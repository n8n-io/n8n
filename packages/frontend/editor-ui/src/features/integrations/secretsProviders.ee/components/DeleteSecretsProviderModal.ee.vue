<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { getAllCredentials } from '@/features/credentials/credentials.api';
import {
	deleteSecretProviderConnection,
	deleteProjectSecretProviderConnection,
} from '@n8n/rest-api-client';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nLink,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY, VIEWS } from '@/app/constants';

interface Props {
	modalName: string;
	data: {
		providerKey: string;
		providerName: string;
		secretsCount: number;
		projectId?: string;
		onConfirm?: () => Promise<void>;
	};
}

const props = defineProps<Props>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const confirmationText = ref('');
const isDeleting = ref(false);
const credentialsCount = ref(0);
const isLoadingCredentials = ref(true);

const shouldShowConfirmation = computed(() => credentialsCount.value > 0);

const deleteEnabled = computed(
	() => !shouldShowConfirmation.value || confirmationText.value === props.data.providerName,
);

const credentialsPageUrl = computed(() => ({
	name: VIEWS.CREDENTIALS,
	query: {
		externalSecretsStore: props.data.providerKey,
	},
}));

const secretsLabel = computed(() => {
	const count = props.data.secretsCount;
	if (count === 1) {
		return i18n.baseText('settings.secretsProviderConnections.oneSecret');
	}
	return i18n.baseText('settings.secretsProviderConnections.secrets', {
		interpolate: { count: count.toString() },
	});
});

const credentialsLabel = computed(() => {
	const count = credentialsCount.value;
	if (count === 1) {
		return i18n.baseText('settings.secretsProviderConnections.delete.impact.oneCredential');
	}
	return i18n.baseText('settings.secretsProviderConnections.delete.impact.credentials', {
		interpolate: { count: count.toString() },
	});
});

onMounted(async () => {
	isLoadingCredentials.value = true;
	try {
		// Fetch credentials count that use this provider
		const credentials = await getAllCredentials(rootStore.restApiContext, {
			includeGlobal: true,
			externalSecretsStore: props.data.providerKey,
		});
		credentialsCount.value = credentials.length;
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('error'));
	} finally {
		isLoadingCredentials.value = false;
	}
});

async function onConfirmDelete() {
	isDeleting.value = true;
	try {
		if (props.data.projectId) {
			await deleteProjectSecretProviderConnection(
				rootStore.restApiContext,
				props.data.projectId,
				props.data.providerKey,
			);
		} else {
			await deleteSecretProviderConnection(rootStore.restApiContext, props.data.providerKey);
		}

		toast.showMessage({
			title: i18n.baseText('settings.secretsProviderConnections.delete.success', {
				interpolate: { name: props.data.providerName },
			}),
			type: 'success',
		});

		if (props.data.onConfirm) {
			await props.data.onConfirm();
		}

		uiStore.closeModal(props.modalName);
		uiStore.closeModal(SECRETS_PROVIDER_CONNECTION_MODAL_KEY);
	} catch (error) {
		toast.showError(
			error as Error,
			i18n.baseText('settings.secretsProviderConnections.delete.error'),
		);
	} finally {
		isDeleting.value = false;
	}
}

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

function onCancel() {
	closeDialog();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="large"
		:header="
			i18n.baseText('settings.secretsProviderConnections.delete.title', {
				interpolate: { name: data.providerName },
			})
		"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div v-if="shouldShowConfirmation" :class="$style.content">
				<N8nText size="medium" color="text-base">
					{{
						i18n.baseText('settings.secretsProviderConnections.delete.description', {
							interpolate: {
								name: data.providerName,
								secretsCount: secretsLabel,
							},
						})
					}}
				</N8nText>

				<div v-if="!isLoadingCredentials" :class="$style.impact">
					<N8nText size="medium" color="text-base" bold>
						{{ i18n.baseText('settings.secretsProviderConnections.delete.impact.title') }}
					</N8nText>
					<ul>
						<li>
							<N8nText size="medium" color="text-base">
								<N8nLink data-test-id="credentials-link" :to="credentialsPageUrl" target="_blank">
									{{ credentialsLabel }}
								</N8nLink>
								{{ i18n.baseText('settings.secretsProviderConnections.delete.impact.description') }}
							</N8nText>
						</li>
					</ul>
				</div>

				<div :class="$style.confirmation">
					<N8nInputLabel
						:label="
							i18n.baseText('settings.secretsProviderConnections.delete.confirmationLabel', {
								interpolate: { name: data.providerName },
							})
						"
						size="small"
					>
						<N8nInput
							v-model="confirmationText"
							:placeholder="data.providerName"
							data-test-id="delete-confirmation-input"
						/>
					</N8nInputLabel>
				</div>
			</div>
			<div v-else :class="$style.content">
				<N8nText size="medium" color="text-base">
					{{ i18n.baseText('settings.secretsProviderConnections.delete.description.noImpact') }}
				</N8nText>
			</div>
		</N8nDialogBody>

		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onCancel">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="destructive"
					:disabled="!deleteEnabled"
					:loading="isDeleting"
					data-test-id="confirm-delete-button"
					@click="onConfirmDelete"
				>
					{{ i18n.baseText('generic.delete') }}
				</N8nButton>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.impact {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.confirmation {
	margin-top: var(--spacing--xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	width: 100%;
}
</style>
