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
import { useI18n } from '../../composables/useI18n';
import N8nBadge from '../N8nBadge';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

const MAX_SELECTED_NAME_CHARS = 30;

const {
	items,
	selectedLabel,
	selectedCredentialName,
	credentialsMissing = false,
	credentialsMissingLabel,
	noMatchLabel,
	showBorder = true,
	disabled = false,
	dataTestId,
	credentialDataTestId,
} = defineProps<{
	/** Menu items to render in the dropdown. */
	items: Array<AiModelSelectorMenuItem<TData>>;
	/** Label for the currently selected model shown in the trigger. */
	selectedLabel: string;
	/** Credential name shown below the selected model, when available. */
	selectedCredentialName?: string;
	/** Whether to show the missing-credentials state in the trigger. */
	credentialsMissing?: boolean;
	/** Text shown when credentials are required but missing. */
	credentialsMissingLabel?: string;
	/** Empty-state text shown when search returns no matching items. */
	noMatchLabel: string;
	/** Whether the trigger button should render with a border. */
	showBorder?: boolean;
	/** Whether the trigger is disabled and cannot open the dropdown. */
	disabled?: boolean;
	/** Test id applied to the trigger button. */
	dataTestId: string;
	/** Test id applied to the selected credential label. */
	credentialDataTestId: string;
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
const { t } = useI18n();

const resolvedCredentialsMissingLabel = computed(
	() => credentialsMissingLabel ?? t('aiModelSelector.credentialsMissing'),
);
const hasSearchListener = computed(() => Boolean(instance?.vnode.props?.onSearch));

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
		:empty-text="noMatchLabel"
		v-bind="searchListenerAttrs"
		placement="bottom-start"
		teleported
		searchable
		@select="handleSelect"
	>
		<template #trigger>
			<Primitive
				as="button"
				:class="[$style.dropdownButton, !showBorder && $style.dropdownButtonBorderless]"
				:disabled="disabled"
				:data-test-id="dataTestId"
			>
				<div :class="$style.selected">
					<slot name="trigger-leading" :ui="{ class: $style.icon }" />
					<div :class="$style.selectedLabel">
						<N8nText bold truncate>
							{{ truncateBeforeLast(selectedLabel, MAX_SELECTED_NAME_CHARS) }}
						</N8nText>
						<N8nBadge
							v-if="credentialsMissing"
							theme="danger"
							size="small"
							:class="$style.credsBadge"
						>
							{{ resolvedCredentialsMissingLabel }}
						</N8nBadge>
						<N8nText
							v-else-if="selectedCredentialName"
							bold
							color="text-light"
							:data-test-id="credentialDataTestId"
						>
							{{ truncateBeforeLast(selectedCredentialName, MAX_SELECTED_NAME_CHARS) }}
						</N8nText>
					</div>
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
				placement="right"
				:teleported="item.data?.descriptionTooltipTeleported ?? true"
			>
				<N8nIcon icon="info" size="medium" color="text-light" :class="$style.infoIcon" />
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

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

.dropdownButtonBorderless {
	border-color: transparent;
	background-color: transparent;

	&:hover {
		background-color: var(--color--foreground);
	}
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

.selectedLabel {
	display: flex;
	align-items: baseline;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--3xs);
	overflow: hidden;
	transform: translateY(1px);
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

.credsBadge {
	flex-shrink: 0;
	transform: translateY(-1px);
}
</style>
