import type { useI18n } from '@n8n/i18n';

type I18n = ReturnType<typeof useI18n>;

/** "v3", or "v3 · Holiday rules" when someone named the version. */
export function formatSkillVersion(i18n: I18n, version: number, label?: string | null): string {
	const versionText = i18n.baseText('agents.builder.skills.version.number', {
		interpolate: { version: String(version) },
	});
	if (!label) return versionText;
	return i18n.baseText('agents.builder.skills.version.numberWithLabel', {
		interpolate: { version: versionText, label },
	});
}
