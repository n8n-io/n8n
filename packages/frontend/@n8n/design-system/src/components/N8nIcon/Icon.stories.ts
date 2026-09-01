import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nIcon from './Icon.vue';
import IconGallery from './IconGallery.vue';
import { updatedIconSet, type IconName } from './icons';

const iconNames = (Object.keys(updatedIconSet) as IconName[]).toSorted((a, b) =>
	a.localeCompare(b),
);

const meta = {
	title: 'Core/Icon',
	component: N8nIcon,
	argTypes: {
		icon: {
			control: 'select',
			options: iconNames,
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'],
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
		layout: 'padded',
		docs: {
			description: {
				component: 'A visual glyph component for representing actions, objects, and states.',
			},
		},
	},
} satisfies Meta<typeof N8nIcon>;

export default meta;
// Icon's name union is too large for StoryObj<typeof meta> in Storybook 10.5.
type Story = StoryObj<typeof N8nIcon>;

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

export const AllIcons: Story = {
	render: (args) => ({
		components: { IconGallery },
		setup() {
			return { args };
		},
		template:
			'<IconGallery :size="args.size" :color="args.color" :spin="args.spin" :stroke-width="args.strokeWidth" />',
	}),
	args: {
		size: 'large',
		spin: false,
	},
	argTypes: {
		icon: { control: false },
	},
	parameters: {
		docs: {
			description: {
				story: 'Browse every current icon. Click a tile to copy its name.',
			},
		},
	},
};

export const WithColor: Story = {
	args: {
		icon: 'check',
		color: 'success',
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
	args: {
		icon: 'info',
	},
	render: () => ({
		components: { N8nIcon },
		template: `
			<div style="display: flex; align-items: center; gap: var(--spacing--sm);">
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="xsmall" />
					<span style="font-size: var(--font-size--2xs);">xsmall</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="small" />
					<span style="font-size: var(--font-size--2xs);">small</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="medium" />
					<span style="font-size: var(--font-size--2xs);">medium</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="large" />
					<span style="font-size: var(--font-size--2xs);">large</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<N8nIcon icon="info" size="xlarge" />
					<span style="font-size: var(--font-size--2xs);">xlarge</span>
				</div>
			</div>
		`,
	}),
};

export const Variants: Story = {
	args: {
		icon: 'circle',
	},
	render: () => ({
		components: { N8nIcon },
		template: `
			<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing--sm);">
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="primary" size="large" />
					<span style="font-size: var(--font-size--2xs);">primary</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="secondary" size="large" />
					<span style="font-size: var(--font-size--2xs);">secondary</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-dark" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-dark</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-base" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-base</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-light" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-light</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="text-xlight" size="large" />
					<span style="font-size: var(--font-size--2xs);">text-xlight</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="danger" size="large" />
					<span style="font-size: var(--font-size--2xs);">danger</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="success" size="large" />
					<span style="font-size: var(--font-size--2xs);">success</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="warning" size="large" />
					<span style="font-size: var(--font-size--2xs);">warning</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="foreground-dark" size="large" />
					<span style="font-size: var(--font-size--2xs);">foreground-dark</span>
				</div>
				<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
					<N8nIcon icon="circle" color="foreground-xdark" size="large" />
					<span style="font-size: var(--font-size--2xs);">foreground-xdark</span>
				</div>
			</div>
		`,
	}),
};
