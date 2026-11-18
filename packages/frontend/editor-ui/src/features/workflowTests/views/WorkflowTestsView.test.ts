import type { WorkflowTestFile } from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import * as api from '../workflowTests.api';
import { useWorkflowTestsStore } from '../workflowTests.store';
import WorkflowTestsView from './WorkflowTestsView.vue';

const revealLine = vi.fn();

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener: () => () => {} }),
}));

vi.mock('../workflowTests.api');

vi.mock('../useWorkflowTestsAssistant', () => ({
	useWorkflowTestsAssistant: () => ({
		available: ref(false),
		subject: ref(null),
		launch: ref({}),
	}),
}));

vi.mock('@/features/shared/editors/components/JsEditor/JsEditor.vue', () => ({
	default: defineComponent({
		props: { modelValue: { type: String, default: '' } },
		emits: ['update:modelValue'],
		setup(props, { emit, expose }) {
			expose({ revealLine });
			return () =>
				h('textarea', {
					'aria-label': 'editor',
					value: props.modelValue,
					onInput: (event: Event) =>
						emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
				});
		},
	}),
}));

vi.mock('../components/WorkflowTestsCanvas.vue', () => ({
	default: defineComponent({
		props: { rows: { type: Array<{ fullName: string }>, required: true } },
		emits: ['showInCode'],
		setup(props, { emit }) {
			return () =>
				h('button', { 'aria-label': 'canvas', onClick: () => emit('showInCode', 7) }, [
					props.rows.map((row) => row.fullName).join(', '),
				]);
		},
	}),
}));

const file: WorkflowTestFile = {
	id: 'file-1',
	workflowId: 'wf-1',
	source:
		"describe('orders', () => {\n\ttest('accepts', () => {});\n\ttest('rejects', () => {});\n});",
	updatedAt: '2026-01-01T00:00:00.000Z',
	lastRun: {
		runId: 'run-1',
		status: 'failed',
		tests: [
			{ name: 'orders > accepts', status: 'passed', durationMs: 12 },
			{
				name: 'orders > rejects',
				status: 'failed',
				durationMs: 40,
				error: { message: 'expected 1 to be 2', code: 'NODE_FAILED' },
			},
		],
		errors: [],
		finishedAt: '2026-01-01T00:00:00.000Z',
	},
};

const renderView = createComponentRenderer(WorkflowTestsView, { props: { workflowId: 'wf-1' } });

describe('WorkflowTestsView', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createPinia();
		setActivePinia(pinia);
		useRBACStore().setGlobalScopes(['workflow:execute']);
		vi.mocked(api.getWorkflowTests).mockResolvedValue([file]);
		vi.mocked(api.saveWorkflowTests).mockImplementation(async (_context, _id, source) => ({
			...file,
			source,
			lastRun: null,
		}));
		vi.mocked(api.runWorkflowTests).mockResolvedValue({ runId: 'run-2' });
	});

	it('shows the empty state, and the editor after the user starts to write', async () => {
		vi.mocked(api.getWorkflowTests).mockResolvedValue([]);
		const { findByRole, getByLabelText, getByRole, queryByText } = renderView({ pinia });

		await userEvent.click(await findByRole('button', { name: 'Write tests' }));

		expect(queryByText('No tests yet')).not.toBeInTheDocument();
		expect(getByLabelText('editor')).toBeVisible();
		expect(getByRole('button', { name: 'Run all' })).toBeDisabled();
	});

	it('shows the last run, and the selected test on the workflow', async () => {
		const { findByText, getByLabelText, getByText } = renderView({ pinia });

		expect(await findByText('1 of 2 tests failed')).toBeVisible();
		expect(getByText('expected 1 to be 2')).toBeVisible();
		expect(getByLabelText('canvas')).toHaveTextContent('orders > accepts, orders > rejects');

		await userEvent.click(getByText('accepts'));

		expect(getByLabelText('canvas')).toHaveTextContent(/^orders > accepts$/);
	});

	it('reveals the selected test, and the line of a mark, in the code', async () => {
		const { findByText, getByLabelText, getByText } = renderView({ pinia });

		await userEvent.click(await findByText('accepts'));
		await userEvent.click(getByText('Code'));
		await waitFor(() => expect(revealLine).toHaveBeenLastCalledWith(2));

		await userEvent.click(getByText('Workflow'));
		await userEvent.click(getByLabelText('canvas'));

		await waitFor(() => expect(revealLine).toHaveBeenLastCalledWith(7));
		expect(getByLabelText('editor')).toBeVisible();
	});

	it('shows the code of a file that the store already holds', async () => {
		useWorkflowTestsStore().files['wf-1'] = file;
		const { findByText, getByLabelText, getByRole } = renderView({ pinia });

		await userEvent.click(await findByText('Code'));

		expect(getByLabelText('editor')).toHaveValue(file.source);
		expect(getByRole('button', { name: 'Run all' })).toBeEnabled();
	});

	it('saves the edited file before it runs the tests', async () => {
		const { findByText, getByLabelText, getByRole } = renderView({ pinia });

		await userEvent.click(await findByText('Code'));
		await userEvent.type(getByLabelText('editor'), '// edit');
		await userEvent.click(getByRole('button', { name: 'Save and run' }));

		await waitFor(() => expect(api.runWorkflowTests).toHaveBeenCalled());
		expect(vi.mocked(api.saveWorkflowTests).mock.calls[0][2]).toBe(`${file.source}// edit`);
	});

	it('tells a user without the permission why the tests cannot run', async () => {
		useRBACStore().setGlobalScopes([]);
		const { findByText, getByRole } = renderView({ pinia });

		expect(await findByText('Only owners and admins can run tests')).toBeVisible();
		expect(getByRole('button', { name: 'Run all' })).toBeDisabled();
	});
});
