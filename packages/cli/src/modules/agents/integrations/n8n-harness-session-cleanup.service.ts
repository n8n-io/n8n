import { destroyN8nHarnessSandbox } from '@n8n/agents/harness';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import {
	AgentHarnessSessionRepository,
	type AgentHarnessSessionCleanupRecord,
} from '../repositories/agent-harness-session.repository';

@Service()
export class N8nHarnessSessionCleanupService {
	constructor(
		private readonly repository: AgentHarnessSessionRepository,
		private readonly sandboxSettings: SandboxSettingsService,
	) {}

	async destroyByAgentAndThread(agentId: string, threadId: string): Promise<void> {
		await this.destroyRows(await this.repository.findForCleanupByAgentAndThread(agentId, threadId));
	}

	async destroyByAgentAndThreadPrefix(agentId: string, threadIdPrefix: string): Promise<void> {
		await this.destroyRows(
			await this.repository.findForCleanupByAgentAndThreadPrefix(agentId, threadIdPrefix),
		);
	}

	async destroyByAgent(agentId: string): Promise<void> {
		await this.destroyRows(await this.repository.findForCleanupByAgent(agentId));
	}

	async destroySupersededForThread(
		agentId: string,
		threadId: string,
		runtimeIdentity: string,
	): Promise<boolean> {
		const rows = await this.repository.findSupersededForCleanup(agentId, threadId, runtimeIdentity);
		await this.destroyRows(rows);
		return rows.length > 0;
	}

	async destroyExpiredForThread(
		agentId: string,
		threadId: string,
		runtimeIdentity: string,
	): Promise<boolean> {
		const rows = await this.repository.findExpiredForCleanup(agentId, threadId, runtimeIdentity);
		await this.destroyRows(rows);
		return rows.length > 0;
	}

	private async destroyRows(rows: AgentHarnessSessionCleanupRecord[]): Promise<void> {
		if (rows.length === 0) return;
		const { serviceUrl, apiKey } = await this.sandboxSettings.resolveN8nSandboxConfig();
		if (!serviceUrl?.trim()) {
			throw new OperationalError('Cannot clean up harness sessions without a sandbox service URL');
		}

		for (const row of rows) {
			await destroyN8nHarnessSandbox({
				serviceUrl,
				...(apiKey ? { apiKey } : {}),
				sandboxId: row.sessionId,
			});
			await this.repository.deleteCleanupRecord(row);
		}
	}
}
