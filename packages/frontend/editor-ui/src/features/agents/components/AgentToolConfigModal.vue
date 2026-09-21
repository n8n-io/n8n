<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { FocusScope } from 'reka-ui';
import { computed, ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import AgentModal from './modals/AgentModal.vue';
import AgentToolConfigForm, { type AgentToolConfigModalData } from './AgentToolConfigForm.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: AgentToolConfigModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const form = ref<InstanceType<typeof AgentToolConfigForm> | null>(null);
const credentialModalOpen = ref(false);
const title = ref(initialTitle());

const isOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const isCustomTool = computed(
	() => props.data.kind !== 'mcpServer' && props.data.toolRef.type === 'custom',
);
const removeLabel = computed(() => {
	if (props.data.kind === 'mcpServer') {
		return i18n.baseText('agents.builder.tools.mcp.remove' as BaseTextKey);
	}
	if (props.data.toolRef.type === 'workflow') {
		return i18n.baseText('agents.builder.tools.workflow.remove' as BaseTextKey);
	}
	return i18n.baseText('agents.builder.tools.remove');
});

function initialTitle(): string {
	if (props.data.kind === 'mcpServer') return props.data.mcpServer.name;
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
	title.value = value;
	form.value?.changeTitle(value);
}

function handleConfirm() {
	if (form.value?.confirm()) closeDialog();
}

function handleRemove() {
	form.value?.remove();
	closeDialog();
}
</script>

<template>
	<AgentModal
		:open="isOpen"
		:title="title"
		:editable-title="!isCustomTool"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-testid="agent-tool-config-modal"
		@interact-outside="handleInteractOutside"
		@update:open="onOpenChange"
		@update:title="updateTitle"
	>
		<FocusScope
			v-if="credentialModalOpen"
			as-child
			@mount-auto-focus.prevent
			@unmount-auto-focus.prevent
		>
			<span hidden aria-hidden="true" />
		</FocusScope>
		<AgentToolConfigForm
			ref="form"
			:data="data"
			@update:title="title = $event"
			@update:credential-modal-open="credentialModalOpen = $event"
		/>

		<template v-if="data.onRemove" #footerLeft>
			<N8nButton variant="subtle" data-testid="agent-tool-config-remove" @click="handleRemove">
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ removeLabel }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nButton variant="solid" data-testid="agent-tool-config-save" @click="handleConfirm">
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>
