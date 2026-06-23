import { describe, expect, it } from 'vitest';

import { DISCOVERY_EVAL_TIMEZONE, enrichDiscoveryUserMessage } from '../runner';

describe('enrichDiscoveryUserMessage', () => {
	it('appends the production current-date-time block with timezone context', () => {
		const enriched = enrichDiscoveryUserMessage('Build a scheduling workflow.');

		expect(enriched).toContain('Build a scheduling workflow.');
		expect(enriched).toContain('<current-date-time>');
		expect(enriched).toContain('</current-date-time>');
		expect(enriched).toContain(`timezone: ${DISCOVERY_EVAL_TIMEZONE}`);
		expect(enriched).toContain("user's current local date and time is:");
	});
});
