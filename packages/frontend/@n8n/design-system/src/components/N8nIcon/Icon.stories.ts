import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nIcon from './Icon.vue';

const meta = {
	title: 'Core/Icon',
	component: N8nIcon,
	argTypes: {
		icon: {
			control: 'text',
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		spin: {
			control: 'boolean',
		},
		color: {
			control: 'select',
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
			control: 'number',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A visual glyph component for representing actions, objects, and states.',
			},
		},
	},
} satisfies Meta<typeof N8nIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nIcon },
		setup() {
			return { args };
		},
		template: '<N8nIcon v-bind="args" />',
	}),
	args: {
		icon: 'check',
		size: 'medium',
		spin: false,
	},
};

export const Clock: Story = {
	args: {
		icon: 'clock',
	},
	render: Default.render,
};

export const Plus: Story = {
	args: {
		icon: 'plus',
	},
	render: Default.render,
};

export const Stop: Story = {
	args: {
		icon: 'stop',
	},
	render: Default.render,
};

export const WithColor: Story = {
	args: {
		icon: 'check',
		color: 'success',
	},
	render: Default.render,
};

export const WithDangerColor: Story = {
	args: {
		icon: 'times',
		color: 'danger',
	},
	render: Default.render,
};

export const WithSize: Story = {
	args: {
		icon: 'info',
		size: 'xlarge',
	},
	render: Default.render,
};

export const WithCustomSize: Story = {
	args: {
		icon: 'info',
		size: 32,
	},
	render: Default.render,
};

export const WithSpin: Story = {
	args: {
		icon: 'spinner',
		spin: true,
	},
	render: Default.render,
};

export const WithStrokeWidth: Story = {
	args: {
		icon: 'circle',
		strokeWidth: 3,
	},
	render: Default.render,
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nIcon },
		template: `
			<div style="display: flex; align-items: center; gap: 16px;">
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="info" size="xsmall" />
					<span style="font-size: 12px;">xsmall</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="info" size="small" />
					<span style="font-size: 12px;">small</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="info" size="medium" />
					<span style="font-size: 12px;">medium</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="info" size="large" />
					<span style="font-size: 12px;">large</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="info" size="xlarge" />
					<span style="font-size: 12px;">xlarge</span>
				</div>
			</div>
		`,
	}),
};

export const Variants: Story = {
	render: () => ({
		components: { N8nIcon },
		template: `
			<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="primary" size="large" />
					<span style="font-size: 12px;">primary</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="secondary" size="large" />
					<span style="font-size: 12px;">secondary</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="text-dark" size="large" />
					<span style="font-size: 12px;">text-dark</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="text-base" size="large" />
					<span style="font-size: 12px;">text-base</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="text-light" size="large" />
					<span style="font-size: 12px;">text-light</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="text-xlight" size="large" />
					<span style="font-size: 12px;">text-xlight</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="danger" size="large" />
					<span style="font-size: 12px;">danger</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="success" size="large" />
					<span style="font-size: 12px;">success</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="warning" size="large" />
					<span style="font-size: 12px;">warning</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="foreground-dark" size="large" />
					<span style="font-size: 12px;">foreground-dark</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<N8nIcon icon="circle" color="foreground-xdark" size="large" />
					<span style="font-size: 12px;">foreground-xdark</span>
				</div>
			</div>
		`,
	}),
};

export const UserRoundKey: Story = {
	args: {
		icon: 'user-round-key',
	},
	render: Default.render,
};

export const CommonIcons: Story = {
	render: () => ({
		components: { N8nIcon },
		template: `
			<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 24px;">
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="check" size="large" />
					<span style="font-size: 12px;">check</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="times" size="large" />
					<span style="font-size: 12px;">times</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="plus" size="large" />
					<span style="font-size: 12px;">plus</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="minus" size="large" />
					<span style="font-size: 12px;">minus</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="search" size="large" />
					<span style="font-size: 12px;">search</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="trash" size="large" />
					<span style="font-size: 12px;">trash</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="edit" size="large" />
					<span style="font-size: 12px;">edit</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="cog" size="large" />
					<span style="font-size: 12px;">cog</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="chevron-down" size="large" />
					<span style="font-size: 12px;">chevron-down</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="chevron-up" size="large" />
					<span style="font-size: 12px;">chevron-up</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="info-circle" size="large" />
					<span style="font-size: 12px;">info-circle</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="exclamation-triangle" size="large" />
					<span style="font-size: 12px;">exclamation-triangle</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<N8nIcon icon="user-round-key" size="large" />
					<span style="font-size: 12px;">user-round-key</span>
				</div>
			</div>
		`,
	}),
};
