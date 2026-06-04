import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck, BinaryCheckContext } from '../types';
import { extractExpressionsFromParams } from '../utils';

const PAIRED_ITEM_PROMPT_PATTERNS = [
	/paired item/i,
	/same paired/i,
	/same item/i,
	/do not use \.first/i,
	/reuse the first/i,
	/first event id/i,
	/multiple (?:email|invite|item)/i,
];

const UPSTREAM_REPLACEMENT_PROMPT_PATTERNS = [
	/current \$json/i,
	/archive .*output.*no longer contains/i,
	/gets undefined/i,
	/referenc(?:e|ing) the upstream/i,
	/upstream extraction/i,
];

const FIRST_ITEM_REFERENCE_PATTERNS = [
	{
		label: '$("...").first()',
		pattern: /\$\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)\.first\s*\(/,
	},
	{
		label: '$items(...)[0]',
		pattern: /\$items\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1[^)]*\)\s*\[\s*0\s*\]/,
	},
	{
		label: '$input.first()',
		pattern: /\$input\.first\s*\(/,
	},
] as const;

const CURRENT_JSON_EVENT_ID = /\$json\.(?:calendarEventId|eventId|eventID|calendar_event_id)\b/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getItemFlowAnnotations(ctx: BinaryCheckContext): Record<string, unknown> {
	const itemFlow = ctx.annotations?.itemFlow;
	return isRecord(itemFlow) ? itemFlow : {};
}

function hasAnnotationFlag(ctx: BinaryCheckContext, flag: string): boolean {
	return getItemFlowAnnotations(ctx)[flag] === true;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(text));
}

function requiresPairedItemReferences(ctx: BinaryCheckContext): boolean {
	return (
		hasAnnotationFlag(ctx, 'requiresPairedItemReferences') ||
		matchesAny(ctx.prompt, PAIRED_ITEM_PROMPT_PATTERNS)
	);
}

function requiresUpstreamReferenceAfterReplacement(ctx: BinaryCheckContext): boolean {
	return (
		hasAnnotationFlag(ctx, 'requiresUpstreamReferenceAfterReplacement') ||
		matchesAny(ctx.prompt, UPSTREAM_REPLACEMENT_PROMPT_PATTERNS)
	);
}

function getFirstItemReferenceLabel(expression: string): string | undefined {
	return FIRST_ITEM_REFERENCE_PATTERNS.find(({ pattern }) => pattern.test(expression))?.label;
}

function isCalendarLookupNode(node: WorkflowNodeResponse): boolean {
	const haystack =
		`${node.name} ${node.type} ${JSON.stringify(node.parameters ?? {})}`.toLowerCase();
	return haystack.includes('calendar') && /(event|lookup|fetch|get)/i.test(haystack);
}

function shortExpression(expression: string): string {
	const compact = expression.replace(/\s+/g, ' ').trim();
	return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

export const itemFlowPairedItemReferences: BinaryCheck = {
	name: 'item_flow_paired_item_references',
	description: 'Item-flow expressions preserve paired upstream item context',
	kind: 'deterministic',
	dimension: 'parameter_correctness',
	run(workflow, ctx) {
		const checkPairedReferences = requiresPairedItemReferences(ctx);
		const checkUpstreamReplacement = requiresUpstreamReferenceAfterReplacement(ctx);
		if (!checkPairedReferences && !checkUpstreamReplacement) {
			return { pass: true, applicable: false };
		}

		const issues: string[] = [];

		for (const node of workflow.nodes ?? []) {
			const expressions = extractExpressionsFromParams(node.parameters ?? {});
			for (const expression of expressions) {
				if (checkPairedReferences) {
					const firstItemReference = getFirstItemReferenceLabel(expression);
					if (firstItemReference) {
						issues.push(
							`"${node.name}" uses ${firstItemReference} in ${shortExpression(expression)}`,
						);
					}
				}

				if (
					checkUpstreamReplacement &&
					isCalendarLookupNode(node) &&
					CURRENT_JSON_EVENT_ID.test(expression)
				) {
					issues.push(
						`"${node.name}" reads eventId from current $json instead of the upstream extraction item`,
					);
				}
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0
				? {
						comment: `Item-flow expressions lose paired source context: ${issues.join('; ')}`,
					}
				: {}),
		};
	},
};
