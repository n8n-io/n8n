import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import DropdownMenu from '../../../components/N8nDropdownMenu/DropdownMenu.vue';
import Listbox from './Listbox.vue';
import ListboxItem from './ListboxItem.vue';

const Harness = defineComponent({
	components: { Listbox, ListboxItem },
	setup() {
		const value = ref('alpha');
		const deleted = ref<string[]>([]);

		function deleteItem(id: string) {
			deleted.value = [...deleted.value, id];
		}

		return { value, deleted, deleteItem };
	},
	template: `
		<div>
			<p data-test-id="value">{{ value }}</p>
			<p data-test-id="deleted">{{ deleted.join(',') }}</p>
			<Listbox v-model="value" aria-label="Files">
				<ListboxItem value="alpha" label="Alpha" />
				<ListboxItem value="beta" label="Beta">
					<template #trailing>
						<button type="button" aria-label="Delete Beta" @click="deleteItem('beta')">
							Delete
						</button>
					</template>
				</ListboxItem>
			</Listbox>
		</div>
	`,
});

describe('Listbox', () => {
	it('moves the highlight with the arrow keys and selects on Enter', async () => {
		const user = userEvent.setup();
		const { getByRole, getByTestId } = render(Harness);

		expect(getByRole('listbox', { name: 'Files' })).toBeTruthy();
		const alpha = getByRole('option', { name: 'Alpha' });
		await user.click(alpha);
		expect(getByTestId('value')).toHaveTextContent('alpha');

		await user.keyboard('{ArrowDown}');
		const beta = getByRole('option', { name: 'Beta' });
		expect(beta).toHaveAttribute('data-highlighted');
		expect(getByTestId('value')).toHaveTextContent('alpha');

		await user.keyboard('{Enter}');
		expect(getByTestId('value')).toHaveTextContent('beta');
	});

	it('keeps a trailing action outside the option', async () => {
		const user = userEvent.setup();
		const { getByRole, getByTestId } = render(Harness);
		const beta = getByRole('option', { name: 'Beta' });
		const deleteBeta = getByRole('button', { name: 'Delete Beta' });

		expect(beta.contains(deleteBeta)).toBe(false);

		await user.click(deleteBeta);
		expect(getByTestId('deleted')).toHaveTextContent('beta');
		expect(getByTestId('value')).toHaveTextContent('alpha');
	});

	it('returns focus to the row when Tab leaves a trailing menu', async () => {
		const user = userEvent.setup();
		const { getByRole, queryByRole } = render(MenuHarness);

		await user.click(getByRole('button', { name: 'Actions for Beta' }));
		expect(getByRole('menu')).toBeVisible();

		await user.keyboard('{Tab}');
		await new Promise((resolve) => {
			setTimeout(resolve, 50);
		});

		const beta = getByRole('option', { name: 'Beta' });
		await waitFor(() => expect(beta).toHaveFocus());
		expect(queryByRole('menu')).toBeNull();

		await user.keyboard('{ArrowDown}');
		expect(getByRole('option', { name: 'Gamma' })).toHaveAttribute('data-highlighted');
	});
});

const MenuHarness = defineComponent({
	components: { Listbox, ListboxItem, DropdownMenu },
	setup() {
		const value = ref('alpha');
		const actions = [{ id: 'rename', label: 'Rename' }];
		return { value, actions };
	},
	template: `
		<Listbox v-model="value" aria-label="Files">
			<ListboxItem value="alpha" label="Alpha" />
			<ListboxItem value="beta" label="Beta">
				<template #trailing="{ setMenuOpen }">
					<DropdownMenu
						:items="actions"
						:modal="false"
						placement="bottom-end"
						@update:model-value="setMenuOpen"
					>
						<template #trigger>
							<button type="button" aria-label="Actions for Beta">Actions</button>
						</template>
					</DropdownMenu>
				</template>
			</ListboxItem>
			<ListboxItem value="gamma" label="Gamma" />
		</Listbox>
	`,
});
