import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import TagsInput from './TagsInput.vue';
import { TagsInputItemDelete, TagsInputItemText } from './reka-ui';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const meta = {
	title: 'Experimental/TagsInput',
	component: TagsInput,
	tags: ['autodocs'],
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies GenericMeta<typeof TagsInput>;
export default meta;

type Story = StoryObj<typeof meta>;

const storyContainerStyle = 'padding: 40px; max-width: 400px';

export const Default = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const value = ref(args.modelValue ?? []);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<TagsInput v-bind="args" v-model="value" />
		</div>
		`,
	}),
	args: {
		modelValue: ['workflow', 'production'],
		placeholder: 'Add tags...',
	},
} satisfies Story;

export const Empty = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const xlargeValue = ref<string[]>([]);
			const largeValue = ref<string[]>([]);
			const mediumValue = ref<string[]>([]);
			const smallValue = ref<string[]>([]);
			const miniValue = ref<string[]>([]);
			return { args, xlargeValue, largeValue, mediumValue, smallValue, miniValue };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<TagsInput v-model="xlargeValue" size="xlarge" placeholder="xlarge (40px)" />
			<TagsInput v-model="largeValue" size="large" placeholder="large (36px, default)" />
			<TagsInput v-model="mediumValue" size="medium" placeholder="medium (32px)" />
			<TagsInput v-model="smallValue" size="small" placeholder="small (28px)" />
			<TagsInput v-model="miniValue" size="mini" placeholder="mini (24px)" />
		</div>
		`,
	}),
} satisfies Story;

export const Disabled = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			return { args };
		},
		template: `
		<div style="${storyContainerStyle}">
			<TagsInput v-bind="args" />
		</div>
		`,
	}),
	args: {
		modelValue: ['locked', 'tag'],
		disabled: true,
	},
} satisfies Story;

