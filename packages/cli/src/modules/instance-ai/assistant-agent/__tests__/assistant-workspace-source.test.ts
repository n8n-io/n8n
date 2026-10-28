import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { BuilderTemplatesService, InstanceAiContext } from '@n8n/instance-ai';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AiService } from '@/services/ai.service';

import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import type { InstanceAiAdapterService } from '../../instance-ai.adapter.service';
import { InstanceAiSandboxService } from '../../sandbox';
import {
	AssistantSandboxWorkspaceSource,
	type AssistantSandboxLease,
} from '../assistant-workspace-source';

vi.mock('../../sandbox', () => ({
	InstanceAiSandboxService: vi.fn(function () {
		return {
			resolveSandboxConfig: vi.fn(),
			getOrCreateWorkspace: vi.fn(),
			destroySandbox: vi.fn(),
		};
	}),
}));

describe('AssistantSandboxWorkspaceSource', () => {
	const user = { id: 'user-1' } as User;
	const scope = { agentId: 'assistant', threadId: 'thread-1', projectId: 'project-1', user };

	function createSource(workflowBuilderAvailable = true) {
		const settingsService = mock<InstanceAiSettingsService>();
		settingsService.getSandboxStatus.mockReturnValue({
			workflowBuilderAvailable,
		} as ReturnType<InstanceAiSettingsService['getSandboxStatus']>);
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const adapterService = mock<InstanceAiAdapterService>();
		const source = new AssistantSandboxWorkspaceSource(
			logger,
			mock<GlobalConfig>({ instanceAi: {} }),
			mock<ErrorReporter>(),
			mock<AiService>(),
			settingsService,
			adapterService,
		);
		const sandboxService = vi.mocked(InstanceAiSandboxService).mock.results.at(-1)?.value as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		const options = vi.mocked(InstanceAiSandboxService).mock.calls.at(-1)?.[0];
		return { source, sandboxService, options, adapterService };
	}

	it('creates sandboxes with the shared templates service', () => {
		const { options, adapterService } = createSource();
		const templatesService = {} as BuilderTemplatesService;
		adapterService.getTemplatesService.mockReturnValue(templatesService);

		expect(options?.getTemplatesService()).toBe(templatesService);
	});

	it('gives no lease when the instance cannot run the workflow builder sandbox', async () => {
		const { source, sandboxService } = createSource(false);

		await expect(source.acquire(scope)).resolves.toBeUndefined();
		expect(sandboxService.resolveSandboxConfig).not.toHaveBeenCalled();
	});

	it('gives no lease when the sandbox is turned off', async () => {
		const { source, sandboxService } = createSource();
		sandboxService.resolveSandboxConfig.mockResolvedValue({ enabled: false });

		await expect(source.acquire(scope)).resolves.toBeUndefined();
	});

	it('keeps the sandbox cache entry in use from acquire until release', async () => {
		const { source, sandboxService, options } = createSource();
		const config = { enabled: true, provider: 'n8n-sandbox' };
		sandboxService.resolveSandboxConfig.mockResolvedValue(config);

		const lease = await source.acquire(scope);

		expect(lease).toEqual({ config, threadId: 'thread-1', user });
		expect(options?.runState.getActiveRunId('thread-1')).toBe('thread-1');
		await source.release(scope);
		expect(options?.runState.getActiveRunId('thread-1')).toBeUndefined();
	});

	it('returns the workspace after the workspace setup, and deletes the sandbox with the thread', async () => {
		const { source, sandboxService } = createSource();
		const workspace = { id: 'workspace-1' };
		sandboxService.getOrCreateWorkspace.mockResolvedValue({ workspace });
		const context = mock<InstanceAiContext>();
		const lease: AssistantSandboxLease = {
			config: { enabled: true, provider: 'n8n-sandbox' } as AssistantSandboxLease['config'],
			threadId: 'thread-1',
			user,
		};

		await expect(source.getWorkspace(lease, context)).resolves.toBe(workspace);
		expect(sandboxService.getOrCreateWorkspace).toHaveBeenCalledWith('thread-1', user, context);

		await source.destroy({ agentId: 'assistant', threadId: 'thread-1', userId: 'user-1' });
		expect(sandboxService.destroySandbox).toHaveBeenCalledWith(
			'thread-1',
			'thread_cleanup',
			'user-1',
		);
	});
});
