import {
	describeInstallPolicyNote,
	describeSelectedNodeRestriction,
	isNodesApiVersionError,
} from '../communityNodes.utils';
import { useCommunityNodesStore } from '../communityNodes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { nextTick, ref } from 'vue';
import { i18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import {
	getNodeItemRestriction,
	removePreviewToken,
} from '@/features/shared/nodeCreator/nodeCreator.utils';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

type InstallNodeProps = {
	type: 'verified' | 'unverified';
	/** The node type the caller adds right after the install, such as a Tool variant. */
	selectedNodeType?: string;
	telemetry?: {
		hasQuickConnect: boolean;
		source: string;
	};
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
	/** A policy restricts `selectedNodeType`. The install toast already said so. */
	restricted?: boolean;
};

export function useInstallNode() {
	const communityNodesStore = useCommunityNodesStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const userStore = useUsersStore();
	const loading = ref(false);
	const toast = useToast();
	const canvasOperations = useCanvasOperations();
	const telemetry = useTelemetry();
	const settingsStore = useSettingsStore();
	const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();

	const getNpmVersion = async (key: string) => {
		const communityNodeAttributes = await nodeTypesStore.getCommunityNodeAttributes(key);

		if (communityNodeAttributes) {
			return communityNodeAttributes.npmVersion;
		}

		return undefined;
	};

	/** `undefined` when no policy restricts the node in the current project. */
	const describeSelectedNode = (nodeTypeName: string) => {
		const restriction = getNodeItemRestriction(nodeTypeName);
		if (!restriction) return undefined;

		const displayName = nodeTypesStore.getNodeType(nodeTypeName)?.displayName ?? nodeTypeName;
		return describeSelectedNodeRestriction(displayName, restriction.scope);
	};

	const installNode = async (props: InstallNodeProps): Promise<InstallNodeResult> => {
		if (!userStore.isAdminOrOwner) {
			const error = new Error('User is not an owner or admin');
			toast.showError(error, i18n.baseText('settings.communityNodes.messages.install.error'));
			return { success: false, error };
		}

		if (props.telemetry) {
			telemetry.track('user started cnr package install', {
				input_string: props.packageName,
				has_quick_connect: props.telemetry.hasQuickConnect,
				source: props.telemetry.source,
			});
		}

		try {
			loading.value = true;
			const installedPackage =
				props.type === 'verified' && !settingsStore.isUnverifiedPackagesEnabled
					? await communityNodesStore.installPackage(
							props.packageName,
							await getNpmVersion(props.nodeType),
						)
					: await communityNodesStore.installPackage(props.packageName);

			// refresh store information about installed nodes
			await Promise.all([
				nodeTypesStore.getNodeTypes(),
				nodeTypesStore.fetchCommunityNodePreviews(),
				credentialsStore.fetchCredentialTypes(true),
				typeAvailabilityPoliciesStore.reload(),
			]);
			await nextTick();

			// update parameters and webhooks for freshly installed nodes
			// rename types from preview version to the actual version
			const nodeType = props.nodeType;
			const allNodes = workflowDocumentStore.value.allNodes;
			if (nodeType && allNodes.length) {
				const nodesToUpdate = allNodes.filter((node) => node.type === removePreviewToken(nodeType));
				canvasOperations.initializeUnknownNodes(nodesToUpdate);
			}
			const selectedNote = props.selectedNodeType
				? describeSelectedNode(removePreviewToken(props.selectedNodeType))
				: undefined;
			const policyNote =
				selectedNote ??
				describeInstallPolicyNote(
					installedPackage.policyRestrictions,
					installedPackage.installedNodes.length,
				);
			toast.showMessage({
				title: i18n.baseText('settings.communityNodes.messages.install.success'),
				...(policyNote ? { type: 'warning', message: policyNote } : { type: 'success' }),
			});
			return { success: true, restricted: selectedNote !== undefined };
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText(
					isNodesApiVersionError(error)
						? 'settings.communityNodes.messages.install.incompatible.title'
						: 'settings.communityNodes.messages.install.error',
				),
			);
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
