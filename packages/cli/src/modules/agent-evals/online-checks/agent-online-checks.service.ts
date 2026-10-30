import {
	MAX_AGENT_ONLINE_SESSIONS,
	type AgentJsonConfig,
	type AgentOnlineRubric,
	type AgentOnlineCaseResult,
	type AgentOnlineReplayComparison,
	type InstanceAiEvalAgentExecutionResult,
	type UpdateAgentOnlineCheckDto,
	type AgentOnlineSession,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { NotFoundError } from '@n8n/errors';

import { CredentialsService } from '@/credentials/credentials.service';
import { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';

import { AgentContextService } from '../../agents/agent-context.service';
import type { AgentSessionTurn } from '../../agents/agent-context.contracts';
import { resolveCredentialAwareModelConfig } from '../../agents/json-config/model-config';
import { createAgentCredentialProvider } from '../../agents/utils/agent-credential-provider';
import { batchChecks, buildJudgePrompt, parseJudgeAnswers } from './judged-checks';
import { BASE_CHECK, buildPromiseCheckPrompt, parsePromiseChecks } from './promise-checks';
import type { DroppedCheck } from './promise-checks';
import { mergeResumedTurns } from './session-turns';
import { generateToolChecks, runToolChecks } from './tool-checks';
import { profileAgentTools, summarizeStakes } from './tool-profile';
import type {
	AgentCheck,
	AgentStakes,
	AgentToolProfile,
	ChatTurn,
	CheckVerdict,
	TimelineEvent,
} from './types';

import { AgentOnlineCheckHistoryRepository } from './agent-online-check-history.repository';

const MODEL_TIMEOUT_MS = 120_000;

// Strict output providers require every field. Use null for an absent value.
const promiseOutputSchema = z.object({
	checks: z.array(
		z.object({
			question: z.string(),
			reason: z.string(),
			quote: z.string(),
			appliesWhen: z.string().nullable(),
		}),
	),
});

const judgeOutputSchema = z.object({
	answers: z.array(
		z.object({
			id: z.string(),
			applies: z.boolean(),
			answer: z.string(),
			reason: z.string(),
			turn: z.number().nullable(),
		}),
	),
});

export interface OnlineCheckSession {
	threadId: string;
	title: string;
	origin: string | null;
	turns: Array<{ userMessage: string; reply: string; toolCalls: number; runFailed: boolean }>;
	verdicts: CheckVerdict[];
	savedResult?: AgentOnlineCaseResult;
}

export interface OnlineChecksReport {
	agentId: string;
	agentName: string;
	stakes: AgentStakes;
	tools: AgentToolProfile[];
	checks: AgentCheck[];
	dropped: DroppedCheck[];
	sessions: OnlineCheckSession[];
}

function replyText(turn: AgentSessionTurn): string {
	return (turn.timeline ?? [])
		.filter((event) => event.type === 'text')
		.map((event) => (event.type === 'text' ? event.content : ''))
		.join('\n')
		.trim();
}

/** A replayed turn in the recorded-turn shape, so the same checks read it. */
function replayedChatTurn(userMessage: string, run: InstanceAiEvalAgentExecutionResult): ChatTurn {
	const now = Date.now();
	const timeline: TimelineEvent[] = run.toolCalls.map((call, index) => ({
		type: 'tool-call',
		kind: call.kind === 'node' || call.kind === 'workflow' ? call.kind : 'tool',
		name: call.tool,
		toolCallId: `replay-${index}`,
		input: call.input,
		output: call.output,
		startTime: now,
		endTime: now,
		success: call.error === undefined,
	}));
	if (run.finalText) timeline.push({ type: 'text', content: run.finalText, timestamp: now });
	return {
		userMessage,
		reply: run.finalText,
		timeline,
		...(run.success ? {} : { runFailed: true }),
	};
}

const sameRubric = (a: AgentOnlineRubric, b: AgentOnlineRubric) =>
	a.generatedAt === b.generatedAt && a.updatedAt === b.updatedAt;

function toChatTurn(turn: AgentSessionTurn): ChatTurn {
	return {
		userMessage: turn.userMessage ?? '',
		reply: replyText(turn),
		timeline: turn.timeline ?? [],
		...(turn.status === 'error' ? { runFailed: true } : {}),
	};
}

/**
 * Spike: generate checks from an agent's definition and run them over its
 * recorded sessions, with the agent's own model and credential. The rubric is
 * stored on the agent. Each assessment keeps its rubric and recorded conversation. See `spike/FINDINGS.md`.
 */
@Service()
export class AgentOnlineChecksService {
	constructor(
		private readonly agentContextService: AgentContextService,
		private readonly credentialsService: CredentialsService,
		private readonly logger: Logger,
		private readonly history: AgentOnlineCheckHistoryRepository,
		private readonly evalExecution: EvalAgentExecutionService,
	) {}

	async getRubric(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<AgentOnlineRubric | null> {
		return await this.agentContextService.readOnlineRubric(user, projectId, agentId);
	}

	async generateRubric(user: User, projectId: string, agentId: string): Promise<AgentOnlineRubric> {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new UserError('Agent not found');
		const config = artifact.config;
		const skills = Object.values(artifact.skills).map((skill) => ({
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
		}));

		const ask = await this.modelFor(config, projectId, user);
		const tools = profileAgentTools(config);
		const promptForChecks = buildPromiseCheckPrompt({ config, skills, tools });
		const promise = parsePromiseChecks(
			await ask(promptForChecks.system, promptForChecks.user, promiseOutputSchema),
			{ instructions: config.instructions ?? '', skills },
		);
		if (promise.unreadable) {
			throw new UserError(
				'Could not generate checks from this agent. Check its model and try again.',
			);
		}
		const rubric: AgentOnlineRubric = {
			checks: [...generateToolChecks(tools), ...promise.kept, BASE_CHECK],
			generatedAt: new Date().toISOString(),
		};
		await this.agentContextService.saveOnlineRubric(user, projectId, agentId, rubric);
		return rubric;
	}

	async run(
		user: User,
		projectId: string,
		agentId: string,
		sessionIds?: string[],
	): Promise<OnlineChecksReport> {
		if (sessionIds && (sessionIds.length === 0 || sessionIds.length > MAX_AGENT_ONLINE_SESSIONS)) {
			throw new UserError('Select between 1 and 10 sessions to check.');
		}
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new UserError('Agent not found');
		const config = artifact.config;
		const rubric =
			(await this.getRubric(user, projectId, agentId)) ??
			(await this.generateRubric(user, projectId, agentId));
		const checks = rubric.checks;
		const tools = profileAgentTools(config);
		const ask = await this.modelFor(config, projectId, user);

		const summaries = await this.listSessions(user, projectId, agentId);
		const selectedIds = [...new Set(sessionIds ?? summaries.map((session) => session.threadId))];

		const sessions: OnlineCheckSession[] = [];
		for (const threadId of selectedIds) {
			const summary = summaries.find((session) => session.threadId === threadId);
			const detail = await this.agentContextService.readSession(user, projectId, agentId, threadId);
			if (!detail || detail.executions.length === 0) {
				throw new UserError('This session has no recorded messages to check.');
			}
			if (detail.executions.some((execution) => execution.status === 'running')) {
				throw new UserError('This session is still running. Try again when it finishes.');
			}
			const savedCase = await this.history.findSessionCase(agentId, threadId, user.id);
			const turns = savedCase?.turns ?? mergeResumedTurns(detail.executions.map(toChatTurn));

			const verdicts = await this.judge(checks, turns, config, tools, ask);
			const title = savedCase?.title ?? summary?.title ?? detail.thread.title ?? 'Untitled session';
			const savedResult = await this.history.saveAssessment({
				agentId,
				ownerId: detail.thread.accessScope === 'project' ? null : user.id,
				threadId,
				title,
				turns,
				rubric,
				configHash: artifact.configHash,
				verdicts,
				caseId: savedCase?.id,
			});

			sessions.push({
				threadId,
				title,
				savedResult,
				origin: summary?.origin ?? null,
				turns: turns.map((turn) => ({
					userMessage: turn.userMessage,
					reply: turn.reply,
					toolCalls: (turn.timeline ?? []).filter((e) => e.type === 'tool-call').length,
					runFailed: turn.runFailed === true,
				})),
				verdicts,
			});
		}

		return {
			agentId,
			agentName: config.name,
			stakes: summarizeStakes(tools),
			tools,
			checks,
			dropped: [],
			sessions,
		};
	}

	/** Approves the saved checks for live monitoring. */
	async approveRubric(user: User, projectId: string, agentId: string) {
		const rubric = await this.getRubric(user, projectId, agentId);
		if (!rubric) throw new NotFoundError('Write checks for this agent before you approve them.');
		const approved = { ...rubric, approvedAt: new Date().toISOString() };
		await this.agentContextService.saveOnlineRubric(user, projectId, agentId, approved);
		return approved;
	}

	async updateCheck(
		user: User,
		projectId: string,
		agentId: string,
		checkId: string,
		input: UpdateAgentOnlineCheckDto,
	) {
		const rubric = await this.getRubric(user, projectId, agentId);
		const check = rubric?.checks.find((item) => item.id === checkId);
		if (!rubric || !check) throw new NotFoundError('Check not found');
		if (check.kind !== 'promise') throw new UserError('Built-in checks cannot be edited.');
		const updated = {
			...rubric,
			updatedAt: new Date().toISOString(),
			checks: rubric.checks.map((item) =>
				item.id === checkId
					? {
							...item,
							question: input.question,
							reason: input.reason,
							appliesWhen: input.appliesWhen || undefined,
						}
					: item,
			),
		};
		await this.agentContextService.saveOnlineRubric(user, projectId, agentId, updated);
		return updated;
	}
	async listActivity(user: User, projectId: string, agentId: string, take: number, skip: number) {
		await this.getRubric(user, projectId, agentId);
		return await this.history.listActivity(agentId, user.id, take, skip);
	}
	async reviewCheck(
		user: User,
		projectId: string,
		agentId: string,
		resultId: number,
		checkId: string,
		feedback: 'good' | 'bad',
	) {
		await this.getRubric(user, projectId, agentId);
		const result = await this.history.findAssessment(agentId, user.id, resultId);
		if (!result) throw new NotFoundError('Assessment not found');
		if (
			!result.rubric.checks.some((check) => check.id === checkId) ||
			!result.verdicts.some((verdict) => verdict.checkId === checkId)
		)
			throw new NotFoundError('Check not found in this assessment');
		return await this.history.recordReview(resultId, user.id, checkId, feedback);
	}

	async listCases(user: User, projectId: string, agentId: string, take: number, skip: number) {
		await this.getRubric(user, projectId, agentId);
		return await this.history.listCases(agentId, user.id, take, skip);
	}
	async listCaseResults(
		user: User,
		projectId: string,
		agentId: string,
		caseId: number,
		take: number,
		skip: number,
	) {
		await this.getRubric(user, projectId, agentId);
		const page = await this.history.listResults(agentId, caseId, user.id, take, skip);
		if (!page) throw new NotFoundError('Test case not found');
		return page;
	}
	async recheckCase(user: User, projectId: string, agentId: string, caseId: number) {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new NotFoundError('Agent not found');
		const testCase = await this.history.findCase(agentId, caseId, user.id);
		if (!testCase) throw new NotFoundError('Test case not found');
		const rubric =
			(await this.getRubric(user, projectId, agentId)) ??
			(await this.generateRubric(user, projectId, agentId));
		const tools = profileAgentTools(artifact.config);
		const ask = await this.modelFor(artifact.config, projectId, user);
		const verdicts = await this.judge(rubric.checks, testCase.turns, artifact.config, tools, ask);
		return await this.history.saveAssessment({
			agentId,
			ownerId: testCase.ownerId,
			caseId,
			threadId: testCase.threadId ?? '',
			title: testCase.title,
			turns: testCase.turns,
			rubric,
			configHash: artifact.configHash,
			verdicts,
		});
	}
	/**
	 * Replays a saved case on the current draft with tools mocked, then judges
	 * the recorded run and the replay with the same rubric. The replay is not
	 * stored.
	 */
	async replayCase(
		user: User,
		projectId: string,
		agentId: string,
		caseId: number,
	): Promise<AgentOnlineReplayComparison> {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new NotFoundError('Agent not found');
		const testCase = await this.history.findCase(agentId, caseId, user.id);
		if (!testCase) throw new NotFoundError('Test case not found');
		const rubric =
			(await this.getRubric(user, projectId, agentId)) ??
			(await this.generateRubric(user, projectId, agentId));

		const latest = (await this.history.listResults(agentId, caseId, user.id, 1, 0))?.items[0];
		const before =
			latest && sameRubric(latest.rubric, rubric)
				? latest
				: await this.recheckCase(user, projectId, agentId, caseId);

		const userMessages = testCase.turns
			.map((turn) => turn.userMessage)
			.filter((message) => message.trim().length > 0);
		const runs = await this.evalExecution.replayWithLlmMock(
			agentId,
			user,
			{ projectId },
			userMessages,
		);
		const turns = runs.map((run, index) => replayedChatTurn(userMessages[index] ?? '', run));
		const tools = profileAgentTools(artifact.config);
		const ask = await this.modelFor(artifact.config, projectId, user);
		const verdicts = await this.judge(rubric.checks, turns, artifact.config, tools, ask);

		return {
			caseId,
			title: testCase.title,
			before,
			after: {
				configHash: artifact.configHash,
				rubric,
				verdicts,
				turns: turns.map((turn, index) => ({
					userMessage: turn.userMessage,
					reply: turn.reply,
					toolCalls: runs[index]?.toolCalls.length ?? 0,
					runFailed: turn.runFailed === true,
				})),
				errors: runs.flatMap((run) => run.errors),
			},
		};
	}

	private async judge(
		checks: AgentCheck[],
		turns: ChatTurn[],
		config: AgentJsonConfig,
		tools: AgentToolProfile[],
		ask: (system: string, prompt: string, schema: z.ZodTypeAny) => Promise<string>,
	) {
		const verdicts = runToolChecks(checks, turns);
		for (const batch of batchChecks(checks.filter((c) => c.kind !== 'tool'))) {
			const prompt = buildJudgePrompt(turns, batch, {
				name: config.name,
				description: config.description,
				instructions: config.instructions,
				tools,
			});
			verdicts.push(
				...parseJudgeAnswers(
					await ask(prompt.system, prompt.user, judgeOutputSchema),
					batch,
					turns.length,
				),
			);
		}
		return verdicts;
	}

	async listSessions(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<AgentOnlineSession[]> {
		const reader = this.agentContextService.createReader(user, projectId);
		const listed = await reader.lookup({
			type: 'sessions',
			agentId,
			limit: MAX_AGENT_ONLINE_SESSIONS,
		});
		const sessions = listed.sessions ?? [];
		return sessions
			.filter((session) => session.status !== null && session.status !== 'running')
			.map(({ threadId, title, origin, updatedAt }) => ({
				threadId,
				title,
				origin,
				updatedAt,
			}));
	}

	/** Use the agent's model and credential. Return JSON text. */
	private async modelFor(config: AgentJsonConfig, projectId: string, user: User) {
		if (!config.model || !config.credential) {
			throw new UserError('This agent needs a model and a credential before checks can run.');
		}
		const modelConfig = await resolveCredentialAwareModelConfig(
			config.model,
			config.credential,
			createAgentCredentialProvider(this.credentialsService, projectId, user),
			config.modelDeploymentName,
		);
		const { Agent } = await import('@n8n/agents');

		return async (system: string, prompt: string, schema: z.ZodTypeAny): Promise<string> => {
			const agent = new Agent('agent-online-checks')
				.model(modelConfig)
				.instructions(system)
				.structuredOutput(schema);
			try {
				const result = await agent.generate(prompt, {
					abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
				});
				if (result.finishReason === 'error') {
					throw result.error ?? new UserError('The model did not complete the checks.');
				}
				return JSON.stringify(result.structuredOutput ?? {});
			} catch (error) {
				this.logger.warn('[AgentOnlineChecks] Model call failed', {
					error: error instanceof Error ? error.message : String(error),
				});
				return '{}';
			}
		};
	}
}
