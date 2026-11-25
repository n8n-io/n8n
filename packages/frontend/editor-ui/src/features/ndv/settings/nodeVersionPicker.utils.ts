/**
 * Returns the versions that the version picker lists, highest first, and the version to tag as latest.
 * A hidden version, or a version above the latest one, is listed only when the node uses it.
 */
export function getNodeVersionChoices(
	versions: number[],
	isHidden: (version: number) => boolean,
	currentVersion: number,
	defaultVersion: number | undefined,
): { latest: number | undefined; listed: number[] } {
	const visible = versions.filter((version) => !isHidden(version));

	const latest =
		defaultVersion !== undefined && visible.includes(defaultVersion)
			? defaultVersion
			: visible.length > 0
				? Math.max(...visible)
				: undefined;

	const listed = versions
		.filter(
			(version) =>
				version === currentVersion ||
				(!isHidden(version) && (latest === undefined || version <= latest)),
		)
		.sort((a, b) => b - a);

	return { latest, listed };
}
