<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton, N8nPopover } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type {
	InstanceAiMentionCandidate,
	InstanceAiMentionOrigin,
	InstanceAiMentionUnavailableReason,
} from './instanceAiMentions.types';

type CatalogAvailability = 'idle' | 'loading' | 'available' | 'empty' | 'error';

const props = withDefaults(
	defineProps<{
		open: boolean;
		origin?: InstanceAiMentionOrigin;
		query: string;
		candidates: InstanceAiMentionCandidate[];
		browsedWorkflow?: InstanceAiMentionCandidate;
		drillableWorkflowIds?: ReadonlySet<string>;
		workflowDetailsLoaded?: boolean;
		workflowDetailsError?: boolean;
		highlightedId?: string;
		anchor?: HTMLElement;
		availability?: CatalogAvailability;
		loading?: boolean;
		error?: boolean;
		hasMore?: boolean;
		limitReason?: 'mentions' | 'attachments';
	}>(),
	{
		browsedWorkflow: undefined,
		drillableWorkflowIds: () => new Set<string>(),
		workflowDetailsLoaded: false,
		workflowDetailsError: false,
		origin: undefined,
		highlightedId: undefined,
		anchor: undefined,
		availability: 'available',
		loading: false,
		error: false,
		hasMore: false,
		limitReason: undefined,
	},
);

