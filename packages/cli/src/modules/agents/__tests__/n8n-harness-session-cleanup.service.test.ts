import { mock } from 'vitest-mock-extended';
import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { N8nHarnessSessionCleanupService } from '../integrations/n8n-harness-session-cleanup.service';
import type {
	AgentHarnessSessionCleanupRecord,
	AgentHarnessSessionRepository,
} from '../repositories/agent-harness-session.repository';
import { createReusableDaytonaSandboxId } from '../utils/harness-sandbox-provider';

const destroyN8nHarnessSandbox = vi.hoisted(() => vi.fn(async () => {}));
const destroyDaytonaHarnessSandbox = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@n8n/agents/harness', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/harness')>()),
	destroyDaytonaHarnessSandbox,
	destroyN8nHarnessSandbox,
}));

const row: AgentHarnessSessionCleanupRecord = {
	agentId: 'agent-1',
	threadId: 'thread-1',
	runtimeIdentity: 'identity-1',
	adapter: 'claude-code:n8n-sandbox',
	sessionId: 'sandbox-1',
};

describe('N8nHarnessSessionCleanupService', () => {
	beforeEach(() => vi.clearAllMocks());

	it('destroys the native sandbox before deleting its resumability row', async () => {
		const repository = mock<AgentHarnessSessionRepository>();
		const sandboxSettings = mock<SandboxSettingsService>();
		repository.findForCleanupByAgentAndThread.mockResolvedValue([row]);
		sandboxSettings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://sandbox.test',
			apiKey: 'secret',
		});
		const service = new N8nHarnessSessionCleanupService(repository, sandboxSettings);

		await service.destroyByAgentAndThread(row.agentId, row.threadId);

		expect(destroyN8nHarnessSandbox).toHaveBeenCalledWith({
			serviceUrl: 'https://sandbox.test',
			apiKey: 'secret',
			sandboxId: 'sandbox-1',
		});
		expect(destroyN8nHarnessSandbox.mock.invocationCallOrder[0]).toBeLessThan(
			repository.deleteCleanupRecord.mock.invocationCallOrder[0],
		);
		expect(repository.deleteCleanupRecord).toHaveBeenCalledWith(row);
	});

	it('keeps the row when sandbox destruction fails so cleanup can be retried', async () => {
		const repository = mock<AgentHarnessSessionRepository>();
		const sandboxSettings = mock<SandboxSettingsService>();
		repository.findForCleanupByAgent.mockResolvedValue([row]);
		sandboxSettings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://sandbox.test',
		});
		destroyN8nHarnessSandbox.mockRejectedValueOnce(new Error('service unavailable'));
		const service = new N8nHarnessSessionCleanupService(repository, sandboxSettings);

		await expect(service.destroyByAgent(row.agentId)).rejects.toThrow('service unavailable');
		expect(repository.deleteCleanupRecord).not.toHaveBeenCalled();
	});

	it('destroys Daytona sessions through the direct sandbox connection', async () => {
		const repository = mock<AgentHarnessSessionRepository>();
		const sandboxSettings = mock<SandboxSettingsService>();
		const daytonaRow = { ...row, adapter: 'claude-code:daytona' };
		repository.findForCleanupByAgentAndThread.mockResolvedValue([daytonaRow]);
		sandboxSettings.resolveDaytonaConfig.mockResolvedValue({
			apiUrl: 'https://daytona.test',
			apiKey: 'secret',
		});
		const service = new N8nHarnessSessionCleanupService(repository, sandboxSettings);

		await service.destroyByAgentAndThread(daytonaRow.agentId, daytonaRow.threadId);

		expect(destroyDaytonaHarnessSandbox).toHaveBeenCalledWith({
			apiUrl: 'https://daytona.test',
			apiKey: 'secret',
			sandboxId: 'sandbox-1',
		});
		expect(repository.deleteCleanupRecord).toHaveBeenCalledWith(daytonaRow);
	});

	it('retains a reusable Daytona sandbox when deleting one thread row', async () => {
		const repository = mock<AgentHarnessSessionRepository>();
		const sandboxSettings = mock<SandboxSettingsService>();
		const daytonaRow = {
			...row,
			adapter: 'codex:daytona',
			sessionId: createReusableDaytonaSandboxId({
				projectId: 'project-1',
				resourceId: 'draft-chat:user-1',
				adapter: 'codex:daytona',
			}),
		};
		repository.findForCleanupByAgentAndThread.mockResolvedValue([daytonaRow]);
		const service = new N8nHarnessSessionCleanupService(repository, sandboxSettings);

		await service.destroyByAgentAndThread(daytonaRow.agentId, daytonaRow.threadId);

		expect(destroyDaytonaHarnessSandbox).not.toHaveBeenCalled();
		expect(repository.deleteCleanupRecord).toHaveBeenCalledWith(daytonaRow);
	});
});
