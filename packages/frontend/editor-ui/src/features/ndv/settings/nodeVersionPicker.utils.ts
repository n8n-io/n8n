/**
 * Returns the versions that the version picker lists, highest first, and the version to tag as latest.
 * A hidden version is listed only when the node uses it.
 */
export function getNodeVersionChoices(
	versions: number[],
	isHidden: (version: number) => boolean,
	currentVersion: number,
	defaultVersion: number | undefined,
): { latest: number | undefined; listed: number[] } {
	const visible = versions.filter((version) => !isHidden(version));
	const listed = versions
		.filter((version) => !isHidden(version) || version === currentVersion)
		.sort((a, b) => b - a);

	const latest =
		defaultVersion !== undefined && visible.includes(defaultVersion)
			? defaultVersion
			: visible.length > 0
				? Math.max(...visible)
				: undefined;

	return { latest, listed };
}
