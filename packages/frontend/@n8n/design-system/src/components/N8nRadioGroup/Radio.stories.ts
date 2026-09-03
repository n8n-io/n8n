import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import RadioGroup from './RadioGroup.vue';
import RadioGroupItem from './RadioGroupItem.vue';

type RadioArgs = {
	label: string;
	description: string;
	disabled: boolean;
	selected: boolean;
};

const meta = {
	title: 'Core/Radio',
	component: RadioGroupItem,
	parameters: {
		docs: {
			description: {
				component:
					'A single radio option from RadioGroup. Render it inside RadioGroup. This story wraps one item so you can inspect the control on its own.',
			},
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		label: { control: 'text' },
		description: { control: 'text' },
		disabled: { control: 'boolean' },
		selected: { control: 'boolean' },
	},
	args: {
		label: 'Label',
		description: '',
		disabled: false,
		selected: false,
	},
} satisfies Meta<RadioArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref(args.selected ? 'radio' : '');
			watch(
				() => args.selected,
				(selected) => {
					value.value = selected ? 'radio' : '';
				},
			);
			return { args, value };
		},
		template: `
			<RadioGroup v-model="value" name="radio" aria-label="Radio">
				<RadioGroupItem
					value="radio"
					:label="args.label"
					:description="args.description || undefined"
					:disabled="args.disabled"
				/>
			</RadioGroup>
		`,
	}),
};

export const States: Story = {
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--md)">
				<RadioGroup model-value="" name="radio-unchecked" aria-label="Unchecked">
					<RadioGroupItem value="radio" label="Unchecked" />
				</RadioGroup>
				<RadioGroup model-value="radio" name="radio-checked" aria-label="Checked">
					<RadioGroupItem value="radio" label="Checked" />
				</RadioGroup>
				<RadioGroup model-value="" name="radio-disabled-unchecked" aria-label="Disabled unchecked">
					<RadioGroupItem value="radio" label="Disabled unchecked" disabled />
				</RadioGroup>
				<RadioGroup model-value="radio" name="radio-disabled-checked" aria-label="Disabled checked">
					<RadioGroupItem value="radio" label="Disabled checked" disabled />
				</RadioGroup>
				<RadioGroup model-value="radio" name="radio-description" aria-label="With description">
					<RadioGroupItem
						value="radio"
						label="With description"
						description="Helper text under the label"
					/>
				</RadioGroup>
			</div>
		`,
	}),
};
