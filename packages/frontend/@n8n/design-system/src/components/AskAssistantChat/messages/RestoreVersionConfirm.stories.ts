import type { StoryFn } from '@storybook/vue3-vite';

import RestoreVersionConfirm from './RestoreVersionConfirm.vue';

export default {
	title: 'Areas/Assistant/RestoreVersionConfirm',
	component: RestoreVersionConfirm,
	parameters: {
		docs: {
			description: {
				component: 'Confirmation card for restoring a previous workflow version from Assistant.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { RestoreVersionConfirm },
	template: '<RestoreVersionConfirm v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	versionId: 'version-abc123',
};

export const WithHourLimit = Template.bind({});
WithHourLimit.args = {
	versionId: 'version-abc123',
	pruneTimeHours: 1,
};

export const WithDayLimit = Template.bind({});
WithDayLimit.args = {
	versionId: 'version-abc123',
	pruneTimeHours: 72,
};
