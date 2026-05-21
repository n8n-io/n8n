<script
	setup
	lang="ts"
	generic="TData extends AiModelSelectorMenuItemData = AiModelSelectorMenuItemData"
>
import { computed, ref, useCssModule, useTemplateRef } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { truncateBeforeLast } from '@n8n/utils';
import type {
	AiModelSelectorMenuItem,
	AiModelSelectorMenuItemData,
} from '@/features/ai/modelSelector/types';

const {
	items,
	selectedLabel,
	selectedCredentialName,
	credentialsMissing = false,
	credentialsMissingLabel,
	noMatchLabel,
	horizontal = false,
	text = false,
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
	dataTestId: string;
	credentialDataTestId: string;
	maxSelectedNameChars: number;
}>();

const emit = defineEmits<{
	select: [id: string];
	search: [query: string];
}>();

defineSlots<{
	'trigger-leading'?: (props: { ui: { class: string } }) => void;
	'item-leading'?: (props: { item: AiModelSelectorMenuItem<TData>; ui: { class: string } }) => void;
}>();

const dropdownRef = useTemplateRef('dropdownRef');
const searchQuery = ref('');
const $style = useCssModule();

const extraPopperClass = computed(() =>
	[$style.component, searchQuery.value ? $style.searching : ''].join(' '),
);

function handleSearch(query: string) {
	searchQuery.value = query;
	emit('search', query);
}

defineExpose({
	open: () => dropdownRef.value?.open(),
});
</script>

<template>
	<N8nDropdownMenu
		ref="dropdownRef"
		:items="items"
		teleported
		placement="bottom-start"
		:extra-popper-class="extraPopperClass"
		searchable
		:empty-text="searchQuery ? noMatchLabel : undefined"
		@search="handleSearch"
		@select="emit('select', $event)"
	>
		<template #trigger>
			<N8nButton
				:variant="text ? 'ghost' : 'outline'"
				:class="[$style.dropdownButton, horizontal && $style.dropdownButtonHorizontal]"
				:text="text"
				size="large"
				:data-test-id="dataTestId"
			>
				<slot name="trigger-leading" :ui="{ class: $style.icon }" />
				<div :class="[$style.selected, horizontal && $style.selectedHorizontal]">
					<N8nText>
						{{ truncateBeforeLast(selectedLabel, maxSelectedNameChars) }}
					</N8nText>
					<N8nText
						v-if="selectedCredentialName"
						:size="horizontal ? 'small' : 'xsmall'"
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
				<N8nIcon
					:class="horizontal && $style.chevronHorizontal"
					icon="chevron-down"
					size="medium"
				/>
			</N8nButton>
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
			<N8nText v-else :class="ui.class" size="medium" color="text-dark">
				{{ item.label }}
			</N8nText>
		</template>

		<template #item-trailing="{ item, ui }">
			<N8nTooltip
				v-if="item.data?.description"
				:content="truncateBeforeLast(item.data.description, 200, 0)"
				:class="ui.class"
				:content-class="$style.tooltip"
				placement="right"
			>
				<N8nIcon icon="info" size="medium" color="text-light" :class="$style.infoIcon" />
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.component {
	z-index: var(--floating-ui--z);
	width: auto !important;
}

.dropdownButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: fit-content;
	padding-block: var(--spacing--2xs);
	text-decoration: none !important;
}

.credentialsMissingIcon {
	display: inline-block;
	margin-bottom: calc(-1 * var(--border-width));
}

.selected {
	display: flex;
	flex-direction: column;
	align-items: start;
	gap: var(--spacing--4xs);
}

.dropdownButtonHorizontal {
	width: 100%;
	display: flex;
	justify-content: stretch;
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	border-radius: var(--radius--2xs);

	> div {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	&:hover {
		border-color: var(--border-color--strong);
	}
}

.selectedHorizontal {
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--xs);
	flex: 1;
	min-width: 0;
	overflow: hidden;

	> :global(.n8n-text) {
		font-weight: var(--font-weight--bold);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.chevronHorizontal {
	align-self: flex-end;
	margin-bottom: var(--spacing--5xs);
}

.icon {
	flex-shrink: 0;
	margin-block: calc(-1 * var(--spacing--5xs));
}

.infoIcon,
.menuIcon {
	flex-shrink: 0;
}

.emoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.infoIcon {
	margin-inline: var(--spacing--5xs);
}

.tooltip {
	z-index: calc(var(--floating-ui--z) + 1) !important;
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
</style>
