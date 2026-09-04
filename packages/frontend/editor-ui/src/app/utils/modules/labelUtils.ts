import type { BaseTextKey } from '@n8n/i18n';
import { i18n } from '@n8n/i18n';

/**
 * Resolve the label of a module contribution — a settings page or a project tab.
 *
 * A descriptor declares `labelKey` instead of a translated `label`, so it needs no
 * value import of `@n8n/i18n`. The shell resolves the key here, and every caller
 * does so inside the computed that renders the contribution: `baseText` tracks the
 * i18n version, so the label follows a locale change. A `label` translated once at
 * descriptor import time cannot.
 *
 * Returns `undefined` when the contribution declares neither, which keeps an
 * unlabelled tab unlabelled instead of giving it an empty string.
 */
export function resolveContributionLabel(contribution: {
	label?: string;
	labelKey?: string;
}): string | undefined {
	if (contribution.labelKey === undefined) {
		return contribution.label;
	}

	// The descriptor field is a plain string on purpose: the SDK must not hand every
	// module the monolithic key union of the central `en.json`.
	return i18n.baseText(contribution.labelKey as BaseTextKey);
}
