import type { StoryFn } from '@storybook/vue3';

import N8nScrollArea from './N8nScrollArea.vue';

export default {
	title: 'Atoms/ScrollArea',
	component: N8nScrollArea,
	argTypes: {
		type: {
			control: 'select',
			options: ['auto', 'always', 'scroll', 'hover'],
		},
		dir: {
			control: 'select',
			options: ['ltr', 'rtl'],
		},
		scrollHideDelay: {
			control: 'number',
		},
		maxHeight: {
			control: 'text',
		},
		maxWidth: {
			control: 'text',
		},
		enableHorizontalScroll: {
			control: 'boolean',
		},
		enableVerticalScroll: {
			control: 'boolean',
		},
	},
};

const Template: StoryFn = (args) => ({
	setup() {
		return { args };
	},
	components: {
		N8nScrollArea,
	},
	template: `
		<div style="width: 300px; height: 200px; border: 1px solid var(--color-foreground-base); border-radius: 4px;">
			<N8nScrollArea v-bind="args">
				<div style="padding: 16px;">
					<h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Scrollable Content</h3>
					<p style="margin: 0 0 12px 0; line-height: 1.6;">
						This is a scrollable area with custom styled scrollbars. The content will scroll when it overflows the container.
					</p>
					<p style="margin: 0 0 12px 0; line-height: 1.6;">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
					</p>
					<p style="margin: 0 0 12px 0; line-height: 1.6;">
						Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
					</p>
					<p style="margin: 0 0 12px 0; line-height: 1.6;">
						Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
					</p>
					<p style="margin: 0 0 12px 0; line-height: 1.6;">
						Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
					</p>
					<p style="margin: 0; line-height: 1.6;">
						Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
					</p>
				</div>
			</N8nScrollArea>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {
	type: 'hover',
	enableVerticalScroll: true,
	enableHorizontalScroll: false,
};

export const AlwaysVisible = Template.bind({});
AlwaysVisible.args = {
	type: 'always',
	enableVerticalScroll: true,
	enableHorizontalScroll: false,
};

export const WithMaxHeight = Template.bind({});
WithMaxHeight.args = {
	type: 'hover',
	maxHeight: '150px',
	enableVerticalScroll: true,
	enableHorizontalScroll: false,
};

const HorizontalScrollTemplate: StoryFn = (args) => ({
	setup() {
		return { args };
	},
	components: {
		N8nScrollArea,
	},
	template: `
		<div style="width: 300px; height: 100px; border: 1px solid var(--color-foreground-base); border-radius: 4px;">
			<N8nScrollArea v-bind="args">
				<div style="padding: 16px; white-space: nowrap; width: 600px;">
					<span style="font-weight: 600;">Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.</span>
					<div style="margin-left: 12px; max-width: 200px; text-wrap: auto">Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.

Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.</div>
				</div>
			</N8nScrollArea>
		</div>
	`,
});

export const HorizontalScroll = HorizontalScrollTemplate.bind({});
HorizontalScroll.args = {
	type: 'hover',
	enableVerticalScroll: false,
	enableHorizontalScroll: true,
};

export const BothDirections = HorizontalScrollTemplate.bind({});
BothDirections.args = {
	type: 'hover',
	enableVerticalScroll: true,
	enableHorizontalScroll: true,
};

const InPopoverTemplate: StoryFn = (args) => ({
	setup() {
		return { args };
	},
	components: {
		N8nScrollArea,
	},
	template: `
		<div style="width: 260px; padding: 16px; background-color: var(--color-foreground-xlight); border: var(--border-base); border-radius: var(--border-radius-base); box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;">
			<N8nScrollArea v-bind="args">
				<div style="display: flex; flex-direction: column; gap: 12px;">
					<h3 style="margin: 0; font-size: 14px; font-weight: 600;">Long Menu Items</h3>
					<div v-for="i in 15" :key="i" style="padding: 8px 12px; background: var(--color-background-base); border-radius: 4px; cursor: pointer;">
						Menu item {{ i }}: Some descriptive text that might be quite long
					</div>
				</div>
			</N8nScrollArea>
		</div>
	`,
});

export const InPopover = InPopoverTemplate.bind({});
InPopover.args = {
	type: 'hover',
	maxHeight: '200px',
	enableVerticalScroll: true,
	enableHorizontalScroll: false,
};
InPopover.storyName = 'Popover Example';
