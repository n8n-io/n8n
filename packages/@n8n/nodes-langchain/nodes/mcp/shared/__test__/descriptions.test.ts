import { credentials } from '../descriptions';

describe('descriptions', () => {
	describe('credentials', () => {
		it('should expose the generic oAuth2Api credential only for the oAuth2Api authentication', () => {
			const entry = credentials.find((credential) => credential.name === 'oAuth2Api');

			expect(entry).toBeDefined();
			expect(entry?.required).toBe(true);
			expect(entry?.displayOptions).toEqual({ show: { authentication: ['oAuth2Api'] } });
		});

		it('should document the missing Resource URL field on the oAuth2Api credential', () => {
			const entry = credentials.find((credential) => credential.name === 'oAuth2Api');

			expect(entry?.hint).toContain('Resource URL');
			expect(entry?.hint).toContain('MCP OAuth2');
		});

		it('should keep the mcpOAuth2Api credential scoped to the mcpOAuth2Api authentication', () => {
			const entry = credentials.find((credential) => credential.name === 'mcpOAuth2Api');

			expect(entry?.displayOptions).toEqual({ show: { authentication: ['mcpOAuth2Api'] } });
		});
	});
});
