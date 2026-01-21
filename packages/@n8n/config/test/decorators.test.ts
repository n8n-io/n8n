import { Container } from '@n8n/di';

import { Config, Env } from '../src/decorators';

describe('decorators', () => {
	beforeEach(() => {
		Container.reset();
	});

	// Note: With ESM (vitest/SWC), decorator metadata behavior differs from CJS (ts-jest):
	// - In CJS, properties without explicit type annotations get 'design:type' as Object
	// - In ESM with SWC, the decorator metadata handles types differently
	//
	// The test verifies that config classes work correctly with proper typing.
	it('should work correctly with explicit typing', () => {
		@Config
		class ValidConfig {
			@Env('STRING_VALUE')
			value: string = 'string';
		}

		const config = Container.get(ValidConfig);
		expect(config).toBeInstanceOf(ValidConfig);
		expect(config.value).toBe('string');
	});
});
