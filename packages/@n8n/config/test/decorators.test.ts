import { Container } from '@n8n/di';
import fs from 'fs';
import { z } from 'zod';

import { Config, Env } from '../src/decorators';

vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('decorators', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		Container.reset();
		process.env = {};
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
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

	it('should treat a set-but-blank number env value as unset', () => {
		process.env.NUMBER_VALUE = '';
		process.env.OPTIONAL_NUMBER_VALUE = '   ';
		// A coercing schema turns '' into 0 too, so the guard must run before it.
		process.env.SCHEMA_NUMBER_VALUE = '';

		@Config
		class TestConfig {
			@Env('NUMBER_VALUE')
			value: number = 42;

			@Env('OPTIONAL_NUMBER_VALUE')
			optionalValue?: number;

			@Env('SCHEMA_NUMBER_VALUE', z.coerce.number().int().gte(0))
			schemaValue: number = 30_000;
		}

		const config = Container.get(TestConfig);
		expect(config.value).toBe(42);
		expect(config.optionalValue).toBeUndefined();
		expect(config.schemaValue).toBe(30_000);
	});

	it('should still parse a blank env value for a non-numeric schema field', () => {
		process.env.STRING_SCHEMA_VALUE = '';

		@Config
		class TestConfig {
			@Env('STRING_SCHEMA_VALUE', z.string())
			value: string = 'default';
		}

		expect(Container.get(TestConfig).value).toBe('');
	});

	it('should read value from _FILE env variable', () => {
		const filePath = '/path/to/secret';
		process.env.TEST_VALUE_FILE = filePath;
		mockFs.readFileSync.mockReturnValueOnce('secret-value');

		@Config
		class TestConfig {
			@Env('TEST_VALUE')
			value: string = 'default';
		}

		const config = Container.get(TestConfig);
		expect(config.value).toBe('secret-value');
		expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
	});

	it('should warn when _FILE env variable value contains whitespace', () => {
		const filePath = '/path/to/secret';
		process.env.TEST_VALUE_FILE = filePath;
		mockFs.readFileSync.mockReturnValueOnce('secret-value\n');
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		@Config
		class TestConfig {
			@Env('TEST_VALUE')
			value: string = 'default';
		}

		const config = Container.get(TestConfig);
		expect(config.value).toBe('secret-value');
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining('TEST_VALUE_FILE contained leading or trailing whitespace'),
		);
		consoleWarnSpy.mockRestore();
	});

	it('should prefer direct env variable over _FILE variant', () => {
		const filePath = '/path/to/secret';
		process.env.TEST_VALUE = 'direct-value';
		process.env.TEST_VALUE_FILE = filePath;

		@Config
		class TestConfig {
			@Env('TEST_VALUE')
			value: string = 'default';
		}

		const config = Container.get(TestConfig);
		expect(config.value).toBe('direct-value');
		expect(mockFs.readFileSync).not.toHaveBeenCalled();
	});

	it('should trim whitespace from a direct env value before parsing it with a zod schema', () => {
		process.env.TEST_VALUE = 'legacy ';

		@Config
		class TestConfig {
			@Env('TEST_VALUE', z.enum(['legacy', 'vm']))
			value: string = 'vm';
		}

		expect(Container.get(TestConfig).value).toBe('legacy');
	});

	it('should strip surrounding quotes from an env value before parsing it with a zod schema', () => {
		process.env.TEST_VALUE = "'legacy'";

		@Config
		class TestConfig {
			@Env('TEST_VALUE', z.enum(['legacy', 'vm']))
			value: string = 'vm';
		}

		expect(Container.get(TestConfig).value).toBe('legacy');
	});

	it('should trim trailing newline from _FILE value before parsing it with a zod schema', () => {
		const filePath = '/path/to/secret';
		process.env.TEST_VALUE_FILE = filePath;
		mockFs.readFileSync.mockReturnValueOnce('legacy\n');
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		@Config
		class TestConfig {
			@Env('TEST_VALUE', z.enum(['legacy', 'vm']))
			value: string = 'vm';
		}

		const config = Container.get(TestConfig);
		expect(config.value).toBe('legacy');
		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('the value was trimmed'));
		consoleWarnSpy.mockRestore();
	});
});
