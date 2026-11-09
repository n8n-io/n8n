import type { TokenUsage } from '../../types/sdk/agent';

/**
 * Invoke a side-call usage callback (observer/reflector/episodic `onUsage`)
 * without letting it fail memory processing. Both failure modes are
 * swallowed: a synchronous throw is caught, and a rejected promise is
 * caught on the promise chain. Pricing is best-effort and must never abort a
 * memory task or surface an unhandled rejection.
 */
export function reportSideCallUsage(
	onUsage:
		| ((model: string | undefined, usage: TokenUsage | undefined) => void | Promise<void>)
		| undefined,
	model: string | undefined,
	usage: TokenUsage | undefined,
): void {
	if (!onUsage) return;
	try {
		void Promise.resolve(onUsage(model, usage)).catch(() => {
			// best-effort: never surface a rejected pricing callback
		});
	} catch {
		// best-effort: never let a synchronous pricing throw fail memory processing
	}
}
