<script setup lang="ts">
import type { SkillWorkflowMention } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
	type DropdownMenuExposed,
	type DropdownMenuItemProps,
	type DropdownMenuProps,
} from '@n8n/design-system';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { useI18n } from '@n8n/i18n';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import { useSkillWorkflowMentionSearch } from '../composables/useSkillWorkflowMentionSearch';

const GROUP_LABEL_ITEM_ID = 'group-label';
const SHOW_MORE_ITEM_ID = 'show-more';

const props = withDefaults(
	defineProps<{
		open: boolean;
		mode: 'typed' | 'button';
		query?: string;
		projectId?: string;
		projectName?: string;
		reference?: DropdownMenuProps['reference'];
		focusTarget?: HTMLElement | null;
		mentionedWorkflowIds?: string[];
		disabled?: boolean;
	}>(),
	{
		query: '',
		projectId: undefined,
		projectName: undefined,
		reference: undefined,
		focusTarget: null,
		mentionedWorkflowIds: () => [],
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:open': [open: boolean];
	select: [mention: SkillWorkflowMention];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const dropdown = useTemplateRef<DropdownMenuExposed>('dropdown');
const { workflows, isLoading, hasMore, hasError, search, loadMore } = useSkillWorkflowMentionSearch(
	() => props.projectId,
);
const searchTerm = ref('');
const mentionedIds = computed(() => new Set(props.mentionedWorkflowIds));
const isButtonMode = computed(() => props.mode === 'button');
const addLabel = computed(() => i18n.baseText('agents.builder.skills.workflowMentions.add'));

const groupLabel = computed(() =>
	props.projectName
		? i18n.baseText('agents.builder.skills.workflowMentions.groupLabelInProject', {
				interpolate: { project: props.projectName },
			})
		: i18n.baseText('agents.builder.skills.workflowMentions.groupLabel'),
);

const items = computed<Array<DropdownMenuItemProps<string, SkillWorkflowMention>>>(() => {
	if (workflows.value.length === 0) return [];
	return [
		{ id: GROUP_LABEL_ITEM_ID, label: groupLabel.value, header: true },
		...workflows.value.map((workflow) => ({
			id: workflow.workflowId,
			label: workflow.name,
			data: workflow,
			disabled: isButtonMode.value && mentionedIds.value.has(workflow.workflowId),
			testId: 'skill-workflow-mention-item',
		})),
		...(hasMore.value
			? [
					{
						id: SHOW_MORE_ITEM_ID,
						label: i18n.baseText('agents.builder.skills.workflowMentions.showMore'),
						keepOpen: true,
						divided: true,
						testId: 'skill-workflow-mention-show-more',
					},
				]
			: []),
	];
});

const emptyText = computed(() =>
	hasError.value
		? i18n.baseText('agents.builder.skills.workflowMentions.loadError')
		: i18n.baseText('agents.builder.skills.workflowMentions.noResults'),
);

async function runSearch(term: string) {
	searchTerm.value = term.trim();
	await search(term);
}

const debouncedSearch = useDebounceFn(runSearch, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

watch(
	() => props.open,
	(open) => {
		if (open) void runSearch(isButtonMode.value ? '' : props.query);
	},
	{ immediate: true },
);

watch(
	() => props.query,
	(query) => {
		if (props.open && !isButtonMode.value) void debouncedSearch(query);
	},
);

watch(
	() => workflows.value[0]?.workflowId,
	(firstWorkflowId) => {
		if (props.open && firstWorkflowId) void nextTick(() => dropdown.value?.highlightFirstItem());
	},
);

function labelParts(label: string) {
	const index = searchTerm.value ? label.toLowerCase().indexOf(searchTerm.value.toLowerCase()) : -1;
	if (index < 0) return { before: label, match: '', after: '' };
	const end = index + searchTerm.value.length;
	return { before: label.slice(0, index), match: label.slice(index, end), after: label.slice(end) };
}

function onSelect(itemId: string) {
	if (itemId === SHOW_MORE_ITEM_ID) {
		void loadMore();
		return;
	}
	const workflow = workflows.value.find(({ workflowId }) => workflowId === itemId);
	if (!workflow) return;
	emit('select', workflow);
	telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_ADDED_SKILL_WORKFLOW_MENTION, {
		source: props.mode,
		scope: props.projectId ? 'project' : 'instance',
		project_id: props.projectId,
	});
}

function handleExternalKeydown(event: KeyboardEvent): boolean {
	return dropdown.value?.handleExternalKeydown(event) ?? false;
}

defineExpose({ handleExternalKeydown });
</script>

<template>
	<N8nDropdownMenu
		ref="dropdown"
		:model-value="props.open"
		:items="items"
		:reference="props.reference"
		:disabled="props.disabled"
		:loading="isLoading && workflows.length === 0"
		:empty-text="emptyText"
		:search-mode="isButtonMode ? 'internal' : 'external'"
		:external-focus-target="props.focusTarget"
		:search-placeholder="i18n.baseText('agents.builder.skills.workflowMentions.searchPlaceholder')"
		:search-debounce="getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH)"
		:extra-popper-class="$style.menu"
		placement="bottom-start"
		max-height="320px"
		searchable
		suppress-close-auto-focus
		content-test-id="skill-workflow-mention-menu"
		@update:model-value="emit('update:open', $event)"
		@search="runSearch"
		@select="onSelect"
	>
		<template #trigger>
			<N8nTooltip v-if="isButtonMode" as-child :content="addLabel" placement="top">
				<N8nIconButton
					icon="plus"
					variant="ghost"
					size="xsmall"
					:class="$style.addButton"
					:disabled="props.disabled"
					:aria-label="addLabel"
					data-testid="skill-workflow-mention-button"
					data-attr="skill-workflow-mention-button"
				/>
			</N8nTooltip>
			<span v-else :class="$style.caretAnchor" aria-hidden="true" />
		</template>
		<template #item-leading="{ item, ui }">
			<N8nIcon v-if="item.data" icon="workflow" :class="ui.class" />
		</template>
		<template #item-label="{ item, ui }">
			<span v-if="item.data" :class="[ui.class, $style.label]"
				>{{ labelParts(item.label).before }}<strong>{{ labelParts(item.label).match }}</strong
				>{{ labelParts(item.label).after }}</span
			>
			<template v-else>{{ item.label }}</template>
		</template>
		<template #item-trailing="{ item, ui }">
			<N8nText
				v-if="item.data && item.disabled"
				:class="ui.class"
				size="small"
				color="text-light"
				data-testid="skill-workflow-mention-added"
			>
				{{ i18n.baseText('agents.builder.skills.workflowMentions.added') }}
			</N8nText>
			<N8nText
				v-else-if="item.data && !isButtonMode"
				:class="[ui.class, $style.enterHint]"
				size="small"
				color="text-light"
				aria-hidden="true"
			>
				↵
			</N8nText>
		</template>
		<template #footer>
			<N8nText
				size="small"
				color="text-light"
				:class="$style.footer"
				data-testid="skill-workflow-mention-footer"
			>
				{{
					isButtonMode
						? i18n.baseText('agents.builder.skills.workflowMentions.hint')
						: i18n.baseText('agents.builder.skills.workflowMentions.keyboardHint')
				}}
			</N8nText>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.menu {
	width: calc(var(--spacing--5xl) + var(--spacing--4xl));
}

.addButton {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
}

.caretAnchor {
	display: block;
	width: 0;
	height: 0;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	strong {
		font-weight: var(--font-weight--bold);
	}
}

.enterHint {
	visibility: hidden;
	font-family: var(--font-family--monospace);
}

:global([data-virtual-highlighted]) .enterHint,
:global([data-highlighted]) .enterHint {
	visibility: visible;
}

.footer {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--3xs);
	border-top: var(--border);
}
</style>
