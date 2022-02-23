import N8nLoadingBlocks from './LoadingBlocks.vue';

export default {
	title: 'Atoms/LoadingBlocks',
	component: N8nLoadingBlocks,
	argTypes: {
		animated: {
			control: {
				type: 'boolean',
			},
		},
		blocks: {
			control: {
				type: 'select',
				options: [1, 2, 3, 4, 5],
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
		tag: {
			control: {
				type: 'select',
				options: ['div', 'span'],
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
		N8nLoadingBlocks,
	},
	template: '<n8n-loading-blocks v-bind="$props"></n8n-loading-blocks>',
});

export const LoadingBlocks = Template.bind({});
