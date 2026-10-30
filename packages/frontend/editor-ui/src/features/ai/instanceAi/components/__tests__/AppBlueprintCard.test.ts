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
};

const renderComponent = createComponentRenderer(AppBlueprintCard);

describe('AppBlueprintCard', () => {
	it('starts building with the edited blueprint', async () => {
		const { emitted, getByTestId } = renderComponent({ props: { blueprint } });
		const name = getByTestId('instance-ai-app-blueprint-name');
		await userEvent.clear(name);
		await userEvent.type(name, 'Project planner');

		await userEvent.click(getByTestId('instance-ai-app-blueprint-start'));

		expect(emitted().submit?.[0]).toEqual([
			{
				kind: 'appBlueprint',
				approved: true,
				blueprint: { ...blueprint, name: 'Project planner' },
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
