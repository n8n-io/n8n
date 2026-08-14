import { computed, ref, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client/utils';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { CredentialsResource } from '@/Interface';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

import {
	bulkDeleteCredentialsApi,
	bulkTransferCredentialsApi,
	normalizeBulkCredentialActionResult,
} from './bulkCredentialActions.api';
import type {
	BulkCredentialActionConfig,
	BulkCredentialActionError,
	BulkCredentialActionId,
	NormalizedBulkCredentialActionResult,
	ResolvedBulkCredentialAction,
} from './bulkCredentialActions.types';

type CredentialPreflightIssue = {
	credentialId?: string;
	reason: string;
	message: string;
};

const isCredentialPreflightIssue = (value: unknown): value is CredentialPreflightIssue => {
	if (typeof value !== 'object' || value === null) return false;
	return (
		(!('credentialId' in value) ||
			value.credentialId === undefined ||
			typeof value.credentialId === 'string') &&
		'reason' in value &&
		typeof value.reason === 'string' &&
		'message' in value &&
		typeof value.message === 'string'
	);
};

const getPreflightIssues = (error: unknown): CredentialPreflightIssue[] => {
	if (!(error instanceof ResponseError)) return [];
	const issues = error.meta?.issues;
	return Array.isArray(issues) ? issues.filter(isCredentialPreflightIssue) : [];
};

export function formatBulkCredentialActionError(
	error: unknown,
	credentials: CredentialsResource[],
	fallbackMessage: string,
): BulkCredentialActionError {
	const namesById = new Map(credentials.map((credential) => [credential.id, credential.name]));
	const details = getPreflightIssues(error).map((issue) => {
		const name = issue.credentialId ? namesById.get(issue.credentialId) : undefined;
		return name ? `${name}: ${issue.message}` : issue.message;
	});

	return {
		message:
			details.length > 0
				? fallbackMessage
				: error instanceof Error
					? error.message
					: fallbackMessage,
		details,
	};
}

const canDelete = (credential: CredentialsResource) => {
	const permissions = getResourcePermissions(credential.scopes).credential;
	return (
		permissions.delete === true && (!credential.isResolvable || permissions.createEndUser === true)
	);
};

const canMove = (credential: CredentialsResource) =>
	getResourcePermissions(credential.scopes).credential.move === true;

export function canUseCredentialBulkMoveDestination(
	project: ProjectListItem,
	credentials: CredentialsResource[],
): boolean {
	if (credentials.some((credential) => credential.homeProject?.id === project.id)) return false;
	if (!project.scopes) return true;

	const permissions = getResourcePermissions(project.scopes).credential;
	const hasResolvableCredentials = credentials.some((credential) => credential.isResolvable);
	return (
		permissions.create === true && (!hasResolvableCredentials || permissions.createEndUser === true)
	);
}

export function useBulkCredentialActions(options: {
	selectedItems: Ref<CredentialsResource[]>;
	teamProjectsEnabled: Ref<boolean>;
}) {
	const { selectedItems, teamProjectsEnabled } = options;
	const i18n = useI18n();
	const rootStore = useRootStore();

	const availableActions = computed<ResolvedBulkCredentialAction[]>(() => {
		const selection = selectedItems.value;
		if (selection.length === 0) return [];

		const actions: ResolvedBulkCredentialAction[] = [];
		if (teamProjectsEnabled.value && selection.every(canMove)) {
			actions.push({
				id: 'move',
				label: i18n.baseText('credentials.bulkActions.action.move'),
				destructive: false,
				affected: selection,
			});
		}
		if (selection.every(canDelete)) {
			actions.push({
				id: 'delete',
				label: i18n.baseText('credentials.bulkActions.action.delete'),
				destructive: true,
				affected: selection,
			});
		}
		return actions;
	});

	const activeActionId = ref<BulkCredentialActionId | null>(null);
	const activeAction = computed(
		() => availableActions.value.find((action) => action.id === activeActionId.value) ?? null,
	);

	const openAction = (id: BulkCredentialActionId) => {
		activeActionId.value = id;
	};
	const closeDialog = () => {
		activeActionId.value = null;
	};

	async function execute(
		config: BulkCredentialActionConfig = {},
	): Promise<NormalizedBulkCredentialActionResult> {
		const action = activeAction.value;
		if (!action) throw new Error('No active bulk credential action');

		const credentialIds = action.affected.map((credential) => credential.id);
		if (action.id === 'delete') {
			return normalizeBulkCredentialActionResult(
				await bulkDeleteCredentialsApi(rootStore.restApiContext, credentialIds),
				action.affected,
			);
		}

		if (!config.destinationProjectId) throw new Error('No destination project selected');
		return normalizeBulkCredentialActionResult(
			await bulkTransferCredentialsApi(rootStore.restApiContext, {
				credentialIds,
				destinationProjectId: config.destinationProjectId,
			}),
			action.affected,
		);
	}

	return { availableActions, activeAction, openAction, closeDialog, execute };
}
