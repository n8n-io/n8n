<script
	setup
	lang="ts"
	generic="TData extends AiModelSelectorMenuItemData = AiModelSelectorMenuItemData"
>
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { Primitive } from 'reka-ui';
import { computed, getCurrentInstance, useCssModule, useTemplateRef } from 'vue';

import type {
	AiModelSelectorMenuItem,
	AiModelSelectorMenuItemData,
} from './AiModelSelectorDropdown.types';
import N8nBadge from '../N8nBadge';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

const {
	items,
	selectedLabel,
	selectedCredentialName,
	credentialsMissing = false,
	credentialsMissingLabel,
	noMatchLabel,
	horizontal = false,
	text = false,
	disabled = false,
	dataTestId,
	credentialDataTestId,
	maxSelectedNameChars,
} = defineProps<{
	items: Array<AiModelSelectorMenuItem<TData>>;
	selectedLabel: string;
	selectedCredentialName?: string;
	credentialsMissing?: boolean;
	credentialsMissingLabel: string;
	noMatchLabel: string;
	horizontal?: boolean;
	text?: boolean;
	disabled?: boolean;
	dataTestId: string;
	credentialDataTestId: string;
	maxSelectedNameChars: number;
}>();

const emit = defineEmits<{
	select: [id: string];
	/**
	 * Use this to handle custom search logic in the parent.
	 * Provide filtered `items` from the parent when handling this event.
	 */
	search: [query: string];
}>();

defineSlots<{
	'trigger-leading'?: (props: { ui: { class: string } }) => void;
	'item-leading'?: (props: { item: AiModelSelectorMenuItem<TData>; ui: { class: string } }) => void;
}>();

const dropdownRef = useTemplateRef('dropdownRef');
const $style = useCssModule();
const instance = getCurrentInstance();

const hasSearchListener = computed(() => Boolean(instance?.vnode.props?.onSearch));

const extraPopperClass = computed(() => $style.component);

const searchListenerAttrs = computed(() =>
	hasSearchListener.value && !disabled
		? { onSearch: (query: string) => emit('search', query) }
		: {},
);

function handleSelect(id: string) {
	if (disabled) return;
	emit('select', id);
}

defineExpose({
	open: () => {
		if (!disabled) dropdownRef.value?.open();
	},
});
</script>

<template>
	<N8nDropdownMenu
		ref="dropdownRef"
		:items="items"
		v-bind="searchListenerAttrs"
		teleported
		placement="bottom-start"
		:extra-popper-class="extraPopperClass"
		searchable
		:empty-text="noMatchLabel"
		@select="handleSelect"
	>
		<template #trigger>
			<Primitive
				as="button"
				:class="[
					$style.dropdownButton,
					horizontal && $style.dropdownButtonHorizontal,
					text && $style.dropdownButtonText,
				]"
				:disabled="disabled"
				:data-test-id="dataTestId"
			>
				<div :class="[$style.selected, horizontal && $style.selectedHorizontal]">
					<slot name="trigger-leading" :ui="{ class: $style.icon }" />
					<N8nText bold truncate :class="$style.selectedLabel">
						{{ truncateBeforeLast(selectedLabel, maxSelectedNameChars) }}
					</N8nText>
					<N8nText
						v-if="selectedCredentialName"
						size="small"
						bold
						color="text-light"
						:data-test-id="credentialDataTestId"
					>
						{{ truncateBeforeLast(selectedCredentialName, maxSelectedNameChars) }}
					</N8nText>
					<N8nText v-else-if="credentialsMissing" size="xsmall" color="danger">
						<N8nIcon
							icon="node-validation-error"
							size="xsmall"
							:class="$style.credentialsMissingIcon"
						/>
						{{ credentialsMissingLabel }}
					</N8nText>
				</div>
				<N8nIcon :class="$style.chevron" icon="chevron-down" size="medium" />
			</Primitive>
		</template>

		<template #item-leading="{ item, ui }">
			<slot name="item-leading" :item="item" :ui="ui" />
			<N8nIcon
				v-if="!item.data && item.icon?.type === 'icon'"
				:icon="item.icon.value"
				:class="ui.class"
				color="text-light"
				size="large"
			/>
			<span v-else-if="!item.data && item.icon?.type === 'emoji'" :class="[$style.emoji, ui.class]">
				{{ item.icon.value }}
			</span>
		</template>

		<template #item-label="{ item, ui }">
			<template v-if="item.data?.parts">
				<div :class="[$style.flattenedLabel, ui.class]">
					<template v-for="(part, index) in item.data.parts" :key="index">
						<N8nText v-if="index > 0" color="text-light" :class="$style.separator">
							<N8nIcon icon="chevron-right" size="small" />
						</N8nText>
						<N8nText
							size="medium"
							:color="index === item.data.parts.length - 1 ? 'text-dark' : 'text-base'"
						>
							{{ part }}
						</N8nText>
					</template>
				</div>
			</template>
			<div v-else :class="[$style.labelWithBadge, ui.class]">
				<N8nText size="medium" color="text-dark">{{ item.label }}</N8nText>
				<N8nBadge
					v-if="item.data?.badgeLabel"
					:class="$style.badge"
					theme="secondary"
					size="xsmall"
					:show-border="false"
				>
					{{ item.data.badgeLabel }}
				</N8nBadge>
			</div>
		</template>

		<template #item-trailing="{ item, ui }">
			<N8nTooltip
				v-if="item.data?.description"
				:content="truncateBeforeLast(item.data.description, 320, 0)"
				:class="ui.class"
				placement="left"
				:teleported="item.data.descriptionTooltipTeleported ?? true"
			>
				<N8nIcon icon="info" size="medium" color="text-light" :class="$style.infoIcon" />
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
.component {
	width: fit-content;
}

.dropdownButton {
	flex: 1;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	height: var(--height--lg);
	padding: 0 var(--spacing--xs);
	gap: var(--spacing--xs);
	border: var(--border);
	background-color: var(--background--surface);
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--sm);
	outline: none;

	&:focus-visible {
		@include focus.focus-ring;
		border-color: var(--focus--border-color) !important;
		transition: none;
	}

	&:hover {
		background-color: color-mix(in srgb, var(--background--surface) 90%, black 5%);
	}

	&:active,
	&[aria-expanded='true'],
	:global([aria-expanded='true']) & {
		background-color: color-mix(in srgb, var(--background--surface) 90%, black 10%);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

.dropdownButtonHorizontal {
	width: 100%;
	justify-content: stretch;
}

.dropdownButtonText {
	border-color: transparent;
	background-color: transparent;

	&:hover {
		background-color: var(--color--foreground);
	}
}

.credentialsMissingIcon {
	display: inline-block;
	margin-bottom: calc(-1 * var(--border-width));
}

.selected {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-start;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--2xs);
	overflow: hidden;
}

.selectedHorizontal {
	gap: var(--spacing--xs);
}

.chevron {
	color: var(--text-color--subtler);
}

.icon {
	min-width: var(--spacing--sm);
	min-height: var(--spacing--sm);
}

.infoIcon {
	flex-shrink: 0;
	margin-inline: var(--spacing--5xs);
}

.emoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.flattenedLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	overflow: hidden;
	flex-grow: 1;
	white-space: nowrap;
}

.separator {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
}

.labelWithBadge {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.labelWithBadge > :global(.n8n-text) {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.badge {
	flex-shrink: 0;
}
</style>
