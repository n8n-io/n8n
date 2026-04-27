<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { N8nButton, N8nText } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { findAppDefinition, type AppDefinition } from '../utils/appToolsets';
import type { AgentJsonAppRef } from '../types';
import type { AgentAppOperationDto } from '@n8n/api-types';
import { listAppOperations } from '../composables/useAgentApi';

const props = defineProps<{
	modalName: string;
	data: {
		app: AgentJsonAppRef;
		projectId: string;
		onRemove: () => void;
	};
}>();

const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();
const rootStore = useRootStore();

const appDef = computed<AppDefinition | null>(() => findAppDefinition(props.data.app.kind) ?? null);

const nodeType = computed(() => {
	const def = appDef.value;
	if (!def) return null;
	return nodeTypesStore.getNodeType(def.nodeType, def.nodeTypeVersion);
});

const operations = ref<AgentAppOperationDto[]>([]);
const loading = ref(false);
const error = ref<Error | null>(null);

async function loadOperations() {
	const def = appDef.value;
	if (!def) return;
	loading.value = true;
	error.value = null;
	try {
		const response = await listAppOperations(
			rootStore.restApiContext,
			props.data.projectId,
			def.kind,
		);
		operations.value = response.operations;
	} catch (e) {
		error.value = e instanceof Error ? e : new Error(String(e));
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	const def = appDef.value;
	if (!def) return;
	// NodeIcon needs the loaded node type for its display source.
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
	await loadOperations();
});

const operationsByResource = computed(() => {
	const groups = new Map<string, AgentAppOperationDto[]>();
	for (const op of operations.value) {
		const list = groups.get(op.resource) ?? [];
		list.push(op);
		groups.set(op.resource, list);
	}
	return [...groups.entries()].map(([resource, ops]) => ({ resource, ops }));
});

const appLabel = computed(() => nodeType.value?.displayName ?? props.data.app.kind);

function close() {
	uiStore.closeModal(props.modalName);
}

function handleRemove() {
	props.data.onRemove();
	close();
}
</script>

<template>
	<Modal :name="modalName" width="640px" data-test-id="agent-app-config-modal">
		<template #header>
			<div :class="$style.header">
				<NodeIcon :node-type="nodeType" :size="22" :class="$style.headerIcon" />
				<div :class="$style.headerText">
					<N8nText size="medium" :bold="true">{{ appLabel }}</N8nText>
					<N8nText size="small" color="text-light">
						Credential: {{ data.app.credentialName }}
					</N8nText>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.contentWrapper">
				<div v-if="!appDef" :class="$style.empty">
					<N8nText size="small" color="text-light">
						This app ({{ data.app.kind }}) is not registered on this instance.
					</N8nText>
				</div>
				<template v-else>
					<div :class="$style.sectionHeader">
						<N8nText :bold="true">Available operations</N8nText>
						<N8nText size="small" color="text-light">{{ operations.length }} total</N8nText>
					</div>
					<N8nText v-if="error" size="small" color="danger" :class="$style.note">
						Couldn't load operations.
					</N8nText>
					<N8nText v-else-if="loading" size="small" color="text-light" :class="$style.note">
						Loading operations…
					</N8nText>

					<div v-for="group in operationsByResource" :key="group.resource" :class="$style.group">
						<N8nText size="small" color="text-light" :class="$style.groupHeader">
							{{ group.resource.toUpperCase() }}
						</N8nText>
						<div :class="$style.opRows">
							<div
								v-for="op in group.ops"
								:key="op.name"
								:class="$style.opRow"
								data-testid="agent-app-operation-row"
							>
								<div :class="$style.opLabels">
									<N8nText :bold="true" :class="$style.opName">{{ op.displayName }}</N8nText>
									<N8nText size="small" color="text-light" :class="$style.opDescription">
										{{ op.description }}
									</N8nText>
								</div>
								<code :class="$style.opCode">{{ op.name }}</code>
							</div>
						</div>
					</div>

					<div v-if="operations.length === 0" :class="$style.empty">
						<N8nText size="small" color="text-light">
							No operations available. The node type may still be loading.
						</N8nText>
					</div>
				</template>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" type="danger" @click="handleRemove">Remove app</N8nButton>
				<N8nButton variant="solid" @click="close">Close</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.headerIcon {
	flex-shrink: 0;
	color: var(--color--primary);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.contentWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	max-height: 70vh;
	overflow-y: auto;
}

.sectionHeader {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
}

.note {
	margin-bottom: var(--spacing--2xs);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.groupHeader {
	letter-spacing: 0.06em;
	margin-top: var(--spacing--2xs);
}

.opRows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.opRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
}

.opLabels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.opName,
.opDescription {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.opCode {
	font-family: monospace;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--background--light-2);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	flex-shrink: 0;
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}
</style>
