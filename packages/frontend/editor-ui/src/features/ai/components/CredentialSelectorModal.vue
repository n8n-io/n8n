<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useUIStore } from '@/app/stores/ui.store';

const props = defineProps<{
	modalName: string;
	data: {
		credentialType: string;
		displayName: string;
		initialValue: string | null;
		onSelect: (credentialId: string | null) => void;
		title?: string;
		description?: string;
		cancelLabel?: string;
		confirmLabel?: string;
		showDelete?: boolean;
		hideCreateNew?: boolean;
		source?: string;
		pickerDataTestId?: string;
		appendToBody?: boolean;
	};
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const uiStore = useUIStore();

const selectedCredentialId = ref<string | null>(props.data.initialValue);
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const displayName = computed(() => props.data.displayName);
const title = computed(
	() =>
		props.data.title ??
		i18n.baseText('chatHub.credentials.selector.title', {
			interpolate: {
				provider: displayName.value,
			},
		}),
);
const description = computed(
	() =>
		props.data.description ??
		i18n.baseText('chatHub.credentials.selector.chooseOrCreate', {
			interpolate: {
				provider: displayName.value,
			},
		}),
);

function onCredentialSelect(credentialId: string) {
	selectedCredentialId.value = credentialId;
}

function onCredentialDeselect() {
	selectedCredentialId.value = null;
}

function onDeleteCredential(credentialId: string) {
	if (!selectedCredentialId.value || credentialId !== selectedCredentialId.value) {
		return;
	}

	selectedCredentialId.value = null;

	if (credentialId === props.data.initialValue) {
		props.data.onSelect(null);
	}
}

function onCredentialModalOpened(credentialId?: string) {
	telemetry.track('User opened Credential modal', {
		credential_type: props.data.credentialType,
		source: props.data.source ?? 'chat',
		new_credential: !credentialId,
		workflow_id: null,
	});
}

async function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

function onConfirm() {
	if (selectedCredentialId.value) {
		props.data.onSelect(selectedCredentialId.value);
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
		:stacked="data.appendToBody === true"
		:container-class="$style.credentialSelectorModal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogHeader>
			<div :class="$style.header">
				<CredentialIcon
					:credential-type-name="data.credentialType"
					:size="24"
					:class="$style.icon"
				/>
				<N8nDialogTitle>{{ title }}</N8nDialogTitle>
			</div>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.content">
				<N8nText size="small" color="text-base">
					{{ description }}
				</N8nText>
				<div :class="$style.credentialContainer">
					<CredentialPicker
						:class="$style.credentialPicker"
						:app-name="displayName"
						:credential-type="data.credentialType"
						:selected-credential-id="selectedCredentialId"
						:show-delete="data.showDelete ?? true"
						:hide-create-new="data.hideCreateNew ?? true"
						:data-testid="data.pickerDataTestId"
						teleported
						:credential-modal-append-to-body="data.appendToBody"
						@credential-selected="onCredentialSelect"
						@credential-deselected="onCredentialDeselect"
						@credential-deleted="onDeleteCredential"
						@credential-modal-opened="onCredentialModalOpened"
					/>
				</div>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onCancel">
					{{ data.cancelLabel ?? i18n.baseText('chatHub.credentials.selector.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" :disabled="!selectedCredentialId" @click="onConfirm">
					{{ data.confirmLabel ?? i18n.baseText('chatHub.credentials.selector.confirm') }}
				</N8nButton>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
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

.credentialContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.credentialPicker {
	width: 100%;
}

.credentialSelectorModal {
	overflow: visible;
	/* No height token matches the previous 250px dialog min-height. */
	min-height: 250px;
}
</style>
