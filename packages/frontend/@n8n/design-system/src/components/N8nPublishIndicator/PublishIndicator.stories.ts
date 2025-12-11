import type { StoryFn } from '@storybook/vue3-vite';

import N8nPublishIndicator from './PublishIndicator.vue';

export default {
	title: 'Atoms/PublishIndicator',
	component: N8nPublishIndicator,
	argTypes: {
		status: {
			control: 'select',
			options: ['published', 'unpublished', 'draft', 'unpublishedDraft'],
		},
		variant: {
			control: 'select',
			options: ['dot', 'badge'],
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nPublishIndicator,
	},
	template: '<n8n-publish-indicator v-bind="args" />',
});

export const PublishIndicator = Template.bind({});
PublishIndicator.args = {
	status: 'published',
	variant: 'dot',
};

const AllStatusesTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nPublishIndicator,
	},
	template: `<div style="display: flex; flex-direction: column; gap: 16px;">
		<div style="display: flex; align-items: center; gap: 16px;">
			<span style="width: 150px; font-weight: 600;">Dot variant:</span>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-publish-indicator status="published" variant="dot" />

			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-publish-indicator status="unpublished" variant="dot" />

			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-publish-indicator status="draft" variant="dot" />

			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-publish-indicator status="unpublishedDraft" variant="dot" />

			</div>
		</div>
		<div style="display: flex; align-items: center; gap: 16px;">
			<span style="width: 150px; font-weight: 600;">Badge variant:</span>
			<n8n-publish-indicator status="published" variant="badge" />
			<n8n-publish-indicator status="unpublished" variant="badge" />
			<n8n-publish-indicator status="draft" variant="badge" />
			<n8n-publish-indicator status="unpublishedDraft" variant="badge" />
		</div>
	</div>`,
});

export const AllVariants = AllStatusesTemplate.bind({});
AllVariants.args = {};

export const Published = Template.bind({});
Published.args = {
	status: 'published',
	variant: 'dot',
};

export const Unpublished = Template.bind({});
Unpublished.args = {
	status: 'unpublished',
	variant: 'dot',
};

export const Draft = Template.bind({});
Draft.args = {
	status: 'draft',
	variant: 'dot',
};

export const UnpublishedDraft = Template.bind({});
UnpublishedDraft.args = {
	status: 'unpublished-draft',
	variant: 'dot',
};

export const DotVariant = AllStatusesTemplate.bind({});
DotVariant.args = {
	variant: 'dot',
};

export const BadgeVariant = AllStatusesTemplate.bind({});
BadgeVariant.args = {
	variant: 'badge',
};
