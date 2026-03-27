import { Container } from '@n8n/di';
import fs from 'fs';

import { Config, Env } from '../src/decorators';

jest.mock('fs');
const mockFs = jest.mocked(fs);

describe('decorators', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		Container.reset();
		process.env = {};
		jest.clearAllMocks();
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
		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		@Config
		class TestConfig {
			@Env('TEST_VALUE')
			value: string = 'default';
		}

		const config = Container.get(TestConfig);
		expect(config.value).toBe('secret-value');
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining('TEST_VALUE_FILE contains leading or trailing whitespace'),
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
});
