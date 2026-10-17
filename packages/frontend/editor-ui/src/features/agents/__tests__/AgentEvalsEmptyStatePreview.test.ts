import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalsEmptyStatePreview from '../components/AgentEvalsEmptyStatePreview.vue';

// Rows render `AgentEvalTryRow`, whose delete-check confirmation needs
// `useUIStore()` — mocked out since nothing here exercises that flow.
vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: vi.fn() }),
}));

const examples = [
	{
		input: 'Which ticket is blocking the release?',
		whatToCheck: 'names a ticket',
		scenario: 'Vague',
	},
];

const renderComponent = createComponentRenderer(AgentEvalsEmptyStatePreview, {
	props: { examples },
});

// This component's own root/buttons use `data-testid`; the slider it wraps
// uses `data-test-id` (default config) internally — queried here by raw
// selector rather than juggling two `configure()`s in one file.
const byTestId = (container: ReturnType<typeof renderComponent>['container'], testId: string) =>
	container.querySelector(`[data-testid="${testId}"]`);

describe('AgentEvalsEmptyStatePreview', () => {
	it('renders the slider and both action buttons', () => {
		const { container, getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-test-agent-examples-slider')).toBeInTheDocument();
		expect(byTestId(container, 'agent-evals-empty-preview-add-checks')).toBeInTheDocument();
		expect(byTestId(container, 'agent-evals-empty-preview-add-own')).toBeInTheDocument();
	});

	// A viewer without `agent:update` can look at the preview but must not be
	// able to commit it or add to it — every write-capable control disables.
	it("disables both action buttons and the slider's add-your-own input for a read-only viewer", () => {
		const { container, getByTestId } = renderComponent({ props: { disabled: true } });

		expect(byTestId(container, 'agent-evals-empty-preview-add-checks')).toBeDisabled();
		expect(byTestId(container, 'agent-evals-empty-preview-add-own')).toBeDisabled();
		expect(getByTestId('instance-ai-test-agent-examples-add-own-input')).toBeDisabled();
	});

	it('does not disable anything for a viewer who can edit', () => {
		const { container, getByTestId } = renderComponent();

		expect(byTestId(container, 'agent-evals-empty-preview-add-checks')).not.toBeDisabled();
		expect(byTestId(container, 'agent-evals-empty-preview-add-own')).not.toBeDisabled();
		expect(getByTestId('instance-ai-test-agent-examples-add-own-input')).not.toBeDisabled();
	});

	// `addingChecks` is a commit already in flight, not a permission state, but a
	// read-only viewer could never trigger it anyway — both disable the same
	// controls regardless of which one caused it.
	it('also disables the slider\'s input and "Add your own" for the whole addingChecks interval', () => {
		const { container, getByTestId } = renderComponent({ props: { addingChecks: true } });

		expect(byTestId(container, 'agent-evals-empty-preview-add-own')).toBeDisabled();
		expect(getByTestId('instance-ai-test-agent-examples-add-own-input')).toBeDisabled();
	});
});
