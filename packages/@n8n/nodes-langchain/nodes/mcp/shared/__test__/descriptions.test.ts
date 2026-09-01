import { credentials } from '../descriptions';

describe('descriptions', () => {
	describe('credentials', () => {
		it('should contain an oAuth2Api entry shown only when authentication is oAuth2Api', () => {
			const entry = credentials.find((credential) => credential.name === 'oAuth2Api');

			expect(entry).toBeDefined();
			expect(entry).toMatchObject({
				name: 'oAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2Api'],
					},
				},
			});
		});

		it('should document on the oAuth2Api entry that mcpOAuth2Api is required for a resource parameter', () => {
			const entry = credentials.find((credential) => credential.name === 'oAuth2Api');

			expect(entry?.hint).toBeDefined();
			expect(entry?.hint).toContain('RFC 8707');
			expect(entry?.hint).toContain('mcpOAuth2Api');
		});
	});
});
