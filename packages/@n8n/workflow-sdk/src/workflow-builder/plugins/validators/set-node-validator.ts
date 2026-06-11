/**
 * Set Node Validator Plugin
 *
 * Validates Set nodes for contract issues and security issues like
 * credential-like field names.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { parseVersion } from '../../string-utils';
import { isCredentialFieldName } from '../../validation-helpers';
import {
	type ValidatorPlugin,
	type ValidationIssue,
	type PluginContext,
	findMapKey,
	isAutoRenamed,
	formatNodeRef,
} from '../types';

const SUPPORTED_MODES = new Set(['manual', 'raw']);

// Set node v3.x declares `mode: "manual" | "raw"`. v3.3 introduced the
// `assignments` collection (`{ id, name, value, type }`). v1/v2 use
// `parameters.values.*`; v3.0-3.2 use `parameters.fields.values[]`.
const MIN_MODE_VERSION = 3;
const MIN_ASSIGNMENT_VERSION = 3.3;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim() !== '';
}

function formatMode(mode: unknown): string {
	if (typeof mode === 'string') return mode;
	if (typeof mode === 'number' || typeof mode === 'boolean' || mode === null) {
		return JSON.stringify(mode);
	}
	if (Array.isArray(mode)) return '[array]';
	return '[object]';
}

/**
 * Validator for Set nodes.
 *
 * Checks for:
 * - Invalid Set node mode values
 * - Invalid assignment collection entries
 * - Credential-like field names in assignments (password, api_key, secret, token, etc.)
 */
export const setNodeValidator: ValidatorPlugin = {
	id: 'core:set-node',
	name: 'Set Node Validator',
	nodeTypes: ['n8n-nodes-base.set'],
	priority: 40,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		const nodeVersion = parseVersion(node.version);

		if (nodeVersion < MIN_MODE_VERSION) {
			return issues;
		}

		const params = node.config?.parameters;

		if (!isRecord(params)) {
			return issues;
		}

		// Find the map key for this node (may be renamed from node.name)
		const mapKey = findMapKey(graphNode, ctx);
		const originalName = node.name;
		const renamed = isAutoRenamed(mapKey, originalName);
		const displayName = renamed ? mapKey : originalName;
		const origForWarning = renamed ? originalName : undefined;
		const nodeRef = formatNodeRef(displayName, origForWarning, node.type);

		const mode = params.mode;
		if (mode !== undefined && (!isNonEmptyString(mode) || !SUPPORTED_MODES.has(mode))) {
			issues.push({
				code: 'SET_INVALID_MODE',
				message:
					`${nodeRef} uses unsupported Set node mode "${formatMode(mode)}". ` +
					'Use "manual" for field mapping or "raw" for JSON output. ' +
					'To keep existing input fields while mapping fields, use mode: "manual" with includeOtherFields: true.',
				severity: 'error',
				violationLevel: 'major',
				nodeName: displayName,
				parameterPath: 'parameters.mode',
				originalName: origForWarning,
			});
		}

		if (nodeVersion < MIN_ASSIGNMENT_VERSION) {
			return issues;
		}

		const assignments = params.assignments;
		if (assignments === undefined) {
			return issues;
		}

		if (!isRecord(assignments)) {
			issues.push({
				code: 'SET_INVALID_ASSIGNMENT',
				message: `${nodeRef} has invalid assignments. Expected parameters.assignments to be an object containing assignments: [].`,
				severity: 'error',
				violationLevel: 'major',
				nodeName: displayName,
				parameterPath: 'parameters.assignments',
				originalName: origForWarning,
			});
			return issues;
		}

		const assignmentItems = assignments.assignments;

		if (assignmentItems === undefined) {
			return issues;
		}

		if (!Array.isArray(assignmentItems)) {
			issues.push({
				code: 'SET_INVALID_ASSIGNMENT',
				message: `${nodeRef} has invalid assignments. Expected parameters.assignments.assignments to be an array.`,
				severity: 'error',
				violationLevel: 'major',
				nodeName: displayName,
				parameterPath: 'parameters.assignments.assignments',
				originalName: origForWarning,
			});
			return issues;
		}

		for (const [index, assignment] of assignmentItems.entries()) {
			const parameterPath = `parameters.assignments.assignments[${index}]`;

			if (!isRecord(assignment)) {
				issues.push({
					code: 'SET_INVALID_ASSIGNMENT',
					message: `${nodeRef} has an invalid assignment at index ${index}. Expected an object with id, name, value, and type.`,
					severity: 'error',
					violationLevel: 'major',
					nodeName: displayName,
					parameterPath,
					originalName: origForWarning,
				});
				continue;
			}

			for (const key of ['id', 'name', 'type']) {
				if (!isNonEmptyString(assignment[key])) {
					issues.push({
						code: 'SET_INVALID_ASSIGNMENT',
						message: `${nodeRef} assignment at index ${index} is missing a non-empty "${key}" field.`,
						severity: 'error',
						violationLevel: 'major',
						nodeName: displayName,
						parameterPath: `${parameterPath}.${key}`,
						originalName: origForWarning,
					});
				}
			}

			if (assignment.value === undefined) {
				issues.push({
					code: 'SET_INVALID_ASSIGNMENT',
					message: `${nodeRef} assignment at index ${index} is missing the "value" field.`,
					severity: 'error',
					violationLevel: 'major',
					nodeName: displayName,
					parameterPath: `${parameterPath}.value`,
					originalName: origForWarning,
				});
			}

			if (isNonEmptyString(assignment.name) && isCredentialFieldName(assignment.name)) {
				issues.push({
					code: 'SET_CREDENTIAL_FIELD',
					message: `${nodeRef} has a field named "${assignment.name}" which appears to be storing credentials. Use n8n's credential system instead.`,
					severity: 'warning',
					nodeName: displayName,
					originalName: origForWarning,
				});
			}
		}

		return issues;
	},
};
