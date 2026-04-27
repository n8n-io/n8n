<script setup lang="ts">
/**
 * Add an app (toolset) to the agent. Catalog comes from APP_REGISTRY in
 * @n8n/agents. Credential picking uses the canonical NodeCredentials
 * component (supports inline create + auto-select).
 */
import { computed, ref, watch } from 'vue';
import Modal from '@/app/components/Modal.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { APP_REGISTRY, type AppDefinition } from '@n8n/agents';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
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

const uiStore = useUIStore();

const catalog = computed<AppDefinition[]>(() => APP_REGISTRY.filter((a) => !a.disabled));

const selectedKind = ref<string | null>(null);
const selectedAppDef = computed<AppDefinition | null>(
	() => catalog.value.find((a) => a.kind === selectedKind.value) ?? null,
);

/** Synthetic INodeUi NodeCredentials operates against. Only the fields it
 *  reads matter; everything else is a placeholder. */
const credentialPickerNode = ref<INodeUi | null>(null);
const pickedCredential = ref<{ id: string; name: string } | null>(null);

watch(selectedAppDef, (def) => {
	if (!def) {
		credentialPickerNode.value = null;
		pickedCredential.value = null;
		return;
	}
	credentialPickerNode.value = {
		id: 'apps-modal-temp',
		name: 'apps-modal-temp',
		type: def.nodeType,
		typeVersion: def.nodeTypeVersion,
		position: [0, 0],
		parameters: {},
		credentials: {},
	} as INodeUi;
	pickedCredential.value = null;
});

function close() {
	uiStore.closeModal(props.modalName);
}

function onCredentialSelected(payload: INodeUpdatePropertiesInformation) {
	const def = selectedAppDef.value;
	if (!def) return;
	const creds = payload.properties.credentials as
		| Record<string, { id: string; name: string }>
		| undefined;
	const cred = creds?.[def.credentialType];
	if (cred?.id && cred?.name) {
		pickedCredential.value = { id: cred.id, name: cred.name };
	}
}

function onAdd() {
	const def = selectedAppDef.value;
	const cred = pickedCredential.value;
	if (!def || !cred) return;
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
	<Modal :name="modalName" width="520px" data-test-id="agent-apps-modal">
		<template #header>
			<N8nText size="medium" :bold="true">Add app</N8nText>
		</template>
		<template #content>
			<div :class="$style.body">
				<div :class="$style.catalog">
					<button
						v-for="def in catalog"
						:key="def.kind"
						:class="[$style.catalogItem, def.kind === selectedKind && $style.catalogItemActive]"
						type="button"
						@click="selectedKind = def.kind"
					>
						<N8nIcon :icon="def.icon as IconName" :size="20" />
						<N8nText :bold="true">{{ def.label }}</N8nText>
					</button>
				</div>
				<div v-if="selectedAppDef && credentialPickerNode" :class="$style.credentialBlock">
					<N8nText size="small" :bold="true">Credential</N8nText>
					<NodeCredentials
						:node="credentialPickerNode"
						:standalone="true"
						:show-all="true"
						:project-id="data.projectId"
						@credential-selected="onCredentialSelected"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="close">Cancel</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!selectedAppDef || !pickedCredential"
					data-testid="agent-apps-add-confirm"
					@click="onAdd"
				>
					Add
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.catalog {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.catalogItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background: transparent;
	color: inherit;
	cursor: pointer;
	text-align: left;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.catalogItemActive {
	border-color: var(--color--primary);
}

.credentialBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
