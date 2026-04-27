<script setup lang="ts">
/**
 * Add an app (toolset) to the agent. Catalog comes from APP_REGISTRY.
 * Layout mirrors AgentToolsModal — search on top, "Available apps (N)"
 * section, NodeIcon + name + description per row, Connect on the right.
 *
 * Connect expands the row to render NodeCredentials inline; once a
 * credential is picked the app is added and the modal closes.
 */
import { computed, onMounted, ref, watch } from 'vue';
import Modal from '@/app/components/Modal.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import AgentToolItem from './AgentToolItem.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { N8nHeading, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import { useDebounceFn } from '@vueuse/core';
import { NodeHelpers } from 'n8n-workflow';
import { APP_REGISTRY, type AppDefinition } from '../utils/appToolsets';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type { AgentJsonAppRef } from '../types';

const props = defineProps<{
	modalName: string;
	data: {
		apps: AgentJsonAppRef[];
		projectId?: string;
		onConfirm: (apps: AgentJsonAppRef[]) => void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();

const catalog = computed<AppDefinition[]>(() => APP_REGISTRY.filter((a) => !a.disabled));

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
	const versions = catalog.value.map((a) => ({ name: a.nodeType, version: a.nodeTypeVersion }));
	if (versions.length) await nodeTypesStore.getFullNodesProperties(versions);
});

function nodeTypeFor(def: AppDefinition) {
	return nodeTypesStore.getNodeType(def.nodeType, def.nodeTypeVersion);
}

const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const setDebouncedSearch = useDebounceFn((value: string) => {
	debouncedSearchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
watch(searchQuery, (value) => {
	void setDebouncedSearch(value);
});

const filteredApps = computed<AppDefinition[]>(() => {
	if (!debouncedSearchQuery.value) return catalog.value;
	const q = debouncedSearchQuery.value.toLowerCase();
	return catalog.value.filter((def) => {
		const nt = nodeTypeFor(def);
		const haystacks = [nt?.displayName, nt?.description, def.kind].filter(
			(s): s is string => typeof s === 'string',
		);
		return haystacks.some((s) => s.toLowerCase().includes(q));
	});
});

/** Kind currently being connected — drives the inline credential picker. */
const connectingKind = ref<string | null>(null);
const connectingDef = computed<AppDefinition | null>(
	() => catalog.value.find((a) => a.kind === connectingKind.value) ?? null,
);

/** Synthetic INodeUi NodeCredentials operates against. */
const credentialPickerNode = ref<INodeUi | null>(null);

watch(connectingDef, (def) => {
	if (!def) {
		credentialPickerNode.value = null;
		return;
	}
	const nodeType = nodeTypesStore.getNodeType(def.nodeType, def.nodeTypeVersion);
	// Resolve the node's parameter defaults so credentials gated by displayOptions
	// (e.g. Gmail's `authentication: 'oAuth2'`) actually surface in the picker.
	const baseNode: Pick<INodeUi, 'typeVersion' | 'parameters'> = {
		typeVersion: def.nodeTypeVersion,
		parameters: {},
	};
	const parameters = nodeType
		? (NodeHelpers.getNodeParameters(nodeType.properties, {}, true, false, baseNode, nodeType) ??
			{})
		: {};
	credentialPickerNode.value = {
		id: 'apps-modal-temp',
		name: 'apps-modal-temp',
		type: def.nodeType,
		typeVersion: def.nodeTypeVersion,
		position: [0, 0],
		parameters,
		credentials: {},
	} as INodeUi;
});

function close() {
	uiStore.closeModal(props.modalName);
}

function onConnect(def: AppDefinition) {
	connectingKind.value = def.kind;
}

function onCredentialSelected(payload: INodeUpdatePropertiesInformation) {
	const def = connectingDef.value;
	if (!def) return;
	const creds = payload.properties.credentials as
		| Record<string, { id: string; name: string }>
		| undefined;
	const cred = creds?.[def.credentialType];
	if (!cred?.id || !cred?.name) return;

	const next: AgentJsonAppRef = {
		kind: def.kind,
		credentialId: cred.id,
		credentialName: cred.name,
	};
	props.data.onConfirm([...props.data.apps, next]);
	close();
}
</script>

<template>
	<Modal
		:name="modalName"
		width="880px"
		:custom-class="$style.modal"
		data-test-id="agent-apps-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.apps.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<N8nInput
				v-model="searchQuery"
				:placeholder="i18n.baseText('agents.apps.search.placeholder')"
				clearable
				data-test-id="agent-apps-search"
				:class="$style.searchInput"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>

			<div :class="$style.listWrapper" data-test-id="agent-apps-list">
				<div v-if="filteredApps.length > 0" :class="$style.section">
					<N8nHeading size="small" color="text-light" tag="h3">
						{{
							i18n.baseText('agents.apps.availableApps', {
								interpolate: { count: filteredApps.length },
							})
						}}
					</N8nHeading>
					<div :class="$style.appsList" data-test-id="agent-apps-available-list">
						<template v-for="def in filteredApps" :key="def.kind">
							<AgentToolItem
								v-if="nodeTypeFor(def)"
								:node-type="nodeTypeFor(def)!"
								mode="available"
								@add="onConnect(def)"
							/>
							<div
								v-if="connectingKind === def.kind && credentialPickerNode"
								:class="$style.credentialBlock"
								data-test-id="agent-apps-credential-picker"
							>
								<NodeCredentials
									:node="credentialPickerNode"
									:standalone="true"
									:show-all="true"
									:project-id="data.projectId"
									@credential-selected="onCredentialSelected"
								/>
							</div>
						</template>
					</div>
				</div>

				<div v-else :class="$style.emptyState" data-test-id="agent-apps-empty-state">
					<N8nText color="text-light">
						{{
							debouncedSearchQuery
								? i18n.baseText('agents.apps.noResults.withQuery', {
										interpolate: { query: debouncedSearchQuery },
									})
								: i18n.baseText('agents.apps.noResults')
						}}
					</N8nText>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.modal {
	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.searchInput {
	padding: var(--spacing--sm) 0;
	width: 100%;
}

.listWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 60vh;
	overflow-y: auto;
	margin-right: calc(-1 * var(--spacing--lg));
	padding-right: var(--spacing--lg);
	padding-top: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.appsList {
	display: flex;
	flex-direction: column;
}

.credentialBlock {
	padding: 0 0 var(--spacing--sm) calc(32px + var(--spacing--sm));
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}
</style>
