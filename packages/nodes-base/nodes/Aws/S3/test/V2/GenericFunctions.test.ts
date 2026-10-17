import { describe, expect, it } from 'vitest';

import { normalizeS3Region } from '../../V2/GenericFunctions';
import { uriEncodeS3Pathname } from '@credentials/common/aws/utils';

describe('normalizeS3Region', () => {
	it.each([
		[null, 'us-east-1'],
		[undefined, 'us-east-1'],
		['', 'us-east-1'],
		['EU', 'eu-west-1'],
		['eu-west-1', 'eu-west-1'],
		['us-west-2', 'us-west-2'],
	])('normalizes %s to %s', (locationConstraint, expected) => {
		expect(normalizeS3Region(locationConstraint)).toBe(expected);
	});
});

describe('uriEncodeS3Pathname', () => {
	it.each([
		['reports/file#1.csv', 'reports/file%231.csv'],
		['reports/file?version=1.csv', 'reports/file%3Fversion%3D1.csv'],
		['reports/my file.csv', 'reports/my%20file.csv'],
		['reports/2026/file.csv', 'reports/2026/file.csv'],
	])('encodes S3 key %s', (key, expected) => {
		expect(uriEncodeS3Pathname(key)).toBe(expected);
	});
});
