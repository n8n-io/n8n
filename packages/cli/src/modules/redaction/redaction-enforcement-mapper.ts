import type { RedactionEnforcementSettings, RedactionFloor } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';

import { assertNever } from '@/utils';

export function floorToSettings(floor: RedactionFloor): RedactionEnforcementSettings {
	switch (floor) {
		case 'off':
			return { enforced: false, manual: false, production: false };
		case 'production':
			return { enforced: true, manual: false, production: true };
		case 'all':
			return { enforced: true, manual: true, production: true };
		default:
			assertNever(floor);
			throw new UnexpectedError(`Unknown redaction floor: ${String(floor)}`);
	}
}

export function settingsToFloor(settings: RedactionEnforcementSettings): RedactionFloor {
	if (!settings.enforced) return 'off';
	// `manual` implies the strictest stored level reachable via this API.
	// Combinations the API cannot produce (e.g. `{manual: true, production: false}`)
	// normalize upward — never report a weaker floor than what is stored.
	if (settings.manual) return 'all';
	return 'production';
}
