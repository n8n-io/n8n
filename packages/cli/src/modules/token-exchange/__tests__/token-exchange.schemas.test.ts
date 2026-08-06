import { TOKEN_EXCHANGE_GRANT_TYPE, TokenExchangeRequestSchema } from '../token-exchange.schemas';

describe('token-exchange.schemas', () => {
	describe('TokenExchangeRequestSchema', () => {
		const validRequest = {
			grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
			subject_token: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig',
		};

		describe('valid input', () => {
			test('accepts minimal required fields', () => {
				expect(TokenExchangeRequestSchema.safeParse(validRequest).success).toBe(true);
			});

			test('accepts all optional fields', () => {
				const result = TokenExchangeRequestSchema.safeParse({
					...validRequest,
					subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
					actor_token: 'actor.jwt.token',
					actor_token_type: 'urn:ietf:params:oauth:token-type:jwt',
					requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
					scope: 'openid profile',
					audience: 'https://api.example.com',
					resource: 'https://api.example.com/resource',
				});
				expect(result.success).toBe(true);
			});
		});

		describe('invalid input', () => {
			test.each([
				{
					name: 'missing grant_type',
					input: { ...validRequest, grant_type: undefined },
					errorPath: ['grant_type'],
				},
				{
					name: 'wrong grant_type value',
					input: {
						...validRequest,
						grant_type: 'urn:ietf:params:oauth:grant-type:client_credentials',
					},
					errorPath: ['grant_type'],
				},
				{
					name: 'missing subject_token',
					input: { ...validRequest, subject_token: undefined },
					errorPath: ['subject_token'],
				},
				{
					name: 'empty subject_token',
					input: { ...validRequest, subject_token: '' },
					errorPath: ['subject_token'],
				},
			])('rejects $name', ({ input, errorPath }) => {
				const result = TokenExchangeRequestSchema.safeParse(input);
				expect(result.success).toBe(false);
				expect(result.error?.issues[0].path).toEqual(errorPath);
			});
		});
	});
});
