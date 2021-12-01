import N8nMenu from './Menu.vue';
import N8nMenuItem from '../N8nMenuItem';

import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Menu',
	component: N8nMenu,
	argTypes: {
		type: {
			control: 'select',
			options: ['primary', 'secondary'],
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-xlight' },
	},
};

const methods = {
	onSelect: action('select'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nMenu,
		N8nMenuItem,
	},
	template:
		`<n8n-menu v-bind="$props" @select="onSelect">
			<n8n-menu-item index="1"> <span slot="title">Item 1</span> </n8n-menu-item>
			<n8n-menu-item index="2"> <span slot="title">Item 2</span> </n8n-menu-item>
		</n8n-menu>`,
	methods,
});

export const Primary = Template.bind({});
Primary.parameters = {
	backgrounds: { default: '--color-background-light' },
};

export const Secondary = Template.bind({});
Secondary.args = {
	type: 'secondary',
};
