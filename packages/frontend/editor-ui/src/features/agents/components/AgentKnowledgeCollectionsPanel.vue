<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { AgentKnowledgeCollectionDto } from '@n8n/api-types';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { VIEWS } from '@/app/constants';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	CollectionConnectionItem,
	ToolConnectionItem,
} from '@/features/shared/toolsConnection/types';
import {
	addAgentKnowledgeCollection,
	listAgentKnowledgeCollections,
	removeAgentKnowledgeCollection,
} from '@/features/agents/composables/useAgentApi';
import { useAgentProjectBreadcrumb } from '@/features/agents/composables/useAgentProjectBreadcrumb';
import AgentChipButton from './AgentChipButton.vue';
import AgentChipRow from './AgentChipRow.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
import AgentPanel from './AgentPanel.vue';
import AgentModal from './modals/AgentModal.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	disabled?: boolean;
}>();

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const { showError } = useToast();
const { projectName } = useAgentProjectBreadcrumb(computed(() => props.projectId));

const collections = ref<AgentKnowledgeCollectionDto[]>([]);
const loading = ref(false);
const pickerOpen = ref(false);
const searchQuery = ref('');

const collectionsUsedByAgent = computed(() =>
	collections.value.filter(({ usedByAgent }) => usedByAgent),
);
const pickerItems = computed<CollectionConnectionItem[]>(() =>
	collections.value.map((collection) => ({
		id: `collection:${collection.id}`,
		kind: 'collection',
		collectionId: collection.id,
		title: collection.name,
		description: collection.description,
		status: 'none',
		attached: collection.usedByAgent,
		summary: i18n.baseText('settings.context.collections.fileCount', {
			interpolate: { count: collection.fileCount },
			adjustToNumber: collection.fileCount,
		}),
	})),
);

/**
 * Collections of the current agent with an add or remove request that is still running. An agent
 * switch makes a new set, so a request from an earlier visit cannot change the current one.
 */
let busyIds = new Set<string>();
const { next: nextRead } = useLatestFetch();

/**
 * A read that returns while a request runs is dropped, because the server can answer before it
 * applies the request. The last request to finish reads the list again.
 */
async function load() {
	const { projectId, agentId } = props;
	const isLatest = nextRead();
	loading.value = true;
	try {
		const list = await listAgentKnowledgeCollections(rootStore.restApiContext, projectId, agentId);
		if (isLatest() && busyIds.size === 0) {
			collections.value = list;
		}
	} catch (error) {
		if (isLatest()) {
			showError(error, i18n.baseText('settings.context.collections.error.load'));
		}
	} finally {
		if (isLatest()) {
			loading.value = false;
		}
	}
}

watch(
	() => [props.projectId, props.agentId],
	() => {
		collections.value = [];
		busyIds = new Set();
		void load();
	},
	{ immediate: true },
);

function setUsedByAgent(collectionId: string, usedByAgent: boolean) {
	collections.value = collections.value.map((collection) =>
		collection.id === collectionId ? { ...collection, usedByAgent } : collection,
	);
}

/**
 * The change shows at once, and a failed request puts the previous state back. A second click
 * on the same collection waits for the first request, as the skill picker does.
 */
async function setMembership(collectionId: string, added: boolean) {
	if (busyIds.has(collectionId)) {
		return;
	}
	const { projectId, agentId } = props;
	const busy = busyIds;
	const isStale = () => busy !== busyIds;
	busy.add(collectionId);
	setUsedByAgent(collectionId, added);
	try {
		const request = added ? addAgentKnowledgeCollection : removeAgentKnowledgeCollection;
		await request(rootStore.restApiContext, projectId, agentId, collectionId);
	} catch (error) {
		if (isStale()) {
			return;
		}
		setUsedByAgent(collectionId, !added);
		showError(
			error,
			i18n.baseText(
				added ? 'agents.builder.collections.addError' : 'agents.builder.collections.removeError',
			),
		);
	} finally {
		// After an agent switch, the watch already read the new agent's list.
		if (!isStale()) {
			busy.delete(collectionId);
			if (busy.size === 0) {
				void load();
			}
		}
	}
}

const categoryLabels = computed(() =>
	projectName.value ? { project: projectName.value } : undefined,
);

