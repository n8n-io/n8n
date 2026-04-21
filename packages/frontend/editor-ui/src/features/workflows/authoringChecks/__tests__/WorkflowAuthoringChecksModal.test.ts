import type { WorkflowCheckResult } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import WorkflowAuthoringChecksModal from '@/features/workflows/authoringChecks/components/WorkflowAuthoringChecksModal.vue';

const ModalStub = {
	props: ['title'],
	template: `
		<div role="dialog">
			<h2 data-test-id="modal-title">{{ title }}</h2>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const renderComponent = createComponentRenderer(WorkflowAuthoringChecksModal, {
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

function renderWithResults(results: WorkflowCheckResult[], onConfirm?: () => void) {
	return renderComponent({
		pinia: createTestingPinia(),
		props: {
			data: {
				results,
				onConfirm,
			},
		},
	});
}

const warningResult: WorkflowCheckResult = {
	checkInstanceId: 'ai-agent-requires-guardrail',
	type: 'node-has-direct-parent',
	name: 'AI Agent requires Guardrails',
	severity: 'warning',
	violations: [
		{ message: 'Agent "Agent 1" has no Guardrails node connected.', nodeIds: ['node-a'] },
	],
};

const blockingResult: WorkflowCheckResult = {
	checkInstanceId: 'some-blocking-check',
	type: 'node-has-direct-parent',
	name: 'Blocking issue',
	severity: 'blocking',
	violations: [{ message: 'Something is very wrong.' }],
};

describe('WorkflowAuthoringChecksModal', () => {
	it('renders the warning header, callout, and a publish-anyway button when all results are warnings', async () => {
		const { getByTestId, getByText, queryByTestId } = renderWithResults([warningResult]);

		await waitFor(() =>
			expect(getByTestId('workflow-authoring-checks-callout')).toBeInTheDocument(),
		);

		expect(getByText('Review before publishing')).toBeVisible();
		expect(getByTestId('workflow-authoring-checks-callout')).toHaveTextContent(
			'Some checks produced warnings. You can still publish, but review them first.',
		);
		expect(getByTestId('workflow-authoring-check-ai-agent-requires-guardrail')).toHaveTextContent(
			'AI Agent requires Guardrails',
		);
		expect(getByTestId('workflow-authoring-check-ai-agent-requires-guardrail')).toHaveTextContent(
			'Agent "Agent 1" has no Guardrails node connected.',
		);

		expect(getByTestId('workflow-authoring-checks-publish-anyway-button')).toBeVisible();
		expect(queryByTestId('workflow-authoring-checks-close-button')).toHaveTextContent('Cancel');
	});

	it('renders the blocking header and hides the publish-anyway button when any result is blocking', async () => {
		const { getByTestId, getByText, queryByTestId } = renderWithResults([
			warningResult,
			blockingResult,
		]);

		await waitFor(() =>
			expect(getByTestId('workflow-authoring-checks-callout')).toBeInTheDocument(),
		);

		expect(getByText("This workflow can't be published")).toBeVisible();
		expect(getByTestId('workflow-authoring-checks-callout')).toHaveTextContent(
			'One or more checks have blocking violations that must be resolved before this workflow can be published.',
		);

		expect(queryByTestId('workflow-authoring-checks-publish-anyway-button')).toBeNull();
		expect(getByTestId('workflow-authoring-checks-close-button')).toHaveTextContent('Close');
	});

	it('invokes the onConfirm callback when publish-anyway is clicked', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderWithResults([warningResult], onConfirm);

		await userEvent.click(getByTestId('workflow-authoring-checks-publish-anyway-button'));

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('does not invoke the onConfirm callback when the close button is clicked', async () => {
		const onConfirm = vi.fn();
		const { getByTestId } = renderWithResults([warningResult], onConfirm);

		await userEvent.click(getByTestId('workflow-authoring-checks-close-button'));

		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('renders one item per result with all violation messages listed', async () => {
		const result: WorkflowCheckResult = {
			checkInstanceId: 'multi-violation',
			type: 'node-has-direct-parent',
			name: 'Multi violation',
			severity: 'warning',
			violations: [{ message: 'First problem.' }, { message: 'Second problem.' }],
		};
		const { getByTestId } = renderWithResults([result]);

		const item = await waitFor(() => getByTestId('workflow-authoring-check-multi-violation'));
		expect(item).toHaveTextContent('First problem.');
		expect(item).toHaveTextContent('Second problem.');
	});
});
