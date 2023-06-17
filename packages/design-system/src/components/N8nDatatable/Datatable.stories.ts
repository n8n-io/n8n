import N8nDatatable from './Datatable.vue';
import type { StoryFn } from '@storybook/vue';
import { rows, columns } from './__tests__/data';

export default {
	title: 'Atoms/Datatable',
	component: N8nDatatable,
};

export const Default: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nDatatable,
	},
	template: '<n8n-datatable v-bind="$props"></n8n-datatable>',
});

Default.args = {
	columns,
	rows,
};
