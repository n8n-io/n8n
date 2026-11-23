import { UserError } from '@n8n/errors';

export interface LeaseTimings {
	leaseSeconds: number;
	renewSeconds: number;
	marginSeconds: number;
}

export function assertLeaseTimings(timings: LeaseTimings): void {
	const { leaseSeconds, renewSeconds, marginSeconds } = timings;

	const maxRenewSeconds = Math.floor((leaseSeconds - marginSeconds) / 3);
	if (renewSeconds > maxRenewSeconds) {
		throw new UserError(
			`N8N_LEASES_*: renewal must be at most the lease minus the margin, divided by three (${maxRenewSeconds} seconds), got ${renewSeconds}`,
		);
	}
}
