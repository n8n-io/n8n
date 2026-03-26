import { z } from 'zod';

// ---------------------------------------------------------------------------
// Input field schemas — reused across tool input definitions
// ---------------------------------------------------------------------------

export const pageIdField = z
	.string()
	.optional()
	.describe('Target page/tab ID. Defaults to active page');

const refTargetSchema = z
	.object({
		ref: z.string().describe('Element ref from browser_snapshot (preferred)'),
	})
	.strict();
const selectorTargetSchema = z
	.object({
		selector: z.string().describe('CSS/text/role/XPath selector (fallback — prefer ref)'),
	})
	.strict();

/** Element target: exactly one of ref or selector. Prefer ref from browser_snapshot. */
export const elementTargetSchema = z.union([refTargetSchema, selectorTargetSchema]);

export type ElementTargetInput = z.infer<typeof elementTargetSchema>;

// ---------------------------------------------------------------------------
// Output field schemas — shared across tool output definitions
// ---------------------------------------------------------------------------

export const modalStateSchema = z.object({
	type: z.enum(['dialog', 'filechooser']),
	description: z.string(),
	clearedBy: z.string(),
	dialogType: z.enum(['alert', 'confirm', 'prompt', 'beforeunload']).optional(),
	message: z.string().optional(),
});

export const consoleSummarySchema = z.object({
	errors: z.number(),
	warnings: z.number(),
});

// ---------------------------------------------------------------------------
// Composable output envelope — fields auto-injected by createConnectedTool
// ---------------------------------------------------------------------------

export const newTabSchema = z.object({
	id: z.string(),
	title: z.string(),
	url: z.string(),
});

/** The fields that `createConnectedTool` appends to every auto-snapshot response. */
export const snapshotEnvelopeFields = {
	snapshot: z.string().optional(),
	modalStates: z.array(modalStateSchema).optional(),
	consoleSummary: consoleSummarySchema.optional(),
	newTabs: z.array(newTabSchema).optional().describe('Tabs opened as a result of this action'),
} as const;

/**
 * Build an output schema by merging tool-specific fields with the
 * auto-snapshot envelope (`snapshot`, `modalStates`, `consoleSummary`).
 *
 * @example
 * const outputSchema = withSnapshotEnvelope({
 *   clicked: z.boolean(),
 *   ref: z.string().optional(),
 * });
 */
export function withSnapshotEnvelope<T extends z.ZodRawShape>(shape: T) {
	return z.object({ ...shape, ...snapshotEnvelopeFields });
}
