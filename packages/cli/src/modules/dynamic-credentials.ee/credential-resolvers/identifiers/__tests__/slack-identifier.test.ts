import { mockLogger } from '@n8n/backend-test-utils';

import { IdentifierValidationError } from '../identifier-interface';
import { SlackIdentifier } from '../slack-identifier';

describe('SlackIdentifier', () => {
	const logger = mockLogger();
	let identifier: SlackIdentifier;

	beforeEach(() => {
		jest.clearAllMocks();
		identifier = new SlackIdentifier(logger);
	});

	describe('resolve', () => {
		test('should return identity directly', () => {
			const context = { identity: 'U0A293J0RFV', version: 1 as const };

			const result = identifier.resolve(context);

			expect(result).toBe('U0A293J0RFV');
		});

		test('should throw for empty identity', () => {
			const context = { identity: '', version: 1 as const };

			expect(() => identifier.resolve(context)).toThrow(IdentifierValidationError);
			expect(() => identifier.resolve(context)).toThrow('Empty identity from Slack request');
		});

		test('should throw for undefined identity', () => {
			const context = { identity: undefined as unknown as string, version: 1 as const };

			expect(() => identifier.resolve(context)).toThrow(IdentifierValidationError);
		});
	});
});
