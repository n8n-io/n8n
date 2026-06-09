import { loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Sandbox, SandboxState } from '@daytonaio/sdk';
import { randomUUID } from 'node:crypto';

import { OperationalError } from 'n8n-workflow';

export const SEARCH_KNOWLEDGE_SANDBOX_CREATED = 'sandbox created' as const;
export const SEARCH_KNOWLEDGE_SANDBOX_REUSED = 'sandbox reused' as const;
export const AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agents-knowledgebase';

export type SearchKnowledgeSandboxResult =
	| typeof SEARCH_KNOWLEDGE_SANDBOX_CREATED
	| typeof SEARCH_KNOWLEDGE_SANDBOX_REUSED;

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';

const SANDBOX_STATE_STARTED: SandboxState = 'started';

const DEAD_SANDBOX_STATES = new Set<SandboxState>([
	'destroyed',
	'destroying',
	'error',
	'build_failed',
]);

const DEFAULT_SANDBOX_IMAGE = 'daytonaio/sandbox:0.5.0';
const AUTO_STOP_INTERVAL_MINUTES = 5;
const SANDBOX_LIST_PAGE_SIZE = 100;

function buildScopeLabels(projectId: string, agentId: string): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
	};
}

function isUsableSandbox(sandbox: Sandbox): boolean {
	const state = sandbox.state;
	if (!state) return true;
	return !DEAD_SANDBOX_STATES.has(state);
}

@Service()
export class AgentKnowledgeSandboxService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
	) {}

	async ensureSandbox(projectId: string, agentId: string): Promise<SearchKnowledgeSandboxResult> {
		this.assertKnowledgeSandboxEnabled();

		const { Daytona } = loadDaytona();
		const daytona = new Daytona({
			apiUrl: this.agentsConfig.daytonaApiUrl || undefined,
			apiKey: this.agentsConfig.daytonaApiKey || undefined,
		});
		const labels = buildScopeLabels(projectId, agentId);
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);

		let page = 1;
		while (true) {
			const listedSandboxes = await daytona.list(labels, page, SANDBOX_LIST_PAGE_SIZE);
			for (const sandbox of listedSandboxes.items) {
				if (!isUsableSandbox(sandbox)) {
					continue;
				}

				if (sandbox.state !== SANDBOX_STATE_STARTED) {
					await sandbox.start(timeoutSeconds);
				}

				this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId });
				return SEARCH_KNOWLEDGE_SANDBOX_REUSED;
			}

			if (page >= listedSandboxes.totalPages) {
				break;
			}
			page += 1;
		}

		const name = `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-${randomUUID()}`;
		const image = this.agentsConfig.sandboxImage || DEFAULT_SANDBOX_IMAGE;

		await daytona.create(
			{
				name,
				labels,
				language: 'typescript',
				image,
				autoStopInterval: AUTO_STOP_INTERVAL_MINUTES,
			},
			{ timeout: timeoutSeconds },
		);

		this.logger.debug('Created agent knowledge sandbox', { projectId, agentId, name });
		return SEARCH_KNOWLEDGE_SANDBOX_CREATED;
	}

	private assertKnowledgeSandboxEnabled(): void {
		if (
			this.agentsConfig.sandboxEnabled !== true ||
			this.agentsConfig.sandboxProvider !== 'daytona'
		) {
			throw new OperationalError('Agent knowledge sandbox is not enabled');
		}
	}
}
