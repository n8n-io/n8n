import { CommunityPackageRequestDto } from '../community-package-request.dto';

describe('CommunityPackageRequestDto', () => {
	it.each([
		{ name: 'n8n-nodes-test' },
		{ name: 'n8n-nodes-test', version: '1.0.0' },
		{ name: '@scope/n8n-nodes-test@1.0.0' },
	])('accepts %o', (request) => {
		expect(CommunityPackageRequestDto.safeParse(request).success).toBe(true);
	});

	it.each([
		{ name: 'missing name', request: {} },
		{ name: 'empty name', request: { name: '  ' } },
		{ name: 'empty version', request: { name: 'n8n-nodes-test', version: '' } },
	])('rejects $name', ({ request }) => {
		expect(CommunityPackageRequestDto.safeParse(request).success).toBe(false);
	});

	it('drops unknown fields', () => {
		const result = CommunityPackageRequestDto.safeParse({
			name: 'n8n-nodes-test',
			checksum: 'sha512-abc',
			verify: true,
		});
		expect(result.success).toBe(true);
		expect(result.success && result.data).toEqual({ name: 'n8n-nodes-test' });
	});
});
