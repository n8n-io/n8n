import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import { INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS } from '../../constants';

const mocks = vi.hoisted(() => ({
	openWithSeed: vi.fn(),
	isOpen: false,
	activeThreadId: null as string | null,
	isStreaming: false,
	isSendingMessage: false,
	instanceAiAvailable: true,
}));

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => mocks.instanceAiAvailable),
}));

vi.mock('../../instanceAiPanel.store', () => ({
	useInstanceAiPanelStore: () => ({
		get isOpen() {
			return mocks.isOpen;
		},
		get activeThreadId() {
			return mocks.activeThreadId;
		},
		openWithSeed: mocks.openWithSeed,
	}),
}));

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		getRuntime: () => undefined,
	}),
}));

import {
	resetInstanceAiProactiveOfferStateForTests,
	useInstanceAiProactiveOffer,
} from '../useInstanceAiProactiveOffer';
import {
	summarizeFailedExecution,
	useInstanceAiExecutionErrorOffer,
	type FailedExecutionSummary,
} from '../useInstanceAiExecutionErrorOffer';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

const failedRun: FailedExecutionSummary = {
	executionId: '4711',
	status: 'error',
	workflowId: 'wf-1',
	workflowName: 'Daily sync',
	nodeName: 'HTTP Request',
	nodeType: 'n8n-nodes-base.httpRequest',
	errorMessage: 'Connection refused',
};

function makeExecution(
	overrides: Partial<IExecutionResponse> &
		Pick<IExecutionResponse, 'id' | 'status'> & {
			lastNodeExecuted?: string;
			errorMessage?: string;
		},
): IExecutionResponse {
	const nodeName = overrides.lastNodeExecuted ?? 'HTTP Request';
	return {
		id: overrides.id,
		status: overrides.status,
		finished: true,
		mode: 'manual',
		startedAt: new Date(),
		createdAt: new Date(),
		workflowData: {
			id: 'wf-1',
			name: 'Daily sync',
			active: false,
			isArchived: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			nodes: [
				{
					name: nodeName,
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					id: 'n1',
				},
			],
			connections: {},
			settings: {},
			versionId: 'v1',
		},
		data: {
			resultData: {
				runData: {},
				lastNodeExecuted: overrides.lastNodeExecuted,
				error: overrides.errorMessage ? ({ message: overrides.errorMessage } as never) : undefined,
			},
		},
		...overrides,
	};
}

describe('summarizeFailedExecution', () => {
	it('summarises error and crashed runs', () => {
		expect(
			summarizeFailedExecution(
				makeExecution({
					id: '4711',
					status: 'error',
					lastNodeExecuted: 'HTTP Request',
					errorMessage: 'Connection refused',
				}),
			),
		).toEqual(failedRun);

		expect(summarizeFailedExecution(makeExecution({ id: '9', status: 'crashed' }))?.status).toBe(
			'crashed',
		);
	});

	it('returns null for success, canceled, or missing runs', () => {
		expect(summarizeFailedExecution(null)).toBeNull();
		expect(summarizeFailedExecution(makeExecution({ id: '1', status: 'success' }))).toBeNull();
		expect(summarizeFailedExecution(makeExecution({ id: '1', status: 'canceled' }))).toBeNull();
	});
});

describe('useInstanceAiExecutionErrorOffer', () => {
	let scope: EffectScope;

	function watchExecution(source: Ref<FailedExecutionSummary | null>) {
		scope = effectScope();
		scope.run(() => useInstanceAiExecutionErrorOffer(source));
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		localStorage.clear();
		mocks.isOpen = false;
		mocks.instanceAiAvailable = true;
		resetInstanceAiProactiveOfferStateForTests();
	});

	afterEach(() => {
		scope?.stop();
	});

	it('offers to explain a failed execution once the user has settled on it', () => {
		watchExecution(ref<FailedExecutionSummary | null>(failedRun));
		const { activeOffer } = useInstanceAiProactiveOffer();

		expect(activeOffer.value).toBeNull();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toMatchObject({
			key: 'execution-error:4711',
			source: 'proactive_offer',
			// Carries the executionId so the agent reads the run itself.
			attachments: [{ type: 'workflow', id: 'wf-1', name: 'Daily sync', executionId: '4711' }],
		});
		expect(activeOffer.value?.message).toContain('workflow: Daily sync (id: wf-1)');
		expect(activeOffer.value?.message).toContain('execution: 4711 (status: error)');
		expect(activeOffer.value?.message).toContain(
			'failed node: HTTP Request (n8n-nodes-base.httpRequest)',
		);
		expect(activeOffer.value?.message).toContain('message: Connection refused');
	});

	it('stays quiet for an execution that did not fail', () => {
		watchExecution(ref<FailedExecutionSummary | null>(null));
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('raises nothing while the user clicks through several failed executions', async () => {
		const source = ref<FailedExecutionSummary | null>(failedRun);
		watchExecution(source);
		const { activeOffer } = useInstanceAiProactiveOffer();

		for (const executionId of ['4712', '4713']) {
			vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS - 500);
			source.value = { ...failedRun, executionId };
			await nextTick();
			expect(activeOffer.value).toBeNull();
		}

		// Only the run they stopped on gets offered.
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value?.key).toBe('execution-error:4713');
	});

	it('does not offer again when the same execution is reopened', async () => {
		const source = ref<FailedExecutionSummary | null>(failedRun);
		watchExecution(source);
		const { activeOffer, clear } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).not.toBeNull();
		clear();

		source.value = null;
		await nextTick();
		source.value = { ...failedRun };
		await nextTick();
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('uses the same title when the run failed before any node reported', () => {
		watchExecution(
			ref<FailedExecutionSummary | null>({ ...failedRun, nodeName: '', nodeType: '' }),
		);
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value?.title).toBe(
			useI18n().baseText('instanceAi.proactiveOffer.executionError.title'),
		);
	});
});
