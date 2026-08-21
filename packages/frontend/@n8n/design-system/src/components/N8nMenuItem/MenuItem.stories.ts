import type { StoryFn } from '@storybook/vue3-vite';

import type { IMenuItem } from '@n8n/design-system/types';

import N8nMenuItem from './MenuItem.vue';

export default {
	title: 'Core/MenuItem',
	component: N8nMenuItem,
	parameters: {
		docs: {
			description: {
				component: 'A navigation item for sidebars and menus, with optional tags and compact mode.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { N8nMenuItem },
	template: `
		<div style="width: 240px; padding: var(--spacing--xs); background: var(--color--background);">
			<N8nMenuItem v-bind="args" />
		</div>
	`,
});

const item = (overrides: Partial<IMenuItem> = {}): IMenuItem => ({
	id: 'workflows',
	label: 'Workflows',
	icon: 'house',
	...overrides,
});

export const Default = Template.bind({});
Default.args = {
	item: item(),
};

export const Active = Template.bind({});
Active.args = {
	item: item(),
	active: true,
};

export const WithPreviewTag = Template.bind({});
WithPreviewTag.args = {
	item: item({ label: 'Insights', icon: 'chart-bar', preview: true }),
};

export const WithNewTag = Template.bind({});
WithNewTag.args = {
	item: item({ label: 'Evaluations', icon: 'sparkles', new: true }),
};

export const Compact = Template.bind({});
Compact.args = {
	item: item(),
	compact: true,
};
