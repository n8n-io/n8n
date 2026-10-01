import { MAX_INTEGER_32BITS_SIGNED } from '@n8n/constants';

/** `setTimeout` treats delays above the 32-bit signed max as 1ms; clamp to it. */
export const MAX_DELAY_MS = MAX_INTEGER_32BITS_SIGNED;

/**
 * One re-armable timer aimed at an absolute instant. Hides the two quirks of
 * `setTimeout`: a delay beyond the 32-bit max is clamped and waited out in
 * hops, and the handle is unref'd so a pending tick never keeps the process
 * alive on its own.
 */
export class Alarm {
	private timer?: ReturnType<typeof setTimeout>;

	constructor(private readonly now: () => number) {}

	/** Aim the alarm at `targetAt` (immediately when already past), replacing any earlier aim. */
	set(targetAt: number, fire: () => void): void {
		this.cancel();
		const delayMs = Math.min(Math.max(0, targetAt - this.now()), MAX_DELAY_MS);
		this.timer = setTimeout(() => {
			this.timer = undefined;
			// A delay beyond the setTimeout maximum was clamped; keep waiting.
			if (targetAt > this.now()) {
				this.set(targetAt, fire);
			} else {
				fire();
			}
		}, delayMs);
		this.timer.unref();
	}

	cancel(): void {
		if (this.timer !== undefined) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
	}
}
