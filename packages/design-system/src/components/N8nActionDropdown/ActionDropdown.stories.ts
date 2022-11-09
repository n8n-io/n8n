import N8nActionDropdown from "./ActionDropdown.vue";
import { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/ActionDropdown',
	component: N8nActionDropdown,
	argTypes: {
		placement: {
			control: {
				type: 'select',
				options: ['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start'],
			},
		},
		activatorIcon: {
			control: {
				type: 'text',
			},
		},
		trigger: {
			control: {
				type: 'select',
				options: ['click', 'hover'],
			},
		},
	},
};

const template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nActionDropdown,
	},
	template: `<n8n-action-dropdown v-bind="$props" />`,
});

export const defaultActionDropdown = template.bind({});
defaultActionDropdown.args = {
	items: [
		{
			id: 'item1',
			label: 'Action 1',
		},
		{
			id: 'item2',
			label: 'Action 2',
		},
	],
};

export const customStyling = template.bind({});
customStyling.args = {
	activatorIcon: 'bars',
	items: [
		{
			id: 'item1',
			label: 'Action 1',
			icon: 'thumbs-up',
		},
		{
			id: 'item2',
			label: 'Action 2',
			icon: 'thumbs-down',
			disabled: true,
		},
		{
			id: 'item3',
			label: 'Action 3',
			icon: 'heart',
			divided: true,
		},
	],
};
