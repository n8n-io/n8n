import N8nAvatar from './Avatar.vue';

export default {
	title: 'Atoms/Avatar',
	component: N8nAvatar,
	argTypes: {
		size: {
			type: 'select',
			options: ['small', 'medium', 'large'],
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nAvatar,
	},
	template: '<n8n-avatar v-bind="$props" />',
});

export const Avatar = Template.bind({});
Avatar.args = {
	name: 'Sunny Side',
};
