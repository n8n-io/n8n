/**
 * Splits a comma-separated list of search keywords, e.g. a locale string for
 * `IMenuSettingItem.searchKeywords` or `SettingsSearchEntry.keywords`.
 */
export function splitSearchKeywords(value: string): string[] {
	return value
		.split(',')
		.map((keyword) => keyword.trim())
		.filter(Boolean);
}
