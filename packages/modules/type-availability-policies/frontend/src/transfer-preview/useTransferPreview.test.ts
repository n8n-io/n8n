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

describe('useTransferPreview', () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mocks.fetchWorkflowTransferPreview.mockReset().mockResolvedValue({
			restricted: [],
			unpublishReasons: [],
			checkFailed: false,
		});
		mocks.fetchFolderTransferPreview.mockReset().mockResolvedValue({
			restricted: [],
			workflowsToUnpublish: [],
			checkFailed: false,
		});
		mocks.fetchCredentialTransferPreview.mockReset().mockResolvedValue({
			restricted: [],
			checkFailed: false,
		});
		mocks.isModuleActive.mockReset().mockReturnValue(true);
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it('fetches a workflow preview and fills the missing folder field', async () => {
		mocks.fetchWorkflowTransferPreview.mockResolvedValue({
			restricted: [slackViolation],
			unpublishReasons: [slackViolation],
			checkFailed: false,
		});

		const { preview } = useTransferPreview(WORKFLOW, 'dest-1');
		await flushPromises();

		expect(mocks.fetchWorkflowTransferPreview).toHaveBeenCalledWith(CONTEXT, 'wf-1', 'dest-1');
		expect(preview.value).toEqual({
			restricted: [slackViolation],
			unpublishReasons: [slackViolation],
			workflowsToUnpublish: [],
			checkFailed: false,
		});
	});

	it('fetches a folder preview from the folder project and fills the missing workflow field', async () => {
		const workflowsToUnpublish = [{ id: 'wf-1', name: 'Daily report' }];
		mocks.fetchFolderTransferPreview.mockResolvedValue({
			restricted: [],
			workflowsToUnpublish,
			checkFailed: true,
		});

		const { preview } = useTransferPreview(FOLDER, 'dest-1');
		await flushPromises();

		expect(mocks.fetchFolderTransferPreview).toHaveBeenCalledWith(
			CONTEXT,
			'p-1',
			'folder-1',
			'dest-1',
		);
		expect(preview.value).toEqual({
			restricted: [],
			unpublishReasons: [],
			workflowsToUnpublish,
			checkFailed: true,
		});
	});

	it('fetches a credential preview and fills both missing unpublish fields', async () => {
		mocks.fetchCredentialTransferPreview.mockResolvedValue({
			restricted: [slackViolation],
			checkFailed: false,
		});

		const { preview } = useTransferPreview(CREDENTIAL, 'dest-1');
		await flushPromises();

		expect(mocks.fetchCredentialTransferPreview).toHaveBeenCalledWith(CONTEXT, 'cred-1', 'dest-1');
		expect(preview.value).toEqual({
			restricted: [slackViolation],
			unpublishReasons: [],
			workflowsToUnpublish: [],
			checkFailed: false,
		});
	});

	it('stays null while the request is pending', async () => {
		const pending = createDeferredPromise<{
			restricted: PolicyViolation[];
			unpublishReasons: PolicyViolation[];
			checkFailed: boolean;
		}>();
		mocks.fetchWorkflowTransferPreview.mockReturnValue(pending.promise);

		const { preview } = useTransferPreview(WORKFLOW, 'dest-1');
		await flushPromises();
		expect(preview.value).toBeNull();

		pending.resolve({ restricted: [], unpublishReasons: [], checkFailed: false });
		await flushPromises();
		expect(preview.value).not.toBeNull();
	});

	describe('when nothing should be fetched', () => {
		it('skips the fetch when the module is not active', async () => {
			mocks.isModuleActive.mockReturnValue(false);

			const { preview } = useTransferPreview(WORKFLOW, 'dest-1');
			await flushPromises();

			expect(mocks.fetchWorkflowTransferPreview).not.toHaveBeenCalled();
			expect(preview.value).toBeNull();
		});

		it('skips the fetch when the module state is unknown', async () => {
			mocks.isModuleActive.mockReturnValue(undefined);

			const { preview } = useTransferPreview(WORKFLOW, 'dest-1');
			await flushPromises();

			expect(mocks.fetchWorkflowTransferPreview).not.toHaveBeenCalled();
			expect(preview.value).toBeNull();
		});

		it.each([
			['target is null', null, 'dest-1'],
			['destination is null', WORKFLOW, null],
			['destination is undefined', WORKFLOW, undefined],
			['destination is empty', WORKFLOW, ''],
		])('skips the fetch when the %s', async (_name, target, destination) => {
			const { preview } = useTransferPreview(target, destination);
			await flushPromises();

			expect(mocks.fetchWorkflowTransferPreview).not.toHaveBeenCalled();
			expect(preview.value).toBeNull();
		});
	});

	describe('when the inputs change', () => {
		it('refetches for a new destination and resets the preview meanwhile', async () => {
			const destination = ref<string | null>('dest-1');
			const second = createDeferredPromise<{
				restricted: PolicyViolation[];
				unpublishReasons: PolicyViolation[];
				checkFailed: boolean;
			}>();
			mocks.fetchWorkflowTransferPreview
				.mockResolvedValueOnce({
					restricted: [slackViolation],
					unpublishReasons: [],
					checkFailed: false,
				})
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

		it('refetches for a new target', async () => {
			const target = ref<TransferPreviewTarget | null>(WORKFLOW);

			useTransferPreview(target, 'dest-1');
			await flushPromises();

			target.value = { resourceType: 'workflow', id: 'wf-2' };
			await flushPromises();

			expect(mocks.fetchWorkflowTransferPreview).toHaveBeenCalledTimes(2);
			expect(mocks.fetchWorkflowTransferPreview).toHaveBeenLastCalledWith(
				CONTEXT,
				'wf-2',
				'dest-1',
			);
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

		it('resets the preview and stops fetching when the destination is cleared', async () => {
			const destination = ref<string | null>('dest-1');

			const { preview } = useTransferPreview(WORKFLOW, destination);
			await flushPromises();
			expect(preview.value).not.toBeNull();

			destination.value = null;
			await flushPromises();

			expect(preview.value).toBeNull();
			expect(mocks.fetchWorkflowTransferPreview).toHaveBeenCalledTimes(1);
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

			second.resolve({ restricted: [slackViolation], unpublishReasons: [], checkFailed: false });
			await flushPromises();
			first.resolve({ restricted: [], unpublishReasons: [], checkFailed: true });
			await flushPromises();

			expect(preview.value?.restricted).toEqual([slackViolation]);
			expect(preview.value?.checkFailed).toBe(false);
		});

		it('drops a pending response when the inputs are cleared', async () => {
			const destination = ref<string | null>('dest-1');
			const pending = createDeferredPromise<object>();
			mocks.fetchWorkflowTransferPreview.mockReturnValue(pending.promise);

			const { preview } = useTransferPreview(WORKFLOW, destination);
			await flushPromises();
			destination.value = null;
			await flushPromises();

			pending.resolve({ restricted: [slackViolation], unpublishReasons: [], checkFailed: false });
			await flushPromises();

			expect(preview.value).toBeNull();
		});
	});

	describe('when the fetch fails', () => {
		it('logs the error and leaves the preview null', async () => {
			const failure = new Error('network down');
			mocks.fetchWorkflowTransferPreview.mockRejectedValue(failure);

			const { preview } = useTransferPreview(WORKFLOW, 'dest-1');
			await flushPromises();

			expect(preview.value).toBeNull();
			expect(errorSpy).toHaveBeenCalledWith('Failed to fetch the transfer preview', failure);
		});

		it('recovers on the next input change', async () => {
			const destination = ref<string | null>('dest-1');
			mocks.fetchWorkflowTransferPreview
				.mockRejectedValueOnce(new Error('network down'))
				.mockResolvedValueOnce({
					restricted: [slackViolation],
					unpublishReasons: [],
					checkFailed: false,
				});

			const { preview } = useTransferPreview(WORKFLOW, destination);
			await flushPromises();
			destination.value = 'dest-2';
			await flushPromises();

			expect(preview.value?.restricted).toEqual([slackViolation]);
		});
	});
});
