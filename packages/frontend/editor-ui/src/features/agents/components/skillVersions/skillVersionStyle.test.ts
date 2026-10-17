import { describe, expect, it } from 'vitest';

import { skillVersionStyle } from './skillVersionStyle';

describe('skillVersionStyle', () => {
	it.each([
		['latest', { variant: 'outline' }],
		['pinned', { variant: 'outline', icon: 'pin' }],
		['published', { variant: 'success' }],
		['unpublished', { variant: 'warning' }],
	] as const)('styles the %s state', (kind, style) => {
		expect(skillVersionStyle(kind)).toEqual(style);
	});
});
