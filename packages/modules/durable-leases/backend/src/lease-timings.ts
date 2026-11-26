import { UserError } from '@n8n/errors';

// Timers take at most 2147483647 ms, so a value in seconds must stay below that once multiplied by 1000.
const MAX_LEASE_SECONDS = 2_147_483;

export interface LeaseTimings {
	leaseSeconds: number;
	renewSeconds: number;
	marginSeconds: number;
}

export function assertLeaseTimings(
	timings: LeaseTimings,
	leaseName = 'N8N_LEASES_LEASE_SECONDS',
): void {
	const { leaseSeconds, renewSeconds, marginSeconds } = timings;

	if (leaseSeconds < 8) {
		throw new UserError(`${leaseName} must be at least 8 seconds, got ${leaseSeconds}`);
	}
	if (leaseSeconds > MAX_LEASE_SECONDS) {
		throw new UserError(
			`${leaseName} must be at most ${MAX_LEASE_SECONDS} seconds, got ${leaseSeconds}`,
		);
	}
	const maxRenewSeconds = Math.floor((leaseSeconds - marginSeconds) / 3);
	if (maxRenewSeconds < 1) {
		throw new UserError(
			`N8N_LEASES_MARGIN_SECONDS must be at most ${leaseSeconds - 3} seconds, so that ${leaseName} (${leaseSeconds}) leaves time to renew, got ${marginSeconds}`,
		);
	}
	if (renewSeconds > maxRenewSeconds) {
		throw new UserError(
			`N8N_LEASES_RENEW_SECONDS must be at most ${maxRenewSeconds} seconds, which is ${leaseName} (${leaseSeconds}) minus N8N_LEASES_MARGIN_SECONDS (${marginSeconds}), divided by three, got ${renewSeconds}`,
		);
	}
}
