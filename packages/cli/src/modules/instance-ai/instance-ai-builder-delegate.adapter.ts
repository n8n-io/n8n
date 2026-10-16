import {
	Tool,
	type CredentialProvider,
	type MemoryTaskUsageReport,
	type StreamChunk,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	createAgentContextTool,
	instanceAiBuilderThreadPrefix,
	REPORT_REQUIRED_ARTIFACT_TOOL_NAME,
	reportRequiredArtifactInputSchema,
	resolveAIAPromptCaching,
	resolveAIAReasoning,
	tokenUsageToBuilderUsageItems,
	type BuilderDelegateSession,
	type BuilderRequiredArtifact,
	type BuilderTurnStream,
	type InstanceAiBuilderDelegate,
	type InstanceAiCredentialService,
	type ReportRequiredArtifactInput,
} from '@n8n/instance-ai';

import { AgentsPublicApi, type BuilderSessionOptions } from '@/modules/agents/public-api';
import { Telemetry } from '@/telemetry';

import { InstanceAiAgentContextAdapterService } from './instance-ai-agent-context.adapter';
import { InstanceAiCreditService } from './instance-ai-credit.service';

const INSTANCE_AI_BUILDER_ADDENDUM = `## Instance AI session rules

You are running as a sub-agent inside n8n's instance AI chat; the user sees your questions as chat cards.

Preview links work in this chat. Include a markdown Preview link after a successful build and when \`call_agent\` reports an unsupported interaction as \`approval_required\`, using the exact relative path from the "Session context" section (form: \`[Preview](<path>)\`). Do not invent absolute URLs. Do not omit the link and describe the path in plain text instead.

When you mention the agent editor, say Sessions tab for history and Preview for live chat. Never say Runs, Executions, or Activity History for agents.

You can publish and unpublish the target agent with \`publish_agent\` and \`unpublish_agent\`. Never tell the user to open the agent editor and click Publish.

Use \`agent-context\` for read-only exploration of the target Agent and related project context. Use the legacy read tools only when a mutation flow specifically requires their freshness token.

The Instance AI orchestrator can create workflows and data tables — never ask the user to create them manually. For each missing artifact, call \`report_required_artifact\` with its concrete requirements before your final reply; the orchestrator will provision them and call you again when the Agent needs the result.

Some requested chat platforms do not have a native Agent integration. In that case, finish the Agent without adding same-platform messaging nodes as Agent tools, then report an \`agent-entrypoint\` workflow. It must use the platform trigger, pass the incoming message and a stable conversation identifier into Message an Agent with a custom session key, then send the Agent's text response back through the platform. This workflow invokes the Agent and must never be attached to the Agent as a workflow tool.`;

function isTextDeltaChunk(
	chunk: StreamChunk,
): chunk is Extract<StreamChunk, { type: 'text-delta' }> {
	return chunk.type === 'text-delta';
}

/** Wrap a builder stream generator as a `BuilderTurnStream`: forwards every chunk
 *  as-is, while resolving `text` to the concatenated text-delta content once the
 *  stream ends (mirrors the SDK's own `fullStream` + `text` shape). */
function toBuilderTurnStream(
	chunks: AsyncGenerator<StreamChunk>,
	requiredArtifacts: BuilderRequiredArtifact[],
): BuilderTurnStream {
	let resolveText: (text: string) => void;
	const text = new Promise<string>((resolve) => {
		resolveText = resolve;
	});
	let resolveRequiredArtifacts: (artifacts: BuilderRequiredArtifact[]) => void;
	const requiredArtifactsPromise = new Promise<BuilderRequiredArtifact[]>((resolve) => {
		resolveRequiredArtifacts = resolve;
	});
	let acc = '';

	async function* pump(): AsyncGenerator<StreamChunk> {
		try {
			for await (const chunk of chunks) {
				if (isTextDeltaChunk(chunk)) acc += chunk.delta;
				yield chunk;
			}
		} finally {
			resolveText(acc);
			resolveRequiredArtifacts([...requiredArtifacts]);
		}
	}

	return { fullStream: pump(), text, requiredArtifacts: requiredArtifactsPromise };
}

@Service()
export class InstanceAiBuilderDelegateAdapterService {
	constructor(
		private readonly agents: AgentsPublicApi,
		private readonly context: InstanceAiAgentContextAdapterService,
		private readonly credit: InstanceAiCreditService,
		private readonly logger: Logger,
		private readonly telemetry: Telemetry,
	) {}

