<script setup lang="ts">
import type { AutomationMapDetail } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nLoading,
	N8nSwitch,
	N8nText,
	N8nTimeAgo,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import {
	deleteAutomationMap,
	fetchAutomationMap,
	refreshAutomationMap,
	updateAutomationMap,
} from '../automationMaps.api';
import type { MapSelection } from '../automationMap.types';
import { AUTOMATION_MAPS_VIEW } from '../constants';
import AutomationMapCanvas from '../components/AutomationMapCanvas.vue';
import AutomationMapDetailsPanel from '../components/AutomationMapDetailsPanel.vue';
import AutomationMapStoryPanel from '../components/AutomationMapStoryPanel.vue';

const props = defineProps<{ id: string }>();

const POLL_INTERVAL_MS = 2000;

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const nodeTypesStore = useNodeTypesStore();
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();

const map = ref<AutomationMapDetail | null>(null);
const loading = ref(true);
const selection = ref<MapSelection | null>(null);
const activeStep = ref<number | null>(null);
const search = ref('');
const showDataLinks = ref(false);
const showChanges = ref(false);
const canvas = ref<InstanceType<typeof AutomationMapCanvas> | null>(null);
let pollTimer: ReturnType<typeof setTimeout> | undefined;

const isBuilding = computed(() => map.value?.status === 'building');

const highlightedWorkflowIds = computed(() => {
	if (activeStep.value === null) return [];
	return map.value?.annotations?.steps[activeStep.value]?.workflowIds ?? [];
});

const changeCounts = computed(() => {
	const changes = map.value?.changes ?? [];
	return {
		total: changes.length,
		modified: changes.filter((change) => change.change === 'modified').length,
		added: changes.filter((change) => change.change === 'added').length,
		removed: changes.filter((change) => change.change === 'removed').length,
	};
});

async function load() {
	try {
		map.value = await fetchAutomationMap(rootStore.restApiContext, props.id);
		documentTitle.set(map.value.name);
		if (map.value.status === 'building') {
			pollTimer = setTimeout(() => void load(), POLL_INTERVAL_MS);
		}
	} catch (error) {
		showError(error, i18n.baseText('automationMaps.error.load'));
	} finally {
		loading.value = false;
	}
}

async function onRefresh() {
	if (!map.value) return;
	try {
		await refreshAutomationMap(rootStore.restApiContext, map.value.id);
		map.value = { ...map.value, status: 'building' };
		selection.value = null;
		activeStep.value = null;
		pollTimer = setTimeout(() => void load(), POLL_INTERVAL_MS);
	} catch (error) {
		showError(error, i18n.baseText('automationMaps.error.refresh'));
	}
}

async function onSave() {
	if (!map.value) return;
	try {
		map.value = await updateAutomationMap(rootStore.restApiContext, map.value.id, { saved: true });
		showMessage({ type: 'success', title: i18n.baseText('automationMaps.saved.toast') });
	} catch (error) {
		showError(error, i18n.baseText('automationMaps.error.save'));
	}
}

async function onAutoUpdateChange(value: string | number | boolean) {
	if (!map.value) return;
	try {
		map.value = await updateAutomationMap(rootStore.restApiContext, map.value.id, {
			autoUpdate: Boolean(value),
		});
	} catch (error) {
		showError(error, i18n.baseText('automationMaps.error.save'));
	}
}

async function onDelete() {
	if (!map.value) return;
	try {
		await deleteAutomationMap(rootStore.restApiContext, map.value.id);
		await router.push({ name: AUTOMATION_MAPS_VIEW });
	} catch (error) {
		showError(error, i18n.baseText('automationMaps.error.delete'));
	}
}

function onSelect(next: MapSelection | null) {
	selection.value = next;
	if (next) activeStep.value = null;
}

function selectAndCenter(next: MapSelection) {
	onSelect(next);
	const prefix = next.kind === 'workflow' ? 'wf' : next.kind === 'dataTable' ? 'dt' : 'svc';
	void canvas.value?.centerOn(`${prefix}:${next.id}`);
}

watch(activeStep, (step) => {
	if (step !== null) selection.value = null;
});

onMounted(async () => {
	await Promise.all([nodeTypesStore.loadNodeTypesIfNotLoaded(), load()]);
});

onBeforeUnmount(() => clearTimeout(pollTimer));
</script>

