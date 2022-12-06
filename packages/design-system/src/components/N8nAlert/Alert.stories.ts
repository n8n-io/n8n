import type { StoryFn } from '@storybook/vue';
import N8nAlert from './Alert.vue';

export default {
	title: 'Atoms/Alert',
	component: N8nAlert,
	argTypes: {
		type: {
			type: 'select',
			options: ['success', 'info', 'warning', 'error'],
		},
		effect: {
			type: 'select',
			options: ['light', 'dark'],
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nAlert,
	},
	template:
		'<div style="position: relative; width: 100%; height: 300px;"><n8n-alert v-bind="$props"><template #aside>custom content slot</template></n8n-alert></div>',
});

export const Alert = Template.bind({});
Alert.args = {
	type: 'info',
	effect: 'light',
	title: 'Alert title',
	description: 'Alert description',
	center: false,
	showIcon: true,
	background: true,
};
