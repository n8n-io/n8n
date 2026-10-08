import type { StoryFn } from '@storybook/vue3-vite';

import AssistantIcon from './AssistantIcon.vue';

export default {
	title: 'Areas/Assistant/AssistantIcon',
	component: AssistantIcon,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantIcon,
	},
	template: '<div style="background: lightgray;"><AssistantIcon v-bind="args" /></div>',
});

export const Default = Template.bind({});
Default.args = {
	theme: 'default',
};

export const Variants: StoryFn = () => ({
	components: { AssistantIcon },
	template: `
		<div style="display: flex; gap: 16px; align-items: center;">
			<div style="background: lightgray; padding: 8px;"><AssistantIcon theme="default" /></div>
			<div style="background: black; padding: 8px;"><AssistantIcon theme="blank" /></div>
			<div style="background: lightgray; padding: 8px;"><AssistantIcon theme="disabled" /></div>
		</div>
	`,
});

export const Sizes: StoryFn = () => ({
	components: { AssistantIcon },
	template: `
		<div style="display: flex; gap: 16px; align-items: center; background: lightgray; padding: 8px;">
			<AssistantIcon size="mini" />
			<AssistantIcon size="small" />
			<AssistantIcon size="medium" />
			<AssistantIcon size="large" />
		</div>
	`,
});
