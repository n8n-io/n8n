import type { useI18n } from '@n8n/i18n';

import { getSelfHealingStatusDisplay } from './selfHealingStatus';

const i18n = { baseText: (key: string) => key } as unknown as ReturnType<typeof useI18n>;

describe('getSelfHealingStatusDisplay', () => {
	it('leaves fix reviews to the regular review status', () => {
		expect(getSelfHealingStatusDisplay(i18n, 'fix', 'open')).toBeNull();
		expect(getSelfHealingStatusDisplay(i18n, null, 'open')).toBeNull();
	});

	it.each(['needs_you', 'could_not_fix'] as const)('names what %s waits for', (kind) => {
		expect(getSelfHealingStatusDisplay(i18n, kind, 'open')).toEqual({
			stateLabel: 'workflowReviews.status.open',
			decisionLabel: `selfHealing.inbox.status.${kind}`,
			colorClass: 'changesRequested',
		});
	});
});
