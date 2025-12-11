import type { Meta, StoryObj } from '@storybook/vue3-vite';

import { SKELETON_VARIANTS } from './Loading.types';
import Loading from './Loading.vue';

const meta = {
	title: 'Components V2/Loading',
	component: Loading,
	parameters: {
		docs: {
			description: {
				component:
					'Displays loading placeholders (skeleton screens) while content is being fetched or processed.',
			},
		},
	},
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: SKELETON_VARIANTS,
			description: 'Visual variant determining the shape and style of skeleton items',
		},
		rows: {
			control: { type: 'number', min: 1, max: 10 },
			description: 'Number of skeleton rows to display',
		},
		cols: {
			control: { type: 'number', min: 0, max: 10 },
			description: 'Number of skeleton columns to display (overrides row-based layout when > 0)',
		},
		animated: {
			control: { type: 'boolean' },
			description: 'Controls whether the skeleton shows pulsing animation',
		},
		loading: {
			control: { type: 'boolean' },
			description: 'Controls whether the loading skeleton is displayed',
		},
		shrinkLast: {
			control: { type: 'boolean' },
			description:
				"Whether to shrink the last row to a shorter width (only for 'h1' and 'p' variants when rows > 1)",
		},
	},
} satisfies Meta<typeof Loading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: 'p',
		rows: 3,
		animated: true,
		loading: true,
		shrinkLast: true,
	},
};

export const Variants: Story = {
	render: () => ({
		components: { Loading },
		setup() {
			return { variants: SKELETON_VARIANTS };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: 24px;">
				<div v-for="variant in variants" :key="variant" style="display: flex; align-items: center; gap: 16px;">
					<code style="width: 80px; font-size: 12px;">{{ variant }}</code>
					<div style="flex: 1; max-width: 300px;">
						<Loading :variant="variant" />
					</div>
				</div>
			</div>
		`,
	}),
};

export const WithRows: Story = {
	render: () => ({
		components: { Loading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 24px;">
				<div>
					<h4 style="margin-bottom: 8px;">1 row (default)</h4>
					<Loading variant="p" :rows="1" />
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">3 rows</h4>
					<Loading variant="p" :rows="3" />
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">5 rows</h4>
					<Loading variant="p" :rows="5" />
				</div>
			</div>
		`,
	}),
};

export const WithColumns: Story = {
	render: () => ({
		components: { Loading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 24px;">
				<div>
					<h4 style="margin-bottom: 8px;">3 columns</h4>
					<div style="display: flex; gap: 8px;">
						<Loading :cols="3" variant="rect" />
					</div>
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">5 columns</h4>
					<div style="display: flex; gap: 8px;">
						<Loading :cols="5" variant="rect" />
					</div>
				</div>
			</div>
		`,
	}),
};

export const ShrinkLastBehavior: Story = {
	render: () => ({
		components: { Loading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 24px;">
				<div>
					<h4 style="margin-bottom: 8px;">h1 variant with shrinkLast=true (40% width)</h4>
					<Loading variant="h1" :rows="3" :shrink-last="true" />
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">h1 variant with shrinkLast=false</h4>
					<Loading variant="h1" :rows="3" :shrink-last="false" />
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">p variant with shrinkLast=true (61% width)</h4>
					<Loading variant="p" :rows="3" :shrink-last="true" />
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">p variant with shrinkLast=false</h4>
					<Loading variant="p" :rows="3" :shrink-last="false" />
				</div>
			</div>
		`,
	}),
};

export const AnimationControl: Story = {
	render: () => ({
		components: { Loading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 24px;">
				<div>
					<h4 style="margin-bottom: 8px;">Animated (default)</h4>
					<Loading variant="p" :rows="2" :animated="true" />
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">Static (no animation)</h4>
					<Loading variant="p" :rows="2" :animated="false" />
				</div>
			</div>
		`,
	}),
};

export const CustomVariant: Story = {
	render: () => ({
		components: { Loading },
		template: `
			<div style="width: 200px; height: 100px; border: 1px dashed #ccc;">
				<Loading variant="custom" />
			</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story: 'The custom variant renders at 100% width and height, filling its parent container.',
			},
		},
	},
};

export const ConditionalLoading: Story = {
	render: () => ({
		components: { Loading },
		setup() {
			return {};
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: 24px;">
				<div>
					<h4 style="margin-bottom: 8px;">loading=true</h4>
					<Loading variant="p" :rows="2" :loading="true" />
				</div>
				<div>
					<h4 style="margin-bottom: 8px;">loading=false (hidden)</h4>
					<div style="border: 1px dashed #ccc; padding: 8px; min-height: 40px;">
						<Loading variant="p" :rows="2" :loading="false" />
						<span>Content is visible when loading=false</span>
					</div>
				</div>
			</div>
		`,
	}),
};

export const ShapeVariants: Story = {
	render: () => ({
		components: { Loading },
		template: `
			<div style="display: flex; gap: 24px; align-items: center;">
				<div style="text-align: center;">
					<Loading variant="circle" />
					<p style="margin-top: 8px; font-size: 12px;">circle</p>
				</div>
				<div style="text-align: center;">
					<Loading variant="rect" />
					<p style="margin-top: 8px; font-size: 12px;">rect</p>
				</div>
				<div style="text-align: center;">
					<Loading variant="button" />
					<p style="margin-top: 8px; font-size: 12px;">button</p>
				</div>
				<div style="text-align: center;">
					<Loading variant="image" />
					<p style="margin-top: 8px; font-size: 12px;">image</p>
				</div>
			</div>
		`,
	}),
};

export const TextVariants: Story = {
	render: () => ({
		components: { Loading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
				<div>
					<code style="font-size: 12px;">h1</code>
					<Loading variant="h1" />
				</div>
				<div>
					<code style="font-size: 12px;">h3</code>
					<Loading variant="h3" />
				</div>
				<div>
					<code style="font-size: 12px;">p</code>
					<Loading variant="p" />
				</div>
				<div>
					<code style="font-size: 12px;">text</code>
					<Loading variant="text" />
				</div>
				<div>
					<code style="font-size: 12px;">caption</code>
					<Loading variant="caption" />
				</div>
			</div>
		`,
	}),
};
