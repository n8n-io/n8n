/**
 * Empty Resource Locator Validator
 *
 * Flags resource locator objects whose `value` is an empty string. Empty
 * `__rl.value` crashes at runtime — use a real ID, name mode, or
 * `placeholder()` / setup, never `""`.
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
		if (
			isEmptyResourceLocatorValue(value) &&
			!isPlaceholderValue(value) &&
			!containsPlaceholderMarker(value)
		) {
			const parameterPath = path || '(root)';
			issues.push({
				code: 'EMPTY_RESOURCE_LOCATOR_VALUE',
				message:
					`'${nodeName}' parameter '${parameterPath}' has an empty resource locator value. ` +
					'Empty __rl.value crashes at runtime — use a real ID, name mode, or placeholder() / setup, never "".',
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
 * Validator for empty resource locator values.
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