<template>
	<div :class="$style.view" data-test-id="automation-map-view">
		<header :class="$style.header">
			<div :class="$style.titleRow">
				<N8nIconButton
					icon="arrow-left"
					variant="ghost"
					size="small"
					:aria-label="i18n.baseText('automationMaps.back')"
					@click="router.push({ name: AUTOMATION_MAPS_VIEW })"
				/>
				<N8nIcon icon="waypoints" :size="18" :class="$style.mapIcon" />
				<div :class="$style.titleText">
					<N8nHeading tag="h1" size="large" bold>
						{{ map?.name ?? i18n.baseText('automationMaps.title') }}
					</N8nHeading>
					<N8nText v-if="map" size="xsmall" color="text-light" :class="$style.meta">
						<span>“{{ map.prompt }}”</span>
						<template v-if="map.graph">
							<span>·</span>
							<span>
								{{
									i18n.baseText('automationMaps.meta.counts', {
										interpolate: {
											workflows: String(map.counts.workflows),
											dataTables: String(map.counts.dataTables),
											services: String(map.counts.services),
										},
									})
								}}
							</span>
						</template>
						<template v-if="map.builtAt">
							<span>·</span>
							<span>
								{{ i18n.baseText('automationMaps.updated') }} <N8nTimeAgo :date="map.builtAt" />
							</span>
						</template>
					</N8nText>
				</div>
			</div>
			<div v-if="map && !isBuilding" :class="$style.toolbar">
				<N8nInput
					v-model="search"
					size="small"
					clearable
					:placeholder="i18n.baseText('automationMaps.search')"
					:class="$style.search"
					data-test-id="automation-map-search"
				>
					<template #prefix><N8nIcon icon="search" :size="14" /></template>
				</N8nInput>
				<label :class="$style.switchLabel">
					<N8nSwitch v-model="showDataLinks" size="small" />
					<N8nText size="small">{{ i18n.baseText('automationMaps.toolbar.allLinks') }}</N8nText>
				</label>
				<N8nTooltip
					v-if="map.saved"
					:content="i18n.baseText('automationMaps.toolbar.autoUpdateHint')"
					placement="bottom"
				>
					<label :class="$style.switchLabel">
						<N8nSwitch
							:model-value="map.autoUpdate"
							size="small"
							data-test-id="automation-map-auto-update"
							@update:model-value="onAutoUpdateChange"
						/>
						<N8nText size="small">{{ i18n.baseText('automationMaps.toolbar.autoUpdate') }}</N8nText>
					</label>
				</N8nTooltip>
				<N8nButton
					variant="outline"
					size="small"
					data-test-id="automation-map-refresh"
					@click="onRefresh"
				>
					<N8nIcon icon="refresh-cw" :size="12" />
					{{ i18n.baseText('automationMaps.toolbar.refresh') }}
				</N8nButton>
				<N8nButton
					v-if="!map.saved"
					variant="solid"
					size="small"
					data-test-id="automation-map-save"
					@click="onSave"
				>
					<N8nIcon icon="bookmark" :size="12" />
					{{ i18n.baseText('automationMaps.toolbar.save') }}
				</N8nButton>
				<N8nIconButton
					v-else
					icon="trash-2"
					variant="ghost"
					size="small"
					:aria-label="i18n.baseText('automationMaps.toolbar.delete')"
					@click="onDelete"
				/>
			</div>
		</header>

		<div
			v-if="map && !isBuilding && changeCounts.total > 0"
			:class="$style.changes"
			data-test-id="automation-map-changes"
		>
			<N8nIcon icon="triangle-alert" :size="14" />
			<N8nText size="small">
				{{
					i18n.baseText('automationMaps.changes.summary', {
						interpolate: { count: String(changeCounts.total) },
					})
				}}
				<span v-if="changeCounts.modified">
					{{
						i18n.baseText('automationMaps.changes.modified', {
							interpolate: { count: String(changeCounts.modified) },
						})
					}}
				</span>
				<span v-if="changeCounts.added">
					{{
						i18n.baseText('automationMaps.changes.added', {
							interpolate: { count: String(changeCounts.added) },
						})
					}}
				</span>
				<span v-if="changeCounts.removed">
					{{
						i18n.baseText('automationMaps.changes.removed', {
							interpolate: { count: String(changeCounts.removed) },
						})
					}}
				</span>
			</N8nText>
			<N8nButton variant="ghost" size="xsmall" @click="showChanges = !showChanges">
				{{
					showChanges
						? i18n.baseText('automationMaps.changes.hide')
						: i18n.baseText('automationMaps.changes.show')
				}}
			</N8nButton>
			<N8nButton variant="solid" size="xsmall" @click="onRefresh">
				{{ i18n.baseText('automationMaps.changes.update') }}
			</N8nButton>
			<div v-if="showChanges" :class="$style.changeList">
				<button
					v-for="change in map.changes"
					:key="change.workflowId"
					type="button"
					:class="$style.changeItem"
					@click="selectAndCenter({ kind: 'workflow', id: change.workflowId })"
				>
					<span :class="[$style.changeKind, $style[change.change]]">
						{{ i18n.baseText(`automationMaps.change.${change.change}`) }}
					</span>
					{{ change.name }}
				</button>
			</div>
		</div>

		<main :class="$style.main">
			<N8nLoading v-if="loading" :rows="6" :class="$style.loading" />
			<div v-else-if="isBuilding" :class="$style.building" data-test-id="automation-map-building">
				<div :class="$style.buildingIcon">
					<N8nIcon icon="waypoints" :size="32" />
				</div>
				<N8nHeading tag="h2" size="large" bold>
					{{ i18n.baseText('automationMaps.building.title') }}
				</N8nHeading>
				<N8nText color="text-light">
					{{ i18n.baseText('automationMaps.building.description') }}
				</N8nText>
				<ol :class="$style.buildingSteps">
					<li>{{ i18n.baseText('automationMaps.building.step.scope') }}</li>
					<li>{{ i18n.baseText('automationMaps.building.step.dependencies') }}</li>
					<li>{{ i18n.baseText('automationMaps.building.step.explain') }}</li>
				</ol>
			</div>
			<N8nCallout v-else-if="map?.status === 'failed'" theme="danger" :class="$style.failed">
				{{ i18n.baseText('automationMaps.failed') }} {{ map.error }}
			</N8nCallout>
			<div
				v-else-if="map?.graph && map.graph.workflows.length === 0"
				:class="$style.building"
				data-test-id="automation-map-empty"
			>
				<N8nHeading tag="h2" size="large" bold>
					{{ i18n.baseText('automationMaps.empty.title') }}
				</N8nHeading>
				<N8nText color="text-light">{{
					i18n.baseText('automationMaps.empty.description')
				}}</N8nText>
			</div>
			<template v-else-if="map?.graph">
				<AutomationMapStoryPanel
					v-model:active-step="activeStep"
					:graph="map.graph"
					:annotations="map.annotations"
					@select-workflow="selectAndCenter({ kind: 'workflow', id: $event })"
				/>
				<div :class="$style.canvasArea">
					<AutomationMapCanvas
						ref="canvas"
						:graph="map.graph"
						:annotations="map.annotations"
						:changes="map.changes"
						:selection="selection"
						:highlighted-workflow-ids="highlightedWorkflowIds"
						:search="search"
						:show-data-links="showDataLinks"
						@select="onSelect"
					/>
				</div>
				<AutomationMapDetailsPanel
					v-if="selection"
					:graph="map.graph"
					:annotations="map.annotations"
					:changes="map.changes"
					:selection="selection"
					@select="selectAndCenter"
					@close="selection = null"
				/>
			</template>
		</main>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--xs) var(--spacing--md);
	border-bottom: var(--border);
	background: var(--color--background--light-3);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.mapIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.titleText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.meta {
	display: flex;
	gap: var(--spacing--4xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
}

.search {
	width: 200px;
}

.switchLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	cursor: pointer;
	white-space: nowrap;
}

