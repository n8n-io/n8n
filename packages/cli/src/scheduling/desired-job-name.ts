import type { DesiredJob, Schedule } from '@n8n/scheduler';
import { scheduleFingerprint } from '@n8n/scheduler';

/**
 * Name a trigger node's schedules for provisioning, one format for every
 * registrar. The name is a job's reconcile-in-place identity: `DurableJobProvisioner`
 * matches existing rows to desired ones by name, so a name that stays the same
 * across re-activation keeps its row and its clock. Rules that share a
 * fingerprint are told apart by their occurrence index.
 */
export function nameDesiredJobs(
	workflowId: string,
	nodeId: string,
	schedules: Array<{ schedule: Schedule; firstRunAt: Date | null }>,
): DesiredJob[] {
	const seen = new Map<string, number>();
	return schedules.map(({ schedule, firstRunAt }) => {
		const fingerprint = scheduleFingerprint(schedule, firstRunAt !== null);
		const occurrence = seen.get(fingerprint) ?? 0;
		seen.set(fingerprint, occurrence + 1);
		return { name: `${workflowId}:${nodeId}:${fingerprint}:${occurrence}`, schedule, firstRunAt };
	});
}
