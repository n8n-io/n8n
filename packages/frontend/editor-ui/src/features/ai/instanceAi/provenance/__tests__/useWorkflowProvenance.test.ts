import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope, type Ref } from 'vue';
import type { InstanceAiWorkflowProvenance } from '@n8n/api-types';
import { NO_NETWORK_ERROR_CODE, ResponseError } from '@n8n/rest-api-client';
import { clearWorkflowProvenanceCache, useWorkflowProvenance } from '../useWorkflowProvenance';

const { fetchWorkflowProvenance, currentUser } = vi.hoisted(() => ({
	fetchWorkflowProvenance: vi.fn(),
	currentUser: { id: 'user-1' as string | null },
}));

vi.mock('../provenance.api', () => ({ fetchWorkflowProvenance }));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({
		get currentUserId() {
			return currentUser.id;
		},
	}),
}));

const flushPromises = async () => await new Promise(setImmediate);

function makeRecord(
	overrides: Partial<InstanceAiWorkflowProvenance> = {},
): InstanceAiWorkflowProvenance {
	return {
		workflowId: 'wf-1',
		threadId: 'thread-1',
		createdAt: '2026-10-01T09:30:00.000Z',
		canOpenThread: true,
		...overrides,
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

// The watcher lives as long as its scope, so each instance gets a scope that
// the next test cannot see.
let scopes: EffectScope[] = [];

function mount(workflowId: Ref<string> | string = 'wf-1', enabled: Ref<boolean> | boolean = true) {
	const scope = effectScope();
	scopes.push(scope);
	const instance = scope.run(() => useWorkflowProvenance(workflowId, enabled));
	if (!instance) throw new Error('effect scope did not run');
	return instance;
}

describe('useWorkflowProvenance', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearWorkflowProvenanceCache();
		currentUser.id = 'user-1';
	});

	afterEach(() => {
		scopes.forEach((scope) => scope.stop());
		scopes = [];
	});

	it('exposes the record of a workflow the Assistant built', async () => {
		const record = makeRecord();
		fetchWorkflowProvenance.mockResolvedValue(record);

		const { provenance } = mount('wf-1');
		expect(provenance.value).toBeNull();
		await flushPromises();

		expect(fetchWorkflowProvenance).toHaveBeenCalledWith(expect.anything(), 'wf-1');
		expect(provenance.value).toEqual(record);
	});

	it('exposes null when the Assistant did not build the workflow', async () => {
		fetchWorkflowProvenance.mockResolvedValue(null);

		const { provenance } = mount('wf-1');
		await flushPromises();

		expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(1);
		expect(provenance.value).toBeNull();
	});

	describe('session cache', () => {
		it('opens a workflow again without a second request once a record is found', async () => {
			fetchWorkflowProvenance.mockResolvedValue(makeRecord());

			mount('wf-1');
			await flushPromises();
			const { provenance } = mount('wf-1');

			// The cached record is there at once, with no loading gap.
			expect(provenance.value).toEqual(makeRecord());
			await flushPromises();
			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(1);
		});

		it('asks again on the next open when the workflow had no record, so a later build shows', async () => {
			fetchWorkflowProvenance.mockResolvedValueOnce(null).mockResolvedValueOnce(makeRecord());

			const first = mount('wf-1');
			await flushPromises();
			expect(first.provenance.value).toBeNull();

			const second = mount('wf-1');
			await flushPromises();

			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(2);
			expect(second.provenance.value).toEqual(makeRecord());
		});

		it('shares one request between headers that open the same workflow together', async () => {
			const pending = deferred<InstanceAiWorkflowProvenance | null>();
			fetchWorkflowProvenance.mockReturnValue(pending.promise);

			const first = mount('wf-1');
			const second = mount('wf-1');
			pending.resolve(makeRecord());
			await flushPromises();

			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(1);
			expect(first.provenance.value).toEqual(makeRecord());
			expect(second.provenance.value).toEqual(makeRecord());
		});

		it('keeps records apart for each workflow', async () => {
			fetchWorkflowProvenance.mockImplementation(
				async (_context: unknown, workflowId: string) =>
					await Promise.resolve(makeRecord({ workflowId, threadId: `thread-of-${workflowId}` })),
			);

			const first = mount('wf-1');
			const second = mount('wf-2');
			await flushPromises();

			expect(first.provenance.value?.threadId).toBe('thread-of-wf-1');
			expect(second.provenance.value?.threadId).toBe('thread-of-wf-2');
			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(2);
		});

		it('asks again after a different user signs in, because chat access depends on the viewer', async () => {
			fetchWorkflowProvenance
				.mockResolvedValueOnce(makeRecord({ canOpenThread: true }))
				.mockResolvedValueOnce(makeRecord({ canOpenThread: false }));

			mount('wf-1');
			await flushPromises();

			currentUser.id = 'user-2';
			const { provenance } = mount('wf-1');
			await flushPromises();

			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(2);
			expect(provenance.value?.canOpenThread).toBe(false);
		});

		it('does not keep a record that arrives after the cache is cleared', async () => {
			const pending = deferred<InstanceAiWorkflowProvenance | null>();
			fetchWorkflowProvenance.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(null);

			mount('wf-1');
			clearWorkflowProvenanceCache();
			pending.resolve(makeRecord());
			await flushPromises();

			const { provenance } = mount('wf-1');
			await flushPromises();

			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(2);
			expect(provenance.value).toBeNull();
		});

		it('keeps sharing the newer request when an older one ends after a cache clear', async () => {
			const older = deferred<InstanceAiWorkflowProvenance | null>();
			const newer = deferred<InstanceAiWorkflowProvenance | null>();
			fetchWorkflowProvenance.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

			mount('wf-1');
			clearWorkflowProvenanceCache();
			const second = mount('wf-1');
			older.resolve(null);
			await flushPromises();

			const third = mount('wf-1');
			newer.resolve(makeRecord());
			await flushPromises();

			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(2);
			expect(second.provenance.value).toEqual(makeRecord());
			expect(third.provenance.value).toEqual(makeRecord());
		});
	});

	describe('failures', () => {
		it.each([
			[
				'the workflow is missing or not readable (404)',
				new ResponseError('gone', { httpStatusCode: 404 }),
			],
			[
				'the Assistant is off or not allowed (403)',
				new ResponseError('no', { httpStatusCode: 403 }),
			],
			['the server fails (500)', new ResponseError('boom', { httpStatusCode: 500 })],
			['the network is down', new ResponseError('offline', { errorCode: NO_NETWORK_ERROR_CODE })],
			['the response has an unknown shape', new Error('invalid response')],
		])('exposes null when %s', async (_case, error) => {
			fetchWorkflowProvenance.mockRejectedValue(error);

			const { provenance } = mount('wf-1');
			await flushPromises();

			expect(provenance.value).toBeNull();
		});

		it('asks again on the next open after a failure', async () => {
			fetchWorkflowProvenance
				.mockRejectedValueOnce(new ResponseError('offline', { errorCode: NO_NETWORK_ERROR_CODE }))
				.mockResolvedValueOnce(makeRecord());

			mount('wf-1');
			await flushPromises();
			const { provenance } = mount('wf-1');
			await flushPromises();

			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(2);
			expect(provenance.value).toEqual(makeRecord());
		});

		it('gives every header that shared a failed request null', async () => {
			const pending = deferred<InstanceAiWorkflowProvenance | null>();
			fetchWorkflowProvenance.mockReturnValue(pending.promise);

			const first = mount('wf-1');
			const second = mount('wf-1');
			pending.reject(new ResponseError('gone', { httpStatusCode: 404 }));
			await flushPromises();

			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(1);
			expect(first.provenance.value).toBeNull();
			expect(second.provenance.value).toBeNull();
		});
	});

	describe('when to ask', () => {
		it('sends no request while disabled', async () => {
			const { provenance } = mount('wf-1', false);
			await flushPromises();

			expect(fetchWorkflowProvenance).not.toHaveBeenCalled();
			expect(provenance.value).toBeNull();
		});

		it('sends no request for an empty workflow id', async () => {
			mount('');
			await flushPromises();

			expect(fetchWorkflowProvenance).not.toHaveBeenCalled();
		});

		it('asks once the gate opens and hides the record when it closes', async () => {
			fetchWorkflowProvenance.mockResolvedValue(makeRecord());
			const enabled = ref(false);

			const { provenance } = mount('wf-1', enabled);
			await flushPromises();
			expect(fetchWorkflowProvenance).not.toHaveBeenCalled();

			enabled.value = true;
			await flushPromises();
			expect(provenance.value).toEqual(makeRecord());

			enabled.value = false;
			await flushPromises();
			expect(provenance.value).toBeNull();
			expect(fetchWorkflowProvenance).toHaveBeenCalledTimes(1);
		});

		it('clears the previous record at once when the workflow changes', async () => {
			const pending = deferred<InstanceAiWorkflowProvenance | null>();
			fetchWorkflowProvenance
				.mockResolvedValueOnce(makeRecord())
				.mockReturnValueOnce(pending.promise);
			const workflowId = ref('wf-1');

			const { provenance } = mount(workflowId);
			await flushPromises();
			expect(provenance.value?.workflowId).toBe('wf-1');

			workflowId.value = 'wf-2';
			await flushPromises();

			// Workflow 2 must not show the badge of workflow 1 while its request runs.
			expect(provenance.value).toBeNull();
			pending.resolve(null);
			await flushPromises();
			expect(provenance.value).toBeNull();
		});

		it('ignores a slow answer for a workflow that is no longer open', async () => {
			const slow = deferred<InstanceAiWorkflowProvenance | null>();
			fetchWorkflowProvenance
				.mockReturnValueOnce(slow.promise)
				.mockResolvedValueOnce(makeRecord({ workflowId: 'wf-2', threadId: 'thread-2' }));
			const workflowId = ref('wf-1');

			const { provenance } = mount(workflowId);
			workflowId.value = 'wf-2';
			await flushPromises();
			expect(provenance.value?.threadId).toBe('thread-2');

			slow.resolve(makeRecord({ workflowId: 'wf-1', threadId: 'thread-1' }));
			await flushPromises();

			expect(provenance.value?.threadId).toBe('thread-2');
		});

		it('ignores a slow answer that arrives after the gate closed', async () => {
			const slow = deferred<InstanceAiWorkflowProvenance | null>();
			fetchWorkflowProvenance.mockReturnValueOnce(slow.promise);
			const enabled = ref(true);

			const { provenance } = mount('wf-1', enabled);
			enabled.value = false;
			await flushPromises();
			slow.resolve(makeRecord());
			await flushPromises();

			expect(provenance.value).toBeNull();
		});
	});
});
