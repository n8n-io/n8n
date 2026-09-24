import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { requireTenantId } from '../credentials/requireTenantId';

const node = {
	id: '1',
	name: 'n',
	type: 't',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as INode;

describe('requireTenantId', () => {
	it.each([
		['a GUID', '8f2a1b3c-4d5e-6f70-8192-a3b4c5d6e7f8'],
		['a verified domain', 'contoso.onmicrosoft.com'],
	])('should accept %s', (_, value) => {
		expect(requireTenantId(node, value)).toBe(value);
	});

	it('should trim before validating', () => {
		expect(requireTenantId(node, '  contoso.onmicrosoft.com  ')).toBe('contoso.onmicrosoft.com');
	});

	// These reach a user sign-in endpoint, which cannot mint an app-only token.
	it.each(['common', 'organizations', 'consumers', 'Common'])(
		'should reject the multi-tenant alias %s',
		(value) => {
			expect(() => requireTenantId(node, value)).toThrow(`Tenant ID cannot be "${value}"`);
		},
	);

	it.each([
		['empty', ''],
		['whitespace', '   '],
		['undefined', undefined],
	])('should reject %s', (_, value) => {
		expect(() => requireTenantId(node, value)).toThrow('Tenant ID is missing');
	});

	// The value becomes a path segment of the token URL.
	it.each(['a/b', 'a?b', 'a#b', 'a b', 'a\\b', 'a@b'])(
		'should reject a value that could reshape the URL: %s',
		(value) => {
			expect(() => requireTenantId(node, value)).toThrow(NodeOperationError);
		},
	);
});
