import { Container } from '@n8n/di';

import { Config, Env } from '../src/decorators';

describe('decorators', () => {
	beforeEach(() => {
		Container.reset();
	});

	it('should throw when explicit typing is missing', () => {
		expect(() => {
			@Config
			class InvalidConfig {
				@Env('STRING_VALUE')
				value = 'string';
			}
			Container.get(InvalidConfig);
		}).toThrowError(
			'Invalid decorator metadata on key "value" on InvalidConfig\n Please use explicit typing on all config fields',
		);
	});
});
