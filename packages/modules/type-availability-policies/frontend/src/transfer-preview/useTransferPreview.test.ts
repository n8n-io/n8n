import type { PolicyViolation } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { waitAllPromises as flushPromises } from '@n8n/frontend-test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

import { useTransferPreview, type TransferPreviewTarget } from './useTransferPreview';

const mocks = vi.hoisted(() => ({
	fetchWorkflowTransferPreview: vi.fn(),
	fetchFolderTransferPreview: vi.fn(),
	fetchCredentialTransferPreview: vi.fn(),
	isModuleActive: vi.fn(),
}));

vi.mock('../type-availability-policies.api', () => ({
	fetchWorkflowTransferPreview: mocks.fetchWorkflowTransferPreview,
	fetchFolderTransferPreview: mocks.fetchFolderTransferPreview,
	fetchCredentialTransferPreview: mocks.fetchCredentialTransferPreview,
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isModuleActive: mocks.isModuleActive }),
}));

const CONTEXT = { baseUrl: 'http://localhost', pushRef: 'test' };

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: CONTEXT }),
}));

const slackViolation: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'Node type "n8n-nodes-base.slack" is blocked',
	subject: 'n8n-nodes-base.slack',
	subjectType: 'nodeType',
	scope: 'project',
};

const WORKFLOW: TransferPreviewTarget = { resourceType: 'workflow', id: 'wf-1' };
const FOLDER: TransferPreviewTarget = { resourceType: 'folder', id: 'folder-1', projectId: 'p-1' };
const CREDENTIAL: TransferPreviewTarget = { resourceType: 'credential', id: 'cred-1' };

const restrictedSlack = { restricted: [slackViolation], unpublishReasons: [], checkFailed: false };

describe('useTransferPreview', () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mocks.fetchWorkflowTransferPreview
			.mockReset()
			.mockResolvedValue({ restricted: [], unpublishReasons: [], checkFailed: false });
		mocks.fetchFolderTransferPreview.mockReset();
		mocks.fetchCredentialTransferPreview.mockReset();
		mocks.isModuleActive.mockReset().mockReturnValue(true);
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it.each([
		{
			target: WORKFLOW,
			fetch: mocks.fetchWorkflowTransferPreview,
			args: ['wf-1', 'dest-1'],
			response: { restricted: [slackViolation], unpublishReasons: [slackViolation] },
		},
		{
			target: FOLDER,
			fetch: mocks.fetchFolderTransferPreview,
			args: ['p-1', 'folder-1', 'dest-1'],
			response: { restricted: [], workflowsToUnpublish: [{ id: 'wf-1', name: 'Daily report' }] },
		},
		{
			target: CREDENTIAL,
			fetch: mocks.fetchCredentialTransferPreview,
			args: ['cred-1', 'dest-1'],
			response: { restricted: [slackViolation] },
		},
	])(
		'fetches a $target.resourceType preview and fills the fields it lacks',
		async ({ target, fetch, args, response }) => {
			fetch.mockResolvedValue({ ...response, checkFailed: true });

			const { preview } = useTransferPreview(target, 'dest-1');
			await flushPromises();

			expect(fetch).toHaveBeenCalledWith(CONTEXT, ...args);
			expect(preview.value).toEqual({
				unpublishReasons: [],
				workflowsToUnpublish: [],
				...response,
				checkFailed: true,
			});
		},
	);

	it.each([
		['module is not active', false, WORKFLOW, 'dest-1'],
		['module state is unknown', undefined, WORKFLOW, 'dest-1'],
		['target is null', true, null, 'dest-1'],
		['destination is null', true, WORKFLOW, null],
		['destination is undefined', true, WORKFLOW, undefined],
		['destination is empty', true, WORKFLOW, ''],
	])('skips the fetch when the %s', async (_name, moduleActive, target, destination) => {
		mocks.isModuleActive.mockReturnValue(moduleActive);

		const { preview } = useTransferPreview(target, destination);
		await flushPromises();

		expect(mocks.fetchWorkflowTransferPreview).not.toHaveBeenCalled();
		expect(preview.value).toBeNull();
	});

	describe('when the inputs change', () => {
		it('refetches for a new destination and resets the preview meanwhile', async () => {
			const destination = ref<string | null>('dest-1');
			const second = createDeferredPromise<object>();
			mocks.fetchWorkflowTransferPreview
				.mockResolvedValueOnce(restrictedSlack)
				.mockReturnValueOnce(second.promise);

			const { preview } = useTransferPreview(WORKFLOW, destination);
			await flushPromises();
			expect(preview.value?.restricted).toEqual([slackViolation]);

			destination.value = 'dest-2';
			await nextTick();

			expect(preview.value).toBeNull();
			expect(mocks.fetchWorkflowTransferPreview).toHaveBeenLastCalledWith(
				CONTEXT,
				'wf-1',
				'dest-2',
			);

			second.resolve({ restricted: [], unpublishReasons: [], checkFailed: false });
			await flushPromises();
			expect(preview.value?.restricted).toEqual([]);
		});

		it('does not refetch when the target object is recreated with the same values', async () => {
			const target = ref<TransferPreviewTarget | null>({ ...WORKFLOW });

			const { preview } = useTransferPreview(target, 'dest-1');
			await flushPromises();
			const loaded = preview.value;

			target.value = { ...WORKFLOW };
			await flushPromises();

			expect(mocks.fetchWorkflowTransferPreview).toHaveBeenCalledTimes(1);
			expect(preview.value).toBe(loaded);
		});

		it('keeps the latest response when an older request resolves last', async () => {
			const destination = ref<string | null>('dest-1');
			const first = createDeferredPromise<object>();
			const second = createDeferredPromise<object>();
			mocks.fetchWorkflowTransferPreview
				.mockReturnValueOnce(first.promise)
				.mockReturnValueOnce(second.promise);

			const { preview } = useTransferPreview(WORKFLOW, destination);
			await flushPromises();
			destination.value = 'dest-2';
			await flushPromises();

			second.resolve(restrictedSlack);
			await flushPromises();
			first.resolve({ restricted: [], unpublishReasons: [], checkFailed: true });
			await flushPromises();

			expect(preview.value?.restricted).toEqual([slackViolation]);
			expect(preview.value?.checkFailed).toBe(false);
		});

		it('drops a pending response and stops fetching when the inputs are cleared', async () => {
			const destination = ref<string | null>('dest-1');
			const pending = createDeferredPromise<object>();
			mocks.fetchWorkflowTransferPreview.mockReturnValue(pending.promise);

			const { preview } = useTransferPreview(WORKFLOW, destination);
			await flushPromises();
			destination.value = null;
			await flushPromises();

			pending.resolve(restrictedSlack);
			await flushPromises();

			expect(preview.value).toBeNull();
			expect(mocks.fetchWorkflowTransferPreview).toHaveBeenCalledTimes(1);
		});
	});

	it('logs a failed fetch and leaves the preview null', async () => {
		const failure = new Error('network down');
		mocks.fetchWorkflowTransferPreview.mockRejectedValue(failure);

		const { preview } = useTransferPreview(WORKFLOW, 'dest-1');
		await flushPromises();

		expect(preview.value).toBeNull();
		expect(errorSpy).toHaveBeenCalledWith('Failed to fetch the transfer preview', failure);
	});
});
