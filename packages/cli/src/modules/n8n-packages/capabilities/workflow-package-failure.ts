import type { PackageFailureReason } from '../n8n-packages.types';
import { classifyPackageFailure } from '../package-failure-classifier';

/** Gives the audit `reason` of an error that the rules of one surface throw, else undefined. */
export type SurfaceFailureClassifier = (error: unknown) => PackageFailureReason | undefined;

/**
 * The `reason` of a failed package export or import for the audit log. The surface classifies
 * its own errors first, for example a workflow that MCP clients must not change.
 */
export function classifyWorkflowPackageFailure(
	error: unknown,
	classifySurfaceFailure?: SurfaceFailureClassifier,
): PackageFailureReason {
	return classifySurfaceFailure?.(error) ?? classifyPackageFailure(error);
}
