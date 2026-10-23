import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceAiAgentContextReader, InstanceAiContext } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentSessionDetail } from '@/modules/agents/agent-context.contracts';
import { userHasScopes } from '@/permissions.ee/check-access';

import { InstanceAiAgentContextAdapterService } from '../instance-ai-agent-context.adapter';
import { InstanceAiService } from '../instance-ai.service';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

type ServiceInternals = {
	bindAgentContextReader(context: InstanceAiContext, user: User): Promise<void>;
	bindAgentPreviewSession(context: InstanceAiContext, user: User): Promise<void>;
};

const user = mock<User>({ id: 'user-1' });

describe('InstanceAiService Agent context binding', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('binds the reader to the current user and project', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
		const reader = mock<InstanceAiAgentContextReader>();
		const adapter = mock<InstanceAiAgentContextAdapterService>();
		adapter.createReader.mockReturnValue(reader);
		vi.spyOn(Container, 'get')
			.mockReturnValueOnce({
				isActive: vi.fn().mockReturnValue(true),
				settings: new Map(),
			} as unknown as ModuleRegistry)
			.mockReturnValueOnce(adapter);
		const service = Object.create(InstanceAiService.prototype) as ServiceInternals;
		const context = { projectId: 'project-1' } as unknown as InstanceAiContext;

		await service.bindAgentContextReader(context, user);

		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
			projectId: 'project-1',
		});
		expect(adapter.createReader).toHaveBeenCalledWith(user, 'project-1');
		expect(context.agentContextService).toBe(reader);
	});

	it('does not expose Agent context without read scope', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);
		const containerGet = vi.spyOn(Container, 'get');
		const service = Object.create(InstanceAiService.prototype) as ServiceInternals;
		const context = { projectId: 'project-1' } as unknown as InstanceAiContext;

		await service.bindAgentContextReader(context, user);

		expect(context.agentContextService).toBeUndefined();
		expect(containerGet).not.toHaveBeenCalled();
	});

	it('reads preview transcripts on demand and rechecks Agent availability', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
		const registry = {
			isActive: vi.fn().mockReturnValue(true),
			settings: new Map(),
		} as unknown as ModuleRegistry;
		const agents = mock<AgentContextService>();
		agents.readSession.mockResolvedValue({
			thread: {
				id: 'preview-thread-1',
				agentId: 'agent-1',
				agentName: 'Support triage',
				title: 'Preview session',
				sessionNumber: 3,
				createdAt: new Date('2026-10-01'),
				updatedAt: new Date('2026-10-01'),
			},
			executions: [
				{
					id: 'execution-1',
					status: 'success',
					userMessage: 'Find the support request',
					model: 'test-model',
					duration: 100,
					totalTokens: 20,
					error: null,
					timeline: [],
				},
			],
		} satisfies AgentSessionDetail);
		vi.spyOn(Container, 'get').mockImplementation((service) => {
			if (service === ModuleRegistry) return registry;
			if (service === AgentContextService) return agents;
			throw new Error('Unexpected service');
		});
		const service = Object.create(InstanceAiService.prototype) as ServiceInternals;
		const reference = { agentId: 'agent-1', threadId: 'preview-thread-1' };
		const context = mock<InstanceAiContext>({
			projectId: 'project-1',
			agentPreviewSession: reference,
		});

		await service.bindAgentPreviewSession(context, user);

		expect(agents.readSession).not.toHaveBeenCalled();
		const preview = await context.resolvePreviewSession?.(reference);
		expect(agents.readSession).toHaveBeenCalledWith(
			user,
			'project-1',
			'agent-1',
			'preview-thread-1',
		);
		expect(preview?.transcript).toContain('Find the support request');
		expect(preview?.title).toBe('Preview session');
		agents.readSession.mockClear();
		registry.settings.set('agents', { enabled: false });

		await expect(context.resolvePreviewSession?.(reference)).resolves.toBeNull();
		expect(agents.readSession).not.toHaveBeenCalled();
	});
});
