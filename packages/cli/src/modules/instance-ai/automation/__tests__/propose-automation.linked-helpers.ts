import type { LinkedInstancePushResult, LinkedInstanceSummary } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { LinkedInstanceStore } from '@/modules/linked-instances/linked-instance.store';
import { TransferLocalWorkflows } from '@/modules/linked-instances/transfer/transfer-local-workflows';
import { TransferService } from '@/modules/linked-instances/transfer/transfer.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/**
 * The linked instances of the acting user, on mocks that the automation placement loads from
 * the container. A test file that uses them stubs the store and the transfer service with
 * `vi.mock`, so that the large import graph of the transfer stays out of the test. The checks of
 * the workflows here are the real ones of the move, on the finder of the test.
 */

export const CLOUD_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
export const OFFLINE_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';

export function linkSummary(overrides: Partial<LinkedInstanceSummary> = {}): LinkedInstanceSummary {
	return {
		id: CLOUD_ID,
		name: 'Team cloud',
		baseUrl: 'https://cloud.example.test',
		status: 'online',
		lastVerifiedAt: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		defaultRemoteProject: null,
		...overrides,
	};
}

/** An online cloud and an offline lab instance. */
export const USER_LINKS: LinkedInstanceSummary[] = [
	linkSummary(),
	linkSummary({
		id: OFFLINE_ID,
		name: 'Lab',
		status: 'offline',
		baseUrl: 'https://lab.example.test',
	}),
];

export function pushResult(
	overrides: Partial<LinkedInstancePushResult> = {},
): LinkedInstancePushResult {
	return {
		remoteWorkflowId: 'remote-9',
		remoteUrl: 'https://cloud.example.test/workflow/remote-9',
		targetProject: null,
		created: true,
		published: false,
		publishFailed: false,
		credentialsNeedingSetup: [],
		missingNodeTypes: [],
		localDeactivated: false,
		warnings: [],
		...overrides,
	};
}

export function createLinkedWorld(finder: ReturnType<typeof mock<WorkflowFinderService>>) {
	const store = mock<LinkedInstanceStore>();
	const transfer = mock<TransferService>();
	Container.set(LinkedInstanceStore, store);
	Container.set(TransferService, transfer);
	Container.set(TransferLocalWorkflows, new TransferLocalWorkflows(finder, mock(), mock(), mock()));

	/**
	 * Call after `vi.resetAllMocks`. The push puts the copy live when it is asked to, and then turns
	 * off the workflow here when it is asked to.
	 */
	const reset = (links: LinkedInstanceSummary[] = USER_LINKS) => {
		// The move names each workflow that the workflow calls by ID. The user can read none.
		finder.findWorkflowsByIdsForUser.mockResolvedValue([]);
		store.listForUser.mockResolvedValue(links);
		store.getForUser.mockImplementation(
			async (_userId, id) => links.find((link) => link.id === id) ?? null,
		);
		transfer.push.mockImplementation(async (_user, _linkId, input) => {
			const published = input.publish === true;
			return pushResult({
				published,
				localDeactivated: published && input.deactivateLocal === true,
			});
		});
	};

	return { store, transfer, reset };
}
