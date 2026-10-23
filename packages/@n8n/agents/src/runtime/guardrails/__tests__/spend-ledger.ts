import type { SpendLedger } from '../budget-guardrail';

/** Ledger for guardrail tests. `add` ignores a repeated `callId`. */
export function spendLedger(): SpendLedger {
	const totals = new Map<string, number>();
	const appliedCallIds = new Set<string>();

	return {
		async add(callId, entries) {
			if (appliedCallIds.has(callId)) {
				return entries.map((entry) => {
					const totalUsd = totals.get(entry.key) ?? 0;
					return { key: entry.key, totalUsd, previousUsd: totalUsd };
				});
			}

			appliedCallIds.add(callId);
			return entries.map((entry) => {
				const previousUsd = totals.get(entry.key) ?? 0;
				const totalUsd = previousUsd + entry.usd;
				totals.set(entry.key, totalUsd);
				return { key: entry.key, totalUsd, previousUsd };
			});
		},
		async read(key) {
			return totals.get(key) ?? 0;
		},
	};
}
