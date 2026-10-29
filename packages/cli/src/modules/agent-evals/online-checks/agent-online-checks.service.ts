import type { AgentJsonConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { CredentialsService } from '@/credentials/credentials.service';

import { AgentContextService } from '../../agents/agent-context.service';
import type { AgentSessionSummary, AgentSessionTurn } from '../../agents/agent-context.contracts';
import { resolveCredentialAwareModelConfig } from '../../agents/json-config/model-config';
import { createAgentCredentialProvider } from '../../agents/utils/agent-credential-provider';
import { batchChecks, buildJudgePrompt, parseJudgeAnswers } from './judged-checks';
import { BASE_CHECK, buildPromiseCheckPrompt, parsePromiseChecks } from './promise-checks';
import type { DroppedCheck } from './promise-checks';
import { mergeResumedTurns } from './session-turns';
import { generateToolChecks, runToolChecks } from './tool-checks';
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
