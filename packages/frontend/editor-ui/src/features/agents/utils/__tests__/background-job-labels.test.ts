import { describe, expect, it } from 'vitest';

import { backgroundJobResultLabel, backgroundJobTitle } from '../background-job-labels';

const i18n = {
	baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
		options?.interpolate ? `${key}:${JSON.stringify(options.interpolate)}` : key,
};

describe('backgroundJobTitle', () => {
	it('keeps a title that is set', () => {
		expect(backgroundJobTitle('Research', i18n)).toBe('Research');
	});

	it.each(['', '  '])('shows a hidden-data label for the title %j', (title) => {
		expect(backgroundJobTitle(title, i18n)).toBe('agentSessions.timeline.dataHidden');
	});

	it('uses the hidden-data label in the result line of a job without a title', () => {
		expect(
			backgroundJobResultLabel(
				{ id: 'job-1', title: '', kind: 'subagent', status: 'completed' },
				i18n,
			),
		).toContain('"title":"agentSessions.timeline.dataHidden"');
	});
});
