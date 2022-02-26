import N8nLoading from './Loading.vue';

export default {
	title: 'Atoms/Loading',
	component: N8nLoading,
	argTypes: {
		animated: {
			control: {
				type: 'boolean',
			},
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
		rows: {
			control: {
				type: 'select',
				options: [1, 2, 3, 4, 5],
			},
		},
		variant: {
			control: {
				type: 'select',
				options: ['button', 'h1', 'image', 'p'],
			},
		},
	},
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nLoading,
	},
	template: '<n8n-loading v-bind="$props"></n8n-loading>',
});

export const Loading = Template.bind({});
Loading.args = {
	variant: 'p',
};
