import type { InferTelemetryProps, TELEMETRY_EVENT } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowSetupSection } from './workflowSetup.types';

type SetupSavedProperties = InferTelemetryProps<typeof TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED>;

/** The setup sections that the telemetry reads. A snapshot keeps them after the card unmounts. */
export type SetupSavedSection = Pick<
	WorkflowSetupSection,
	'credentialType' | 'credentialTargetNodes' | 'parameterNames'
> & { node: Pick<WorkflowSetupSection['node'], 'id' | 'name' | 'type'> };

/**
 * The outcome of `AI Assistant workflow setup saved` for one setup tool result.
 * Returns `undefined` when the result saved nothing, so the caller sends no event.
 */
export function buildSetupSavedOutcome(
	sections: SetupSavedSection[],
	result: Record<string, unknown>,
): Pick<SetupSavedProperties, 'items' | 'setup_complete'> | undefined {
	if (result.success !== true) return undefined;
	const report = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
	const completedNodes = report(result.completedNodes);
	if (!completedNodes.length) return undefined;
	const failedNodes = new Set(report(result.failedNodes).map((node) => node.nodeName));
	const pendingNodes = report(result.nodesStillNeedingSetup);
	const savedNodes = report(result.updatedNodes);
	const items: SetupSavedProperties['items'] = [];
	const parameters = new Set<string>();
	for (const section of sections) {
		if (section.credentialType) {
			for (const node of section.credentialTargetNodes) {
				const savedNode = savedNodes.find((saved) => saved.id === node.id);
				const credential = isRecord(savedNode?.credentials)
					? savedNode.credentials[section.credentialType]
					: undefined;
				items.push({
					node_id: node.id,
					node_type: node.type,
					kind: 'credential',
					credential_type: section.credentialType,
					completed:
						!failedNodes.has(node.name) &&
						(completedNodes.some(
							(completed) =>
								completed.nodeName === node.name &&
								completed.credentialType === section.credentialType,
						) ||
							(isRecord(credential) &&
								((typeof credential.id === 'string' && credential.id.length > 0) ||
									credential.__aiGatewayManaged === true))),
				});
			}
		}
		for (const parameterName of section.parameterNames) {
			const key = JSON.stringify([section.node.id, parameterName]);
			if (parameters.has(key)) continue;
			parameters.add(key);
			items.push({
				node_id: section.node.id,
				node_type: section.node.type,
				kind: 'parameter',
				parameter_name: parameterName,
				completed:
					!failedNodes.has(section.node.name) &&
					!pendingNodes.some(
						(pending) =>
							pending.nodeName === section.node.name &&
							isRecord(pending.parameterIssues) &&
							Object.hasOwn(pending.parameterIssues, parameterName),
					) &&
					completedNodes.some(
						(completed) =>
							completed.nodeName === section.node.name &&
							Array.isArray(completed.parametersSet) &&
							completed.parametersSet.includes(parameterName),
					),
			});
		}
	}
	if (!items.some((item) => item.completed)) return undefined;
	return {
		items,
		setup_complete:
			(result.partial === undefined || result.partial === false) &&
			[result.failedNodes, result.nodesStillNeedingSetup, result.skippedByUser].every(
				(value) => value === undefined || (Array.isArray(value) && value.length === 0),
			) &&
			items.every((item) => item.completed),
	};
}
