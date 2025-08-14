import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ColumnHeader from '@/features/dataStore/components/dataGrid/ColumnHeader.vue';

// Mock N8nActionDropdown to make it easy to trigger item selection
vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionDropdown: {
			name: 'N8nActionDropdown',
			props: {
				items: { type: Array, required: true },
			},
			emits: ['select'],
			template: `
        <div>
          <ul>
            <li v-for="item in items" :key="item.id">
              <button :data-test-id="'action-' + item.id" @click="$emit('select', item.id)">
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>
      `,
		},
	};
});

const onDeleteMock = vi.fn();

const renderComponent = createComponentRenderer(ColumnHeader, {
	props: {
		params: {
			displayName: 'My Column',
			column: { getColId: () => 'col-1' },
			onDelete: onDeleteMock,
		},
	},
});

describe('ColumnHeader', () => {
	it('renders the column display name', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('action-delete')).toBeInTheDocument();
	});

	it('calls onDelete with the column id when delete is selected', async () => {
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('action-delete'));
		expect(onDeleteMock).toHaveBeenCalledWith('col-1');
	});
});
