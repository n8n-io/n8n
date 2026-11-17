import {
	getStaticSubworkflowId,
	isNodeWithWorkflowSelector,
	isResourceLocatorValue,
	type INode,
	type IWorkflowSettings,
	type WorkflowSettings,
} from 'n8n-workflow';

import { visitWorkflowCredentials } from '@/modules/n8n-packages/entities/credential/workflow-credential-references';

import type {
	ExpressionReferenceFact,
	ReferenceConsumer,
	ReferenceFact,
	Verdict,
} from './dependency-check.types';

export type ReferenceSource = {
	nodes?: INode[];
	settings?: IWorkflowSettings;
};

export type ExtractedReferences = {
	references: ReferenceFact[];
	expressionReferences: ExpressionReferenceFact[];
};

/**
 * The static references of one workflow: credentials, sub-workflows and the error workflow.
 * The name and the type are the ones that the node holds. A reference that an expression
 * computes has no static target, so it is listed apart.
 */
export function extractReferences(
	consumer: ReferenceConsumer,
	source: ReferenceSource,
): ExtractedReferences {
	const references = new Map<string, ReferenceFact>();
	const expressionUsages = new Set<ExpressionReferenceFact['usage']>();
	const add = (reference: ReferenceFact) => {
		const key = `${reference.usage}|${reference.target.id}`;
		if (!references.has(key)) references.set(key, reference);
	};

	visitWorkflowCredentials(source.nodes, (credentialType, details) => {
		if (details.id) {
			add({
				consumer,
				target: { kind: 'credential', id: details.id, name: details.name, credentialType },
				usage: 'credential',
			});
		}
		return false;
	});

	for (const node of source.nodes ?? []) {
		if (!isNodeWithWorkflowSelector(node)) continue;
		const id = getStaticSubworkflowId(node);
		if (id !== undefined) {
			const name = cachedWorkflowName(node);
			add({
				consumer,
				target: { kind: 'workflow', id, ...(name ? { name } : {}) },
				usage: 'sub-workflow',
			});
		} else if (isExpressionWorkflowId(node)) {
			expressionUsages.add('sub-workflow');
		}
	}

	const errorWorkflow = source.settings?.errorWorkflow;
	if (typeof errorWorkflow === 'string' && errorWorkflow !== '' && errorWorkflow !== 'DEFAULT') {
		if (errorWorkflow.startsWith('=')) expressionUsages.add('error-workflow');
		else
			add({ consumer, target: { kind: 'workflow', id: errorWorkflow }, usage: 'error-workflow' });
	}

	return {
		references: [...references.values()],
		expressionReferences: [...expressionUsages].map((usage) => ({ consumer, usage })),
	};
}

function cachedWorkflowName(node: INode): string | undefined {
	const value = node.parameters.workflowId;
	if (!isResourceLocatorValue(value)) return undefined;
	const { cachedResultName } = value;
	return typeof cachedResultName === 'string' && cachedResultName !== ''
		? cachedResultName
		: undefined;
}

/** The node reads a workflow from the database, and an expression gives the id. */
function isExpressionWorkflowId(node: INode): boolean {
	const { source = 'database', workflowId } = node.parameters;
	if (source !== 'database') return false;
	const value = isResourceLocatorValue(workflowId) ? workflowId.value : workflowId;
	return typeof value === 'string' && value.trim().startsWith('=');
}

/**
 * The caller policy of a sub-workflow, as `SubworkflowPolicyChecker` decides it. This version
 * reads settings and projects that the caller gives, so it also works for the state after an
 * Apply, when the workflows are not both in the database yet.
 */
export function callerPolicyVerdict(args: {
	subworkflowSettings: IWorkflowSettings | undefined;
	defaultPolicy: WorkflowSettings.CallerPolicy;
	callerWorkflowId: string;
	callerProjectId: string | undefined;
	subworkflowProjectId: string | undefined;
}): Verdict {
	const policy = args.subworkflowSettings?.callerPolicy ?? args.defaultPolicy;
	if (policy === 'any') return true;
	if (policy === 'none') return false;
	if (policy === 'workflowsFromAList') {
		const callerIds = (args.subworkflowSettings?.callerIds ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id !== '');
		return callerIds.includes(args.callerWorkflowId);
	}
	if (args.callerProjectId === undefined || args.subworkflowProjectId === undefined) {
		return 'unknown';
	}
	return args.callerProjectId === args.subworkflowProjectId;
}
