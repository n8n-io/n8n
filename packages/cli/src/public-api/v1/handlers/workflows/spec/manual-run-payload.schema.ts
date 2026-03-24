import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { WorkflowRequest } from '@/workflows/workflow.request';

const destinationNodeSchema = z.object({
	nodeName: z.string(),
	mode: z.enum(['inclusive', 'exclusive']),
});

const triggerToStartFromSchema = z.object({
	name: z.string(),
	data: z.unknown().optional(),
});

/**
 * Validates manual run JSON bodies for the public API. Shapes align with
 * `WorkflowExecutionService.executeManually` type guards (known trigger, partial, unknown trigger).
 */
const manualRunPayloadSchema = z.unknown().superRefine((val, ctx) => {
	if (val === undefined || val === null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Request body is required and must be a JSON object.',
		});
		return;
	}
	if (typeof val !== 'object' || Array.isArray(val)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Body must be a JSON object.',
		});
		return;
	}

	const o = val as Record<string, unknown>;
	if (Object.keys(o).length === 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Empty object is not a valid manual payload.',
		});
		return;
	}

	const hasTrigger =
		'triggerToStartFrom' in o &&
		o.triggerToStartFrom !== undefined &&
		o.triggerToStartFrom !== null;
	const hasRunData = 'runData' in o && o.runData !== undefined;
	const hasDest =
		'destinationNode' in o && o.destinationNode !== undefined && o.destinationNode !== null;

	if (hasTrigger) {
		const r = triggerToStartFromSchema.safeParse(o.triggerToStartFrom);
		if (!r.success) {
			for (const issue of r.error.issues) {
				ctx.addIssue({
					...issue,
					path: ['triggerToStartFrom', ...issue.path],
				});
			}
		}
		return;
	}

	if (hasRunData) {
		if (!hasDest) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Partial execution requires destinationNode when runData is present.',
			});
			return;
		}
		if (typeof o.runData !== 'object' || o.runData === null || Array.isArray(o.runData)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'runData must be an object.',
			});
			return;
		}
		const destResult = destinationNodeSchema.safeParse(o.destinationNode);
		if (!destResult.success) {
			for (const issue of destResult.error.issues) {
				ctx.addIssue({
					...issue,
					path: ['destinationNode', ...issue.path],
				});
			}
			return;
		}
		if (
			!('dirtyNodeNames' in o) ||
			!Array.isArray(o.dirtyNodeNames) ||
			!o.dirtyNodeNames.every((x) => typeof x === 'string')
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Partial execution requires dirtyNodeNames as an array of strings.',
			});
		}
		return;
	}

	if (hasDest) {
		const destResult = destinationNodeSchema.safeParse(o.destinationNode);
		if (!destResult.success) {
			for (const issue of destResult.error.issues) {
				ctx.addIssue({
					...issue,
					path: ['destinationNode', ...issue.path],
				});
			}
		}
		return;
	}

	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message:
			'Invalid manual payload: provide triggerToStartFrom, or destinationNode with runData and dirtyNodeNames, or destinationNode alone.',
	});
});

function formatFirstIssueMessage(error: z.ZodError): string {
	const first = error.issues[0];
	if (!first) {
		return 'Invalid manual run payload.';
	}
	const prefix = first.path.length ? `${first.path.join('.')}: ` : '';
	return `${prefix}${first.message}`;
}

export function parsePublicApiManualRunPayload(body: unknown): WorkflowRequest.ManualRunPayload {
	const parsed = manualRunPayloadSchema.safeParse(body);
	if (!parsed.success) {
		throw new BadRequestError(formatFirstIssueMessage(parsed.error));
	}
	return body as WorkflowRequest.ManualRunPayload;
}
