import type { WorkflowSuggestionBaseline, WorkflowSuggestionSnapshot } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';
import {
	compileWorkflowSource,
	downgradeUnchangedNodeBlockers,
	partitionWarnings,
	readWorkspaceFile,
	type InstanceAiContext,
	type ValidationWarning,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import isEqual from 'lodash/isEqual';
import {
	calculateWorkflowChecksum,
	INodeSchema,
	normalizeNodeShape,
	type INode,
} from 'n8n-workflow';

import { validateWorkflowStructure } from '@/workflow-helpers';

import { toWorkflowJSON } from '../workflow-json';

type CandidateWorkflowInput = {
	baseline: WorkflowSuggestionBaseline;
	context: InstanceAiContext;
	filePath: string;
	shareParameters: boolean;
	abortSignal?: AbortSignal;
};

export type CandidateWorkflowResult =
	| {
			success: true;
			filePath: string;
			candidateChecksum: string;
			workflow: WorkflowSuggestionSnapshot;
			warnings: ValidationWarning[];
			declaredOutputFixtures?: WorkflowJSON['pinData'];
	  }
	| { success: false; reason: string; errors: string[] };

async function baselineRoundtrip(baseline: WorkflowSuggestionBaseline): Promise<WorkflowJSON> {
	const { generateWorkflowCode, parseWorkflowCodeToBuilder } = await import('@n8n/workflow-sdk');
	const workflow = toWorkflowJSON({ ...baseline.original, id: baseline.workflowId });
	return parseWorkflowCodeToBuilder(
		generateWorkflowCode({ workflow, includeNodeIds: true, includePositions: false }),
	).toJSON({ tidyUp: true });
}

function checkWorkflowFields(
	candidate: WorkflowJSON,
	roundtrip: WorkflowJSON,
	baseline: WorkflowSuggestionBaseline,
	declaredOutputFixtures?: WorkflowJSON['pinData'],
): void {
	const fields = new Set([...Object.keys(roundtrip), ...Object.keys(candidate)]);
	for (const field of fields) {
		if (field === 'nodes' || field === 'connections') continue;
		const value: unknown = Reflect.get(candidate, field);
		if (field === 'pinData' && isEqual(value, declaredOutputFixtures)) continue;
		if (
			!isEqual(value, Reflect.get(roundtrip, field)) &&
			!isEqual(value, Reflect.get(baseline.original, field))
		) {
			throw new BadRequestError(
				`Candidate changes to workflow field "${field}" are not supported.`,
			);
		}
	}
}

function restoreNode(
	node: WorkflowJSON['nodes'][number],
	original: INode | undefined,
	roundtrip: WorkflowJSON['nodes'][number] | undefined,
): INode {
	if (!original) return INodeSchema.parse(node);
	if (!roundtrip)
		throw new BadRequestError(`The baseline node "${original.name}" could not be rebuilt.`);
	const fields = new Set([...Object.keys(roundtrip), ...Object.keys(node)]);
	const changes: Record<string, unknown> = {};
	for (const field of fields) {
		// Compilation adds layout and missing webhook IDs. Keep the captured values.
		if (field === 'position' || field === 'webhookId') continue;
		let value: unknown = Reflect.get(node, field);
		if (
			field === 'onError' &&
			value === undefined &&
			Reflect.get(node, 'continueOnFail') === true
		) {
			value = 'continueRegularOutput';
		}
		if (!isEqual(value, Reflect.get(roundtrip, field))) {
			changes[field] = value;
		}
	}
	if (Object.hasOwn(changes, 'onError')) changes.continueOnFail = undefined;
	return normalizeNodeShape({ ...original, ...changes });
}

async function restoreGraph(
	candidate: WorkflowJSON,
	roundtrip: WorkflowJSON,
	baseline: WorkflowSuggestionBaseline,
): Promise<WorkflowSuggestionSnapshot> {
	const { toEngineConnections } = await import('@n8n/workflow-sdk');
	const connections = toEngineConnections(candidate.connections);
	if (!isEqual(connections, candidate.connections)) {
		throw new BadRequestError('The candidate contains unsupported connection types.');
	}
	const originals = new Map(baseline.original.nodes.map((node) => [node.id, node]));
	const roundtripNodes = new Map(roundtrip.nodes.map((node) => [node.id, node]));
	const originalNames = new Set(baseline.original.nodes.map((node) => node.name));
	const allowedCredentials = baseline.original.nodes.flatMap((node) =>
		Object.entries(node.credentials ?? {}),
	);
	const nodes = candidate.nodes.map((node) => {
		const original = originals.get(node.id);
		if (!original && node.name && originalNames.has(node.name)) {
			throw new BadRequestError(`Keep the existing ID for node "${node.name}".`);
		}
		const restored = restoreNode(node, original, roundtripNodes.get(node.id));
		if (original && !isEqual(restored.credentials, original.credentials)) {
			throw new BadRequestError(`Credential changes for node "${node.name}" are not supported.`);
		}
		for (const reference of Object.entries(restored.credentials ?? {})) {
			if (!allowedCredentials.some((allowed) => isEqual(allowed, reference))) {
				throw new BadRequestError(`Node "${node.name}" must use a captured credential reference.`);
			}
		}
		return restored;
	});
	const order = new Map(baseline.original.nodes.map((node, index) => [node.id, index]));
	nodes.sort(
		(left, right) => (order.get(left.id) ?? order.size) - (order.get(right.id) ?? order.size),
	);
	return {
		...baseline.original,
		nodes,
		connections: isEqual(candidate.connections, roundtrip.connections)
			? baseline.original.connections
			: connections,
	};
}

/** Compile each call from the workspace. Verification never saves or publishes this workflow. */
export async function compileCandidateWorkflow({
	baseline,
	context,
	filePath,
	shareParameters,
	abortSignal,
}: CandidateWorkflowInput): Promise<CandidateWorkflowResult> {
	abortSignal?.throwIfAborted();
	if (!shareParameters) {
		return {
			success: false,
			reason: 'parameter_sharing_disabled',
			errors: ['Candidate verification requires parameter sharing to be enabled.'],
		};
	}
	if (!context.workspace) {
		return {
			success: false,
			reason: 'workspace_unavailable',
			errors: ['The workspace is unavailable.'],
		};
	}
	const source = await readWorkspaceFile(context.workspace, filePath, {
		logger: context.logger,
		abortSignal,
	});
	abortSignal?.throwIfAborted();
	if (source === null) {
		return {
			success: false,
			reason: 'candidate_not_found',
			errors: ['The candidate file was not found in this workspace.'],
		};
	}
	try {
		const compiled = await compileWorkflowSource(context, filePath, source, abortSignal);
		if (!compiled.success) return compiled;
		const roundtrip = await baselineRoundtrip(baseline);
		checkWorkflowFields(compiled.workflow, roundtrip, baseline, compiled.declaredOutputFixtures);
		const workflow = await restoreGraph(compiled.workflow, roundtrip, baseline);
		validateWorkflowStructure(workflow);
		if (
			isEqual(workflow.nodes, baseline.original.nodes) &&
			isEqual(workflow.connections, baseline.original.connections)
		) {
			return {
				success: false,
				reason: 'candidate_unchanged',
				errors: ['The candidate has no workflow changes.'],
			};
		}
		const warnings = downgradeUnchangedNodeBlockers(
			compiled.warnings,
			compiled.workflow,
			toWorkflowJSON({ ...baseline.original, id: baseline.workflowId }),
		);
		const { blocking } = partitionWarnings(warnings);
		if (blocking.length > 0) {
			return {
				success: false,
				reason: 'candidate_invalid',
				errors: blocking.map(({ message }) => message),
			};
		}
		return {
			success: true,
			filePath,
			candidateChecksum: await calculateWorkflowChecksum(workflow),
			workflow: structuredClone(workflow),
			warnings,
			declaredOutputFixtures: compiled.declaredOutputFixtures,
		};
	} catch (error) {
		abortSignal?.throwIfAborted();
		return { success: false, reason: 'candidate_invalid', errors: [getErrorMessage(error)] };
	}
}