export const Multiline = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const tags = [
				'automation',
				'billing',
				'critical',
				'customer-success',
				'engineering',
				'finance',
				'marketing',
				'onboarding',
				'ops',
				'product',
				'sales',
				'support',
			];
			const xlargeValue = ref([...tags]);
			const largeValue = ref([...tags]);
			const mediumValue = ref([...tags]);
			const smallValue = ref([...tags]);
			const miniValue = ref([...tags]);
			return { args, xlargeValue, largeValue, mediumValue, smallValue, miniValue };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<TagsInput v-model="xlargeValue" size="xlarge" placeholder="xlarge (40px)" />
			<TagsInput v-model="largeValue" size="large" placeholder="large (36px, default)" />
			<TagsInput v-model="mediumValue" size="medium" placeholder="medium (32px)" />
			<TagsInput v-model="smallValue" size="small" placeholder="small (28px)" />
			<TagsInput v-model="miniValue" size="mini" placeholder="mini (24px)" />
		</div>
		`,
	}),
} satisfies Story;

export const TruncatedTag = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const tags = [
				'short',
				'ops',
				'this-is-an-extremely-long-tag-name-that-should-truncate-with-an-ellipsis-instead-of-wrapping',
				'billing',
				'product',
				'sales',
				'another-very-long-tag-label-used-to-verify-ellipsis-truncation-across-sizes',
				'engineering',
				'support',
				'marketing',
				'onboarding',
				'customer-success',
			];
			const xlargeValue = ref([...tags]);
			const largeValue = ref([...tags]);
			const mediumValue = ref([...tags]);
			const smallValue = ref([...tags]);
			const miniValue = ref([...tags]);
			return { args, xlargeValue, largeValue, mediumValue, smallValue, miniValue };
		},
		template: `
		<div style="padding: 40px; max-width: 280px; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<TagsInput v-model="xlargeValue" size="xlarge" placeholder="xlarge (40px)" />
			<TagsInput v-model="largeValue" size="large" placeholder="large (36px, default)" />
			<TagsInput v-model="mediumValue" size="medium" placeholder="medium (32px)" />
			<TagsInput v-model="smallValue" size="small" placeholder="small (28px)" />
			<TagsInput v-model="miniValue" size="mini" placeholder="mini (24px)" />
		</div>
		`,
	}),
} satisfies Story;

export const Scrollable = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const tags = [
				'automation',
				'billing',
				'critical',
				'customer-success',
				'engineering',
				'finance',
				'marketing',
				'onboarding',
				'ops',
				'product',
				'sales',
				'support',
				'workflow',
				'production',
				'staging',
				'legacy',
				'analytics',
				'compliance',
				'infrastructure',
				'security',
				'reliability',
				'release',
				'experiment',
				'growth',
			];
			const xlargeValue = ref([...tags]);
			const largeValue = ref([...tags]);
			const mediumValue = ref([...tags]);
			const smallValue = ref([...tags]);
			const miniValue = ref([...tags]);
			return { args, xlargeValue, largeValue, mediumValue, smallValue, miniValue };
		},
		template: `
		<div style="${storyContainerStyle}; --tags-input--max-height: 72px; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<TagsInput v-model="xlargeValue" size="xlarge" placeholder="xlarge (40px)" />
			<TagsInput v-model="largeValue" size="large" placeholder="large (36px, default)" />
			<TagsInput v-model="mediumValue" size="medium" placeholder="medium (32px)" />
			<TagsInput v-model="smallValue" size="small" placeholder="small (28px)" />
			<TagsInput v-model="miniValue" size="mini" placeholder="mini (24px)" />
		</div>
		`,
	}),
} satisfies Story;

export const Sizes = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const xlargeValue = ref(['workflow', 'production']);
			const largeValue = ref(['workflow', 'production']);
			const mediumValue = ref(['workflow', 'production']);
			const smallValue = ref(['workflow', 'production']);
			const miniValue = ref(['workflow', 'production']);
			return { args, xlargeValue, largeValue, mediumValue, smallValue, miniValue };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<TagsInput v-model="xlargeValue" size="xlarge" placeholder="xlarge (40px)" />
			<TagsInput v-model="largeValue" size="large" placeholder="large (36px, default)" />
			<TagsInput v-model="mediumValue" size="medium" placeholder="medium (32px)" />
			<TagsInput v-model="smallValue" size="small" placeholder="small (28px)" />
			<TagsInput v-model="miniValue" size="mini" placeholder="mini (24px)" />
		</div>
		`,
	}),
} satisfies Story;

type ColoredTag = { label: string; color: string };

export const CustomTags = {
	render: (args) => ({
		components: { TagsInput, TagsInputItemText, TagsInputItemDelete, N8nIcon },
		setup() {
			const value = ref<ColoredTag[]>(
				(args.modelValue as ColoredTag[] | undefined) ?? [
					{ label: 'production', color: 'var(--color--success)' },
					{ label: 'billing', color: 'var(--color--warning)' },
					{ label: 'critical', color: 'var(--color--danger)' },
				],
			);
			const displayValue = (tag: ColoredTag) => tag.label;
			const convertValue = (input: string): ColoredTag => ({
				label: input,
				color: 'var(--color--text--tint-1)',
			});
			return { args, value, displayValue, convertValue };
		},
		template: `
		<div style="${storyContainerStyle}">
			<TagsInput
				v-bind="args"
				v-model="value"
				:display-value="displayValue"
				:convert-value="convertValue"
			>
				<template #tag="{ value: tag, disabled, ui }">
					<span
						aria-hidden="true"
						:style="{
							width: 'var(--spacing--2xs)',
							height: 'var(--spacing--2xs)',
							borderRadius: 'var(--radius--full)',
							backgroundColor: tag.color,
							flexShrink: 0,
						}"
					/>
					<TagsInputItemText :class="ui.text" />
					<TagsInputItemDelete :class="ui.delete" :disabled="disabled">
						<N8nIcon icon="circle-x" size="small" />
					</TagsInputItemDelete>
				</template>
			</TagsInput>
		</div>
		`,
	}),
	args: {
		placeholder: 'Add tags...',
	},
} satisfies Story;
