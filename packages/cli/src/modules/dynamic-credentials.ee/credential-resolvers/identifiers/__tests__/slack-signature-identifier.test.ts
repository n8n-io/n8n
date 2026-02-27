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
		describe('with user_id subject claim', () => {
			it('should return the user_id as identity', async () => {
				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: { source: 'slack-signature' },
				};

				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'user_id',
				});

				expect(result).toBe('U12345');
			});

			it('should return user_id when no subjectClaim specified (default)', async () => {
				const context = {
					identity: 'UDEFAULT',
					version: 1 as const,
				};

				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
				});

				expect(result).toBe('UDEFAULT');
			});
		});

		describe('with team_user subject claim', () => {
			it('should return team_id:user_id composite key', async () => {
				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						team_id: 'T67890',
					},
				};

				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'team_user',
				});

				expect(result).toBe('T67890:U12345');
			});

			it('should throw when team_id is missing for team_user claim', async () => {
				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: { source: 'slack-signature' },
				};

				await expect(
					identifier.resolve(context, {
						signingSecret: TEST_SIGNING_SECRET,
						subjectClaim: 'team_user',
					}),
				).rejects.toThrow(IdentifierValidationError);
			});
		});

		describe('signature re-verification', () => {
			it('should re-verify signature when raw verification data is present', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=U12345&team_id=T67890';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, timestamp, rawBody);

				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						rawBody,
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

			it('should throw when re-verification fails with wrong secret', async () => {
				const timestamp = Math.floor(Date.now() / 1000).toString();
				const rawBody = 'user_id=U12345';
				const signature = computeSlackSignature('wrong-secret', timestamp, rawBody);

				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: {
						rawBody,
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

			it('should throw when timestamp in metadata is too old', async () => {
				const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
				const rawBody = 'user_id=U12345';
				const signature = computeSlackSignature(TEST_SIGNING_SECRET, oldTimestamp, rawBody);

				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: {
						rawBody,
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

			it('should skip re-verification when metadata has no raw data', async () => {
				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: { source: 'slack-signature' },
				};

				// Should not throw - just returns the identity
				const result = await identifier.resolve(context, {
					signingSecret: TEST_SIGNING_SECRET,
					subjectClaim: 'user_id',
				});

				expect(result).toBe('U12345');
			});
		});

		it('should throw when identity is empty', async () => {
			const context = {
				identity: '',
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
});
