import type { EvalCollectionVersionEntry, EvalVersionEntry } from '../../evalCollections.types';

// A version's last run is only worth reusing if it can still yield results. A
// failed or cancelled run has no usable data, so pinning it would produce a
// collection that "compares" a run with nothing to show (a Done card with an
// empty bar). Schedule a fresh run for those instead. `new`/`running`/
// `completed` runs are reusable — they already have data or will once they
// finish.
export const isReusableRun = (
	run: EvalVersionEntry['lastRun'],
): run is NonNullable<EvalVersionEntry['lastRun']> =>
	!!run && run.status !== 'error' && run.status !== 'cancelled';

// Map the selected versions to create-collection entries: reuse a still-good
// run, otherwise omit `existingTestRunId` so the backend schedules a fresh run.
// A null `workflowVersionId` is the "Current draft" row, which the server
// snapshots at run start.
export const buildVersionEntries = (versions: EvalVersionEntry[]): EvalCollectionVersionEntry[] =>
	versions.map((version) => ({
		workflowVersionId: version.workflowVersionId,
		existingTestRunId: isReusableRun(version.lastRun) ? version.lastRun.testRunId : undefined,
	}));
