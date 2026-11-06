import type { WorkflowEntity } from '@n8n/db';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

export function toWorkflowJSON(
	workflow: Pick<WorkflowEntity, 'id' | 'name' | 'nodes' | 'connections' | 'settings'> &
		Partial<Pick<WorkflowEntity, 'nodeGroups'>>,
	options?: {
		redactParameters?: boolean;
		/** Substitute a history version's graph; id/name/settings stay from the live entity, as history rows only carry a version label. */
		graph?: Pick<WorkflowEntity, 'nodes' | 'connections' | 'nodeGroups'>;
	},
): WorkflowJSON {
	const redact = options?.redactParameters ?? false;
	const source = options?.graph ?? workflow;

	return {
		id: workflow.id,
		name: workflow.name,
		nodes: (source.nodes ?? []).map((n) => ({
			id: n.id ?? '',
			name: n.name,
			type: n.type,
			typeVersion: n.typeVersion,
			position: n.position,
			parameters: redact ? {} : n.parameters,
			credentials: n.credentials,
			webhookId: n.webhookId,
			disabled: n.disabled,
			notes: n.notes,
			notesInFlow: n.notesInFlow,
			executeOnce: n.executeOnce,
			retryOnFail: n.retryOnFail,
			maxTries: n.maxTries,
			waitBetweenTries: n.waitBetweenTries,
			alwaysOutputData: n.alwaysOutputData,
			// `continueOnFail` is the pre-`onError` spelling and has no SDK config field, so
			// read it the way the editor does. An agent save writes these nodes over the saved
			// ones, and dropping the flag would silently reset the node to `stopWorkflow`.
			onError: n.onError ?? (n.continueOnFail ? 'continueRegularOutput' : undefined),
			extendsCredential: n.extendsCredential,
			customTelemetryTags: n.customTelemetryTags,
		})),
		connections: source.connections,
		settings: workflow.settings as WorkflowJSON['settings'],
		...(source.nodeGroups ? { nodeGroups: source.nodeGroups } : {}),
	};
}
