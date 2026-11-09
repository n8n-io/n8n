import type { AppBlueprint } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';

import AppBlueprintCard from '../AppBlueprintCard.vue';

const blueprint: AppBlueprint = {
	name: 'Weekly planner',
	namespace: 'weekly-planner',
	visibility: 'project',
	description: 'Plan the week and track completed tasks.',
	theme: 'both',
	bindings: [
		{
			kind: 'dataTable',
			name: 'Weekly tasks',
			description: 'Stores tasks and their completion status.',
			status: 'existing',
			resourceId: 'table-1',
		},
		{
			kind: 'agent',
			name: 'Planning agent',
			description: 'Answers questions about the weekly plan.',
			status: 'new',
		},
	],
};

const renderComponent = createComponentRenderer(AppBlueprintCard);

describe('AppBlueprintCard', () => {
	it('starts building with the edited blueprint', async () => {
		const { emitted, getByTestId } = renderComponent({ props: { blueprint } });
		const name = getByTestId('instance-ai-app-blueprint-name');
		await userEvent.clear(name);
		await userEvent.type(name, 'Project planner');
		const namespace = getByTestId('instance-ai-app-blueprint-namespace');
		await userEvent.clear(namespace);
		await userEvent.type(namespace, 'project-planner');

		await userEvent.click(getByTestId('instance-ai-app-blueprint-start'));

		expect(emitted().submit?.[0]).toEqual([
			{
				kind: 'appBlueprint',
				approved: true,
				blueprint: { ...blueprint, name: 'Project planner', namespace: 'project-planner' },
			},
		]);
	});

	it('includes optional changes when starting the build', async () => {
		const { emitted, getByTestId } = renderComponent({ props: { blueprint } });
		await userEvent.type(
			getByTestId('instance-ai-app-blueprint-instructions'),
			'Focus on projects.',
		);

		await userEvent.click(getByTestId('instance-ai-app-blueprint-start'));

		expect(emitted().submit?.[0]).toEqual([
			{
				kind: 'appBlueprint',
				approved: true,
				blueprint: { ...blueprint, additionalInstructions: 'Focus on projects.' },
			},
		]);
	});

	it('cancels without starting a build', async () => {
		const { emitted, getByTestId } = renderComponent({ props: { blueprint } });
		const namespace = getByTestId('instance-ai-app-blueprint-namespace');
		await userEvent.clear(namespace);
		await userEvent.type(namespace, 'Not valid');

		await userEvent.click(getByTestId('instance-ai-app-blueprint-cancel'));

		expect(emitted().submit?.[0]).toEqual([{ kind: 'appBlueprint', approved: false, blueprint }]);
	});

	it('disables approval when a required field is invalid', async () => {
		const { getByTestId } = renderComponent({ props: { blueprint } });
		const namespace = getByTestId('instance-ai-app-blueprint-namespace');
		await userEvent.clear(namespace);
		await userEvent.type(namespace, 'Not valid');

		expect(getByTestId('instance-ai-app-blueprint-start')).toBeDisabled();
	});

	it('shows the description as read-only text', () => {
		const { getByTestId } = renderComponent({ props: { blueprint } });

		expect(getByTestId('instance-ai-app-blueprint-description')).toHaveTextContent(
			blueprint.description,
		);
	});

	it('shows planned bindings as read-only rows', () => {
		const { getAllByTestId, getByText, queryByText } = renderComponent({ props: { blueprint } });

		const bindings = getAllByTestId('instance-ai-app-blueprint-binding');
		expect(bindings).toHaveLength(2);
		expect(bindings[0]).toHaveAttribute('data-binding-kind', 'dataTable');
		expect(bindings[1]).toHaveAttribute('data-binding-kind', 'agent');
		expect(getByText('Weekly tasks')).toBeVisible();
		expect(getByText('Stores tasks and their completion status.')).toBeVisible();
		expect(getByText('Existing')).toBeVisible();
		expect(getByText('New')).toBeVisible();
		expect(queryByText('table-1')).not.toBeInTheDocument();
	});

	it('hides the bindings section when none are planned', () => {
		const { queryByText, queryByTestId } = renderComponent({
			props: { blueprint: { ...blueprint, bindings: undefined } },
		});

		expect(queryByText('Runs on')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-app-blueprint-binding')).not.toBeInTheDocument();
	});

	it('is read-only after resolution', () => {
		const resolvedBlueprint = { ...blueprint, additionalInstructions: 'Use compact cards.' };
		const { getByTestId, queryByTestId } = renderComponent({
			props: { blueprint: resolvedBlueprint, readOnly: true },
		});

		expect(getByTestId('instance-ai-app-blueprint-name')).toBeDisabled();
		expect(getByTestId('instance-ai-app-blueprint-instructions')).toBeDisabled();
		expect(getByTestId('instance-ai-app-blueprint-instructions')).toHaveValue('Use compact cards.');
		expect(queryByTestId('instance-ai-app-blueprint-start')).not.toBeInTheDocument();
	});
});
