/**
 * Lightweight, dependency-free user-agent parser for display only. Pulls a
 * coarse "Browser on OS" label out of the raw UA string. Intentionally not
 * exhaustive — we keep the raw UA in the DB so parsing can improve later.
 */
const BROWSERS: Array<[RegExp, string]> = [
	[/Edg(?:e|A|iOS)?\//, 'Edge'],
	[/OPR\/|Opera/, 'Opera'],
	[/Firefox\/|FxiOS\//, 'Firefox'],
	[/Chrome\/|CriOS\//, 'Chrome'],
	[/Safari\//, 'Safari'],
];

const OPERATING_SYSTEMS: Array<[RegExp, string]> = [
	[/Windows NT/, 'Windows'],
	[/iPhone|iPad|iPod/, 'iOS'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/Android/, 'Android'],
	[/Linux/, 'Linux'],
];

function match(userAgent: string, table: Array<[RegExp, string]>): string | undefined {
	for (const [pattern, name] of table) {
		if (pattern.test(userAgent)) return name;
	}
	return undefined;
}

export function parseUserAgent(userAgent: string | null): { browser?: string; os?: string } {
	if (!userAgent) return {};
	return {
		browser: match(userAgent, BROWSERS),
		os: match(userAgent, OPERATING_SYSTEMS),
	};
}
