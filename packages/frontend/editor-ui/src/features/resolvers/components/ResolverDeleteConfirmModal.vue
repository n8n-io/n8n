<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import type { CredentialResolver, CredentialResolverAffectedWorkflow } from '@n8n/api-types';
import { getCredentialResolverWorkflows, deleteCredentialResolver } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/app/components/Modal.vue';
import { N8nButton, N8nText } from '@n8n/design-system';

const MAX_DISPLAYED_WORKFLOWS = 5;

const props = defineProps<{
	modalName: string;
	data: {
		resolver: CredentialResolver;
		onConfirm?: () => void | Promise<void>;
	};
}>();

const rootStore = useRootStore();
const uiStore = useUIStore();
const toast = useToast();
const i18n = useI18n();
const modalBus = createEventBus();

const affectedWorkflows = ref<CredentialResolverAffectedWorkflow[]>([]);
const isLoadingWorkflows = ref(true);
const isDeleting = ref(false);

const displayed = computed(() => affectedWorkflows.value.slice(0, MAX_DISPLAYED_WORKFLOWS));
const remaining = computed(() => affectedWorkflows.value.length - displayed.value.length);

onMounted(async () => {
	try {
		affectedWorkflows.value = await getCredentialResolverWorkflows(
			rootStore.restApiContext,
			props.data.resolver.id,
		);
	} catch (error) {
		console.warn('Failed to fetch affected workflows for resolver deletion', error);
	} finally {
		isLoadingWorkflows.value = false;
	}
});

async function onConfirmDelete() {
	isDeleting.value = true;
	try {
		await deleteCredentialResolver(rootStore.restApiContext, props.data.resolver.id);

		toast.showMessage({
			title: i18n.baseText('credentialResolverEdit.deleteSuccess.title'),
			type: 'success',
		});

		if (props.data.onConfirm) {
			await props.data.onConfirm();
		}

		uiStore.closeModal(props.modalName);
	} catch (error) {
		toast.showError(error, i18n.baseText('credentialResolverEdit.error.delete'));
	} finally {
		isDeleting.value = false;
	}
}

function onCancel() {
	uiStore.closeModal(props.modalName);
}
</script>

<template>
	<Modal
		:name="modalName"
		:title="i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.headline')"
		:event-bus="modalBus"
		width="540px"
	>
		<template #content>
			<div :class="$style.content">
				<N8nText v-if="isLoadingWorkflows" size="medium" color="text-base">
					{{
						i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.message', {
							interpolate: { savedResolverName: data.resolver.name },
						})
					}}
				</N8nText>
				<template v-else-if="affectedWorkflows.length > 0">
					<N8nText size="medium" color="text-base">
						{{
							i18n.baseText(
								'credentialResolverEdit.confirmMessage.deleteResolver.messageWithWorkflows',
								{ interpolate: { savedResolverName: data.resolver.name } },
							)
						}}
					</N8nText>
					<ul :class="$style.workflowList">
						<li v-for="workflow in displayed" :key="workflow.id">
							<N8nText bold>{{ workflow.name }}</N8nText>
						</li>
					</ul>
					<N8nText v-if="remaining > 0" size="small" color="text-light">
						{{
							i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.andMore', {
								interpolate: { count: String(remaining) },
							})
						}}
					</N8nText>
				</template>
				<N8nText v-else size="medium" color="text-base">
					{{
						i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.message', {
							interpolate: { savedResolverName: data.resolver.name },
						})
					}}
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onCancel">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="destructive"
					:loading="isDeleting"
					data-test-id="confirm-delete-resolver-button"
					@click="onConfirmDelete"
				>
					{{ i18n.baseText('generic.delete') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.workflowList {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style: disc;

	li {
		padding: var(--spacing--4xs) 0;
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
