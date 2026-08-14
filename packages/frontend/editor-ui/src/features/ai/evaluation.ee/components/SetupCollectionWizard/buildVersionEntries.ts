import type { EvalCollectionVersionEntry, EvalVersionEntry } from '../../evalCollections.types';

// A version's last run is only reusable if it's a completed result. Reusing a
// new/running/failed/cancelled run would seed a version with no comparable
// scores — and the backend now rejects anything not `completed` on create, so
// keep the FE in sync. Anything else schedules a fresh run.
export const isReusableRun = (
	run: EvalVersionEntry['lastRun'],
): run is NonNullable<EvalVersionEntry['lastRun']> => !!run && run.status === 'completed';

// Map the selected versions to create-collection entries: reuse a still-good
// run, otherwise omit `existingTestRunId` so the backend schedules a fresh run.
// A null `workflowVersionId` is the "Current draft" row, which the server
// snapshots at run start.
export const buildVersionEntries = (versions: EvalVersionEntry[]): EvalCollectionVersionEntry[] =>
	versions.map((version) => ({
		workflowVersionId: version.workflowVersionId,
		existingTestRunId: isReusableRun(version.lastRun) ? version.lastRun.testRunId : undefined,
	}));