.changes {
	position: relative;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs) var(--spacing--md);
	background: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
	border-bottom: var(--border);

	span + span::before {
		content: ' · ';
	}
}

.changeList {
	position: absolute;
	top: 100%;
	left: var(--spacing--md);
	z-index: 20;
	display: flex;
	flex-direction: column;
	min-width: 320px;
	max-height: 320px;
	overflow-y: auto;
	padding: var(--spacing--3xs);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
}

.changeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: none;
	border: none;
	border-radius: var(--radius);
	text-align: left;
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.changeKind {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius);
}

.modified {
	color: var(--color--warning--shade-1);
	background: var(--color--warning--tint-2);
}

.added {
	color: var(--color--success--shade-1);
	background: var(--color--success--tint-3);
}

.removed {
	color: var(--color--danger--shade-1);
	background: var(--color--danger--tint-4);
}

.main {
	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
}

.canvasArea {
	position: relative;
	flex: 1;
	min-width: 0;
}

.loading {
	flex: 1;
	padding: var(--spacing--xl);
}

.building {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	height: 100%;
	text-align: center;
}

.buildingIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 72px;
	height: 72px;
	border-radius: 50%;
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
	animation: pulse 1.6s ease-in-out infinite;
}

.buildingSteps {
	text-align: left;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.failed {
	margin: var(--spacing--xl);
}

@keyframes pulse {
	0%,
	100% {
		transform: scale(1);
		opacity: 1;
	}

	50% {
		transform: scale(1.08);
		opacity: 0.7;
	}
}
</style>
