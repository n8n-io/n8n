import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import NavigationDropdown from './NavigationDropdown.vue';

export default {
	title: 'Atoms/NavigationDropdown',
	component: NavigationDropdown,
	argTypes: {},
};

const methods = {
	onSelect: action('select'),
};

const template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		NavigationDropdown,
	},
	template: `
		<div style="height: 10vh; width: 200px">
			<n8n-navigation-dropdown v-bind="args" @select="onSelect">
				<button type="button">trigger</button>
			</n8n-navigation-dropdown>
		</div>
	`,
	methods,
});

const menuItems = [
	{
		id: 'credentials',
		title: 'Credentials',
		submenu: [
			{
				id: 'credentials-0',
				title: 'Create',
				disabled: true,
			},
			{
				id: 'credentials-1',
				title: 'Credentials - 1',
				icon: 'user',
			},
			{
				id: 'credentials-2',
				title: 'Credentials - 2',
				icon: 'user',
			},
		],
	},
	{
		id: 'variables',
		title: 'Variables',
	},
];

export const primary = template.bind({});
primary.args = {
	menu: menuItems,
};
