import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { reasonForClient } from './package-tool-error';

/** Logs the full error of a step after an import. The client gets a reason that is safe to show. */
export function logPostImportFailure(workflowId: string, error: unknown): void {
	Container.get(Logger).warn('A step after a workflow package import failed', {
		workflowId,
		error: ensureError(error).message,
	});
}

/**
 * Runs one step after the import. The workflow is already written, so a failure becomes a
 * warning: an error result would tell the client that the import failed.
 */
export async function warnOnFailure(
	run: () => Promise<string[]>,
	warning: (reason: string) => string,
	workflowId: string,
): Promise<string[]> {
	try {
		return await run();
	} catch (error) {
		logPostImportFailure(workflowId, error);
		return [warning(reasonForClient(error))];
	}
}
