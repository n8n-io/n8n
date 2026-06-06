import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import TestCaseForm from './TestCaseForm.vue';
import { nodeViewEventBus } from '@/app/event-bus';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';

type MockNode = { name: string; type: string; disabled?: boolean };

const { mocks } = vi.hoisted(() => ({
	mocks: {
		allNodes: [] as MockNode[],
		runEntireWorkflow: vi.fn(),
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get allNodes() {
				return mocks.allNodes;
			},
		},
	}),
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({}),
}));

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({ runEntireWorkflow: mocks.runEntireWorkflow }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const SLICE_INPUTS = { fieldNames: [], values: {}, hasExecution: false } as const;

const renderComponent = createComponentRenderer(TestCaseForm, {
	props: { sliceInputs: SLICE_INPUTS },
});

describe('TestCaseForm run-workflow button', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		mocks.allNodes = [];
		mocks.runEntireWorkflow.mockReset();
		vi.restoreAllMocks();
	});

	it('runs the workflow directly when there is no chat trigger', async () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		mocks.allNodes = [{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }];

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-run-workflow'));

		expect(mocks.runEntireWorkflow).toHaveBeenCalledWith('main');
		expect(emitSpy).not.toHaveBeenCalledWith('openChat');
	});

	it('opens the chat panel instead of executing for chat-trigger workflows', async () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		mocks.allNodes = [{ name: 'When chat message received', type: CHAT_TRIGGER_NODE_TYPE }];

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-run-workflow'));

		expect(emitSpy).toHaveBeenCalledWith('openChat');
		expect(mocks.runEntireWorkflow).not.toHaveBeenCalled();
	});

	it('ignores a disabled chat trigger and runs the workflow', async () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		mocks.allNodes = [
			{ name: 'When chat message received', type: CHAT_TRIGGER_NODE_TYPE, disabled: true },
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
		];

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-run-workflow'));

		expect(mocks.runEntireWorkflow).toHaveBeenCalledWith('main');
		expect(emitSpy).not.toHaveBeenCalledWith('openChat');
	});
});
