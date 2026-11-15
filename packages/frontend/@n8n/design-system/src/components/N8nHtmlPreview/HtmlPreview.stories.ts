import type { StoryFn } from '@storybook/vue3-vite';

import N8nHtmlPreview from './HtmlPreview.vue';

export default {
	title: 'Core/HtmlPreview',
	component: N8nHtmlPreview,
	argTypes: {
		html: {
			control: 'text',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'Shows untrusted HTML in a sandboxed iframe. The component sanitizes the HTML first. The iframe runs no scripts and has no access to the parent page. The iframe fills its container, so give the container a size.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nHtmlPreview,
	},
	template: '<div style="height: 240px"><N8nHtmlPreview v-bind="args" /></div>',
});

export const Default = Template.bind({});
Default.args = {
	html: '<h1>Order confirmed</h1><p>Thank you for your order. It ships <strong>tomorrow</strong>.</p>',
};

export const WithStyles = Template.bind({});
WithStyles.args = {
	html: '<style>.card { padding: 16px; border: 1px solid #ccc; border-radius: 8px; font-family: sans-serif; }</style><div class="card"><h2>Weekly report</h2><p>12 workflows ran without errors.</p></div>',
};
