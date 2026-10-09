import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceAiAgentContextReader, InstanceAiContext } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { hasScopes } from '@/permissions.ee/scope-access';

import { InstanceAiAgentContextAdapterService } from '../../agents/instance-ai-agent-context.adapter';
import { InstanceAiService } from '../instance-ai.service';

vi.mock('@/permissions.ee/scope-access', () => ({
	hasScopes: vi.fn(),
}));

type ServiceInternals = {
	bindAgentContextReader(context: InstanceAiContext, user: User): Promise<void>;
};

const user = mock<User>({ id: 'user-1' });

describe('InstanceAiService Agent context binding', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('binds the reader to the current user and project', async () => {
		vi.mocked(hasScopes).mockResolvedValue(true);
		const reader = mock<InstanceAiAgentContextReader>();
		const adapter = mock<InstanceAiAgentContextAdapterService>();
		adapter.createReader.mockReturnValue(reader);
		vi.spyOn(Container, 'get')
			.mockReturnValueOnce({ isActive: vi.fn().mockReturnValue(true) } as unknown as ModuleRegistry)
			.mockReturnValueOnce(adapter);
		const service = Object.create(InstanceAiService.prototype) as ServiceInternals;
		const context = { projectId: 'project-1' } as unknown as InstanceAiContext;

		await service.bindAgentContextReader(context, user);

		expect(hasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
			projectId: 'project-1',
		});
		expect(adapter.createReader).toHaveBeenCalledWith(user, 'project-1');
		expect(context.agentContextService).toBe(reader);
	});

	it('does not expose Agent context without read scope', async () => {
		vi.mocked(hasScopes).mockResolvedValue(false);
		const containerGet = vi.spyOn(Container, 'get');
		const service = Object.create(InstanceAiService.prototype) as ServiceInternals;
		const context = { projectId: 'project-1' } as unknown as InstanceAiContext;

		await service.bindAgentContextReader(context, user);

		expect(context.agentContextService).toBeUndefined();
		expect(containerGet).not.toHaveBeenCalled();
	});
});
