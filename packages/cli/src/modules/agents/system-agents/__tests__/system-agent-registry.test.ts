import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import { SystemAgentRegistry } from '../system-agent-registry';
import type { SystemAgentProvider, SystemAgentSharingPolicy } from '../system-agent.types';

const AGENT_ID = 'test-assistant';
const reader = mock<User>({ id: 'reader-1' });

const threadOf = (agentId: string, ownerId: string | null) =>
	mock<AgentExecutionThread>({ id: 'thread-1', agentId, projectId: 'project-1', ownerId });

function setup(options: { sharing?: boolean } = {}) {
	const registry = new SystemAgentRegistry();
	const sharing = mock<SystemAgentSharingPolicy>();
	const provider = mock<SystemAgentProvider>({ agentId: AGENT_ID, name: 'Test Assistant' });
	Object.defineProperty(provider, 'sharing', {
		value: options.sharing === false ? undefined : sharing,
	});
	registry.register(provider);
	return { registry, provider, sharing };
}

describe('SystemAgentRegistry', () => {
	it('refuses to register an agent id twice', () => {
		const { registry, provider } = setup();

		expect(() => registry.register(provider)).toThrow('is already registered');
	});

	describe('allows', () => {
		it.each([true, false])('asks the provider of an instance agent (%s)', async (authorized) => {
			const { registry, provider } = setup();
			provider.authorize.mockResolvedValue(authorized);

			await expect(registry.allows(AGENT_ID, reader, 'project-1')).resolves.toBe(authorized);
			expect(provider.authorize).toHaveBeenCalledWith(reader, 'project-1');
		});

		it('allows every project agent', async () => {
			const { registry, provider } = setup();

			await expect(registry.allows('agent-1', reader, 'project-1')).resolves.toBe(true);
			expect(provider.authorize).not.toHaveBeenCalled();
		});
	});

	describe('readsOthersThreads', () => {
		it.each([true, false])('asks the sharing rules of an instance agent (%s)', async (reads) => {
			const { registry, sharing } = setup();
			sharing.canReadSharedIn.mockResolvedValue(reads);

			await expect(registry.readsOthersThreads(AGENT_ID, reader, 'project-1')).resolves.toBe(reads);
			expect(sharing.canReadSharedIn).toHaveBeenCalledWith(reader, 'project-1');
		});

		it('lets nobody read the threads of others for an instance agent without sharing rules', async () => {
			const { registry } = setup({ sharing: false });

			await expect(registry.readsOthersThreads(AGENT_ID, reader, 'project-1')).resolves.toBe(false);
		});

		it('keeps project agents to the route checks', async () => {
			const { registry, sharing } = setup();

			await expect(registry.readsOthersThreads('agent-1', reader, 'project-1')).resolves.toBe(true);
			expect(sharing.canReadSharedIn).not.toHaveBeenCalled();
		});
	});

	describe('canReadThread', () => {
		it('lets the owner read without asking the sharing rules', async () => {
			const { registry, sharing } = setup();

			await expect(registry.canReadThread(reader, threadOf(AGENT_ID, 'reader-1'))).resolves.toBe(
				true,
			);
			expect(sharing.canRead).not.toHaveBeenCalled();
		});

		it.each([true, false])(
			"asks the sharing rules for another user's thread (%s)",
			async (canRead) => {
				const { registry, sharing } = setup();
				const thread = threadOf(AGENT_ID, 'owner-1');
				sharing.canRead.mockResolvedValue(canRead);

				await expect(registry.canReadThread(reader, thread)).resolves.toBe(canRead);
				expect(sharing.canRead).toHaveBeenCalledWith(reader, thread);
			},
		);

		it('asks the sharing rules for a thread without owner too', async () => {
			const { registry, sharing } = setup();
			sharing.canRead.mockResolvedValue(false);

			await expect(registry.canReadThread(reader, threadOf(AGENT_ID, null))).resolves.toBe(false);
		});

		it("refuses another user's thread of an instance agent without sharing rules", async () => {
			const { registry } = setup({ sharing: false });

			await expect(registry.canReadThread(reader, threadOf(AGENT_ID, 'owner-1'))).resolves.toBe(
				false,
			);
		});

		it('keeps the threads of project agents to the route checks', async () => {
			const { registry, sharing } = setup();

			await expect(registry.canReadThread(reader, threadOf('agent-1', 'owner-1'))).resolves.toBe(
				true,
			);
			expect(sharing.canRead).not.toHaveBeenCalled();
		});
	});
});
