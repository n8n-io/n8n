import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import { rows, columns } from './__tests__/data';
import N8nDatatable from './Datatable.vue';

export default {
	title: 'Core/Datatable',
	component: N8nDatatable,

	parameters: {
		docs: {
			description: {
				component:
					'A tabular data component for displaying rows, columns, and table interactions. The footer is the shared pagination control. It sits on the right, with a top margin. Page sizes include All.',
			},
		},
	},
};

export const Default: StoryFn = (args) => ({
	setup() {
		const currentPage = ref(typeof args.currentPage === 'number' ? args.currentPage : 1);
		const rowsPerPage = ref(typeof args.rowsPerPage === 'number' ? args.rowsPerPage : 10);
		return { args, currentPage, rowsPerPage };
	},
	components: {
		N8nDatatable,
	},
	template: `
		<n8n-datatable
			v-bind="args"
			:current-page="currentPage"
			:rows-per-page="rowsPerPage"
			@update:current-page="currentPage = $event"
			@update:rows-per-page="rowsPerPage = $event"
		/>
	`,
});

Default.args = {
	columns,
	rows,
};
