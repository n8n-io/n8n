import { isRecord } from '@n8n/utils/is-record';
import type { INodeParameters } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	generateSchemaFromExample,
	isResourceLocatorValue,
} from 'n8n-workflow';

import type { NodeDefinition, WorkflowDefinition } from '../workflow-set';
import type { WorkflowSetIssue } from './issues';

export interface SubWorkflowCall {
	node: NodeDefinition;
	childId?: string;
	storedName?: string;
}

interface Field {
	name: string;
	type?: string;
}

type Declaration = { fields: Field[]; typed: boolean } | { notChecked: string };

type Sending = { fields: Field[]; convertsTypes: boolean } | { notChecked: string };

export function subWorkflowCalls(definition: WorkflowDefinition): SubWorkflowCall[] {
	return definition.nodes.flatMap((node) => subWorkflowCall(node) ?? []);
}

export function subWorkflowCall(node: NodeDefinition): SubWorkflowCall | undefined {
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE || node.disabled) return undefined;
	if ((node.parameters.source ?? 'database') !== 'database') return undefined;
	return { node, ...storedChild(node) };
}

function storedChild(node: NodeDefinition): Omit<SubWorkflowCall, 'node'> {
	const { workflowId } = node.parameters;
	const locator = isResourceLocatorValue(workflowId) ? workflowId : undefined;
	const value = locator ? locator.value : workflowId;
	const storedName =
		typeof locator?.cachedResultName === 'string' ? locator.cachedResultName : undefined;
	if (typeof value !== 'string' || value.startsWith('=')) return { storedName };
	return { childId: value, storedName };
}

export function callHeading(parent: string, node: string, child: string) {
	return `${parent} → "${node}" calls ${child}`;
}

export function missingChildMessage(parent: string, call: SubWorkflowCall, names: string[]) {
	const storedName = call.storedName ? ` (stored name "${call.storedName}")` : '';
	const child = `the workflow ID "${call.childId}"${storedName}`;
	return `${callHeading(parent, call.node.name, child)}, which the set does not hold. Workflows in the set: ${names.join(', ')}. Add the child to the set, or mock the node with mockNode().`;
}

export function checkContract(
	parent: string,
	node: NodeDefinition,
	child: WorkflowDefinition,
): WorkflowSetIssue | undefined {
	const heading = callHeading(parent, node.name, child.name);
	const notChecked = (reason: string) =>
		issue('CONTRACT_NOT_CHECKED', parent, node, heading, [`not checked: ${reason}`]);

	const declaration = childDeclaration(child);
	if ('notChecked' in declaration) return notChecked(declaration.notChecked);
	const sending = parentSending(node);
	if ('notChecked' in sending) return notChecked(sending.notChecked);

	const differences = compareFields(child.name, sending, declaration);
	if (differences.length === 0) return undefined;
	return issue('CONTRACT_MISMATCH', parent, node, heading, differences);
}

function issue(
	code: WorkflowSetIssue['code'],
	workflow: string,
	node: NodeDefinition,
	heading: string,
	lines: string[],
): WorkflowSetIssue {
	const message = [heading, ...lines.map((line) => `  - ${line}`)].join('\n');
	return { code, workflow, node: node.name, message };
}

function compareFields(
	child: string,
	sending: { fields: Field[]; convertsTypes: boolean },
	declaration: { fields: Field[]; typed: boolean },
): string[] {
	const declared = new Map(declaration.fields.map((field) => [field.name, field]));
	const sent = new Map(sending.fields.map((field) => [field.name, field]));
	const extra = sending.fields
		.filter((field) => !declared.has(field.name))
		.map((field) => `sends "${field.name}", which ${child} does not declare`);
	const missing = declaration.fields
		.filter((field) => !sent.has(field.name))
		.map((field) => `does not send "${field.name}"${typeSuffix(field)}, which ${child} declares`);
	const checksTypes = declaration.typed && !sending.convertsTypes;
	const wrongType = checksTypes
		? sending.fields.flatMap((field) => typeDifference(child, field, declared.get(field.name)))
		: [];
	return [...extra, ...missing, ...wrongType];
}

function typeDifference(child: string, sent: Field, declared: Field | undefined): string[] {
	if (!declared?.type || !sent.type || declared.type === sent.type) return [];
	return [`sends "${sent.name}" as ${sent.type}, which ${child} declares as ${declared.type}`];
}

function typeSuffix(field: Field) {
	return field.type ? ` (${field.type})` : '';
}

function childDeclaration(child: WorkflowDefinition): Declaration {
	const trigger = child.nodes.find((node) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	if (!trigger) return { notChecked: `${child.name} has no Execute Workflow Trigger` };
	const { parameters } = trigger;
	const inputSource = trigger.typeVersion === 1 ? 'passthrough' : parameters.inputSource;

	if (inputSource === 'jsonExample') return jsonExampleFields(child.name, parameters);
	if (inputSource === undefined || inputSource === 'workflowInputs') {
		return { fields: declaredFields(parameters.workflowInputs), typed: true };
	}
	return { notChecked: `${child.name} accepts all data` };
}

function declaredFields(workflowInputs: unknown): Field[] {
	const values = isRecord(workflowInputs) ? workflowInputs.values : undefined;
	if (!Array.isArray(values)) return [];
	return values.filter(isRecord).map((value) => ({
		name: String(value.name),
		type: declaredType(value.type),
	}));
}

function declaredType(type: unknown) {
	if (type === 'any') return undefined;
	return typeof type === 'string' ? type : 'string';
}

function jsonExampleFields(child: string, parameters: INodeParameters): Declaration {
	const { jsonExample } = parameters;
	if (typeof jsonExample !== 'string') {
		return { notChecked: `the JSON example of ${child} is not in the workflow JSON` };
	}
	let names: string[];
	try {
		names = Object.keys(generateSchemaFromExample(jsonExample).properties ?? {});
	} catch {
		return { notChecked: `the JSON example of ${child} is not valid JSON` };
	}
	return { fields: names.map((name) => ({ name })), typed: false };
}

function parentSending(node: NodeDefinition): Sending {
	if (node.typeVersion < 1.2) {
		return {
			notChecked: `"${node.name}" is version ${node.typeVersion}. The check needs version 1.2 or newer`,
		};
	}
	const workflowInputs: unknown = node.parameters.workflowInputs;
	if (!isRecord(workflowInputs)) return { fields: [], convertsTypes: false };
	const schema = Array.isArray(workflowInputs.schema) ? workflowInputs.schema.filter(isRecord) : [];
	return {
		fields: schema
			.filter((field) => field.removed !== true)
			.map((field) => ({
				name: String(field.id),
				type: typeof field.type === 'string' ? field.type : undefined,
			})),
		convertsTypes: workflowInputs.attemptToConvertTypes === true,
	};
}
