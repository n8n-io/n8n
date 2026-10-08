<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nFormInput,
	N8nText,
} from '@n8n/design-system';
import { type ChatHubLLMProvider, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import {
	CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	providerDisplayNames,
} from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';

const props = defineProps<{
	modalName: string;
	data: {
		provider: ChatHubLLMProvider;
		initialValue: string | null;
		onSelect: (provider: ChatHubLLMProvider, modelId: string) => void;
	};
}>();

const modelId = ref<string | null>(props.data.initialValue);
const inputRef = ref<InstanceType<typeof N8nFormInput> | null>(null);

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(
	() => uiStore.modalsById[CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY]?.open === true,
);

onMounted(() => {
	// With modals normal focusing via `props.focus-initially` on N8nFormInput does not work
	setTimeout(() => {
		inputRef.value?.inputRef?.select();
		inputRef.value?.inputRef?.focus();
	});
});

async function closeDialog() {
	uiStore.closeModal(CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

function onConfirm() {
	if (modelId.value) {
		props.data.onSelect(props.data.provider, modelId.value);
		void closeDialog();
	}
}

function onCancel() {
	void closeDialog();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:container-class="$style.dialog"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogHeader>
			<div :class="$style.header">
				<CredentialIcon
					:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[data.provider]"
					:size="24"
					:class="$style.icon"
				/>
				<N8nDialogTitle>
					{{
						i18n.baseText('chatHub.models.byIdSelector.title', {
							interpolate: {
								provider: providerDisplayNames[data.provider],
							},
						})
					}}
				</N8nDialogTitle>
			</div>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.content">
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('chatHub.models.byIdSelector.choose') }}
				</N8nText>
				<N8nFormInput
					ref="inputRef"
					v-model="modelId"
					name="model"
					label=""
					max-length="64"
					focus-initially
					@enter="onConfirm"
				/>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onCancel">
					{{ i18n.baseText('chatHub.models.byIdSelector.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" :disabled="!modelId" @click="onConfirm">
					{{ i18n.baseText('chatHub.models.byIdSelector.confirm') }}
				</N8nButton>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.dialog {
	/* No height token matches the previous 250px dialog min-height. */
	min-height: 250px;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}
</style>
