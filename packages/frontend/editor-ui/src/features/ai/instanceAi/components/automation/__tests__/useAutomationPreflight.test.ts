import { defineComponent, h, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import type { LinkedInstanceTransferPreflight } from '@n8n/api-types';

import { fetchTransferPreflight } from '@/features/linkedInstances/transfer/transfer.api';
import {
	clearAutomationPreflights,
	useAutomationPreflight,
	type AutomationPreflightRequest,
} from '../useAutomationPreflight';

vi.mock('@/features/linkedInstances/transfer/transfer.api', () => ({
	fetchTransferPreflight: vi.fn(),
}));

const preflightMock = vi.mocked(fetchTransferPreflight);
const CLOUD = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const LAB = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';

function preflight(nodes: number): LinkedInstanceTransferPreflight {
	return {
		workflowName: 'Digest builder',
		moves: { nodes },
		nodeTypeCheck: 'unknown',
		missingNodeTypes: [],
		credentials: [],
		targetProject: null,
		subWorkflowCalls: [],
	};
}

const on = (linkId: string, versionId = 'v-1'): AutomationPreflightRequest => ({
	linkId,
	workflowId: 'wf-1',
	versionId,
});

/** Mounts the composable, so that its watcher runs as it does in the card. */
function setup(initial: AutomationPreflightRequest | undefined) {
	const request = ref(initial);
	let result!: ReturnType<typeof useAutomationPreflight>;
	mount(
		defineComponent({
			setup() {
				result = useAutomationPreflight(request);
				return () => h('div');
			},
		}),
	);
	return { request, result };
}

/** The node count of a finished check, or the state of a check without one. */
function nodesOf(check: ReturnType<typeof useAutomationPreflight>['check']['value']) {
	return typeof check === 'string' ? check : check.nodeCount;
}

describe('useAutomationPreflight', () => {
	beforeEach(() => {
		createTestingPinia();
		clearAutomationPreflights();
		preflightMock.mockReset();
	});

	it('stays idle without a link, and checks nothing', () => {
		const { result } = setup(undefined);

		expect(result.check.value).toBe('idle');
		expect(preflightMock).not.toHaveBeenCalled();
	});

	it('keeps only the answer of the latest link when the user changes it during a check', async () => {
		let answerCloud!: (value: LinkedInstanceTransferPreflight) => void;
		preflightMock.mockImplementation(async (_context, linkId) =>
			linkId === CLOUD ? await new Promise((resolve) => (answerCloud = resolve)) : preflight(5),
		);
		const { request, result } = setup(on(CLOUD));

		request.value = on(LAB);
		await flushPromises();
		answerCloud(preflight(1));
		await flushPromises();

		expect(nodesOf(result.check.value)).toBe(5);
	});

	it('goes back to idle when the link goes away, and drops the late answer', async () => {
		let answer!: (value: LinkedInstanceTransferPreflight) => void;
		preflightMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		const { request, result } = setup(on(CLOUD));
		expect(result.check.value).toBe('checking');

		request.value = undefined;
		await nextTick();
		answer(preflight(1));
		await flushPromises();

		expect(result.check.value).toBe('idle');
	});

	it('checks a new version of the workflow again, and asks again on request', async () => {
		preflightMock.mockResolvedValueOnce(preflight(1)).mockResolvedValueOnce(preflight(2));
		preflightMock.mockResolvedValueOnce(preflight(3));
		const { request, result } = setup(on(CLOUD));
		await flushPromises();

		request.value = on(CLOUD, 'v-2');
		await flushPromises();
		expect(nodesOf(result.check.value)).toBe(2);

		result.recheck();
		await flushPromises();
		expect(nodesOf(result.check.value)).toBe(3);
		expect(preflightMock).toHaveBeenCalledTimes(3);
	});

	it('reuses a finished check of the same version, but not a failed one', async () => {
		preflightMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(preflight(4));
		const first = setup(on(CLOUD));
		await flushPromises();
		expect(first.result.check.value).toBe('failed');

		const second = setup(on(CLOUD));
		await flushPromises();
		const third = setup(on(CLOUD));

		expect(nodesOf(second.result.check.value)).toBe(4);
		expect(nodesOf(third.result.check.value)).toBe(4);
		expect(preflightMock).toHaveBeenCalledTimes(2);
	});
});
