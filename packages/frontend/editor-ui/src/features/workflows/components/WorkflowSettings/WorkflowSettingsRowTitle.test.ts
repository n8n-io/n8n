import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import WorkflowSettingsRowTitle from './WorkflowSettingsRowTitle.vue';

const renderComponent = createComponentRenderer(WorkflowSettingsRowTitle);

describe('WorkflowSettingsRowTitle', () => {
	it('shows the title without a help icon when there is no tooltip', () => {
		const { getByText, queryByTestId } = renderComponent({ props: { title: 'Timezone' } });

		expect(getByText('Timezone')).toBeInTheDocument();
		expect(queryByTestId('workflow-settings-help-icon')).not.toBeInTheDocument();
	});

	it('shows a help icon when the tooltip prop is set', () => {
		const { getByTestId } = renderComponent({
			props: { title: 'Timezone', tooltip: 'The timezone of the workflow' },
		});

		expect(getByTestId('workflow-settings-help-icon')).toBeInTheDocument();
	});

	it('shows a help icon when the tooltip slot is filled', () => {
		const { getByTestId } = renderComponent({
			props: { title: 'Timezone' },
			slots: { tooltip: 'Rich help' },
		});

		expect(getByTestId('workflow-settings-help-icon')).toBeInTheDocument();
	});

	it('opens the tooltip when the help icon gets keyboard focus', async () => {
		const { getByRole, findAllByText } = renderComponent({
			props: { title: 'Timezone', tooltip: 'The timezone of the workflow' },
		});

		const helpButton = getByRole('button', { name: 'More info about Timezone' });
		await userEvent.tab();

		expect(helpButton).toHaveFocus();
		expect((await findAllByText('The timezone of the workflow')).length).toBeGreaterThan(0);
	});

	it('renders the title in a label for the control when labelFor is set', () => {
		const { getByText } = renderComponent({
			props: { title: 'Timezone', labelFor: 'timezone-control' },
		});

		const label = getByText('Timezone').closest('label');
		expect(label).toBeInTheDocument();
		expect(label).toHaveAttribute('for', 'timezone-control');
	});

	it('renders no label when labelFor is not set', () => {
		const { container, getByText } = renderComponent({ props: { title: 'Timezone' } });

		expect(getByText('Timezone')).toBeInTheDocument();
		expect(container.querySelector('label')).toBeNull();
	});
});
