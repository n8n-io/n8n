import type { AgentJsonConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { Time } from '@n8n/constants';

import { TtlMap } from '@/utils/ttl-map';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import { summarizeTools } from '../evaluation/evaluation-config';
import { sanitizeToolName } from '../json-config/agent-config-composition';
import { toAgentDocument } from '../json-config/agent-document';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { SafeTestingFlagGate } from './safe-testing-flag-gate';
import { SimulationBackendRegistry } from './simulation-backend-registry';
import { SimulationSession } from './simulation-session';
import type { SimulatedAgent, SimulatedTool, SimulationWorld } from './tool-simulation.contracts';

export interface OpenSimulationInput {
	user: User;
	agentId: string;
	projectId: string;
	/** The test chat (thread) ID. One world for each test chat. */
	testChatId: string;
	/** The user message of this turn. Seeds a new world. */
	message: string;
}

/**
 * Decides whether a draft run is a test run and gives it the session of its
 * test chat. With the flag off, draft runs stay live.
 */
@Service()
export class SimulationSessionService {
	private readonly sessions = new TtlMap<string, SimulationSession>(
		30 * Time.minutes.toMilliseconds,
	);

	constructor(
		private readonly logger: Logger,
		private readonly flagGate: SafeTestingFlagGate,
		private readonly registry: SimulationBackendRegistry,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly agentRepository: AgentRepository,
		private readonly skillRefs: AgentSkillRefsService,
		private readonly executionRepository: AgentExecutionRepository,
	) {}

	/** The session of a test run, or `undefined` for a live run. */
	async openForDraftRun(input: OpenSimulationInput): Promise<SimulationSession | undefined> {
		if (!(await this.flagGate.isEnabled(input.user))) return undefined;
		const cached = this.sessions.get(input.testChatId);
		if (cached) {
			this.sessions.touch(input.testChatId);
			return cached;
		}

		const backend = this.registry.get();
		let world: SimulationWorld | undefined;
		let unavailableDetail: string | undefined;
		if (!backend) {
			unavailableDetail = 'No simulator is set up on this instance.';
		} else {
			try {
				world = await backend.openWorld({
					testChatId: input.testChatId,
					agent: await this.describeAgent(input.agentId, input.projectId),
					firstMessage: input.message,
				});
			} catch (error) {
				unavailableDetail = 'The simulator could not start.';
				this.logger.warn('[SafeTesting] Failed to open a simulated world', {
					agentId: input.agentId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		const session = new SimulationSession({
			testChatId: input.testChatId,
			world,
			unavailableDetail,
			queueMode: this.executionsConfig.mode === 'queue',
		});
		this.sessions.set(input.testChatId, session);
		return session;
	}

	async markExecutionSimulated(executionId: string): Promise<void> {
		await this.executionRepository.update({ id: executionId }, { simulated: true });
	}

	/** The agent and its tools, as a backend sees them to seed a world. */
	private async describeAgent(agentId: string, projectId: string): Promise<SimulatedAgent> {
		const saved = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!saved?.schema) throw new NotFoundError(`Agent ${agentId} not found`);
		const refs = await this.skillRefs.refsForDraft(saved, {});
		const config: AgentJsonConfig = toAgentDocument(structuredClone(saved.schema), refs);
		const tools: SimulatedTool[] = summarizeTools(config, saved.tools ?? {}, sanitizeToolName).map(
			(tool) => ({
				toolName: tool.name,
				kind: tool.kind === 'other' && tool.name === 'web_search' ? 'web_search' : tool.kind,
				...(tool.description ? { description: tool.description } : {}),
				...(tool.nodeType ? { nodeType: tool.nodeType } : {}),
			}),
		);
		return {
			agentId,
			projectId,
			name: config.name,
			instructions: config.instructions ?? '',
			tools,
		};
	}
}
