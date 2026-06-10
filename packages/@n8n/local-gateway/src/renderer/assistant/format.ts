/** Formats minutes as `Xm` or `Xh Ym` (omitting `0m`) — mirrors the prototype's `fmtMinutes`. */
export function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
