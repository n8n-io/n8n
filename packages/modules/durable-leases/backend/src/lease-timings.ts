import { UserError } from '@n8n/errors';

export interface LeaseTimings {
	leaseSeconds: number;
	renewSeconds: number;
	marginSeconds: number;
}

export function assertLeaseTimings(timings: LeaseTimings): void {
	const { leaseSeconds, renewSeconds, marginSeconds } = timings;

	const maxRenewSeconds = Math.floor((leaseSeconds - marginSeconds) / 3);
	if (maxRenewSeconds < 1) {
		throw new UserError(
			`N8N_LEASES_MARGIN_SECONDS must be at most ${leaseSeconds - 3} seconds, so that N8N_LEASES_LEASE_SECONDS (${leaseSeconds}) leaves time to renew, got ${marginSeconds}`,
		);
	}
	if (renewSeconds > maxRenewSeconds) {
		throw new UserError(
			`N8N_LEASES_RENEW_SECONDS must be at most ${maxRenewSeconds} seconds, which is N8N_LEASES_LEASE_SECONDS (${leaseSeconds}) minus N8N_LEASES_MARGIN_SECONDS (${marginSeconds}), divided by three, got ${renewSeconds}`,
		);
	}
}
