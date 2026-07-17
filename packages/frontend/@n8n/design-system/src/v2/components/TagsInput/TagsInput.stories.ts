import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import { TagsInputItemDelete, TagsInputItemText } from './reka-ui';
import TagsInput from './TagsInput.vue';

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

export const ControlledUncontrolled = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { TagsInput },
		setup() {
			const value = ref(['workflow', 'production']);
			const presets = [
				{ label: 'Workflow + production', tags: ['workflow', 'production'] },
				{ label: 'Staging only', tags: ['staging'] },
				{ label: 'Clear', tags: [] as string[] },
			];
			return { value, presets };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Controlled
				</h3>
				<TagsInput
					key="controlled"
					v-model="value"
					placeholder="Add tags..."
				/>
				<div style="display: flex; gap: var(--spacing--2xs); margin-top: var(--spacing--sm); flex-wrap: wrap;">
					<button
						v-for="preset in presets"
						:key="preset.label"
						type="button"
						style="
							padding: var(--spacing--3xs) var(--spacing--xs);
							border: var(--border);
							border-radius: var(--radius--2xs);
							background: var(--background--surface);
							color: var(--text-color);
							cursor: pointer;
							font: inherit;
							font-size: var(--font-size--xs);
						"
						@click="value = [...preset.tags]"
					>
						{{ preset.label }}
					</button>
				</div>
				<p style="margin-top: var(--spacing--sm); font-size: var(--font-size--sm);">
					Selected: <strong>{{ value.length ? value.join(', ') : '(empty)' }}</strong>
				</p>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Uncontrolled
				</h3>
				<TagsInput
					key="uncontrolled"
					:default-value="['workflow', 'production']"
					placeholder="Add tags..."
				/>
			</section>
		</div>
		`,
	}),
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
			const emptyValue = ref<string[]>([]);
			const filledValue = ref(['locked', 'tag']);
			return { args, emptyValue, filledValue };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<TagsInput v-bind="args" v-model="emptyValue" placeholder="Disabled empty" />
			<TagsInput v-bind="args" v-model="filledValue" placeholder="Disabled with tags" />
		</div>
		`,
	}),
	args: {
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
							marginTop: 'var(--spacing--5xs)',
							marginInlineEnd: 'var(--spacing--4xs)',
							borderRadius: 'var(--radius--full)',
							backgroundColor: tag.color,
							flexShrink: 0,
						}"
					/>
					<TagsInputItemText :class="ui.text" />
					<TagsInputItemDelete :class="ui.delete" :disabled="disabled">
						<N8nIcon icon="x" size="small" />
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

export const Max = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const value = ref(['workflow', 'production']);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<TagsInput v-bind="args" v-model="value" :max="2" placeholder="Max 2 tags — try adding another" />
		</div>
		`,
	}),
} satisfies Story;

export const Duplicates = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const value = ref(['workflow', 'workflow', 'production']);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<TagsInput
				v-bind="args"
				v-model="value"
				:duplicate="true"
				placeholder="Duplicates allowed — add workflow again"
			/>
		</div>
		`,
	}),
} satisfies Story;

export const DuplicateToEnd = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const initialTags = ['workflow', 'production', 'staging'];
			const value = ref([...initialTags]);
			const fieldRef = ref<HTMLElement | null>(null);

			function getInput() {
				const input = fieldRef.value?.querySelector('input');
				return input instanceof HTMLInputElement ? input : null;
			}

			function tryDuplicate(tag: string) {
				const input = getInput();
				if (!input) {
					return;
				}

				input.focus();
				input.value = tag;
				input.dispatchEvent(new InputEvent('input', { bubbles: true, data: tag }));
				input.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
				);
			}

			function reset() {
				value.value = [...initialTags];
				const input = getInput();
				if (!input) {
					return;
				}

				input.value = '';
				input.dispatchEvent(new InputEvent('input', { bubbles: true, data: null }));
				input.blur();
			}

			return { args, value, fieldRef, tryDuplicate, reset, initialTags };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--sm);">
			<p style="margin: 0; color: var(--text-color--subtler); font-size: var(--font-size--xs);">
				Duplicates are blocked — adding an existing tag moves it to the end.
			</p>
			<div ref="fieldRef">
				<TagsInput
					v-bind="args"
					v-model="value"
					:duplicate="false"
					placeholder="Add tags..."
				/>
			</div>
			<div style="display: flex; flex-wrap: wrap; gap: var(--spacing--2xs);">
				<button
					v-for="tag in initialTags"
					:key="tag"
					type="button"
					style="
						padding: var(--spacing--3xs) var(--spacing--xs);
						border: var(--border);
						border-radius: var(--radius--2xs);
						background: var(--background--surface);
						color: var(--text-color);
						cursor: pointer;
						font: inherit;
						font-size: var(--font-size--xs);
					"
					@click="tryDuplicate(tag)"
				>
					Add “{{ tag }}” again
				</button>
				<button
					type="button"
					style="
						padding: var(--spacing--3xs) var(--spacing--xs);
						border: var(--border);
						border-radius: var(--radius--2xs);
						background: transparent;
						color: var(--text-color--subtler);
						cursor: pointer;
						font: inherit;
						font-size: var(--font-size--xs);
					"
					@click="reset"
				>
					Reset
				</button>
			</div>
		</div>
		`,
	}),
} satisfies Story;

export const DelimiterPaste = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const value = ref<string[]>([]);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<p style="margin: 0 0 var(--spacing--xs); color: var(--color--text--tint-1); font-size: var(--font-size--xs);">
				Type commas or paste <code>alpha,beta,gamma</code>
			</p>
			<TagsInput
				v-bind="args"
				v-model="value"
				delimiter=","
				:add-on-paste="true"
				placeholder="Add tags..."
			/>
		</div>
		`,
	}),
} satisfies Story;

export const OverflowingTag = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const tag =
				'this-is-an-extremely-long-tag-name-that-should-truncate-with-an-ellipsis-instead-of-wrapping';
			const xlargeValue = ref([tag]);
			const largeValue = ref([tag]);
			const mediumValue = ref([tag]);
			const smallValue = ref([tag]);
			const miniValue = ref([tag]);
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

type LabeledTag = { label: string };

export const ObjectTags = {
	render: (args) => ({
		components: { TagsInput },
		setup() {
			const value = ref<LabeledTag[]>([
				{ label: 'production' },
				{ label: 'billing' },
				{ label: 'critical' },
			]);
			const displayValue = (tag: LabeledTag) => tag.label;
			const convertValue = (input: string): LabeledTag => ({ label: input });
			return { args, value, displayValue, convertValue };
		},
		template: `
		<div style="${storyContainerStyle}">
			<TagsInput
				v-bind="args"
				v-model="value"
				:display-value="displayValue"
				:convert-value="convertValue"
				placeholder="Object tags via displayValue"
			/>
		</div>
		`,
	}),
} satisfies Story;
