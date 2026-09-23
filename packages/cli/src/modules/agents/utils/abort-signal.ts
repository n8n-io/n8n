/** Returns a signal that aborts when any of the given signals aborts. */
export function anyAbortSignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
	const defined = signals.filter((signal): signal is AbortSignal => signal !== undefined);
	return defined.length === 1 ? defined[0] : AbortSignal.any(defined);
}
