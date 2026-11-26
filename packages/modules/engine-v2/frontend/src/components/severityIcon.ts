import type { IconColor, IconName } from '@n8n/design-system';

import type { EngineCompatibilityReason } from '../engineV2Check';

type Severity = EngineCompatibilityReason['severity'];

/** The icon depends on the severity only, so a new reason code needs no icon. */
const SEVERITY_ICONS: Record<Severity, { icon: IconName; color: IconColor }> = {
	blocking: { icon: 'circle-x', color: 'danger' },
	warning: { icon: 'triangle-alert', color: 'warning' },
};

export function severityIcon(severity: Severity) {
	return SEVERITY_ICONS[severity];
}

/** The icon of a list: blocking when any reason blocks. */
export function worstSeverity(reasons: EngineCompatibilityReason[]): Severity {
	return reasons.some((reason) => reason.severity === 'blocking') ? 'blocking' : 'warning';
}
