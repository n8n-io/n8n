import { validateNodeName } from './validation';

describe('validateNodeName', () => {
	describe('valid names', () => {
		test.each([
			['unscoped name', 'n8n-nodes-my-app'],
			['unscoped name with single segment', 'n8n-nodes-app'],
			['unscoped name with numbers', 'n8n-nodes-app2'],
			['unscoped name with many hyphenated segments', 'n8n-nodes-my-really-long-app-name'],
			['scoped name', '@mycompany/n8n-nodes-my-app'],
			['scoped name with hyphenated org', '@my-company/n8n-nodes-my-app'],
			['scoped name with numbers', '@company2/n8n-nodes-app'],
			['scoped name with dotted org (domain.tld)', '@example.com/n8n-nodes-my-app'],
			['scoped name with dotted org (tld.domain)', '@com.example/n8n-nodes-my-app'],
			['scoped name with multi-level dotted org', '@sub.example.com/n8n-nodes-my-app'],
		])('accepts %s: %s', (_description, name) => {
			expect(validateNodeName(name)).toBeUndefined();
		});
	});

	describe('invalid names', () => {
		test.each([
			['missing prefix entirely', 'my-app'],
			['unscoped without trailing segment', 'n8n-nodes-'],
			['unscoped with uppercase letters', 'n8n-nodes-MyApp'],
			['unscoped with underscore', 'n8n-nodes-my_app'],
			['unscoped with double hyphen', 'n8n-nodes-my--app'],
			['unscoped with trailing hyphen', 'n8n-nodes-my-app-'],
			['scoped missing org', '/n8n-nodes-my-app'],
			['scoped missing leading @', 'mycompany/n8n-nodes-my-app'],
			['scoped with uppercase org', '@MyCompany/n8n-nodes-my-app'],
			['scoped with uppercase name', '@mycompany/n8n-nodes-MyApp'],
			['scoped org with leading dot', '@.example/n8n-nodes-my-app'],
			['scoped org with trailing dot', '@example./n8n-nodes-my-app'],
			['scoped org with consecutive dots', '@example..com/n8n-nodes-my-app'],
			['scoped without n8n-nodes segment', '@mycompany/my-app'],
			['plain package name', 'my-app'],
			['whitespace only', '   '],
		])('rejects %s: %s', (_description, name) => {
			expect(validateNodeName(name)).toEqual(
				"Must start with 'n8n-nodes-' or '@org/n8n-nodes-'. Examples: n8n-nodes-my-app, @mycompany/n8n-nodes-my-app",
			);
		});
	});
});
