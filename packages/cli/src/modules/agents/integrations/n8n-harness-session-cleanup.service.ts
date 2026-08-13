import { destroyDaytonaHarnessSandbox, destroyN8nHarnessSandbox } from '@n8n/agents/harness';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import {
	AgentHarnessSessionRepository,
	type AgentHarnessSessionCleanupRecord,
} from '../repositories/agent-harness-session.repository';
import {
	getStoredHarnessSandboxProvider,
	isReusableDaytonaSandboxId,
} from '../utils/harness-sandbox-provider';

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
		let daytonaConfig:
			| Awaited<ReturnType<SandboxSettingsService['resolveDaytonaConfig']>>
			| undefined;
		let n8nSandboxConfig:
			| Awaited<ReturnType<SandboxSettingsService['resolveN8nSandboxConfig']>>
			| undefined;

		for (const row of rows) {
			const provider =
				getStoredHarnessSandboxProvider(row.adapter) ?? this.sandboxSettings.getProvider();
			if (provider === 'daytona' && isReusableDaytonaSandboxId(row.sessionId)) {
				await this.repository.deleteCleanupRecord(row);
				continue;
			}
			if (provider === 'daytona') {
				daytonaConfig ??= await this.sandboxSettings.resolveDaytonaConfig();
				if (!daytonaConfig.apiKey?.trim()) {
					throw new OperationalError('Cannot clean up harness sessions without a Daytona API key');
				}
				await destroyDaytonaHarnessSandbox({
					apiKey: daytonaConfig.apiKey,
					...(daytonaConfig.apiUrl ? { apiUrl: daytonaConfig.apiUrl } : {}),
					sandboxId: row.sessionId,
				});
			} else {
				n8nSandboxConfig ??= await this.sandboxSettings.resolveN8nSandboxConfig();
				if (!n8nSandboxConfig.serviceUrl?.trim()) {
					throw new OperationalError(
						'Cannot clean up harness sessions without a sandbox service URL',
					);
				}
				await destroyN8nHarnessSandbox({
					serviceUrl: n8nSandboxConfig.serviceUrl,
					...(n8nSandboxConfig.apiKey ? { apiKey: n8nSandboxConfig.apiKey } : {}),
					sandboxId: row.sessionId,
				});
			}
			await this.repository.deleteCleanupRecord(row);
		}
	}
}
