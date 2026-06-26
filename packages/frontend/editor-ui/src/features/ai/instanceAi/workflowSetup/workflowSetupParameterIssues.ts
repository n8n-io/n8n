import { findPlaceholderDetails } from '@n8n/utils';
import type { INodeUi } from '@/Interface';
import type { INodeParameters, INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

export function getWorkflowSetupParameterIssues(
	node: INodeUi,
	nodeType: INodeTypeDescription | null,
	parameterNames: string[],
): Record<string, string[]> {
	if (!nodeType || parameterNames.length === 0) return {};

	const wanted = new Set(parameterNames);
	const allIssues =
		NodeHelpers.getNodeParametersIssues(nodeType.properties, node, nodeType)?.parameters ?? {};
	// A parameter name can have multiple definitions with different displayOptions.
	// Keep all variants so issues are shown when any matching definition is visible.
	const parameterDefinitionsByName = groupParameterDefinitionsByName(nodeType.properties);
	const filtered: Record<string, string[]> = {};

	for (const name of wanted) {
		const parameterDefinitions = parameterDefinitionsByName.get(name);
		if (
			!parameterDefinitions ||
			!parameterDefinitions.some((definition) =>
				isParameterDefinitionVisible(node.parameters, definition, node, nodeType),
			)
		) {
			continue;
		}

		const issues = [...(allIssues[name] ?? [])];
		const placeholderDetails = findPlaceholderDetails(node.parameters[name]);
		if (placeholderDetails.length > 0) {
			issues.push(`Placeholder "${placeholderDetails[0].label}" - please provide the real value`);
		}

		if (issues.length > 0) filtered[name] = issues;
	}

	return filtered;
}

function groupParameterDefinitionsByName(
	properties: INodeProperties[],
): Map<string, INodeProperties[]> {
	const result = new Map<string, INodeProperties[]>();
	for (const prop of properties) {
		const existing = result.get(prop.name);
		if (existing) {
			existing.push(prop);
		} else {
			result.set(prop.name, [prop]);
		}
	}
	return result;
}

function isParameterDefinitionVisible(
	parameters: INodeParameters,
	property: INodeProperties,
	node: INodeUi,
	nodeType: INodeTypeDescription,
): boolean {
	if (property.type === 'hidden') return false;
	if (!property.displayOptions) return true;
	return NodeHelpers.displayParameter(parameters, property, node, nodeType);
}
