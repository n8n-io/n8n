import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nListbox from './Listbox.vue';
import N8nListboxItem from './ListboxItem.vue';

const meta = {
	title: 'Core/Listbox',
	component: N8nListbox,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof N8nListbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { N8nListbox, N8nListboxItem },
		setup() {
			const value = ref('v2');
			return { value };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xs); width: 20rem">
				<N8nListbox v-model="value" label="Versions" style="flex: none">
					<N8nListboxItem value="v2">
						<span style="display: block; padding: var(--spacing--3xs)">v2 · Latest</span>
					</N8nListboxItem>
					<N8nListboxItem value="v1">
						<span style="display: block; padding: var(--spacing--3xs)">v1 · Published</span>
					</N8nListboxItem>
					<N8nListboxItem value="v0" disabled>
						<span style="display: block; padding: var(--spacing--3xs)">v0</span>
					</N8nListboxItem>
				</N8nListbox>
				<p style="margin: 0">Selected: {{ value }}</p>
			</div>
		`,
	}),
};
