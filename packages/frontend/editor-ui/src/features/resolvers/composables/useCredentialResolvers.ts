import { h, ref } from 'vue';
import type {
	CredentialResolver,
	CredentialResolverAffectedWorkflow,
	CredentialResolverType,
} from '@n8n/api-types';
import {
	getCredentialResolvers,
	getCredentialResolverTypes,
	getCredentialResolverWorkflows,
	deleteCredentialResolver,
} from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { CREDENTIAL_RESOLVER_EDIT_MODAL_KEY, MODAL_CONFIRM } from '@/app/constants';
import ResolverDeleteConfirmMessage from '@/features/resolvers/components/ResolverDeleteConfirmMessage.vue';

export interface ModalCallbacks {
	onSave?: (resolverId: string) => void | Promise<void>;
	onDelete?: (resolverId: string) => void | Promise<void>;
}

export function useCredentialResolvers() {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const message = useMessage();
	const toast = useToast();
	const i18n = useI18n();

	const resolvers = ref<CredentialResolver[]>([]);
	const resolverTypes = ref<CredentialResolverType[]>([]);
	const isLoading = ref(false);
	const isDeleting = ref(false);

	const fetchResolvers = async (): Promise<boolean> => {
		try {
			isLoading.value = true;
			resolvers.value = await getCredentialResolvers(rootStore.restApiContext);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('workflowSettings.showError.fetchSettings.title'));
			return false;
		} finally {
			isLoading.value = false;
		}
	};

	const fetchResolverTypes = async (): Promise<void> => {
		try {
			resolverTypes.value = await getCredentialResolverTypes(rootStore.restApiContext);
		} catch (error) {
			toast.showError(error, i18n.baseText('credentialResolverEdit.error.loadTypes'));
		}
	};

	const confirmAndDeleteResolver = async (resolver: CredentialResolver): Promise<boolean> => {
		let affectedWorkflows: CredentialResolverAffectedWorkflow[] = [];
		try {
			affectedWorkflows = await getCredentialResolverWorkflows(
				rootStore.restApiContext,
				resolver.id,
			);
		} catch {
			// Fall back to standard confirm dialog if fetching affected workflows fails
		}

		const confirmMessage = h(ResolverDeleteConfirmMessage, {
			resolverName: resolver.name,
			affectedWorkflows,
		});

		const deleteConfirmed = await message.confirm(
			confirmMessage,
			i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.headline'),
			{
				confirmButtonText: i18n.baseText(
					'credentialResolverEdit.confirmMessage.deleteResolver.confirmButtonText',
				),
				customClass: 'el-message-box--destructive',
				showClose: true,
			},
		);

		if (deleteConfirmed !== MODAL_CONFIRM) {
			return false;
		}

		try {
			isDeleting.value = true;
			await deleteCredentialResolver(rootStore.restApiContext, resolver.id);

			toast.showMessage({
				title: i18n.baseText('credentialResolverEdit.deleteSuccess.title'),
				type: 'success',
			});

			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('credentialResolverEdit.error.delete'));
			return false;
		} finally {
			isDeleting.value = false;
		}
	};

	const openCreateModal = (callbacks?: ModalCallbacks): void => {
		uiStore.openModalWithData({
			name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
			data: {
				onSave: callbacks?.onSave ?? fetchResolvers,
			},
		});
	};

	const openEditModal = (resolverId: string, callbacks?: ModalCallbacks): void => {
		uiStore.openModalWithData({
			name: CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
			data: {
				resolverId,
				onSave: callbacks?.onSave ?? fetchResolvers,
				onDelete: callbacks?.onDelete ?? fetchResolvers,
			},
		});
	};

	return {
		// State
		resolvers,
		resolverTypes,
		isLoading,
		isDeleting,

		// Actions
		fetchResolvers,
		fetchResolverTypes,
		deleteResolver: confirmAndDeleteResolver,

		// Modal helpers
		openCreateModal,
		openEditModal,
	};
}
