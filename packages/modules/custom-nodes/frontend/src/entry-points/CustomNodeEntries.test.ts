import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import AddCustomActionEntry from './AddCustomActionEntry.vue';
import CreateCustomNodeEntry from './CreateCustomNodeEntry.vue';

const renderCreate = createComponentRenderer(CreateCustomNodeEntry);
const renderAdd = createComponentRenderer(AddCustomActionEntry);

describe('CreateCustomNodeEntry', () => {
	it('shows the entry as a list item and emits select on click', async () => {
		const { getByTestId, emitted } = renderCreate();

		expect(getByTestId('custom-node-create-entry')).toHaveTextContent('Create custom node');
		expect(getByTestId('custom-node-create-entry')).not.toHaveAttribute('data-highlighted');

		await userEvent.click(getByTestId('custom-node-create-button'));

		expect(emitted('select')).toHaveLength(1);
	});

	it('marks the highlighted entry of the no-results state', () => {
		const { getByTestId } = renderCreate({ props: { highlighted: true } });

		expect(getByTestId('custom-node-create-entry')).toHaveAttribute('data-highlighted', 'true');
	});
});

describe('AddCustomActionEntry', () => {
	it('names the parent node and emits select on click', async () => {
		const { getByTestId, emitted } = renderAdd({ props: { nodeDisplayName: 'Slack' } });

		expect(getByTestId('custom-action-add-entry')).toHaveTextContent('Add custom action to Slack');

		await userEvent.click(getByTestId('custom-action-add-entry'));

		expect(emitted('select')).toHaveLength(1);
	});

	it('says "Add action" for a custom node', () => {
		const { getByTestId } = renderAdd({ props: { nodeDisplayName: 'Acme', customNode: true } });

		expect(getByTestId('custom-action-add-entry')).toHaveTextContent('Add action to Acme');
	});
});
