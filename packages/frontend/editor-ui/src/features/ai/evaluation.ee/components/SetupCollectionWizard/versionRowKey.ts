import type { EvalVersionEntry } from '../../evalCollections.types';

// Sentinel key for the "Current draft" row, whose `workflowVersionId` is null
// until the server snapshots it on submit. The wizard stores selection by this
// key and the versions table reads `checked` back through it, so both must use
// the same helper or the draft row's checkbox silently desyncs from selection.
export const DRAFT_VERSION_KEY = '__draft__';

export const versionRowKey = (version: EvalVersionEntry) =>
	version.workflowVersionId ?? DRAFT_VERSION_KEY;
