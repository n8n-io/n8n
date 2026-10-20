import { resolveAmbientModelFetch } from '@n8n/agents';
import type { BilledUsageCollector, BilledUsageWindow, FetchFn } from '@n8n/agents';

/**
 * Header the AI gateway sets on a proxied model response with the USD it
 * billed the wallet for that call. Decimal dollars, e.g. "0.0042". Absent on
 * gateway versions that do not report per-call cost — the runtime then keeps
 * the models.dev estimate.
 */
export const BILLED_USD_HEADER = 'x-n8n-billed-usd';

/** Decimal dollars only, the whole value: a malformed header is ignored, not partially parsed. */
const BILLED_USD_PATTERN = /^\d+(\.\d+)?$/;

function parseBilledUsd(raw: string | null): number | undefined {
	if (raw === null) return undefined;
	const trimmed = raw.trim();
	if (!BILLED_USD_PATTERN.test(trimmed)) return undefined;
	const amount = Number(trimmed);
	if (!Number.isFinite(amount)) return undefined;
	return amount;
}

/**
 * Collects the gateway's per-call billed USD. One collector lives per agent
 * runtime; each model call opens a window and drives its own transport, so a
 * response is always attributed to the call that opened the window — a
 * fire-and-forget side call (title generation, memory) can never leak its
 * cost into the next model turn even though they share the runtime.
 */
export function createBilledUsageCollector(): BilledUsageCollector {
	return {
		startWindow(): BilledUsageWindow {
			let total: number | undefined;
			return {
				wrap(fetch) {
					const base: FetchFn =
						fetch ??
						resolveAmbientModelFetch() ??
						(async (input, init) => await globalThis.fetch(input, init));
					return async (input, init) => {
						const response = await base(input, init);
						const billed = parseBilledUsd(response.headers.get(BILLED_USD_HEADER));
						if (billed !== undefined) total = (total ?? 0) + billed;
						return response;
					};
				},
				settle: () => total,
			};
		},
	};
}
