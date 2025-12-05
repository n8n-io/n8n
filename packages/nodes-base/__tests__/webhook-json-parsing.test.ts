// Jest test for webhook JSON parsing

// Mock webhook handler that mimics our enhanced logic
function mockWebhookHandler(contentType: string, body: string) {
	try {
		// Enhanced JSON detection
		const isJsonContent =
			contentType.includes('application/json') ||
			contentType.includes('application/ld+json') ||
			contentType.includes('application/vnd.api+json') ||
			contentType.includes('application/hal+json');

		let parsedBody = body;

		if (typeof body === 'string' && isJsonContent) {
			// Size check
			if (body.length > 10 * 1024 * 1024) {
				return {
					status: 413,
					response: {
						error: 'Payload too large',
						message: 'Request body exceeds 10MB limit for JSON parsing',
					},
				};
			}

			parsedBody = JSON.parse(body);
		}

		return {
			status: 200,
			response: {
				success: true,
				receivedBody: parsedBody,
				contentType: contentType,
				bodyType: typeof parsedBody,
			},
		};
	} catch (error) {
		return {
			status: 400,
			response: {
				error: 'Invalid JSON body sent to webhook',
				message:
					'Webhook could not parse the request body as JSON. Please send valid JSON and set Content-Type: application/json, or send raw text and handle parsing downstream.',
				details: String(error),
			},
		};
	}
}

describe('Webhook JSON Parsing', () => {
	describe('Valid JSON content types', () => {
		it('should parse application/json', () => {
			const result = mockWebhookHandler('application/json', '{"message": "hello"}');
			expect(result.status).toBe(200);
			expect(result.response.receivedBody).toEqual({ message: 'hello' });
			expect(result.response.bodyType).toBe('object');
		});

		it('should parse application/ld+json', () => {
			const result = mockWebhookHandler(
				'application/ld+json',
				'{"@context": "http://schema.org", "name": "Test"}',
			);
			expect(result.status).toBe(200);
			expect(result.response.receivedBody).toEqual({
				'@context': 'http://schema.org',
				name: 'Test',
			});
		});

		it('should parse application/vnd.api+json', () => {
			const result = mockWebhookHandler(
				'application/vnd.api+json',
				'{"data": {"type": "users", "id": "1"}}',
			);
			expect(result.status).toBe(200);
			expect(result.response.receivedBody).toEqual({ data: { type: 'users', id: '1' } });
		});

		it('should parse application/json with charset', () => {
			const result = mockWebhookHandler('application/json; charset=utf-8', '{"message": "hello"}');
			expect(result.status).toBe(200);
			expect(result.response.receivedBody).toEqual({ message: 'hello' });
		});
	});

	describe('Invalid JSON handling', () => {
		it('should return 400 for invalid JSON', () => {
			const result = mockWebhookHandler('application/json', '{"message": "hello"');
			expect(result.status).toBe(400);
			expect(result.response.error).toBe('Invalid JSON body sent to webhook');
			expect(result.response.message).toContain('Webhook could not parse the request body as JSON');
		});

		it('should return 413 for oversized payload', () => {
			const largePayload = '{"data": "' + 'x'.repeat(11 * 1024 * 1024) + '"}';
			const result = mockWebhookHandler('application/json', largePayload);
			expect(result.status).toBe(413);
			expect(result.response.error).toBe('Payload too large');
		});
	});

	describe('Non-JSON content types', () => {
		it('should not parse text/plain', () => {
			const result = mockWebhookHandler('text/plain', '{"message": "hello"}');
			expect(result.status).toBe(200);
			expect(result.response.receivedBody).toBe('{"message": "hello"}');
			expect(result.response.bodyType).toBe('string');
		});

		it('should not parse multipart/form-data', () => {
			const result = mockWebhookHandler('multipart/form-data', '{"message": "hello"}');
			expect(result.status).toBe(200);
			expect(result.response.receivedBody).toBe('{"message": "hello"}');
			expect(result.response.bodyType).toBe('string');
		});
	});
});
