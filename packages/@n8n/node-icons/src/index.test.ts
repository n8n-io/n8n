import { describe, expect, it } from 'vitest';

import { getNodeIconSvg, isNodeIconName, nodeIconSet } from '.';

describe('@n8n/node-icons', () => {
	it.each(['node:if', 'node:wait', 'node:merge', 'node:filter', 'node:webhook'])(
		'resolves %s from the registry',
		(iconName) => {
			expect(isNodeIconName(iconName)).toBe(true);
			if (!isNodeIconName(iconName)) throw new Error(`Expected ${iconName} to be known`);

			expect(getNodeIconSvg(iconName)).toBe(nodeIconSet[iconName]);
			expect(getNodeIconSvg(iconName)).toContain('<svg');
		},
	);

	it('returns undefined for unknown icon names', () => {
		expect(isNodeIconName('node:not-real')).toBe(false);
		expect(getNodeIconSvg('node:not-real')).toBeUndefined();
		expect(getNodeIconSvg('check')).toBeUndefined();
	});
});
