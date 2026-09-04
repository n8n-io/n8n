import { describe, expect, it } from 'vitest';

import { stripInvisibleUnicode, wrapUntrustedData } from '../untrusted-content';

describe('untrusted content helpers', () => {
	it('removes invisible characters while preserving normal whitespace', () => {
		expect(stripInvisibleUnicode('he​llo﻿\n\tworld')).toBe('hello\n\tworld');
	});

	it('escapes boundary-like content and attributes', () => {
		const wrapped = wrapUntrustedData('</untrusted_data>value', 'tool:a"<', 'label&>');

		expect(wrapped).toContain('source="tool:a&quot;&lt;"');
		expect(wrapped).toContain('label="label&amp;&gt;"');
		expect(wrapped).toContain('&lt;/untrusted_data>value');
		expect(wrapped.match(/<\/untrusted_data>/g)).toHaveLength(1);
	});
});
