import type { StoryFn } from '@storybook/vue3-vite';

import N8nIcon from './Icon.vue';

export default {
	title: 'Atoms/Icon',
	component: N8nIcon,
	argTypes: {
		icon: {
			control: 'text',
		},
		size: {
			control: {
				type: 'select',
			},
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		spin: {
			control: {
				type: 'boolean',
			},
		},
		color: {
			control: {
				type: 'select',
			},
			options: [
				'primary',
				'secondary',
				'text-dark',
				'text-base',
				'text-light',
				'text-xlight',
				'danger',
				'success',
				'warning',
				'foreground-dark',
				'foreground-xdark',
			],
		},
		strokeWidth: {
			control: {
				type: 'number',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
	},
	template: '<n8n-icon v-bind="args" />',
});

export const Clock = Template.bind({});
Clock.args = {
	icon: 'clock',
};

export const Plus = Template.bind({});
Plus.args = {
	icon: 'plus',
};

export const Stop = Template.bind({});
Stop.args = {
	icon: 'stop',
};

export const WithColor = Template.bind({});
WithColor.args = {
	icon: 'check',
	color: 'success',
};

export const WithDangerColor = Template.bind({});
WithDangerColor.args = {
	icon: 'times',
	color: 'danger',
};

export const WithSize = Template.bind({});
WithSize.args = {
	icon: 'info',
	size: 'xlarge',
};

export const WithCustomSize = Template.bind({});
WithCustomSize.args = {
	icon: 'info',
	size: 32,
};

export const WithSpin = Template.bind({});
WithSpin.args = {
	icon: 'spinner',
	spin: true,
};

export const WithStrokeWidth = Template.bind({});
WithStrokeWidth.args = {
	icon: 'circle',
	strokeWidth: 3,
};

export const AllSizes: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
	},
	template: `
		<div style="display: flex; align-items: center; gap: 16px;">
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="info" size="xsmall" />
				<span style="font-size: 12px;">xsmall</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="info" size="small" />
				<span style="font-size: 12px;">small</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="info" size="medium" />
				<span style="font-size: 12px;">medium</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="info" size="large" />
				<span style="font-size: 12px;">large</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="info" size="xlarge" />
				<span style="font-size: 12px;">xlarge</span>
			</div>
		</div>
	`,
});

export const AllColors: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
	},
	template: `
		<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="primary" size="large" />
				<span style="font-size: 12px;">primary</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="secondary" size="large" />
				<span style="font-size: 12px;">secondary</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="text-dark" size="large" />
				<span style="font-size: 12px;">text-dark</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="text-base" size="large" />
				<span style="font-size: 12px;">text-base</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="text-light" size="large" />
				<span style="font-size: 12px;">text-light</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="text-xlight" size="large" />
				<span style="font-size: 12px;">text-xlight</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="danger" size="large" />
				<span style="font-size: 12px;">danger</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="success" size="large" />
				<span style="font-size: 12px;">success</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="warning" size="large" />
				<span style="font-size: 12px;">warning</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="foreground-dark" size="large" />
				<span style="font-size: 12px;">foreground-dark</span>
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<n8n-icon icon="circle" color="foreground-xdark" size="large" />
				<span style="font-size: 12px;">foreground-xdark</span>
			</div>
		</div>
	`,
});

export const CommonIcons: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
	},
	template: `
		<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 24px;">
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="check" size="large" />
				<span style="font-size: 12px;">check</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="times" size="large" />
				<span style="font-size: 12px;">times</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="plus" size="large" />
				<span style="font-size: 12px;">plus</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="minus" size="large" />
				<span style="font-size: 12px;">minus</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="search" size="large" />
				<span style="font-size: 12px;">search</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="trash" size="large" />
				<span style="font-size: 12px;">trash</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="edit" size="large" />
				<span style="font-size: 12px;">edit</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="cog" size="large" />
				<span style="font-size: 12px;">cog</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="chevron-down" size="large" />
				<span style="font-size: 12px;">chevron-down</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="chevron-up" size="large" />
				<span style="font-size: 12px;">chevron-up</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="info-circle" size="large" />
				<span style="font-size: 12px;">info-circle</span>
			</div>
			<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
				<n8n-icon icon="exclamation-triangle" size="large" />
				<span style="font-size: 12px;">exclamation-triangle</span>
			</div>
		</div>
	`,
});
