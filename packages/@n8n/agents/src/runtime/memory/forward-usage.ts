import type { TokenUsage } from '../../types/sdk/agent';

/** Callback shape for side-call usage (observer/reflector/episodic `onUsage`). */
export type SideCallUsageCallback = (
	model: string | undefined,
	usage: TokenUsage | undefined,
	/** Provider-billed USD for the call, when the model is gateway-managed. */
	billedCostUsd?: number,
) => void | Promise<void>;

/**
 * Invoke a side-call usage callback (observer/reflector/episodic `onUsage`)
 * without letting it fail memory processing. Both failure modes are
 * swallowed: a synchronous throw is caught, and a rejected promise is
 * caught on the promise chain. Pricing is best-effort and must never abort a
 * memory task or surface an unhandled rejection.
 */
export function reportSideCallUsage(
	onUsage: SideCallUsageCallback | undefined,
	model: string | undefined,
	usage: TokenUsage | undefined,
	billedCostUsd?: number,
): void {
	if (!onUsage) return;
	try {
		void Promise.resolve(onUsage(model, usage, billedCostUsd)).catch(() => {
			// best-effort: never surface a rejected pricing callback
		});
	} catch {
		// best-effort: never let a synchronous pricing throw fail memory processing
	}
}
