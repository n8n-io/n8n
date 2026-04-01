import { createHmac } from 'crypto';

import type { Logger } from '@n8n/backend-common';

import { IdentifierValidationError } from '../identifier-interface';
import { SlackSignatureIdentifier } from '../slack-signature-identifier';

const TEST_SIGNING_SECRET = 'test-slack-signing-secret-abc123';

function computeSlackSignature(signingSecret: string, timestamp: string, body: string): string {
	const hmac = createHmac('sha256', signingSecret);
	hmac.update(`v0:${timestamp}:${body}`);
	return `v0=${hmac.digest('hex')}`;
}

describe('SlackSignatureIdentifier', () => {
	let identifier: SlackSignatureIdentifier;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		identifier = new SlackSignatureIdentifier(mockLogger);
	});

	describe('validateOptions', () => {
		it('should accept valid options with user_id claim', async () => {
			await expect(
				identifier.validateOptions({
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'user_id',
				}),
			).resolves.not.toThrow();
		});

		it('should accept valid options with team_user claim', async () => {
			await expect(
				identifier.validateOptions({
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'team_user',
				}),
			).resolves.not.toThrow();
		});

		it('should accept options without subjectClaim (defaults to user_id)', async () => {
			await expect(
				identifier.validateOptions({
					signingSecret: TEST_SIGNING_SECRET,
				}),
			).resolves.not.toThrow();
		});

		it('should reject missing signingSecret', async () => {
			await expect(identifier.validateOptions({})).rejects.toThrow(IdentifierValidationError);
		});

		it('should reject empty signingSecret', async () => {
			await expect(identifier.validateOptions({ signingSecret: '' })).rejects.toThrow(
				IdentifierValidationError,
			);
		});
	});

	describe('resolve', () => {
		describe('with form-encoded payload (slash commands)', () => {
			it('should return the user_id as identity', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=U12345';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'user_id',
				});

				expect(result).toBe('U12345');
			});

			it('should return user_id when no subjectClaim specified (defaults to user_id)', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=UDEFAULT';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
				});

				expect(result).toBe('UDEFAULT');
			});

			it('should return team_id:user_id composite key for team_user claim', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=U12345&team_id=T67890';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'team_user',
				});

				expect(result).toBe('T67890:U12345');
			});

			it('should throw when team_id is missing for team_user claim', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=U12345'; // no team_id
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'team_user',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});
		});

		describe('when user_id is absent (flat schema does not match)', () => {
			it('should throw when body has no user_id field', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'team_id=T67890&command=%2Fconnect';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'user_id',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});

			it('should throw when body is empty', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = '';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'user_id',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});
		});

		describe('signature re-verification', () => {
			it('should verify the Slack signature before resolving', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=U12345&team_id=T67890';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'user_id',
				});

				expect(result).toBe('U12345');
			});

			it('should throw when signature does not match the signing secret', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=U12345';
				const signature = computeSlackSignature('wrong-secret', timestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp,
						signature,
					},
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'user_id',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});

			it('should throw when timestamp is too old (replay attack prevention)', async () => {
				const oldTimestamp = '0';
				const rawBody = 'user_id=U12345';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, oldTimestamp, rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp: oldTimestamp,
						signature,
					},
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'user_id',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});

			it('should throw when timestamp is not a valid number', async () => {
				const rawBody = 'user_id=U12345';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, 'not-a-number', rawBody);

				const context = {
					identity: rawBody,
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						timestamp: 'not-a-number',
						signature,
					},
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'user_id',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});

			it('should throw when metadata is missing signature verification data', async () => {
				const context = {
					identity: 'user_id=U12345',
					version: 1 as const,
					metadata: { source: 'slack-signature' },
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'user_id',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});

			it('should throw when metadata is missing entirely', async () => {
				const context = {
					identity: 'user_id=U12345',
					version: 1 as const,
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'user_id',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});
		});

		it('should throw when identity is empty', async () => {
			const context = {
				identity: '',
				version: 1 as const,
				metadata: { source: 'slack-signature' },
			};

			await expect(
				identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'user_id',
				}),
			).rejects.toThrow(IdentifierValidationError);
		});

		it('should throw when called with invalid options', async () => {
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const rawBody = 'user_id=U12345';
			const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

			const context = {
				identity: rawBody,
				version: 1 as const,
				metadata: {
					source: 'slack-signature',
					timestamp,
					signature,
				},
			};

			await expect(identifier.resolve(context, { signingSecret: '' })).rejects.toThrow(
				IdentifierValidationError,
			);
		});
	});

	describe('resolveKey', () => {
		// resolveKey parses the raw body like resolve(), but skips signature verification —
		// any signature value is accepted. Use only for pre-verified trusted paths.
		const fakeSignature = 'v0=intentionally-wrong-signature';

		it('should derive key without verifying the signature', () => {
			const rawBody = 'user_id=U12345';
			const context = {
				identity: rawBody,
				version: 1 as const,
				metadata: {
					source: 'slack-signature',
					timestamp: '1234567890',
					signature: fakeSignature,
				},
			};

			// A wrong signature is accepted — no HMAC verification happens here
			const result = identifier.resolveKey(context, {
				signingSecret: TEST_SIGNING_SECRET,
				subjectClaim: 'user_id',
			});

			expect(result).toBe('U12345');
		});

		it('should derive team_user composite key from body fields', () => {
			const rawBody = 'user_id=U12345&team_id=T67890';
			const context = {
				identity: rawBody,
				version: 1 as const,
				metadata: {
					source: 'slack-signature',
					timestamp: '1234567890',
					signature: fakeSignature,
				},
			};

			const result = identifier.resolveKey(context, {
				signingSecret: TEST_SIGNING_SECRET,
				subjectClaim: 'team_user',
			});

			expect(result).toBe('T67890:U12345');
		});

		it('should throw for team_user when body contains no team_id', () => {
			const rawBody = 'user_id=U12345'; // no team_id
			const context = {
				identity: rawBody,
				version: 1 as const,
				metadata: {
					source: 'slack-signature',
					timestamp: '1234567890',
					signature: fakeSignature,
				},
			};

			expect(() =>
				identifier.resolveKey(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'team_user',
				}),
			).toThrow(IdentifierValidationError);
		});

		it('should throw when metadata is missing', () => {
			const context = {
				identity: 'user_id=U12345',
				version: 1 as const,
				// no metadata — fails SlackIdentitySchema
			};

			expect(() =>
				identifier.resolveKey(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'user_id',
				}),
			).toThrow(IdentifierValidationError);
		});

		it('should throw when called with invalid options', () => {
			const context = {
				identity: 'user_id=U12345',
				version: 1 as const,
				metadata: {
					source: 'slack-signature',
					timestamp: '1234567890',
					signature: fakeSignature,
				},
			};

			expect(() => identifier.resolveKey(context, { signingSecret: '' })).toThrow(
				IdentifierValidationError,
			);
		});
	});
});
