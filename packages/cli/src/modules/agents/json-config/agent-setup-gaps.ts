import type { AgentJsonConfig, AgentJsonToolConfig } from '@n8n/api-types';
import { getRequiredNodeCredentialSlots } from '@n8n/ai-utilities/node-catalog';
import type { INodeParameters, INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { isResourceLocatorValue, NodeHelpers } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

import {
	getNodeToolDescription,
	isCredentialDisplayed,
	isCredentialSlotFilled,
	resolveNodeParameters,
} from './node-tool-description';

/**
 * A node-tool field that the config leaves empty and that only the user can
 * fill: a required credential slot, or a required parameter without a value.
 * Only fields that the node displays for its current parameters count. A
 * `$fromAI(...)` value is filled by the agent at run time, so it is not a gap.
 */
export type SetupGap = CredentialSetupGap | ParameterSetupGap;

export interface CredentialSetupGap {
	kind: 'credential';
	tool: string;
	credentialType: string;
}

export interface ParameterSetupGap {
	kind: 'parameter';
	tool: string;
	parameter: string;
	label: string;
	/** The user can type the value. Selectors need a lookup, and secrets do not belong in chat. */
	askable: boolean;
}

/** Values to write into the gaps of a config. */
export interface SetupValues {
	/** Credential for each credential type. */
	credentials: Record<string, { id: string; name: string }>;
	/** Text for each askable parameter gap, keyed by `parameterGapKey`. */
	parameters: Record<string, string>;
}

type NodeTool = Extract<AgentJsonToolConfig, { type: 'node' }>;

interface LocatedSetupGap {
	toolIndex: number;
	gap: SetupGap;
}

/** Parameter names never contain ':', so the key is unambiguous. */
export function parameterGapKey(gap: Pick<ParameterSetupGap, 'tool' | 'parameter'>): string {
	return `${gap.tool}:${gap.parameter}`;
}

function isEmptyParameterValue(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (isResourceLocatorValue(value)) return isEmptyParameterValue(value.value);
	return false;
}

function isAskableAsText(property: INodeProperties): boolean {
	const typeOptions = property.typeOptions ?? {};
	return (
		property.type === 'string' &&
		!typeOptions.password &&
		!typeOptions.multipleValues &&
		!typeOptions.loadOptionsMethod &&
		!typeOptions.loadOptions
	);
}

function credentialGaps(
	tool: NodeTool,
	description: INodeTypeDescription,
	parameters: INodeParameters,
): CredentialSetupGap[] {
	return getRequiredNodeCredentialSlots(description)
		.filter(
			({ credentialType }) =>
				!isCredentialSlotFilled(tool.node.credentials?.[credentialType]) &&
				isCredentialDisplayed(tool.node, description, credentialType, parameters),
		)
		.map(({ credentialType }) => ({ kind: 'credential', tool: tool.name, credentialType }));
}

function parameterGaps(
	tool: NodeTool,
	description: INodeTypeDescription,
	parameters: INodeParameters,
): ParameterSetupGap[] {
	const gaps: ParameterSetupGap[] = [];
	// A node can declare one parameter name several times for different operations.
	const displayedNames = new Set<string>();
	for (const property of description.properties) {
		if (!property.required || displayedNames.has(property.name)) continue;
		const displayed = NodeHelpers.displayParameter(
			parameters,
			property,
			{ typeVersion: tool.node.nodeTypeVersion },
			description,
		);
		if (!displayed) continue;
		displayedNames.add(property.name);
		if (!isEmptyParameterValue(parameters[property.name])) continue;
		gaps.push({
			kind: 'parameter',
			tool: tool.name,
			parameter: property.name,
			label: property.displayName,
			askable: isAskableAsText(property),
		});
	}
	return gaps;
}

function locateSetupGaps(
	tools: AgentJsonToolConfig[] | undefined,
	nodeTypes: NodeTypes,
): LocatedSetupGap[] {
	const located: LocatedSetupGap[] = [];
	(tools ?? []).forEach((tool, toolIndex) => {
		if (tool.type !== 'node') return;
		const description = getNodeToolDescription(tool.node, nodeTypes);
		if (!description) return;
		const parameters = resolveNodeParameters(tool.node, description);
		for (const gap of [
			...credentialGaps(tool, description, parameters),
			...parameterGaps(tool, description, parameters),
		]) {
			located.push({ toolIndex, gap });
		}
	});
	return located;
}

export function findSetupGaps(
	tools: AgentJsonToolConfig[] | undefined,
	nodeTypes: NodeTypes,
): SetupGap[] {
	return locateSetupGaps(tools, nodeTypes).map(({ gap }) => gap);
}

/**
 * Writes each value into the gap it belongs to and returns a new config.
 * A value without a gap is ignored, so a field that is already set is never
 * overwritten. The input config is not changed.
 */
export function fillSetupGaps(
	config: AgentJsonConfig,
	nodeTypes: NodeTypes,
	values: SetupValues,
): { config: AgentJsonConfig; filled: SetupGap[] } {
	const tools = structuredClone(config.tools ?? []);
	const filled: SetupGap[] = [];

	for (const { toolIndex, gap } of locateSetupGaps(tools, nodeTypes)) {
		const tool = tools[toolIndex];
		if (tool?.type !== 'node') continue;

		if (gap.kind === 'credential') {
			const credential = values.credentials[gap.credentialType];
			if (!credential) continue;
			tool.node.credentials = {
				...tool.node.credentials,
				[gap.credentialType]: { id: credential.id, name: credential.name },
			};
		} else {
			const value = gap.askable ? values.parameters[parameterGapKey(gap)] : undefined;
			if (value === undefined) continue;
			tool.node.nodeParameters = { ...tool.node.nodeParameters, [gap.parameter]: value };
		}
		filled.push(gap);
	}

	return { config: filled.length > 0 ? { ...config, tools } : config, filled };
}
