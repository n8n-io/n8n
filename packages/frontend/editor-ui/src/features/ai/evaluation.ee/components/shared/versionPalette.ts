// Shared color palette for version identity. `VersionAvatar` (legend dots and
// letter squares) and `GroupedMetricChart` (bars) index this by the same
// version position, so a version's dot must map to the same color as its bar.
// Keeping a single source guarantees the two can't drift out of lockstep.
export const VERSION_PALETTE = [
	'--color--neutral-800',
	'--color--green-600',
	'--color--orange-500',
	'--color--blue-600',
	'--color--purple-600',
	'--color--red-600',
] as const;

// Resolve a version index to a CSS `var(...)` reference, wrapping past the end.
export const versionColorVar = (index: number) =>
	`var(${VERSION_PALETTE[index % VERSION_PALETTE.length]})`;