	private memoryUsage(user: User, agentId: string, session: BuilderDelegateSession) {
		const { hostThreadId, runId } = session;
		return async (report: MemoryTaskUsageReport): Promise<void> => {
			try {
				const items = tokenUsageToBuilderUsageItems(report.model, report.usage);
				if (items.length === 0) return;
				await this.credit.claimRunUsage(
					user,
					hostThreadId,
					`${runId}:agent-builder:${agentId}:memory:${report.task}:${report.reportId}`,
					items,
					'completed',
				);
			} catch (error) {
				this.logger.warn('Failed to claim agent-builder observational-memory usage', {
					agentId,
					hostThreadId,
					runId,
					task: report.task,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		};
	}

	private buildSubAgentSession(
		user: User,
		projectId: string,
		agentId: string,
		session: BuilderDelegateSession,
		requiredArtifacts: BuilderRequiredArtifact[],
		useEvalModelCatalog: boolean,
	): BuilderSessionOptions {
		const contextTool = createAgentContextTool({
			reader: this.context.createReader(user, projectId),
			resolveDefaultAgentId: async () => agentId,
			logger: this.logger,
		});
		const artifactTool = new Tool(REPORT_REQUIRED_ARTIFACT_TOOL_NAME)
			.description(
				'Report a workflow or data table that Instance AI must create outside the target Agent. ' +
					'Use relationship "agent-entrypoint" for a channel bridge that invokes the Agent; it will not be attached as an Agent tool.',
			)
			.input(reportRequiredArtifactInputSchema)
			.handler(async (input: ReportRequiredArtifactInput) => {
				requiredArtifacts.push(input.artifact);
				return { ok: true };
			})
			.build();
		return {
			threadId: session.threadId,
			instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
			modelConfig: session.modelConfig,
			reasoning: resolveAIAReasoning(session.modelConfig),
			promptCaching: resolveAIAPromptCaching(session.modelConfig),
			telemetry: session.telemetry,
			memoryTaskObserver: session.memoryTaskObserver,
			onMemoryUsage: this.memoryUsage(user, agentId, session),
			track: (entry, properties) =>
				this.telemetry.track(entry, {
					agent_id: agentId,
					user_id: user.id,
					thread_id: session.hostThreadId,
					run_id: session.runId,
					...properties,
				}),
			abortSignal: session.abortSignal,
			mcpTools: session.mcpTools,
			useEvalModelCatalog,
			hostTools: [contextTool, artifactTool],
		};
	}

	createDelegate(
		user: User,
		projectId: string,
		credentialProviderFor: (agentId: string) => CredentialProvider | Promise<CredentialProvider>,
		credentialService: InstanceAiCredentialService,
		options: { useEvalModelCatalog?: boolean } = {},
	): InstanceAiBuilderDelegate {
		const buildRequest = async (
			agentId: string,
			session: BuilderDelegateSession,
			artifacts: BuilderRequiredArtifact[],
		) => ({
			user,
			projectId,
			agentId,
			credentialService,
			credentialProvider: await credentialProviderFor(agentId),
			session: this.buildSubAgentSession(
				user,
				projectId,
				agentId,
				session,
				artifacts,
				options.useEvalModelCatalog === true,
			),
		});
		return {
			createAgent: async (name, options) =>
				await this.agents.createDraft(user, projectId, name, options),
			streamBuild: async (agentId, message, session) => {
				const artifacts: BuilderRequiredArtifact[] = [];
				const stream = await this.agents.build(
					await buildRequest(agentId, session, artifacts),
					message,
				);
				return toBuilderTurnStream(stream, artifacts);
			},
			resumeBuild: async (agentId, resume, session) => {
				const artifacts: BuilderRequiredArtifact[] = [];
				const stream = await this.agents.resumeBuild(
					await buildRequest(agentId, session, artifacts),
					resume,
				);
				return toBuilderTurnStream(stream, artifacts);
			},
			findOpenSuspensions: async (agentId, session) =>
				await this.agents.findOpenSuspensions(user, projectId, agentId, session.threadId),
			cancelOpenSuspension: async (agentId, runId) =>
				await this.agents.cancelOpenSuspension(user, projectId, agentId, runId),
			resolveAgentName: async (agentId) =>
				await this.agents.resolveAgentName(user, projectId, agentId),
			readAgentArtifact: async (agentId) =>
				await this.agents.readArtifact(user, projectId, agentId),
		};
	}

	async deleteBuilderSessions(instanceAiThreadId: string): Promise<void> {
		await this.agents.deleteBuilderSessions(instanceAiBuilderThreadPrefix(instanceAiThreadId));
	}
}
