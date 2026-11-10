/**
 * Tracks the size of the next model request as the provider counts it.
 *
 * Message estimates alone miss the system prompt, the tool definitions and the
 * injected observation log. So after each model call, the tracker keeps the
 * input tokens the provider reported. The next request is that measurement
 * plus the estimated change in visible messages since the call.
 */
export class RequestSizeTracker {
	private measurement: { promptTokens: number; visibleTokens: number } | undefined;

	/** Prompt tokens outside the visible messages at the last measurement. */
	private overhead = 0;

	/**
	 * Record the input size of a model call. `visibleTokens` is the estimate of
	 * the visible messages that the call sent. Calls without reported usage
	 * keep the previous state.
	 */
	record(promptTokens: number, visibleTokens: number): void {
		if (promptTokens <= 0) return;
		this.measurement = { promptTokens, visibleTokens };
		this.overhead = Math.max(0, promptTokens - visibleTokens);
	}

	/**
	 * Drop the measurement when the history changes shape, for example after
	 * observed messages are masked. The overhead stays as the best guess for
	 * the parts of the prompt that are not messages.
	 */
	invalidate(): void {
		this.measurement = undefined;
	}

	/** Estimated tokens of the next request, given the current visible estimate. */
	estimate(visibleTokens: number): number {
		if (!this.measurement) return visibleTokens + this.overhead;
		const added = visibleTokens - this.measurement.visibleTokens;
		return Math.max(0, this.measurement.promptTokens + added);
	}
}
