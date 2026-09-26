import { GENERIC_AUTH_CREDENTIAL_TYPES } from '@n8n/api-types';
import { OperationalError, UserError } from 'n8n-workflow';

import {
	buildSetupItemsFromAnnouncement,
	buildSetupItemsFromCredentialRequests,
	isSetupPanelEnabled,
	requestsCredentialReplacement,
	type AnnouncedCredentialRequest,
} from './setup-items';
import { analyzeWorkflow } from './setup-workflow.service';
import { recordSessionOwnedWorkflow } from './workflow-build-context';
import {
	getWorkflowSourceFileBinding,
	normalizeWorkflowSourceFilePath,
	saveWorkflowSourceFileBinding,
	type WorkflowSourceFileBinding,
} from './workflow-file-bindings';
import type { InstanceAiContext } from '../../types';

const pendingPreparations = new WeakMap<InstanceAiContext, Promise<unknown>>();

/** Parallel tool calls must not create two workflows for the same source file. */
export async function prepareWorkflowSetup(
	context: InstanceAiContext,
	input: Parameters<typeof prepare>[1],
) {
	const previous = pendingPreparations.get(context) ?? Promise.resolve();
	const pending = previous.catch(() => undefined).then(async () => await prepare(context, input));
	pendingPreparations.set(context, pending);
	try {
		return await pending;
	} finally {
		if (pendingPreparations.get(context) === pending) pendingPreparations.delete(context);
	}
}

/** Establish the saved workflow identity before the model writes its source. */
async function prepare(
	context: InstanceAiContext,
	input: {
		filePath: string;
		workflowName?: string;
		workflowId?: string;
		folderPath?: string;
		credentials: readonly AnnouncedCredentialRequest[];
	},
) {
	if (!isSetupPanelEnabled(context) || !context.threadMemory || !context.threadId) {
		throw new OperationalError('Early workflow setup is unavailable');
	}
	if (
		input.credentials.some(({ credentialType }) =>
			GENERIC_AUTH_CREDENTIAL_TYPES.has(credentialType),
		)
	) {
		throw new UserError(
			'Announce service-specific credential types before building. Leave generic authentication for workflow setup after the build.',
		);
	}
	const filePath = normalizeWorkflowSourceFilePath(input.filePath, {
		workspaceRoot: context.workspaceRoot,
	});
	let binding = await getWorkflowSourceFileBinding(context, filePath, { requirePersistence: true });
	if (input.workflowId && binding?.workflowId && input.workflowId !== binding.workflowId) {
		throw new UserError(
			'The source file belongs to another workflow. Use its bound workflow or a different filePath.',
		);
	}
	const workflowId = binding?.workflowId ?? input.workflowId;
	const satisfiedCredentialTypes =
		binding?.setupPreferences?.runId === context.runId
			? (binding?.setupPreferences?.satisfiedCredentialTypes ?? [])
			: [];
	const setupPreferences: NonNullable<WorkflowSourceFileBinding['setupPreferences']> = {
		runId: context.runId,
		satisfiedCredentialTypes,
		preferNewCredentialTypes: input.credentials
			.filter(
				(request) =>
					request.preferNew && !satisfiedCredentialTypes.includes(request.credentialType),
			)
			.map((request) => request.credentialType),
	};
	let analyzedRequests: Awaited<ReturnType<typeof analyzeWorkflow>> | undefined;
	if (workflowId) {
		// Validate access before publishing a workflow-scoped announcement.
		const saved = await context.workflowService.get(workflowId);
		if (!binding?.setupPending) {
			analyzedRequests = await analyzeWorkflow(context, workflowId, undefined, {
				includeSettled: true,
			});
		}
		if (
			analyzedRequests &&
			requestsCredentialReplacement(analyzedRequests, setupPreferences.preferNewCredentialTypes)
		) {
			throw new UserError(
				'Use credential setup without filePath to replace an existing workflow account.',
			);
		}
		binding = await saveWorkflowSourceFileBinding(
			context,
			{
				...binding,
				filePath,
				workflowId,
				workflowVersionId: saved.versionId,
				workflowChecksum: saved.checksum,
				setupPreferences,
			},
			{ requirePersistence: true },
		);
		if (context.aiCreatedWorkflowIds?.has(workflowId)) {
			await recordSessionOwnedWorkflow(context, workflowId);
		}
	} else {
		if (
			context.permissions?.createWorkflow === 'blocked' ||
			context.permissions?.updateWorkflow === 'blocked'
		) {
			throw new UserError('Early workflow setup is blocked by admin policy');
		}
		if (!input.workflowName?.trim() || input.credentials.length === 0) {
			throw new UserError(
				'Provide a workflowName and the known credential requirements for a new workflow.',
			);
		}
		const saved = await context.workflowService.createFromWorkflowJSON(
			{ name: input.workflowName, nodes: [], connections: {} },
			{ markAsAiTemporary: true, ...(input.folderPath ? { folderPath: input.folderPath } : {}) },
		);
		try {
			binding = await saveWorkflowSourceFileBinding(
				context,
				{
					filePath,
					workflowId: saved.id,
					workflowVersionId: saved.versionId,
					workflowChecksum: saved.checksum,
					setupPending: true,
					setupPreferences,
				},
				{ requirePersistence: true },
			);
		} finally {
			await recordSessionOwnedWorkflow(context, saved.id);
		}
	}
	if (!binding.workflowId)
		throw new OperationalError('The workflow setup context has no workflow ID');
	const items = binding.setupPending
		? buildSetupItemsFromCredentialRequests(binding.workflowId, input.credentials)
		: buildSetupItemsFromAnnouncement(
				binding.workflowId,
				input.credentials,
				analyzedRequests ??
					(await analyzeWorkflow(context, binding.workflowId, undefined, { includeSettled: true })),
			);
	await context.setupItemsEmitter.announce(binding.workflowId, items);
	return {
		success: true,
		announced: true,
		preBuild: true,
		workflowId: binding.workflowId,
		filePath,
		message:
			'The setup panel is ready. Continue writing the workflow source and call build-workflow with this filePath. Do not wait for connections or repeat folderPath on the build. The user can connect while you work. Their selections will be applied to the generated nodes. If the plan changes before building, call setup again with the complete remaining requirements.',
	};
}
