import { ref } from 'vue';
import type { CredentialResolver, CredentialResolverType } from '@n8n/api-types';
import { getCredentialResolvers, getCredentialResolverTypes } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import {
	CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
	CREDENTIAL_RESOLVER_DELETE_MODAL_KEY,
} from '@/app/constants';

export interface ModalCallbacks {
	onSave?: (resolverId: string) => void | Promise<void>;
	onDelete?: (resolverId: string) => void | Promise<void>;
}

export function useCredentialResolvers() {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const toast = useToast();
	const i18n = useI18n();

	const resolvers = ref<CredentialResolver[]>([]);
	const resolverTypes = ref<CredentialResolverType[]>([]);
	const isLoading = ref(false);

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

	const openDeleteModal = (
		resolver: CredentialResolver,
		onConfirm?: () => void | Promise<void>,
	): void => {
		uiStore.openModalWithData({
			name: CREDENTIAL_RESOLVER_DELETE_MODAL_KEY,
			data: {
				resolver,
				onConfirm: onConfirm ?? fetchResolvers,
			},
		});
	};

	return {
		// State
		resolvers,
		resolverTypes,
		isLoading,

		// Actions
		fetchResolvers,
		fetchResolverTypes,

		// Modal helpers
		openCreateModal,
		openEditModal,
		openDeleteModal,
	};
}
