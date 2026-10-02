import { z } from 'zod';

import type { WorkspaceAfterWrite } from '../types';

export const diagnosticsOutputSchema = z
	.array(z.string())
	.optional()
	.describe('Problems that a check found in the written file. Fix them before you use the file.');

/** The `diagnostics` of a written file, when the workspace checks written files. */
export async function afterWriteDiagnostics(
	afterWrite: WorkspaceAfterWrite | undefined,
	file: { path: string; content: string },
	options: Parameters<WorkspaceAfterWrite>[1],
): Promise<{ diagnostics?: string[] }> {
	const diagnostics = await afterWrite?.(file, options);
	return diagnostics === undefined ? {} : { diagnostics };
}
