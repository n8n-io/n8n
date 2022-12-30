import N8nNotice from './Notice.vue';
import type { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/Notice',
	component: N8nNotice,
	argTypes: {
		theme: {
			control: 'select',
			options: ['success', 'warning', 'danger', 'info'],
		},
	},
};

const SlotTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nNotice,
	},
	template:
		'<n8n-notice v-bind="$props">This is a notice! Thread carefully from this point forward.</n8n-notice>',
});

const PropTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nNotice,
	},
	template: '<n8n-notice v-bind="$props"/>',
});

export const Warning = SlotTemplate.bind({});
Warning.args = {
	theme: 'warning',
};

export const Danger = SlotTemplate.bind({});
Danger.args = {
	theme: 'danger',
};

export const Success = SlotTemplate.bind({});
Success.args = {
	theme: 'success',
};

export const Info = SlotTemplate.bind({});
Info.args = {
	theme: 'info',
};

export const Sanitized = PropTemplate.bind({});
Sanitized.args = {
	theme: 'warning',
	content:
		'<script>alert(1)</script> This content contains a script tag and is <strong>sanitized</strong>.',
};

export const Truncated = PropTemplate.bind({});
Truncated.args = {
	theme: 'warning',
	truncate: true,
	content:
		'This content is long and will be truncated at 150 characters. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
};

export const HtmlEdgeCase = PropTemplate.bind({});
HtmlEdgeCase.args = {
	theme: 'warning',
	truncate: true,
	content:
		'This content is long and will be truncated at 150 characters. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod <a href="">read the documentation</a> ut labore et dolore magna aliqua.',
};
