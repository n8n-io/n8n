import { describe, expect, it } from 'vitest';

import { getPreviewNodeIconSvg, resolvePreviewNodeIconColor } from './node-icon.utils';

describe('workflow diagram node icon utilities', () => {
	it('resolves known node icons before local fallback rendering', () => {
		const svg = getPreviewNodeIconSvg({ type: 'icon', name: 'node:if', color: 'green' });

		expect(svg).toContain('<svg');
		expect(svg).toContain('currentColor');
	});

	it('does not resolve unknown node icons', () => {
		expect(getPreviewNodeIconSvg({ type: 'icon', name: 'node:not-real' })).toBeUndefined();
	});

	it('does not resolve file or unknown icon payloads as named node icons', () => {
		expect(
			getPreviewNodeIconSvg({ type: 'file', src: 'data:image/svg+xml;base64,test' }),
		).toBeUndefined();
		expect(getPreviewNodeIconSvg({ type: 'unknown' })).toBeUndefined();
	});

	it('maps theme icon color tokens to standalone light and dark values', () => {
		expect(resolvePreviewNodeIconColor('green')).toBe(
			'light-dark(oklch(51.52% 0.0905 185.73), oklch(72.89% 0.2119 147.82))',
		);
		expect(resolvePreviewNodeIconColor('black')).toBe(
			'light-dark(oklch(31.71% 0 89.88), oklch(92.19% 0 89.88))',
		);
	});

	it('preserves custom non-neutral icon colors', () => {
		expect(resolvePreviewNodeIconColor(' #123456 ')).toBe('#123456');
		expect(resolvePreviewNodeIconColor('#000')).toBeUndefined();
	});
});
