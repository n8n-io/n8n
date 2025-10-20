import { useCommunityNodesStore } from '../communityNodes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { computed, nextTick, ref } from 'vue';
import { i18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { removePreviewToken } from '@/components/Node/NodeCreator/utils';

type InstallNodeProps = {
	type: 'verified' | 'unverified';
} & (
	| {
			type: 'verified';
			packageName: string;
			nodeType: string;
	  }
	| {
			type: 'unverified';
			packageName: string;
			nodeType?: string;
	  }
);

type InstallNodeResult = {
	success: boolean;
	error?: Error;
};

export function useInstallNode() {
	const communityNodesStore = useCommunityNodesStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const workflowsStore = useWorkflowsStore();
	const isOwner = computed(() => useUsersStore().isInstanceOwner);
	const loading = ref(false);
	const toast = useToast();
	const canvasOperations = useCanvasOperations();

	const getNpmVersion = async (key: string) => {
		const communityNodeAttributes = await nodeTypesStore.getCommunityNodeAttributes(key);

		if (communityNodeAttributes) {
			return communityNodeAttributes.npmVersion;
		}

		return undefined;
	};

	const installNode = async (props: InstallNodeProps): Promise<InstallNodeResult> => {
		if (!isOwner.value) {
			const error = new Error('User is not an owner');
			toast.showError(error, i18n.baseText('settings.communityNodes.messages.install.error'));
			return { success: false, error };
		}
		try {
			loading.value = true;
			if (props.type === 'verified') {
				await communityNodesStore.installPackage(
					props.packageName,
					true,
					await getNpmVersion(props.nodeType),
				);
			} else {
				await communityNodesStore.installPackage(props.packageName);
			}

			// refresh store information about installed nodes
			await nodeTypesStore.getNodeTypes();
			await credentialsStore.fetchCredentialTypes(true);
			await nextTick();

			// update parameters and webhooks for freshly installed nodes
			const nodeType = props.nodeType;
			if (nodeType && workflowsStore.workflow.nodes?.length) {
				const nodesToUpdate = workflowsStore.workflow.nodes.filter(
					(node) => node.type === removePreviewToken(nodeType),
				);
				canvasOperations.initializeUnknownNodes(nodesToUpdate);
			}
			toast.showMessage({
				title: i18n.baseText('settings.communityNodes.messages.install.success'),
				type: 'success',
			});
			return { success: true };
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.communityNodes.messages.install.error'));
			return { success: false, error };
		} finally {
			loading.value = false;
		}
	};

	return {
		installNode,
		loading,
	};
}