function connectLabel() {
	return i18n.baseText('agents.builder.collections.add');
}

function connectAriaLabel(item: ToolConnectionItem) {
	return i18n.baseText('agents.builder.collections.addAriaLabel', {
		interpolate: { name: item.title },
	});
}

function onPickerToggle(item: ToolConnectionItem, added: boolean) {
	if (item.kind === 'collection') {
		void setMembership(item.collectionId, added);
	}
}

function openPicker() {
	searchQuery.value = '';
	pickerOpen.value = true;
	// Another tab can change the collections, so the picker reads them again.
	void load();
}

/** A new tab keeps the agent open. */
function openCollection(collectionId: string) {
	const { href } = router.resolve({
		name: VIEWS.KNOWLEDGE_COLLECTION,
		params: { projectId: props.projectId, collectionId },
	});
	window.open(href, '_blank', 'noopener');
}

function openManageCollections() {
	const { href } = router.resolve({ name: VIEWS.SETTINGS_CONTEXT_COLLECTIONS });
	window.open(href, '_blank', 'noopener');
}
</script>

<template>
	<AgentPanel
		:header="i18n.baseText('agents.builder.collections.title')"
		:description="i18n.baseText('agents.builder.collections.description')"
		data-testid="agent-collections-panel"
	>
		<AgentChipRow
			:label="i18n.baseText('agents.builder.collections.label')"
			:item-count="collectionsUsedByAgent.length"
			:add-label="i18n.baseText('agents.builder.collections.add')"
			add-button-test-id="agent-collections-add"
			:disabled="props.disabled"
			@add="openPicker"
		>
			<div
				v-for="collection in collectionsUsedByAgent"
				:key="collection.id"
				:class="$style.chipGroup"
			>
				<AgentItemContextMenu
					:disabled="props.disabled"
					:remove-label="i18n.baseText('agents.builder.collections.remove')"
					@remove="setMembership(collection.id, false)"
				>
					<AgentChipButton
						icon="book-open"
						:class="$style.chip"
						data-testid="agent-collections-chip"
						@click="openCollection(collection.id)"
					>
						{{ collection.name }}
					</AgentChipButton>
				</AgentItemContextMenu>
			</div>
		</AgentChipRow>

		<AgentModal
			:open="pickerOpen"
			:title="i18n.baseText('agents.builder.collections.picker.title')"
			:show-cancel="false"
			size="fit"
			data-testid="agent-collections-picker"
			@update:open="pickerOpen = $event"
		>
			<div :class="$style.picker">
				<ToolsConnectionModal
					:open="pickerOpen"
					:items="pickerItems"
					:categories="['all', 'project']"
					:category-labels="categoryLabels"
					:loading="loading && collections.length === 0"
					:search-placeholder="i18n.baseText('agents.builder.collections.picker.search')"
					:empty-message="i18n.baseText('agents.builder.collections.picker.empty')"
					:no-results-message="
						i18n.baseText('agents.builder.collections.picker.noResults', {
							interpolate: { query: searchQuery.trim() },
						})
					"
					:connect-label="connectLabel"
					:connect-aria-label="connectAriaLabel"
					embedded
					show-connect-actions
					hide-empty-categories
					iconless-rows
					persistent-scrollbar
					@update:search-query="searchQuery = $event"
					@connect="onPickerToggle($event, true)"
					@disconnect="onPickerToggle($event, false)"
				/>
			</div>

			<template #footerLeft>
				<N8nButton
					variant="ghost"
					data-testid="agent-collections-picker-manage"
					@click="openManageCollections"
				>
					<template #icon><N8nIcon icon="settings" :size="16" /></template>
					{{ i18n.baseText('agents.builder.collections.picker.manage') }}
				</N8nButton>
			</template>
		</AgentModal>
	</AgentPanel>
</template>

<style module lang="scss">
.chipGroup {
	display: inline-flex;
	min-width: 0;
	/** Truncates the chip to stop long names **/
	max-width: min(var(--spacing--5xl), 100%);

	> .chip {
		width: 100%;
	}
}

.picker {
	width: min(calc(52rem - var(--spacing--lg) * 2), calc(100dvw - var(--spacing--lg) * 5));
	height: 100%;
}
</style>
