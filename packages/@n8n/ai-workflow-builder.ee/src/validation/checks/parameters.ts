import {
	checkConditions,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyOptions,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';

import type { ProgrammaticViolation } from '../types';

/**
 * Check if a property should be hidden based on a specific condition key.
 * Returns true if the property should be hidden, false otherwise.
 */
function isHiddenByCondition(
	displayOptions: INodeProperties['displayOptions'],
	conditionKey: string,
	value: string | number,
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
 * Check if a property should be hidden based on @version, resource, operation conditions.
 * We only evaluate these conditions to avoid false positives from other complex conditions.
 */
function isPropertyHiddenForContext(
	displayOptions: INodeProperties['displayOptions'],
	nodeVersion: number,
	currentValues: INodeParameters,
): boolean {
	if (!displayOptions) return false;

	if (isHiddenByCondition(displayOptions, '@version', nodeVersion)) return true;

	const resource = currentValues.resource;
	if (typeof resource === 'string' && isHiddenByCondition(displayOptions, 'resource', resource)) {
		return true;
	}

	const operation = currentValues.operation;
	if (
		typeof operation === 'string' &&
		isHiddenByCondition(displayOptions, 'operation', operation)
	) {
		return true;
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
 * Check if a value is an expression (starts with '=').
 * Expressions are not validated statically.
 */
function isExpression(value: unknown): boolean {
	return typeof value === 'string' && value.startsWith('=');
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
function getAllowedOptionsValues(property: INodeProperties): Set<unknown> | undefined {
	if (property.type !== 'options' || !property.options) {
		return undefined;
	}

	const allowedValues = new Set<unknown>();
	for (const opt of property.options) {
		if (isINodePropertyOptions(opt)) {
			allowedValues.add(opt.value);
		}
	}

	return allowedValues.size > 0 ? allowedValues : undefined;
}

/**
 * Convert a parameter value to a string for display purposes.
 */
function valueToString(value: unknown): string {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
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
		if (property.type === 'collection' || property.type === 'fixedCollection') continue;
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

		const allowedValues = getAllowedOptionsValues(property);
		if (allowedValues && !allowedValues.has(paramValue)) {
			violations.push({
				name: 'node-invalid-options-value',
				type: 'critical',
				description: `Node "${node.name}" has invalid value "${valueToString(paramValue)}" for parameter "${property.displayName}"`,
				pointsDeducted: 50,
				metadata: {
					nodeName: node.name,
					nodeType: node.type,
					parameterName: property.name,
					parameterDisplayName: property.displayName,
					invalidValue: valueToString(paramValue),
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
