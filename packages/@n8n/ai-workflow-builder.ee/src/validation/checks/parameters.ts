import {
	checkConditions,
	isExpression,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyOptions,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';

import type { ProgrammaticViolation } from '../types';

/** The value type for options (dropdown) fields */
type OptionValue = INodePropertyOptions['value'];

/**
 * Type guard for option values (primitives only).
 * Options can only be string, number, or boolean.
 */
function isOptionValue(value: unknown): value is OptionValue {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Check if a property should be hidden based on a specific condition key.
 * Returns true if the property should be hidden, false otherwise.
 */
function isHiddenByCondition(
	displayOptions: INodeProperties['displayOptions'],
	conditionKey: string,
	value: string | number | boolean,
): boolean {
	// Check 'show' condition - if specified but doesn't match, hide it
	const showCondition = displayOptions?.show?.[conditionKey];
	if (showCondition && !checkConditions(showCondition, [value])) {
		return true;
	}

	// Check 'hide' condition - if specified and matches, hide it
	const hideCondition = displayOptions?.hide?.[conditionKey];
	if (hideCondition && checkConditions(hideCondition, [value])) {
		return true;
	}

	return false;
}

/**
 * Check if a property should be hidden based on displayOptions conditions.
 * Evaluates all conditions in displayOptions.show and displayOptions.hide.
 */
function isPropertyHiddenForContext(
	displayOptions: INodeProperties['displayOptions'],
	nodeVersion: number,
	currentValues: INodeParameters,
): boolean {
	if (!displayOptions) return false;

	// Always check @version first
	if (isHiddenByCondition(displayOptions, '@version', nodeVersion)) return true;

	// Check all 'show' conditions - if ANY specified condition doesn't match, hide it
	if (displayOptions.show) {
		for (const [conditionKey, _conditionValue] of Object.entries(displayOptions.show)) {
			if (conditionKey === '@version') continue; // Already checked above

			const paramValue = currentValues[conditionKey];
			// Only check if we have a value for this parameter (string, number, or boolean)
			if (
				typeof paramValue === 'string' ||
				typeof paramValue === 'number' ||
				typeof paramValue === 'boolean'
			) {
				if (isHiddenByCondition(displayOptions, conditionKey, paramValue)) {
					return true;
				}
			} else if (paramValue === undefined) {
				// If the parameter value is undefined but there's a show condition for it,
				// we can't determine visibility - skip this property to avoid false positives
				return true;
			}
		}
	}

	// Check all 'hide' conditions - if ANY specified condition matches, hide it
	if (displayOptions.hide) {
		for (const [conditionKey, _conditionValue] of Object.entries(displayOptions.hide)) {
			if (conditionKey === '@version') continue; // Already checked above

			const paramValue = currentValues[conditionKey];
			if (
				typeof paramValue === 'string' ||
				typeof paramValue === 'number' ||
				typeof paramValue === 'boolean'
			) {
				if (isHiddenByCondition(displayOptions, conditionKey, paramValue)) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Check if a default value is "meaningful" (i.e., a real value, not empty/undefined).
 * Required fields with meaningful defaults can be left empty to use the default.
 */
function hasMeaningfulDefault(property: INodeProperties): boolean {
	const d = property.default;
	if (d === undefined || d === null || d === '') return false;
	return !(Array.isArray(d) && d.length === 0);
}

/**
 * Type guard for INodePropertyOptions.
 * INodePropertyOptions has `name` + `value` (primitive value).
 */
function isINodePropertyOptions(item: unknown): item is INodePropertyOptions {
	return (
		typeof item === 'object' &&
		item !== null &&
		'value' in item &&
		'name' in item &&
		!('values' in item) // Distinguish from INodePropertyCollection
	);
}

/**
 * Get allowed values from options property.
 * Returns undefined if the property doesn't have static options.
 */
function getAllowedOptionsValues(property: INodeProperties): Set<OptionValue> | undefined {
	if (property.type !== 'options' || !property.options) {
		return undefined;
	}

	const allowedValues = new Set<OptionValue>();
	for (const opt of property.options) {
		if (isINodePropertyOptions(opt)) {
			allowedValues.add(opt.value);
		}
	}

	return allowedValues.size > 0 ? allowedValues : undefined;
}

/**
 * Check if a parameter value is empty.
 */
function isEmptyValue(value: unknown): boolean {
	if (value === undefined || value === null || value === '') return true;
	return Array.isArray(value) && value.length === 0;
}

/**
 * Validate a single node's required parameters.
 */
function validateRequiredParameters(
	node: SimpleWorkflow['nodes'][0],
	nodeType: INodeTypeDescription,
	nodeParameters: INodeParameters,
	nodeVersion: number,
	violations: ProgrammaticViolation[],
): void {
	for (const property of nodeType.properties) {
		if (property.required !== true) continue;
		// Skip types the workflow builder can't configure
		if (
			property.type === 'collection' ||
			property.type === 'fixedCollection' ||
			property.type === 'credentialsSelect'
		) {
			continue;
		}
		if (isPropertyHiddenForContext(property.displayOptions, nodeVersion, nodeParameters)) continue;

		const paramValue = nodeParameters[property.name];
		if (isEmptyValue(paramValue) && !hasMeaningfulDefault(property)) {
			violations.push({
				name: 'node-missing-required-parameter',
				type: 'critical',
				description: `Node "${node.name}" is missing required parameter "${property.displayName}"`,
				pointsDeducted: 50,
				metadata: {
					nodeName: node.name,
					nodeType: node.type,
					parameterName: property.name,
					parameterDisplayName: property.displayName,
				},
			});
		}
	}
}

/**
 * Validate a single node's options parameter values.
 */
function validateOptionsValues(
	node: SimpleWorkflow['nodes'][0],
	nodeType: INodeTypeDescription,
	nodeParameters: INodeParameters,
	nodeVersion: number,
	violations: ProgrammaticViolation[],
): void {
	for (const property of nodeType.properties) {
		if (property.type !== 'options') continue;
		if (property.typeOptions?.loadOptionsMethod) continue;
		if (isPropertyHiddenForContext(property.displayOptions, nodeVersion, nodeParameters)) continue;

		const paramValue = nodeParameters[property.name];
		if (paramValue === undefined || paramValue === null || isExpression(paramValue)) continue;
		// Only validate primitive option values (not objects/arrays)
		if (!isOptionValue(paramValue)) continue;

		const allowedValues = getAllowedOptionsValues(property);
		if (allowedValues && !allowedValues.has(paramValue)) {
			violations.push({
				name: 'node-invalid-options-value',
				type: 'critical',
				description: `Node "${node.name}" has invalid value "${String(paramValue)}" for parameter "${property.displayName}"`,
				pointsDeducted: 50,
				metadata: {
					nodeName: node.name,
					nodeType: node.type,
					parameterName: property.name,
					parameterDisplayName: property.displayName,
					invalidValue: String(paramValue),
				},
			});
		}
	}
}

/**
 * Validate workflow parameters for:
 * 1. Missing required parameters (without meaningful defaults)
 * 2. Invalid options values (value not in allowed list)
 *
 * Only validates top-level parameters (skips collections/fixedCollection).
 */
export function validateParameters(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): ProgrammaticViolation[] {
	const violations: ProgrammaticViolation[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		return violations;
	}

	const { nodeTypeMap, nodeTypesByName } = createNodeTypeMaps(nodeTypes);

	for (const node of workflow.nodes) {
		const nodeType = getNodeTypeForNode(node, nodeTypeMap, nodeTypesByName);
		if (!nodeType?.properties) {
			continue;
		}

		const nodeVersion = node.typeVersion ?? 1;
		const nodeParameters = node.parameters ?? {};

		validateRequiredParameters(node, nodeType, nodeParameters, nodeVersion, violations);
		validateOptionsValues(node, nodeType, nodeParameters, nodeVersion, violations);
	}

	return violations;
}