const emit = defineEmits<{
	'update:open': [open: boolean];
	'update:query': [query: string];
	select: [candidate: InstanceAiMentionCandidate, position: number];
	highlight: [key: string];
	keydown: [event: KeyboardEvent];
	'browse-workflow': [candidate: InstanceAiMentionCandidate];
	'browse-workflows': [];
	retry: [];
	'retry-workflow': [];
	'load-more': [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const searchInput = ref<HTMLInputElement>();
const listboxId = 'instance-ai-mention-listbox';
const hasNodeCandidates = computed(() =>
	props.candidates.some((candidate) => candidate.kind === 'node'),
);
const isSearchMode = computed(() => props.query.trim().length > 0);
const isBrowseMode = computed(() => !isSearchMode.value && props.browsedWorkflow !== undefined);
const isWorkflowRoot = computed(() => !isSearchMode.value && !props.browsedWorkflow);
const isWorkflowDetailsLoading = computed(
	() => isBrowseMode.value && !props.workflowDetailsLoaded && !props.workflowDetailsError,
);

const candidatePositions = computed(
	() => new Map(props.candidates.map((candidate, index) => [candidate.key, index])),
);

function optionId(candidate: InstanceAiMentionCandidate): string {
	return `instance-ai-mention-${candidate.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function typeLabel(candidate: InstanceAiMentionCandidate): string {
	return i18n.baseText(
		candidate.kind === 'canvas-group'
			? 'instanceAi.mentions.type.canvasGroup'
			: `instanceAi.mentions.type.${candidate.kind}`,
	);
}

function canBrowseWorkflow(candidate: InstanceAiMentionCandidate): boolean {
	return (
		isWorkflowRoot.value &&
		candidate.kind === 'workflow' &&
		props.drillableWorkflowIds.has(candidate.workflowId)
	);
}

const unavailableKey: Record<InstanceAiMentionUnavailableReason, BaseTextKey> = {
	selected: 'instanceAi.mentions.unavailable.selected',
	'node-unavailable': 'instanceAi.mentions.unavailable.node',
	'group-unavailable': 'instanceAi.mentions.unavailable.group',
	'group-too-large': 'instanceAi.mentions.unavailable.groupTooLarge',
};

function unavailableLabel(candidate: InstanceAiMentionCandidate): string | undefined {
	return candidate.unavailableReason
		? i18n.baseText(unavailableKey[candidate.unavailableReason])
		: undefined;
}

const activeOptionId = computed(() => {
	const candidate = props.candidates.find(({ key }) => key === props.highlightedId);
	return candidate ? optionId(candidate) : undefined;
});

function handleSelect(candidate: InstanceAiMentionCandidate): void {
	if (!candidate.source || candidate.unavailableReason) return;
	emit('select', candidate, candidatePositions.value.get(candidate.key) ?? 0);
}

function handleSearchInput(event: Event): void {
	const target = event.target;
	if (target instanceof HTMLInputElement) emit('update:query', target.value);
}

watch([() => props.open, hasNodeCandidates], async ([open, hasNodes]) => {
	if (open && hasNodes) await nodeTypesStore.loadNodeTypesIfNotLoaded();
});

watch(
	() => props.open,
	async (open) => {
		if (!open) return;
		if (props.origin === 'button') {
			await nextTick();
			searchInput.value?.focus();
		}
	},
);
</script>

<template>
	<N8nPopover
		:open="open"
		:reference="anchor"
		side="top"
		:side-flip="true"
		align="end"
		width="min(calc(var(--spacing--5xl) * 3), calc(100vw - var(--spacing--lg)))"
		max-height="calc(var(--spacing--5xl) * 5)"
		:enable-scrolling="false"
		:suppress-auto-focus="origin === 'typed'"
		@update:open="emit('update:open', $event)"
	>
		<template #trigger>
			<slot name="trigger" />
		</template>
		<template #content>
			<div :class="$style.picker" data-test-id="instance-ai-mention-picker">
				<input
					v-if="origin === 'button'"
					ref="searchInput"
					:class="$style.search"
					type="text"
					:value="query"
					:placeholder="i18n.baseText('instanceAi.mentions.picker.search')"
					role="combobox"
					:aria-expanded="open"
					:aria-controls="listboxId"
					:aria-activedescendant="activeOptionId"
					@input="handleSearchInput"
					@keydown="emit('keydown', $event)"
				/>
				<button
					v-if="isBrowseMode"
					type="button"
					:class="$style.workflowBack"
					tabindex="-1"
					:aria-label="i18n.baseText('instanceAi.mentions.picker.backToWorkflows')"
					@mousedown.prevent
					@click="emit('browse-workflows')"
				>
					<N8nIcon icon="chevron-left" size="small" />
					<span>{{ browsedWorkflow?.label }}</span>
				</button>

				<div v-if="limitReason" :class="$style.state" role="status">
					{{ i18n.baseText(`instanceAi.mentions.limit.${limitReason}`) }}
				</div>
				<div v-else-if="isWorkflowDetailsLoading" :class="$style.state" role="status">
					{{ i18n.baseText('instanceAi.mentions.picker.loadingWorkflow') }}
				</div>
				<div v-else-if="isBrowseMode && workflowDetailsError" :class="$style.state" role="alert">
					<span>{{ i18n.baseText('instanceAi.mentions.picker.workflowError') }}</span>
					<N8nButton size="small" variant="subtle" @click="emit('retry-workflow')">
						{{ i18n.baseText('instanceAi.mentions.picker.retry') }}
					</N8nButton>
				</div>
				<div
					v-else-if="
						!isBrowseMode && (availability === 'loading' || loading) && candidates.length === 0
					"
					:class="$style.state"
					role="status"
				>
					{{ i18n.baseText('instanceAi.mentions.picker.loading') }}
				</div>
				<div
					v-else-if="!isBrowseMode && availability === 'empty'"
					:class="$style.state"
					role="status"
				>
					{{ i18n.baseText('instanceAi.mentions.picker.emptyProject') }}
				</div>
				<div
					v-else-if="
						!isBrowseMode && (availability === 'error' || error) && candidates.length === 0
					"
					:class="$style.state"
					role="alert"
				>
					<span>{{ i18n.baseText('instanceAi.mentions.picker.error') }}</span>
					<N8nButton size="small" variant="subtle" @click="emit('retry')">
						{{ i18n.baseText('instanceAi.mentions.picker.retry') }}
					</N8nButton>
				</div>
				<div
					v-else-if="isBrowseMode && workflowDetailsLoaded && candidates.length === 0"
					:class="$style.state"
					role="status"
				>
					{{ i18n.baseText('instanceAi.mentions.picker.emptyWorkflow') }}
				</div>
				<div v-else-if="candidates.length === 0" :class="$style.state" role="status">
					{{ i18n.baseText('instanceAi.mentions.picker.noResults') }}
				</div>
				<div v-else :id="listboxId" :class="$style.listbox" role="listbox">
					<div
						v-if="!isBrowseMode && (availability === 'loading' || loading)"
						:class="$style.inlineState"
						role="status"
					>
						{{ i18n.baseText('instanceAi.mentions.picker.loading') }}
					</div>
					<div
						v-if="!isBrowseMode && (availability === 'error' || error)"
						:class="$style.inlineState"
						role="alert"
					>
						<span>{{ i18n.baseText('instanceAi.mentions.picker.error') }}</span>
						<N8nButton size="small" variant="subtle" @click="emit('retry')">
							{{ i18n.baseText('instanceAi.mentions.picker.retry') }}
						</N8nButton>
					</div>
					<div v-if="isWorkflowRoot" :class="$style.sectionLabel">
						{{ i18n.baseText('instanceAi.mentions.picker.workflows') }}
					</div>
					<div
						v-for="candidate in candidates"
						:key="candidate.key"
						:class="[$style.optionRow, { [$style.highlighted]: candidate.key === highlightedId }]"
						@mouseenter="emit('highlight', candidate.key)"
					>
						<button
							:id="optionId(candidate)"
							type="button"
							:class="$style.option"
							role="option"
							:aria-disabled="!candidate.source || Boolean(candidate.unavailableReason)"
							:aria-selected="candidate.unavailableReason === 'selected'"
							tabindex="-1"
							:aria-label="`${candidate.label}, ${typeLabel(candidate)}${candidate.parentLabel ? `, ${candidate.parentLabel}` : ''}${unavailableLabel(candidate) ? `, ${unavailableLabel(candidate)}` : ''}`"
							:title="unavailableLabel(candidate)"
							@mousedown.prevent
							@click="handleSelect(candidate)"
						>
							<template v-if="isSearchMode && candidate.kind !== 'workflow'">
								<span :class="$style.parentName">{{ candidate.parentLabel }}</span>
								<N8nIcon :class="$style.breadcrumbSeparator" icon="chevron-right" size="xsmall" />
							</template>
							<span :class="$style.icon">
								<N8nIcon v-if="candidate.kind === 'workflow'" icon="workflow" />
								<N8nIcon v-else-if="candidate.kind === 'canvas-group'" icon="layers" />
								<NodeIcon
									v-else
									:node-type="
										candidate.node
											? nodeTypesStore.getNodeType(candidate.node.type, candidate.node.typeVersion)
											: null
									"
									:size="16"
								/>
							</span>
							<span :class="$style.name">{{ candidate.label }}</span>
						</button>
						<N8nIconButton
							v-if="canBrowseWorkflow(candidate)"
							icon="chevron-right"
							icon-size="medium"
							size="small"
							variant="ghost"
							:class="$style.drillButton"
							tabindex="-1"
							:title="
								i18n.baseText('instanceAi.mentions.picker.openWorkflow', {
									interpolate: { workflow: candidate.label },
								})
							"
							:aria-label="
								i18n.baseText('instanceAi.mentions.picker.openWorkflow', {
									interpolate: { workflow: candidate.label },
								})
							"
							:data-test-id="`instance-ai-mention-browse-${candidate.workflowId}`"
							@mousedown.stop.prevent
							@click.stop="emit('browse-workflow', candidate)"
						/>
					</div>
					<N8nButton
						v-if="hasMore && !isBrowseMode"
						:class="$style.loadMore"
						size="small"
						variant="ghost"
						@click="emit('load-more')"
					>
						{{ i18n.baseText('instanceAi.mentions.picker.loadMore') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.picker {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.search {
	margin: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--sm);
	background: var(--background--surface);
	color: var(--color--text);
	font: inherit;

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

.workflowBack {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	border-bottom: var(--border);
	background: transparent;
	color: var(--color--text);
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.listbox {
	max-height: calc(var(--spacing--5xl) * 4);
	overflow-y: auto;
	padding: var(--spacing--3xs);
}

.sectionLabel {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
}

.optionRow {
	display: flex;
	align-items: center;
	border-radius: var(--radius--sm);

	&:hover,
	&.highlighted {
		background: var(--color--background--light-2);
	}
}

.option {
	display: flex;
	flex: 1 1 auto;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs);
	border: none;
	background: transparent;
	color: var(--color--text);
	text-align: left;
	cursor: pointer;

	&[aria-disabled='true'] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.icon {
	display: inline-flex;
	flex: 0 0 auto;
}

.drillButton {
	flex: 0 0 auto;
}

.parentName,
.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.parentName {
	flex: 0 1 auto;
	color: var(--color--text--tint-1);
}

.breadcrumbSeparator {
	flex: 0 0 auto;
	color: var(--color--text--tint-1);
}

.name {
	flex: 1 1 auto;
	min-width: 0;
	font-size: var(--font-size--sm);
}

.state {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--5xl);
	padding: var(--spacing--lg);
	color: var(--color--text--tint-1);
	text-align: center;
}

.inlineState {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.loadMore {
	width: 100%;
	margin-top: var(--spacing--3xs);
}
</style>
