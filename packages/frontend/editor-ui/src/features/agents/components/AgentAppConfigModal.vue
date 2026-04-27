<script setup lang="ts">
import { computed, onMounted } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nBadge, N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import {
	buildOperationsFromDescription,
	findAppDefinition,
	type AppDefinition,
	type AppOperationStatus,
	type OperationEntry,
} from '@n8n/agents';
import type { AgentJsonAppRef } from '../types';
import { useCredentialScopes } from '../composables/useCredentialScopes';

const props = defineProps<{
	modalName: string;
	data: {
		app: AgentJsonAppRef;
		onRemove: () => void;
	};
}>();

const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();

const appDef = computed<AppDefinition | null>(() => findAppDefinition(props.data.app.kind) ?? null);

onMounted(() => {
	void nodeTypesStore.loadNodeTypesIfNotLoaded();
});

const nodeType = computed(() => {
	const def = appDef.value;
	if (!def) return null;
	return nodeTypesStore.getNodeType(def.nodeType, def.nodeTypeVersion);
});

const {
	scopes,
	loading: scopesLoading,
	error: scopesError,
} = useCredentialScopes(computed(() => props.data.app.credentialId));

const operations = computed<OperationEntry[]>(() => {
	const def = appDef.value;
	if (!def) return [];
	return buildOperationsFromDescription(nodeType.value, def, scopes.value);
});

const operationsByResource = computed(() => {
	const groups = new Map<string, OperationEntry[]>();
	for (const op of operations.value) {
		const list = groups.get(op.resource) ?? [];
		list.push(op);
		groups.set(op.resource, list);
	}
	return [...groups.entries()].map(([resource, ops]) => ({ resource, ops }));
});

const appLabel = computed(() => appDef.value?.label ?? props.data.app.kind);
const appIcon = computed<IconName>(() => (appDef.value?.icon ?? 'help-circle') as IconName);

function close() {
	uiStore.closeModal(props.modalName);
}

function handleRemove() {
	props.data.onRemove();
	close();
}

function statusBadgeTheme(
	status: AppOperationStatus | undefined,
): 'success' | 'warning' | 'danger' | undefined {
	if (status === 'available') return 'success';
	if (status === 'caution') return 'warning';
	if (status === 'missing-scope') return 'danger';
	return undefined;
}

function statusBadgeLabel(status: AppOperationStatus | undefined): string {
	if (status === 'available') return 'Available';
	if (status === 'caution') return 'Caution';
	if (status === 'missing-scope') return 'Missing scope';
	return '';
}
</script>

<template>
	<Modal :name="modalName" width="640px" data-test-id="agent-app-config-modal">
		<template #header>
			<div :class="$style.header">
				<N8nIcon :icon="appIcon" :size="22" :class="$style.headerIcon" />
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
					<N8nText v-if="scopesError" size="small" color="danger" :class="$style.note">
						Couldn't read credential scopes. Status badges are unavailable.
					</N8nText>
					<N8nText v-else-if="scopesLoading" size="small" color="text-light" :class="$style.note">
						Loading credential scopes…
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
								:data-status="op.status"
							>
								<div :class="$style.opLabels">
									<N8nText :bold="true" :class="$style.opName">{{ op.displayName }}</N8nText>
									<N8nText size="small" color="text-light" :class="$style.opDescription">
										{{ op.description }}
									</N8nText>
								</div>
								<code :class="$style.opCode">{{ op.name }}</code>
								<N8nTooltip v-if="op.status" :content="op.statusReason" placement="top">
									<N8nBadge :theme="statusBadgeTheme(op.status)">
										{{ statusBadgeLabel(op.status) }}
									</N8nBadge>
								</N8nTooltip>
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
