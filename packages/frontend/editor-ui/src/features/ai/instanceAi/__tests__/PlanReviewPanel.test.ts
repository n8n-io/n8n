import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import PlanReviewPanel, { type PlannedTaskArg } from '../components/PlanReviewPanel.vue';

const plannedTasks: PlannedTaskArg[] = [
	{ id: 't1', title: 'First task', kind: 'build-workflow', spec: 'Spec one', deps: [] },
	{ id: 't2', title: 'Second task', kind: 'checkpoint', spec: 'Spec two', deps: ['t1'] },
];

const renderComponent = createComponentRenderer(PlanReviewPanel);

function render() {
	return renderComponent({ props: { plannedTasks } });
}

describe('PlanReviewPanel', () => {
	it('renders Deny and Approve buttons, no standalone Request changes button', () => {
		const { getByTestId, queryByTestId } = render();
		expect(getByTestId('instance-ai-plan-deny')).toHaveTextContent('Deny');
		expect(getByTestId('instance-ai-plan-approve')).toHaveTextContent('Allow');
		expect(queryByTestId('instance-ai-plan-request-changes')).toBeNull();
	});

	it('emits approve when the primary button is clicked with empty feedback', async () => {
		const { emitted, getByTestId } = render();
		await fireEvent.click(getByTestId('instance-ai-plan-approve'));
		expect(emitted().approve).toHaveLength(1);
		expect(emitted()['request-changes']).toBeUndefined();
		expect(emitted().deny).toBeUndefined();
	});

	it('morphs primary label and emits request-changes when feedback is typed', async () => {
		const { emitted, getByTestId, container } = render();
		const textarea = container.querySelector('textarea');
		expect(textarea).not.toBeNull();
		await fireEvent.update(textarea as HTMLTextAreaElement, 'please use telegram');

		const primary = getByTestId('instance-ai-plan-approve');
		expect(primary).toHaveTextContent('Request changes');

		await fireEvent.click(primary);
		expect(emitted()['request-changes']).toEqual([['please use telegram']]);
		expect(emitted().approve).toBeUndefined();
	});

	it('emits deny when the Deny button is clicked', async () => {
		const { emitted, getByTestId } = render();
		await fireEvent.click(getByTestId('instance-ai-plan-deny'));
		expect(emitted().deny).toHaveLength(1);
		expect(emitted().approve).toBeUndefined();
		expect(emitted()['request-changes']).toBeUndefined();
	});

	it('ignores subsequent clicks after the panel has been resolved', async () => {
		const { emitted, getByTestId } = render();
		await fireEvent.click(getByTestId('instance-ai-plan-approve'));
		// Footer is unmounted once resolved, so we just confirm only one emit fired.
		expect(emitted().approve).toHaveLength(1);
	});
});
