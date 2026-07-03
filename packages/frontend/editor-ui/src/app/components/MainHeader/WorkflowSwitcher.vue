<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';

import { useRootStore } from '@n8n/stores/useRootStore';

import { VIEWS } from '@/app/constants';
import { DEBOUNCE_TIME } from '@/app/constants/durations';
import { useDebounce } from '@/app/composables/useDebounce';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useToast } from '@/app/composables/useToast';
import * as workflowDependenciesApi from '@/app/api/workflow-dependencies';

interface SwitcherItem {
	id: string;
	name: string;
	/** Parent folder name, shown inline before the workflow name. */
	folder?: string;
	active: boolean;
	isSubWorkflow: boolean;
}

const props = defineProps<{
	currentWorkflowId: string;
	projectId?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const workflowsListStore = useWorkflowsListStore();
const rootStore = useRootStore();
const { callDebounced } = useDebounce();

const open = ref(false);
const filter = ref('');
const loading = ref(false);
const workflows = ref<SwitcherItem[]>([]);
// Bumped on every fetch so a slower sub-workflow response from a stale query is
// ignored when it resolves.
let fetchToken = 0;

async function fetchWorkflows(query: string) {
	loading.value = true;
	const token = ++fetchToken;
	const trimmedQuery = query.trim() || undefined;
	try {
		const results = await workflowsListStore.searchWorkflows({
			projectId: props.projectId,
			query: trimmedQuery,
			select: ['id', 'name', 'parentFolder', 'active'],
		});
		if (token !== fetchToken) return;
		workflows.value = results.map(({ id, name, parentFolder, active }) => ({
			id,
			name,
			folder: parentFolder?.name,
			active,
			isSubWorkflow: false,
		}));
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowDetails.switcher.title'));
		return;
	} finally {
		loading.value = false;
	}

	// A workflow is a "sub-workflow" if it contains an Execute Sub-workflow
	// trigger. Resolve that from the workflow index separately so it doesn't
	// block the initial render, then patch the flags in when it arrives.
	// ponytail: endpoint caps at 500 ids; a switcher rarely lists that many, so
	// just slice — the tail simply misses its marker.
	const ids = workflows.value.slice(0, 500).map((workflow) => workflow.id);
	if (ids.length === 0) return;
	try {
		const subWorkflowIds = new Set(
			await workflowDependenciesApi.getSubWorkflowIds(rootStore.restApiContext, ids),
		);
		if (token !== fetchToken) return;
		workflows.value = workflows.value.map((workflow) => ({
			...workflow,
			isSubWorkflow: subWorkflowIds.has(workflow.id),
		}));
	} catch {
		// Non-critical enrichment; leave sub-workflow markers off on failure.
	}
}

watch(open, (isOpen) => {
	if (isOpen) {
		filter.value = '';
		void fetchWorkflows('');
	}
});

watch(filter, (query) => {
	void callDebounced(fetchWorkflows, { debounceTime: DEBOUNCE_TIME.INPUT.SEARCH }, query);
});

async function selectWorkflow(id: string) {
	open.value = false;
	if (id === props.currentWorkflowId) return;
	await router.push({ name: VIEWS.WORKFLOW, params: { workflowId: id } });
}
</script>

<template>
	<N8nPopover
		:open="open"
		:enable-scrolling="false"
		width="320px"
		data-test-id="workflow-switcher"
		@update:open="open = $event"
	>
		<template #trigger>
			<button
				type="button"
				:aria-expanded="open"
				aria-haspopup="listbox"
				:class="[$style.trigger, { [$style.triggerOpen]: open }]"
				:aria-label="i18n.baseText('workflowDetails.switcher.title')"
				data-test-id="workflow-switcher-trigger"
			>
				<N8nIcon icon="chevron-down" :class="$style.chevron" />
			</button>
		</template>

		<template #content>
			<div :class="$style.panel">
				<N8nText :class="$style.title" bold color="text-dark">{{
					i18n.baseText('workflowDetails.switcher.title')
				}}</N8nText>
				<div :class="$style.search">
					<N8nIcon icon="search" :class="$style.searchIcon" />
					<input
						v-model="filter"
						type="text"
						:placeholder="i18n.baseText('workflowDetails.switcher.search')"
						:aria-label="i18n.baseText('workflowDetails.switcher.search')"
						:class="$style.searchInput"
						data-test-id="workflow-switcher-search"
					/>
				</div>

				<div role="listbox" :class="$style.optionList">
					<button
						v-for="workflow in workflows"
						:key="workflow.id"
						type="button"
						role="option"
						:aria-selected="workflow.id === currentWorkflowId"
						:class="[$style.option, { [$style.optionSelected]: workflow.id === currentWorkflowId }]"
						:data-test-id="`workflow-switcher-option-${workflow.id}`"
						@click="selectWorkflow(workflow.id)"
					>
						<span :class="$style.indicator">
							<span v-if="workflow.active" :class="$style.activeDot" />
							<N8nIcon
								v-else-if="workflow.isSubWorkflow"
								icon="node:sub-workflow-trigger"
								size="small"
							/>
						</span>
						<span
							:class="$style.optionText"
							:title="workflow.folder ? `${workflow.folder} / ${workflow.name}` : workflow.name"
						>
							<template v-if="workflow.folder">
								<span :class="$style.optionPrefix">{{ workflow.folder }}</span>
								<span :class="$style.optionSeparator">/</span>
							</template>
							<span :class="$style.optionName">{{ workflow.name }}</span>
						</span>
					</button>

					<div v-if="!loading && !workflows.length" :class="$style.noResults">
						{{ i18n.baseText('workflowDetails.switcher.noResults') }}
					</div>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.trigger {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	padding: 0;
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.chevron {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.triggerOpen .chevron {
	transform: rotate(180deg);
}

.panel {
	padding: var(--spacing--4xs);
}

.title {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--4xs);
	font-size: var(--font-size--sm);
}

.search {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--2xs);
	border-bottom: var(--border-width) solid var(--border-color);
	margin-bottom: var(--spacing--4xs);
}

.searchIcon {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.searchInput {
	flex: 1;
	min-width: 0;
	height: 24px;
	padding: 0;
	border: none;
	outline: none;
	background: transparent;
	font-family: inherit;
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
}

.optionList {
	max-height: 280px;
	overflow-y: auto;
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;
	font-family: inherit;

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.optionSelected,
.optionSelected:hover {
	background-color: var(--color--background--light-2);
}

// Fixed-width slot so workflow names stay aligned whether or not a row has a
// status indicator.
.indicator {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	flex-shrink: 0;
}

.activeDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background-color: var(--color--mint-600);
}

.optionText {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
	min-width: 0;
	font-size: var(--font-size--sm);
	white-space: nowrap;
	overflow: hidden;
}

.optionPrefix {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
	max-width: 40%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.optionSeparator {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}

.optionName {
	color: var(--color--text--shade-1);
	overflow: hidden;
	text-overflow: ellipsis;
}

.noResults {
	padding: var(--spacing--sm) var(--spacing--2xs);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}
</style>
