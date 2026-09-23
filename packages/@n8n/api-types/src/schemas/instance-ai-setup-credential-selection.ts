import { z } from 'zod';

export const instanceAiSetupCredentialSelectionSchema = z.object({
	selectionId: z.string().min(1),
	credentialType: z.string().min(1),
	credentialId: z.string().min(1),
	nodeNames: z.array(z.string().min(1)).min(1).optional(),
});

export type InstanceAiSetupCredentialSelection = z.infer<
	typeof instanceAiSetupCredentialSelectionSchema
>;

const SELECTION_KEY_PREFIX = 'instanceAiSetupCredentialSelection:';

export function instanceAiSetupCredentialSelectionKey(itemId: string): string {
	return `${SELECTION_KEY_PREFIX}${itemId}`;
}

/** A marker for each choice keeps reordered saves independent. */
export function instanceAiSetupCredentialAppliedKey(itemId: string, selectionId: string): string {
	return `instanceAiSetupCredentialApplied:${itemId}:${selectionId}`;
}

export function readPendingInstanceAiSetupCredentialSelections(
	metadata: Record<string, unknown> | undefined,
	workflowId: string,
): Array<{ itemId: string; selection: InstanceAiSetupCredentialSelection }> {
	const pending: Array<{ itemId: string; selection: InstanceAiSetupCredentialSelection }> = [];
	const workflowPrefix = `${workflowId}:credential:`;
	for (const [key, value] of Object.entries(metadata ?? {})) {
		if (!key.startsWith(`${SELECTION_KEY_PREFIX}${workflowPrefix}`)) continue;
		const parsed = instanceAiSetupCredentialSelectionSchema.safeParse(value);
		if (!parsed.success) continue;
		const itemId = key.slice(SELECTION_KEY_PREFIX.length);
		const typePrefix = `${workflowPrefix}${parsed.data.credentialType}`;
		if (itemId !== typePrefix && !itemId.startsWith(`${typePrefix}:`)) continue;
		if (metadata?.[instanceAiSetupCredentialAppliedKey(itemId, parsed.data.selectionId)] === true) {
			continue;
		}
		pending.push({ itemId, selection: parsed.data });
	}
	// Apply node-specific choices after choices for the whole service.
	return pending.sort(
		(a, b) =>
			Number(a.selection.nodeNames !== undefined) - Number(b.selection.nodeNames !== undefined),
	);
}
