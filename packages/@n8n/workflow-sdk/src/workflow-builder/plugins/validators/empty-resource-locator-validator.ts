/**
 * Empty Resource Locator Validator
 *
 * Flags empty `id`-mode resource locators. Unknown resources should use
 * `mode: 'list'` with `value: ''` and a `cachedResultName` hint so setup shows
 * the From-list picker (INS-631) — that shape is intentional and not flagged.
 * Empty `id` forces a By-ID text field and often hallucinated IDs.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import { containsPlaceholderMarker, isPlaceholderValue } from '../../string-utils';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

function isEmptyResourceLocatorValue(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	if (value.trim() !== '') return false;
	return true;
}

function isResourceLocator(value: unknown): value is Record<string, unknown> {
	if (!isRecord(value)) return false;
	if (!('mode' in value) || !('value' in value)) return false;
	// Prefer explicit __rl, but also catch objects that look like RLs without it
	// (serializer may add __rl later).
	if ('__rl' in value && value.__rl !== true) return false;
	return typeof value.mode === 'string';
}

function collectEmptyResourceLocators(
	params: unknown,
	path: string,
	issues: ValidationIssue[],
	nodeName: string,
): void {
	if (Array.isArray(params)) {
		params.forEach((item, index) => {
			collectEmptyResourceLocators(item, `${path}[${index}]`, issues, nodeName);
		});
		return;
	}

	if (!isRecord(params)) return;

	if (isResourceLocator(params)) {
		const value = params.value;
		const mode = params.mode;
		// Empty list + cachedResultName is the approved unknown-resource setup
		// shape — list-mode placeholders are also cleared to "" by the serializer.
		if (mode === 'list') return;

		if (
			mode === 'id' &&
			isEmptyResourceLocatorValue(value) &&
			!isPlaceholderValue(value) &&
			!containsPlaceholderMarker(value)
		) {
			const parameterPath = path || '(root)';
			issues.push({
				code: 'EMPTY_RESOURCE_LOCATOR_VALUE',
				message:
					`'${nodeName}' parameter '${parameterPath}' has an empty id-mode resource locator. ` +
					"Use mode: 'list' with value: '' and a cachedResultName hint when the resource is " +
					'unknown (setup From-list picker), or a real ID when known — never empty id mode.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName,
				parameterPath,
			});
		}
		return;
	}

	for (const [key, val] of Object.entries(params)) {
		const nextPath = path ? `${path}.${key}` : key;
		collectEmptyResourceLocators(val, nextPath, issues, nodeName);
	}
}

/**
 * Validator for empty id-mode resource locator values.
 */
export const emptyResourceLocatorValidator: ValidatorPlugin = {
	id: 'core:empty-resource-locator',
	name: 'Empty Resource Locator Validator',
	priority: 45,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const params = node.config?.parameters;
		if (!isRecord(params)) return [];

		const issues: ValidationIssue[] = [];
		collectEmptyResourceLocators(params, '', issues, node.name);
		return issues;
	},
};
