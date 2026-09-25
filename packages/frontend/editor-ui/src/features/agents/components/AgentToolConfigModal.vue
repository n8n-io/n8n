<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import AgentModal from './modals/AgentModal.vue';
import AgentToolConfigContent, { type AgentToolConfigData } from './AgentToolConfigContent.vue';
import AgentToolConfigCredentialPicker from './AgentToolConfigCredentialPicker.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: AgentToolConfigData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const content = ref<InstanceType<typeof AgentToolConfigContent> | null>(null);
const credentialPicker = ref<InstanceType<typeof AgentToolConfigCredentialPicker> | null>(null);
const formTitle = ref(initialTitle());
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
		(props.data.kind === 'registryMcpServer' && (content.value?.saveDisabled ?? true)),
);
const canRender = computed(() => {
	if (props.data.kind === 'registryMcpServer') return true;
	if (props.data.kind === 'mcpServer') return Boolean(props.data.initialNode);
	if (props.data.toolRef.type === 'custom' || props.data.toolRef.type === 'workflow') return true;
	return toolRefToNode(props.data.toolRef) !== null;
});

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
</script>

<template>
	<AgentModal
		v-if="canRender"
		:open="isOpen"
		:title="formTitle"
		:title-error="content?.titleError"
		:editable-title="!isCustomTool"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-testid="agent-tool-config-modal"
		@interact-outside="handleInteractOutside"
		@update:open="onOpenChange"
		@update:title="updateTitle"
	>
		<template v-if="content?.headerItem?.credentials?.length" #headerActions>
			<AgentToolConfigCredentialPicker
				ref="credentialPicker"
				:item="content.headerItem"
				:adapter="content.credentialAdapter"
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
			@request-credential-picker="credentialPicker?.open()"
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
