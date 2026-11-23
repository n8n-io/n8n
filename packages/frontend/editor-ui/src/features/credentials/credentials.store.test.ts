import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ICredentialsResponse } from './credentials.types';
import * as credentialsApi from './credentials.api';
import { useCredentialsStore } from './credentials.store';

vi.mock('./credentials.api', async (importOriginal) => ({
	...(await importOriginal<typeof import('./credentials.api')>()),
	getUsableCredentials: vi.fn(),
	deleteCredential: vi.fn(),
	updateCredential: vi.fn(),
}));

function makeCredential(id: string, name = id): ICredentialsResponse {
	return {
		id,
		name,
		type: 'anthropicApi',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		isManaged: false,
	} as ICredentialsResponse;
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const agentScope = { projectId: 'project-1', forAgent: true };
const workflowScope = { workflowId: 'workflow-1' };

describe('credentials store: usable credentials by scope', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(credentialsApi.getUsableCredentials).mockReset();
	});

	it('keeps a scope after a fetch for another scope replaces the slice', async () => {
		const store = useCredentialsStore();
		vi.mocked(credentialsApi.getUsableCredentials)
			.mockResolvedValueOnce([makeCredential('agent-cred')])
			.mockResolvedValueOnce([makeCredential('workflow-cred')]);

		await store.fetchUsableCredentials(agentScope);
		await store.fetchUsableCredentials(workflowScope);

		expect(store.hasUsableCredentialsForScope(agentScope)).toBe(false);
		expect(store.getUsableCredentialsForScope(agentScope)?.map((c) => c.id)).toEqual([
			'agent-cred',
		]);
		expect(store.getUsableCredentialsForScope(workflowScope)?.map((c) => c.id)).toEqual([
			'workflow-cred',
		]);
	});

	it('returns undefined for a scope that was never fetched', () => {
		const store = useCredentialsStore();

		expect(store.getUsableCredentialsForScope(agentScope)).toBeUndefined();
	});

	it('drops the oldest scope once ten scopes are cached', async () => {
		const store = useCredentialsStore();
		vi.mocked(credentialsApi.getUsableCredentials).mockResolvedValue([makeCredential('cred')]);

		for (let index = 0; index < 11; index++) {
			await store.fetchUsableCredentials({ workflowId: `workflow-${index}` });
		}

		expect(store.getUsableCredentialsForScope({ workflowId: 'workflow-0' })).toBeUndefined();
		expect(store.getUsableCredentialsForScope({ workflowId: 'workflow-1' })).toBeDefined();
		expect(store.getUsableCredentialsForScope({ workflowId: 'workflow-10' })).toBeDefined();
	});

	it('does not let an older response for a scope overwrite a newer one', async () => {
		const store = useCredentialsStore();
		const older = deferred<ICredentialsResponse[]>();
		const newer = deferred<ICredentialsResponse[]>();
		vi.mocked(credentialsApi.getUsableCredentials)
			.mockReturnValueOnce(older.promise)
			.mockReturnValueOnce(newer.promise);

		const olderFetch = store.fetchUsableCredentials(agentScope);
		const newerFetch = store.fetchUsableCredentials(agentScope);
		newer.resolve([makeCredential('newer')]);
		await newerFetch;
		older.resolve([makeCredential('older')]);
		await olderFetch;

		expect(store.getUsableCredentialsForScope(agentScope)?.map((c) => c.id)).toEqual(['newer']);
	});

	it('caches a scope again after a failed fetch for it', async () => {
		const store = useCredentialsStore();
		vi.mocked(credentialsApi.getUsableCredentials)
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce([makeCredential('agent-cred')]);

		await expect(store.fetchUsableCredentials(agentScope)).rejects.toThrow('offline');
		await store.fetchUsableCredentials(agentScope);

		expect(store.getUsableCredentialsForScope(agentScope)?.map((c) => c.id)).toEqual([
			'agent-cred',
		]);
	});

	it('updates the connection state in every cached scope', async () => {
		const store = useCredentialsStore();
		vi.mocked(credentialsApi.getUsableCredentials)
			.mockResolvedValueOnce([makeCredential('shared')])
			.mockResolvedValueOnce([makeCredential('shared')]);
		await store.fetchUsableCredentials(agentScope);
		await store.fetchUsableCredentials(workflowScope);

		store.setConnectedByMe('shared', true, 'me@example.com');

		for (const scope of [agentScope, workflowScope]) {
			expect(store.getUsableCredentialsForScope(scope)?.[0]).toMatchObject({
				connectedByMe: true,
				connectedAccountIdentifier: 'me@example.com',
			});
		}
		expect(store.getUsableCredentialById('shared')).toMatchObject({ connectedByMe: true });
	});

	it('removes a deleted credential from the slice and every cached scope', async () => {
		const store = useCredentialsStore();
		vi.mocked(credentialsApi.getUsableCredentials)
			.mockResolvedValueOnce([makeCredential('deleted'), makeCredential('kept')])
			.mockResolvedValueOnce([makeCredential('deleted')]);
		vi.mocked(credentialsApi.deleteCredential).mockResolvedValue(true);
		await store.fetchUsableCredentials(agentScope);
		await store.fetchUsableCredentials(workflowScope);

		await store.deleteCredential({ id: 'deleted' });

		expect(store.getUsableCredentialsForScope(agentScope)?.map((c) => c.id)).toEqual(['kept']);
		expect(store.getUsableCredentialsForScope(workflowScope)).toEqual([]);
		expect(store.getUsableCredentialById('deleted')).toBeUndefined();
	});

	it('applies a rename to every cached scope', async () => {
		const store = useCredentialsStore();
		vi.mocked(credentialsApi.getUsableCredentials).mockResolvedValueOnce([
			makeCredential('renamed', 'Old name'),
		]);
		vi.mocked(credentialsApi.updateCredential).mockResolvedValue(
			makeCredential('renamed', 'New name'),
		);
		await store.fetchUsableCredentials(agentScope);

		await store.updateCredential({
			id: 'renamed',
			data: { id: 'renamed', name: 'New name', type: 'anthropicApi', data: {} },
		});

		expect(store.getUsableCredentialsForScope(agentScope)?.[0].name).toBe('New name');
	});
});
