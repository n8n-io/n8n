import { SlackIntegration } from '../platforms/slack-integration';

describe('SlackIntegration', () => {
	let integration: SlackIntegration;

	beforeEach(() => {
		integration = new SlackIntegration();
	});

	describe('handleUnauthenticatedWebhook', () => {
		it('echoes the challenge for a url_verification event', () => {
			const result = integration.handleUnauthenticatedWebhook({
				type: 'url_verification',
				challenge: 'abc123',
			});

			expect(result).toEqual({ status: 200, body: { challenge: 'abc123' } });
		});

		it('returns undefined for non-verification events', () => {
			const result = integration.handleUnauthenticatedWebhook({
				type: 'event_callback',
				event: { type: 'message', text: 'hi' },
			});

			expect(result).toBeUndefined();
		});

		it.each([
			['missing challenge', { type: 'url_verification' }],
			['non-string challenge', { type: 'url_verification', challenge: 42 }],
		])('returns undefined for malformed url_verification body (%s)', (_label, body) => {
			expect(integration.handleUnauthenticatedWebhook(body)).toBeUndefined();
		});

		it.each([
			['null', null],
			['undefined', undefined],
			['string', 'hello'],
			['number', 42],
		])('returns undefined for non-object body (%s)', (_label, body) => {
			expect(integration.handleUnauthenticatedWebhook(body)).toBeUndefined();
		});
	});
});
