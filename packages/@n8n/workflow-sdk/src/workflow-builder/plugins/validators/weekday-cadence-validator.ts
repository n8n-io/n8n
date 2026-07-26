/**
 * Weekday Cadence Validator
 *
 * Flags digest/schedule gates that use `$now.weekday` (or Luxon
 * `DateTime.now().weekday`) equality. That pattern only fires on one weekday
 * and silently no-ops every other day — digests should be driven by the
 * Schedule Trigger cron / interval or a stored last-sent timestamp.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const WEEKDAY_GATE = /(?:\$now\.weekday|DateTime\.now\(\)\s*\.weekday)\s*(?:===?|!==?|==|!=)\s*\d+/;

function sourcesOf(node: NodeInstance<string, string, unknown>): Array<{
	source: string;
	parameterPath: string;
}> {
	const params = node.config?.parameters;
	const sources: Array<{ source: string; parameterPath: string }> = [];
	if (!isRecord(params)) return sources;

	for (const entry of extractExpressions(params)) {
		sources.push({ source: entry.expression, parameterPath: entry.path });
	}

	if (typeof params.jsCode === 'string' && params.jsCode.length > 0) {
		sources.push({ source: params.jsCode, parameterPath: 'jsCode' });
	}

	return sources;
}

/**
 * Validator for weekday-equality digest cadence gates.
 */
export const weekdayCadenceValidator: ValidatorPlugin = {
	id: 'core:weekday-cadence',
	name: 'Weekday Cadence Validator',
	priority: 36,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		for (const { source, parameterPath } of sourcesOf(node)) {
			if (!WEEKDAY_GATE.test(source)) continue;
			issues.push({
				code: 'WEEKDAY_DIGEST_CADENCE',
				message:
					`'${node.name}' gates on \`$now.weekday\` / \`DateTime.now().weekday\` equality. That only ` +
					'runs on one weekday and silently no-ops the rest. Drive digest cadence from the Schedule ' +
					'Trigger (cron/interval) or a stored last-sent timestamp instead.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath,
			});
		}

		return issues;
	},
};
