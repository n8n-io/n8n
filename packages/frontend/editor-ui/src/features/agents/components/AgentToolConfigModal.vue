<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useTypeAvailability } from '@n8n/frontend-module-type-availability-policies';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import { AGENT_GUARDRAIL_MODAL_KEY } from '../constants';
import type { OpenGuardrailRequest } from './AgentToolGuardrailsSection.vue';
import AgentModal from './modals/AgentModal.vue';
import AgentToolConfigContent, { type AgentToolConfigData } from './AgentToolConfigContent.vue';
import AgentToolConfigCredentialPicker from './AgentToolConfigCredentialPicker.vue';
import AgentToolConfigTitleIcon from './AgentToolConfigTitleIcon.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: AgentToolConfigData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();
useTypeAvailability(() => props.data.projectId);
const content = ref<InstanceType<typeof AgentToolConfigContent> | null>(null);
const credentialPicker = ref<InstanceType<typeof AgentToolConfigCredentialPicker> | null>(null);
const formTitle = ref(initialTitle());
const isRestricted = ref(false);
const isOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const isCustomTool = computed(
	() =>
		props.data.kind !== 'mcpServer' &&
		props.data.kind !== 'registryMcpServer' &&
		props.data.toolRef.type === 'custom',
);
const credentialModalOpen = computed(
	() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true,
);
const saveDisabled = computed(
	() =>
		credentialModalOpen.value ||
		isRestricted.value ||
		(props.data.kind === 'registryMcpServer' && (content.value?.saveDisabled ?? true)),
);
const canRender = computed(() => {
	if (props.data.kind === 'registryMcpServer') return true;
	if (props.data.kind === 'mcpServer') return Boolean(props.data.initialNode);
	if (props.data.toolRef.type === 'custom' || props.data.toolRef.type === 'workflow') return true;
	return toolRefToNode(props.data.toolRef) !== null;
});

void nodeTypesStore.loadNodeTypesIfNotLoaded();

function initialTitle(): string {
	if (props.data.kind === 'mcpServer' || props.data.kind === 'registryMcpServer') {
		return props.data.mcpServer.name;
	}
	if (props.data.toolRef.type === 'custom') {
		return props.data.customTool?.descriptor.name ?? props.data.toolRef.id;
	}
	return props.data.toolRef.name ?? '';
}

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onOpenChange(open: boolean) {
	if (!open) closeDialog();
}

function handleInteractOutside(event: Event) {
	if (credentialModalOpen.value) event.preventDefault();
}

function updateTitle(value: string) {
	formTitle.value = value;
	content.value?.changeTitle(value);
}

function handleConfirm() {
	if (content.value?.confirm()) closeDialog();
}

async function handleRemove() {
	if (await content.value?.remove()) closeDialog();
}

/**
 * A guardrail edit replaces this modal: close it (its data stays in the store,
 * the kept ref) and hand over to the guardrail modal. Its exit callback reopens
 * this modal with the same tool, so the form returns with live guardrail chips.
 */
function handleOpenGuardrail(request: OpenGuardrailRequest) {
	const data = props.data;
	if (data.kind === 'mcpServer' || data.kind === 'registryMcpServer') return;
	const wiring = data.guardrails;
	if (!wiring) return;
	const draftToolRef = content.value?.getToolDraft();
	closeDialog();
	uiStore.openModalWithData({
		name: AGENT_GUARDRAIL_MODAL_KEY,
		data: {
			guardrail: request.guardrail,
			...(request.kind ? { kind: request.kind } : {}),
			getGuardrails: wiring.getGuardrails,
			getTools: wiring.getTools,
			getReviewConfigurations: wiring.getReviewConfigurations,
			getReviewContext: wiring.getReviewContext,
			getProjectId: wiring.getProjectId,
			disabled: wiring.disabled,
			onUpdateGuardrails: wiring.onUpdateGuardrails,
			onExit: () => {
				uiStore.setModalData({
					name: props.modalName,
					data: { ...data, draftToolRef, initialTab: 'guardrails' },
				});
				uiStore.openModal(props.modalName);
			},
		},
	});
}
</script>

<template>
	<AgentModal
		v-if="canRender"
		:open="isOpen"
		:title="formTitle"
		:title-error="content?.titleError"
		:editable-title="!isCustomTool && !isRestricted"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-testid="agent-tool-config-modal"
		@interact-outside="handleInteractOutside"
		@update:open="onOpenChange"
		@update:title="updateTitle"
	>
		<template #titlePrefix>
			<AgentToolConfigTitleIcon :data="data" />
		</template>
		<template v-if="content?.headerItem?.credentials?.length" #headerActions>
			<AgentToolConfigCredentialPicker
				ref="credentialPicker"
				:item="content.headerItem"
				:adapter="content.credentialAdapter"
				:show-connected-icon="Boolean(data.onRemove)"
				@select-credential="
					(authType, credentialId) => content?.selectCredential(authType, credentialId)
				"
			/>
		</template>

		<AgentToolConfigContent
			v-if="isOpen"
			ref="content"
			:data="data"
			@credential-deleted="closeDialog"
			@update:title="formTitle = $event"
			@update:restricted="isRestricted = $event"
			@request-credential-picker="credentialPicker?.open()"
			@open-guardrail="handleOpenGuardrail"
		/>

		<template v-if="data.onRemove" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-tool-config-remove" @click="handleRemove">
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.tools.remove') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:disabled="saveDisabled"
				data-testid="agent-tool-config-save"
				@click="handleConfirm"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>
