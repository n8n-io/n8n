import { createHash } from 'node:crypto';

import type { AgentJsonConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentContextService } from '../../agents/agent-context.service';
import type { AgentSessionSummary, AgentSessionTurn } from '../../agents/agent-context.contracts';
import { resolveCredentialAwareModelConfig } from '../../agents/json-config/model-config';
import { createAgentCredentialProvider } from '../../agents/utils/agent-credential-provider';
import { batchChecks, buildJudgePrompt, parseJudgeAnswers } from './judged-checks';
import { BASE_CHECK, buildPromiseCheckPrompt, parsePromiseChecks } from './promise-checks';
import type { DroppedCheck, SkillText } from './promise-checks';
import { buildPromptIdeasPrompt, parsePromptIdeas } from './prompt-ideas';
import type { PromptIdea } from './prompt-ideas';
import { mergeResumedTurns, turnForExecution } from './session-turns';
import { generateToolChecks, replyIssues, runToolChecks } from './tool-checks';
import { profileAgentTools, summarizeStakes } from './tool-profile';
import type { AgentCheck, AgentStakes, AgentToolProfile, ChatTurn, CheckVerdict } from './types';

const MODEL_TIMEOUT_MS = 120_000;

// Loose on purpose: the parsers own validation, so a field the model leaves out
// is dropped there with a reason instead of failing the whole call.
const promiseOutputSchema = z.object({
	checks: z.array(
		z.object({
			question: z.string().optional(),
			reason: z.string().optional(),
			quote: z.string().optional(),
			appliesWhen: z.string().optional(),
		}),
	),
});

const ideasOutputSchema = z.object({
	ideas: z.array(
		z.object({
			kind: z.string().optional(),
			prompt: z.string().optional(),
			why: z.string().optional(),
			quote: z.string().optional(),
			tool: z.string().optional(),
		}),
	),
});

const judgeOutputSchema = z.object({
	answers: z.array(
		z.object({
			id: z.string().optional(),
			applies: z.boolean().optional(),
			answer: z.string().optional(),
			reason: z.string().optional(),
			turn: z.number().nullable().optional(),
		}),
	),
});

export interface OnlineCheckSession {
	threadId: string;
	title: string;
	origin: string | null;
	turns: Array<{ userMessage: string; reply: string; toolCalls: number; runFailed: boolean }>;
	verdicts: CheckVerdict[];
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

export interface PromptIdeasResponse {
	ideas: PromptIdea[];
}

export interface ReplyChecksResponse {
	issues: Array<{ checkId: string; reason: string }>;
}

/** Ideas for the same agent setup are reused, so a second click costs nothing. */
const MAX_CACHED_IDEAS = 500;

function setupKey(agentId: string, config: AgentJsonConfig, skills: SkillText[]): string {
	return createHash('sha256')
		.update(
			JSON.stringify([
				agentId,
				config.name,
				config.description,
				config.instructions,
				config.tools,
				config.mcpServers,
				skills,
			]),
		)
		.digest('hex');
}

function replyText(turn: AgentSessionTurn): string {
	return (turn.timeline ?? [])
		.filter((event) => event.type === 'text')
		.map((event) => (event.type === 'text' ? event.content : ''))
		.join('\n')
		.trim();
}

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
 * recorded sessions, with the agent's own model and credential. Nothing is
 * stored; the caller gets the report back. See `spike/FINDINGS.md`.
 */
@Service()
export class AgentOnlineChecksService {
	private readonly ideasCache = new Map<string, PromptIdea[]>();

	constructor(
		private readonly agentContextService: AgentContextService,
		private readonly credentialsService: CredentialsService,
		private readonly logger: Logger,
	) {}

	async run(
		user: User,
		projectId: string,
		agentId: string,
		sessionLimit = 10,
	): Promise<OnlineChecksReport> {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new UserError('Agent not found');
		const config = artifact.config;
		const skills = this.skillsOf(artifact.skills);

		const ask = await this.modelFor(config, projectId, user);
		const tools = profileAgentTools(config);
		const promptForChecks = buildPromiseCheckPrompt({ config, skills, tools });
		const promise = parsePromiseChecks(
			await ask(promptForChecks.system, promptForChecks.user, promiseOutputSchema),
			{ instructions: config.instructions ?? '', skills },
		);
		const checks = [...generateToolChecks(tools), ...promise.kept, BASE_CHECK];

		const reader = this.agentContextService.createReader(user, projectId);
		const listed = await reader.lookup({ type: 'sessions', agentId, limit: sessionLimit });
		const summaries = (listed.sessions ?? []) as AgentSessionSummary[];

		const sessions: OnlineCheckSession[] = [];
		for (const summary of summaries) {
			const detail = await this.agentContextService.readSession(
				user,
				projectId,
				agentId,
				summary.threadId,
			);
			if (!detail || detail.executions.length === 0) continue;
			const turns = mergeResumedTurns(detail.executions.map(toChatTurn));

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

			sessions.push({
				threadId: summary.threadId,
				title: summary.title,
				origin: summary.origin,
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
			dropped: promise.dropped,
			sessions,
		};
	}

	/**
	 * Up to three messages to try the agent with: an everyday request, one that
	 * tests a written rule, and one that makes it use a tool that acts. One model
	 * call per agent setup; an empty list when the model gives nothing usable.
	 */
	async promptIdeas(user: User, projectId: string, agentId: string): Promise<PromptIdeasResponse> {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new NotFoundError('Agent not found');
		const config = artifact.config;
		const skills = this.skillsOf(artifact.skills);

		const key = setupKey(agentId, config, skills);
		const cached = this.ideasCache.get(key);
		if (cached) return { ideas: cached };

		const tools = profileAgentTools(config);
		const ask = await this.modelFor(config, projectId, user);
		const prompt = buildPromptIdeasPrompt({ config, skills, tools });
		const parsed = parsePromptIdeas(await ask(prompt.system, prompt.user, ideasOutputSchema), {
			instructions: config.instructions ?? '',
			skills,
			tools,
		});
		if (parsed.dropped.length > 0 || parsed.unreadable) {
			this.logger.debug('[AgentOnlineChecks] Dropped prompt ideas', {
				dropped: parsed.dropped.map((d) => d.why),
				unreadable: parsed.unreadable === true,
			});
		}
		// An unreadable answer is not cached, so the next click tries again.
		if (!parsed.unreadable) {
			if (this.ideasCache.size >= MAX_CACHED_IDEAS) {
				const oldest = this.ideasCache.keys().next().value;
				if (oldest !== undefined) this.ideasCache.delete(oldest);
			}
			this.ideasCache.set(key, parsed.ideas);
		}
		return { ideas: parsed.ideas };
	}

	/** The code checks that failed on the turn one execution belongs to. */
	async replyChecks(
		user: User,
		projectId: string,
		agentId: string,
		threadId: string,
		executionId: string,
	): Promise<ReplyChecksResponse> {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new NotFoundError('Agent not found');
		const detail = await this.agentContextService.readSession(user, projectId, agentId, threadId);
		const turn = detail
			? turnForExecution(
					detail.executions.map((execution) => ({ id: execution.id, turn: toChatTurn(execution) })),
					executionId,
				)
			: undefined;
		if (!turn) throw new NotFoundError('Execution not found');
		return { issues: replyIssues(profileAgentTools(artifact.config), turn) };
	}

	private skillsOf(skills: Record<string, SkillText>): SkillText[] {
		return Object.values(skills).map((skill) => ({
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
		}));
	}

	/** One model call per prompt, with the agent's own model and credential. Returns JSON text. */
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
