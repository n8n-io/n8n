<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { InstanceAiSetupItem } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type { INodeParameters } from 'n8n-workflow';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';
import { useThread } from '../../instanceAi.store';
import { useSetupPanelState, type SetupPanelRow } from '../../composables/useSetupPanelState';
import {
	useSetupPanelActions,
	type SetupCredentialItem,
	type SetupPanelApplyResult,
} from '../../composables/useSetupPanelActions';
import InstanceAiSetupPanelDetail from './InstanceAiSetupPanelDetail.vue';

const props = defineProps<{
	/** The thread's active artifact workflow — the host gates rendering on it. */
	workflowId: string;
	projectId?: string;
}>();

const i18n = useI18n();
const toast = useToast();
const thread = useThread();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const projectsStore = useProjectsStore();
const { testCredentialInBackground } = useCredentialTestInBackground();

const { rows, isAgentBuilding, getNodeByName, refreshWorkflow, workflowProjectId } =
	useSetupPanelState({
		thread,
		workflowId: () => props.workflowId,
	});

const credentialProjectId = computed(() => workflowProjectId.value ?? props.projectId);
const isCredentialProjectReady = computed(() =>
	projectsStore.myProjects.some((project) => project.id === credentialProjectId.value),
);
watch(
	credentialProjectId,
	async (id) => {
		if (id && !isCredentialProjectReady.value) {
			await projectsStore.getMyProjects().catch(() => {});
		}
	},
	{ immediate: true },
);

const actions = useSetupPanelActions({
	thread,
	workflowId: () => props.workflowId,
	isAgentBuilding,
	onFlushResult: notifyApplyResult,
});

// --- Drill-down navigation (list ↔ detail swap inside the card) ---

const selectedItemId = ref<string>();
const selectedRow = computed(() => rows.value.find((row) => row.item.id === selectedItemId.value));

function itemNodeName(item: InstanceAiSetupItem): string | undefined {
	return item.kind === 'parameters'
		? item.nodeName
		: item.nodeBindings?.find((binding) => getNodeByName(binding.nodeName))?.nodeName;
}

/**
 * The workflow node behind the selected item. Unresolvable while the row feed
 * is event-only (agent mid-build, or the saved workflow still fetching) — the
 * detail closes itself and rows stop offering drill-down until it resolves.
 */
const selectedNode = computed(() => {
	const item = selectedRow.value?.item;
	const nodeName = item ? itemNodeName(item) : undefined;
	return nodeName ? getNodeByName(nodeName) : undefined;
});

function canOpenRow(row: SetupPanelRow): boolean {
	const nodeName = itemNodeName(row.item);
	return (
		nodeName !== undefined &&
		getNodeByName(nodeName) !== undefined &&
		(row.item.kind !== 'credential' || isCredentialProjectReady.value)
	);
}

function openRow(row: SetupPanelRow) {
	if (canOpenRow(row)) selectedItemId.value = row.item.id;
}

function closeDetail() {
	selectedItemId.value = undefined;
}

// --- Row rendering ---

function rowName(item: InstanceAiSetupItem): string {
	if (item.kind === 'parameters') return item.nodeName;
	return getAppNameFromCredType(
		item.appDisplayName ??
			credentialsStore.getCredentialTypeByName(item.credentialType)?.displayName ??
			item.credentialType,
	);
}

function rowNodeType(item: InstanceAiSetupItem) {
	const nodeName = itemNodeName(item);
	const node = nodeName ? getNodeByName(nodeName) : undefined;
	return node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
}

// --- Apply paths (T6 actions; row done-ness re-derives after each write) ---

const isApplying = ref(false);

async function notifyApplyResult(result: SetupPanelApplyResult) {
	if (result === 'error' || result === 'conflict') {
		toast.showMessage({ title: i18n.baseText('instanceAi.setupPanel.applyError'), type: 'error' });
	}
	if (result === 'applied' || result === 'noop' || result === 'dropped' || result === 'conflict') {
		await refreshWorkflow();
	}
}

async function onBindCredential(item: SetupCredentialItem, credentialId: string) {
	const credential = credentialsStore.getCredentialById(credentialId);
	if (!credential) return;
	void testCredentialInBackground(credential.id, credential.name, item.credentialType);
	await notifyApplyResult(
		await actions.bindCredential(item, { id: credential.id, name: credential.name }),
	);
}

async function onApplyParameters(
	nodeName: string,
	values: INodeParameters,
	baseline?: INodeParameters,
) {
	isApplying.value = true;
	try {
		await notifyApplyResult(await actions.applyParameterValues(nodeName, values, baseline));
	} finally {
		isApplying.value = false;
	}
}
</script>

<template>
	<section v-if="rows.length > 0" :class="$style.panel" data-test-id="instance-ai-setup-panel">
		<template v-if="selectedRow && selectedNode && canOpenRow(selectedRow)">
			<header :class="$style.detailHeader">
				<N8nButton
					variant="ghost"
					size="small"
					icon-only
					:aria-label="i18n.baseText('generic.back')"
					data-test-id="instance-ai-setup-panel-back"
					@click="closeDetail"
				>
					<N8nIcon icon="chevron-left" size="small" />
				</N8nButton>
				<N8nText size="medium" color="text-dark" bold>{{ rowName(selectedRow.item) }}</N8nText>
			</header>
			<InstanceAiSetupPanelDetail
				:key="selectedRow.item.id"
				:item="selectedRow.item"
				:node="selectedNode"
				:workflow-id="workflowId"
				:project-id="credentialProjectId"
				:is-applying="isApplying"
				@bind-credential="onBindCredential"
				@apply-parameters="onApplyParameters"
			/>
		</template>

		<ul v-else :class="$style.rows">
			<li v-for="row in rows" :key="row.item.id">
				<button
					type="button"
					:class="$style.row"
					:disabled="!canOpenRow(row)"
					data-test-id="instance-ai-setup-panel-row"
					@click="openRow(row)"
				>
					<CredentialIcon
						v-if="row.item.kind === 'credential'"
						:credential-type-name="row.item.credentialType"
						:size="16"
					/>
					<NodeIcon v-else :node-type="rowNodeType(row.item)" :size="16" />
					<N8nText :class="$style.rowName" size="medium" color="text-dark">
						{{ rowName(row.item) }}
					</N8nText>
					<N8nText
						v-if="row.isDone"
						:class="$style.rowStatus"
						size="small"
						color="success"
						data-test-id="instance-ai-setup-panel-row-done"
					>
						<N8nIcon icon="check" size="small" />
						{{
							i18n.baseText(
								row.item.kind === 'credential'
									? 'instanceAi.setupPanel.connected'
									: 'instanceAi.setupPanel.ready',
							)
						}}
					</N8nText>
					<N8nIcon
						v-if="canOpenRow(row)"
						icon="chevron-right"
						size="small"
						:class="$style.rowChevron"
					/>
				</button>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.rows {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius);
	background: none;
	cursor: pointer;
	text-align: left;

	&:hover:not(:disabled) {
		background-color: var(--background--hover);
	}

	&:disabled {
		cursor: default;
	}
}

.rowName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rowStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.rowChevron {
	color: var(--icon-color);
}

.detailHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
