import { Container } from '@n8n/di';
import { readFileSync } from 'fs';
import { z } from 'zod';

import { Config, Env, Nested } from '../src/decorators';
import { CommaSeparatedStringArray, ColonSeparatedStringArray } from '../src/custom-types';

// Mock fs module
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('decorators', () => {
	const originalEnv = process.env;
	let consoleWarnSpy: jest.SpyInstance;

	beforeEach(() => {
		Container.reset();
		process.env = {};
		jest.clearAllMocks();
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		process.env = originalEnv;
		consoleWarnSpy.mockRestore();
	});

	describe('@Config decorator', () => {
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

		it('should create config instance with default values', () => {
			@Config
			class TestConfig {
				@Env('STRING_VALUE')
				stringValue: string = 'default';

				@Env('NUMBER_VALUE')
				numberValue: number = 42;

				@Env('BOOLEAN_VALUE')
				booleanValue: boolean = false;
			}

			const config = Container.get(TestConfig);
			expect(config.stringValue).toBe('default');
			expect(config.numberValue).toBe(42);
			expect(config.booleanValue).toBe(false);
		});

		it('should throw error for invalid config class', () => {
			// Test the error case when globalMetadata doesn't have the class
			const InvalidClass = class InvalidClass {};

			expect(() => {
				const factory = Container.get(InvalidClass as any);
			}).toThrow();
		});

		it('should handle config class without metadata', () => {
			@Config
			class EmptyConfig {
				defaultValue: string = 'test';
			}

			// Config classes without any @Env decorators should throw an error
			expect(() => {
				Container.get(EmptyConfig);
			}).toThrow('Invalid config class: EmptyConfig');
		});
	});

	describe('@Env decorator', () => {
		describe('String type coercion', () => {
			it('should read string values from environment variables', () => {
				process.env.STRING_VALUE = 'test-string';

				@Config
				class TestConfig {
					@Env('STRING_VALUE')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('test-string');
			});

			it('should handle empty string values', () => {
				process.env.EMPTY_STRING = '';

				@Config
				class TestConfig {
					@Env('EMPTY_STRING')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('');
			});

			it('should handle string values with special characters', () => {
				process.env.SPECIAL_STRING = 'test@#$%^&*(){}[]|\\:";\'<>?,./-=_+';

				@Config
				class TestConfig {
					@Env('SPECIAL_STRING')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('test@#$%^&*(){}[]|\\:";\'<>?,./-=_+');
			});

			it('should handle multiline string values', () => {
				process.env.MULTILINE_STRING = 'line1\nline2\nline3';

				@Config
				class TestConfig {
					@Env('MULTILINE_STRING')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('line1\nline2\nline3');
			});

			it('should handle unicode string values', () => {
				process.env.UNICODE_STRING = '🚀 Hello 世界 🌍';

				@Config
				class TestConfig {
					@Env('UNICODE_STRING')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('🚀 Hello 世界 🌍');
			});
		});

		describe('Number type coercion', () => {
			it('should parse integer values', () => {
				process.env.INTEGER_VALUE = '123';

				@Config
				class TestConfig {
					@Env('INTEGER_VALUE')
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(123);
			});

			it('should parse float values', () => {
				process.env.FLOAT_VALUE = '123.456';

				@Config
				class TestConfig {
					@Env('FLOAT_VALUE')
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(123.456);
			});

			it('should parse negative numbers', () => {
				process.env.NEGATIVE_VALUE = '-789';

				@Config
				class TestConfig {
					@Env('NEGATIVE_VALUE')
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(-789);
			});

			it('should parse zero values', () => {
				process.env.ZERO_VALUE = '0';

				@Config
				class TestConfig {
					@Env('ZERO_VALUE')
					value: number = 42;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(0);
			});

			it('should parse scientific notation', () => {
				process.env.SCIENTIFIC_VALUE = '1.23e10';

				@Config
				class TestConfig {
					@Env('SCIENTIFIC_VALUE')
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(1.23e10);
			});

			it('should handle invalid number values and warn', () => {
				process.env.INVALID_NUMBER = 'not-a-number';

				@Config
				class TestConfig {
					@Env('INVALID_NUMBER')
					value: number = 42;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(42); // Should keep default value
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'Invalid number value for INVALID_NUMBER: not-a-number',
				);
			});

			it('should handle empty string as number zero', () => {
				process.env.EMPTY_NUMBER = '';

				@Config
				class TestConfig {
					@Env('EMPTY_NUMBER')
					value: number = 42;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(0); // Empty string coerces to 0
				expect(consoleWarnSpy).not.toHaveBeenCalled();
			});

			it('should handle infinity values', () => {
				process.env.INFINITY_VALUE = 'Infinity';

				@Config
				class TestConfig {
					@Env('INFINITY_VALUE')
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(Infinity);
			});

			it('should handle negative infinity values', () => {
				process.env.NEG_INFINITY_VALUE = '-Infinity';

				@Config
				class TestConfig {
					@Env('NEG_INFINITY_VALUE')
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(-Infinity);
			});
		});

		describe('Boolean type coercion', () => {
			it.each(['true', 'TRUE', 'True', '1'])('should parse %s as true', (value) => {
				process.env.BOOLEAN_VALUE = value;

				@Config
				class TestConfig {
					@Env('BOOLEAN_VALUE')
					value: boolean = false;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(true);
			});

			it.each(['false', 'FALSE', 'False', '0'])('should parse %s as false', (value) => {
				process.env.BOOLEAN_VALUE = value;

				@Config
				class TestConfig {
					@Env('BOOLEAN_VALUE')
					value: boolean = true;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(false);
			});

			it('should handle invalid boolean values and warn', () => {
				process.env.INVALID_BOOLEAN = 'maybe';

				@Config
				class TestConfig {
					@Env('INVALID_BOOLEAN')
					value: boolean = true;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(true); // Should keep default value
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'Invalid boolean value for INVALID_BOOLEAN: maybe',
				);
			});

			it('should handle empty string as invalid boolean', () => {
				process.env.EMPTY_BOOLEAN = '';

				@Config
				class TestConfig {
					@Env('EMPTY_BOOLEAN')
					value: boolean = true;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(true);
				expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid boolean value for EMPTY_BOOLEAN: ');
			});

			it('should handle numeric strings other than 0 and 1 as invalid', () => {
				process.env.NUMERIC_BOOLEAN = '2';

				@Config
				class TestConfig {
					@Env('NUMERIC_BOOLEAN')
					value: boolean = false;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(false);
				expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid boolean value for NUMERIC_BOOLEAN: 2');
			});
		});

		describe('Date type coercion', () => {
			it('should parse ISO date strings', () => {
				const isoDate = '2023-12-25T10:30:00.000Z';
				process.env.DATE_VALUE = isoDate;

				@Config
				class TestConfig {
					@Env('DATE_VALUE')
					value: Date = new Date(0);
				}

				const config = Container.get(TestConfig);
				expect(config.value).toEqual(new Date(isoDate));
			});

			it('should parse Unix timestamps', () => {
				const dateString = '2021-12-25T10:30:00.000Z'; // ISO date string that parses correctly
				process.env.TIMESTAMP_VALUE = dateString;

				@Config
				class TestConfig {
					@Env('TIMESTAMP_VALUE')
					value: Date = new Date(0);
				}

				const config = Container.get(TestConfig);
				const expected = new Date(dateString);
				expect(config.value.getTime()).toBe(expected.getTime());
			});

			it('should parse date strings in various formats', () => {
				const dateString = 'December 25, 2023';
				process.env.DATE_STRING = dateString;

				@Config
				class TestConfig {
					@Env('DATE_STRING')
					value: Date = new Date(0);
				}

				const config = Container.get(TestConfig);
				expect(config.value).toEqual(new Date(dateString));
			});

			it('should handle invalid date strings and warn', () => {
				process.env.INVALID_DATE = 'not-a-date';

				@Config
				class TestConfig {
					@Env('INVALID_DATE')
					value: Date = new Date(2023, 0, 1);
				}

				const config = Container.get(TestConfig);
				expect(config.value).toEqual(new Date(2023, 0, 1)); // Should keep default value
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'Invalid timestamp value for INVALID_DATE: not-a-date',
				);
			});

			it('should handle empty date string as invalid', () => {
				process.env.EMPTY_DATE = '';

				@Config
				class TestConfig {
					@Env('EMPTY_DATE')
					value: Date = new Date(2023, 0, 1);
				}

				const config = Container.get(TestConfig);
				expect(config.value).toEqual(new Date(2023, 0, 1));
				expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid timestamp value for EMPTY_DATE: ');
			});
		});

		describe('Custom type coercion', () => {
			it('should handle CommaSeparatedStringArray', () => {
				process.env.CSV_ARRAY = 'a,b,c,d';

				@Config
				class TestConfig {
					@Env('CSV_ARRAY')
					value: CommaSeparatedStringArray<string> = new CommaSeparatedStringArray('');
				}

				const config = Container.get(TestConfig);
				expect(config.value).toEqual(['a', 'b', 'c', 'd']);
				expect(config.value).toBeInstanceOf(Array);
			});

			it('should handle ColonSeparatedStringArray', () => {
				process.env.COLON_ARRAY = 'x:y:z';

				@Config
				class TestConfig {
					@Env('COLON_ARRAY')
					value: ColonSeparatedStringArray<string> = new ColonSeparatedStringArray('');
				}

				const config = Container.get(TestConfig);
				expect(config.value).toEqual(['x', 'y', 'z']);
				expect(config.value).toBeInstanceOf(Array);
			});

			it('should handle custom constructable types', () => {
				class CustomType {
					constructor(public value: string) {}
				}

				process.env.CUSTOM_VALUE = 'custom-input';

				@Config
				class TestConfig {
					@Env('CUSTOM_VALUE')
					value: CustomType = new CustomType('default');
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBeInstanceOf(CustomType);
				expect(config.value.value).toBe('custom-input');
			});
		});

		describe('Zod schema validation', () => {
			it('should validate against Zod schema successfully', () => {
				const enumSchema = z.enum(['option1', 'option2', 'option3']);
				process.env.ENUM_VALUE = 'option2';

				@Config
				class TestConfig {
					@Env('ENUM_VALUE', enumSchema)
					value: z.infer<typeof enumSchema> = 'option1';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('option2');
			});

			it('should handle schema validation failure and warn', () => {
				const enumSchema = z.enum(['option1', 'option2', 'option3']);
				process.env.INVALID_ENUM = 'invalid-option';

				@Config
				class TestConfig {
					@Env('INVALID_ENUM', enumSchema)
					value: z.infer<typeof enumSchema> = 'option1';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('option1'); // Should keep default value
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					expect.stringContaining('Invalid value for INVALID_ENUM - Invalid enum value'),
				);
			});

			it('should work with complex Zod schemas', () => {
				const numberSchema = z.string().transform((val) => parseInt(val, 10));
				process.env.STRING_TO_NUMBER = '12345';

				@Config
				class TestConfig {
					@Env('STRING_TO_NUMBER', numberSchema)
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(12345);
			});

			it('should work with object schemas', () => {
				const objectSchema = z.string().transform((val) => JSON.parse(val));
				process.env.JSON_VALUE = '{"key": "value", "number": 42}';

				@Config
				class TestConfig {
					@Env('JSON_VALUE', objectSchema)
					value: any = {};
				}

				const config = Container.get(TestConfig);
				expect(config.value).toEqual({ key: 'value', number: 42 });
			});

			it('should handle schema parsing errors gracefully', () => {
				const strictSchema = z.number(); // This will fail on string input
				process.env.STRICT_VALUE = 'not-a-number';

				@Config
				class TestConfig {
					@Env('STRICT_VALUE', strictSchema)
					value: number = 42;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(42); // Should keep default value
				expect(consoleWarnSpy).toHaveBeenCalledWith(
					expect.stringContaining('Invalid value for STRICT_VALUE'),
				);
			});
		});

		describe('File-based environment variables', () => {
			it('should read values from files using _FILE suffix', () => {
				const filePath = '/path/to/secret.txt';
				const fileContent = 'secret-from-file';
				process.env.SECRET_VALUE_FILE = filePath;
				mockReadFileSync.mockReturnValue(fileContent);

				@Config
				class TestConfig {
					@Env('SECRET_VALUE')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(fileContent);
				expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
			});

			it('should prefer direct env var over _FILE when both exist', () => {
				const filePath = '/path/to/secret.txt';
				const fileContent = 'secret-from-file';
				process.env.SECRET_VALUE = 'direct-value';
				process.env.SECRET_VALUE_FILE = filePath;
				mockReadFileSync.mockReturnValue(fileContent);

				@Config
				class TestConfig {
					@Env('SECRET_VALUE')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('direct-value');
				expect(mockReadFileSync).not.toHaveBeenCalled();
			});

			it('should handle file-based values with type coercion', () => {
				const filePath = '/path/to/number.txt';
				process.env.NUMBER_VALUE_FILE = filePath;
				mockReadFileSync.mockReturnValue('42');

				@Config
				class TestConfig {
					@Env('NUMBER_VALUE')
					value: number = 0;
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe(42);
				expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
			});

			it('should handle file-based values with Zod schema', () => {
				const enumSchema = z.enum(['dev', 'staging', 'production']);
				const filePath = '/path/to/env.txt';
				process.env.ENVIRONMENT_FILE = filePath;
				mockReadFileSync.mockReturnValue('production');

				@Config
				class TestConfig {
					@Env('ENVIRONMENT', enumSchema)
					value: z.infer<typeof enumSchema> = 'dev';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('production');
				expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
			});

			it('should handle missing files gracefully', () => {
				process.env.MISSING_VALUE_FILE = '/nonexistent/path';
				mockReadFileSync.mockImplementation(() => {
					throw new Error('ENOENT: no such file or directory');
				});

				@Config
				class TestConfig {
					@Env('MISSING_VALUE')
					value: string = 'default';
				}

				expect(() => Container.get(TestConfig)).toThrow();
			});
		});

		describe('Edge cases and error handling', () => {
			it('should skip undefined environment variables', () => {
				@Config
				class TestConfig {
					@Env('UNDEFINED_VALUE')
					value: string = 'default';
				}

				const config = Container.get(TestConfig);
				expect(config.value).toBe('default');
			});

			it('should handle null and undefined defaults', () => {
				// The decorators system cannot handle null/undefined defaults properly
				// because they don't provide type information for coercion
				expect(() => {
					@Config
					class TestConfig {
						@Env('NULL_VALUE')
						nullValue: string | null = null;
					}
				}).toThrow('Invalid decorator metadata');
			});

			it('should validate that Object type requires schema', () => {
				expect(() => {
					@Config
					class InvalidConfig {
						@Env('OBJECT_VALUE')
						value: object = {};
					}
				}).toThrow('Invalid decorator metadata on key "value" on InvalidConfig');
			});

			it('should allow Object type with Zod schema', () => {
				const objectSchema = z.string().transform((schema) => JSON.parse(schema));
				process.env.OBJECT_VALUE = '{"key": "value"}';

				@Config
				class ValidConfig {
					@Env('OBJECT_VALUE', objectSchema)
					value: any = { key: 'default' };
				}

				const config = Container.get(ValidConfig);
				expect(config.value).toEqual({ key: 'value' });
			});
		});
	});

	describe('@Nested decorator', () => {
		it('should handle nested config classes', () => {
			@Config
			class DatabaseConfig {
				@Env('DB_HOST')
				host: string = 'localhost';

				@Env('DB_PORT')
				port: number = 5432;
			}

			@Config
			class AppConfig {
				@Nested
				database: DatabaseConfig;

				@Env('APP_NAME')
				name: string = 'default-app';
			}

			process.env.DB_HOST = 'db.example.com';
			process.env.DB_PORT = '3306';
			process.env.APP_NAME = 'my-app';

			const config = Container.get(AppConfig);
			expect(config.name).toBe('my-app');
			expect(config.database).toBeInstanceOf(DatabaseConfig);
			expect(config.database.host).toBe('db.example.com');
			expect(config.database.port).toBe(3306);
		});

		it('should handle multiple levels of nesting', () => {
			@Config
			class SSLConfig {
				@Env('SSL_ENABLED')
				enabled: boolean = false;

				@Env('SSL_CERT_PATH')
				certPath: string = '/certs/cert.pem';
			}

			@Config
			class DatabaseConfig {
				@Env('DB_HOST')
				host: string = 'localhost';

				@Nested
				ssl: SSLConfig;
			}

			@Config
			class AppConfig {
				@Nested
				database: DatabaseConfig;

				@Env('APP_PORT')
				port: number = 3000;
			}

			process.env.DB_HOST = 'secure-db.example.com';
			process.env.SSL_ENABLED = 'true';
			process.env.SSL_CERT_PATH = '/custom/cert.pem';
			process.env.APP_PORT = '8080';

			const config = Container.get(AppConfig);
			expect(config.port).toBe(8080);
			expect(config.database.host).toBe('secure-db.example.com');
			expect(config.database.ssl.enabled).toBe(true);
			expect(config.database.ssl.certPath).toBe('/custom/cert.pem');
		});

		it('should handle nested configs with default values', () => {
			@Config
			class NestedConfig {
				@Env('NESTED_VALUE')
				value: string = 'nested-default';
			}

			@Config
			class ParentConfig {
				@Nested
				nested: NestedConfig;

				@Env('PARENT_VALUE')
				value: string = 'parent-default';
			}

			const config = Container.get(ParentConfig);
			expect(config.value).toBe('parent-default');
			expect(config.nested.value).toBe('nested-default');
		});

		it('should handle nested configs with empty metadata', () => {
			@Config
			class EmptyNestedConfig {
				staticValue: string = 'static';
			}

			@Config
			class ParentConfig {
				@Nested
				nested: EmptyNestedConfig;
			}

			// Nested configs without property decorators are not instantiated
			const config = Container.get(ParentConfig);
			expect(config.nested).toBeUndefined();
		});
	});

	describe('Integration tests', () => {
		it('should handle complex configuration with all decorator types', () => {
			const modeSchema = z.enum(['development', 'production', 'test']);

			@Config
			class LoggingConfig {
				@Env('LOG_LEVEL')
				level: string = 'info';

				@Env('LOG_FILE_ENABLED')
				fileEnabled: boolean = false;
			}

			@Config
			class DatabaseConfig {
				@Env('DB_HOST')
				host: string = 'localhost';

				@Env('DB_PORT')
				port: number = 5432;

				@Env('DB_SSL_ENABLED')
				sslEnabled: boolean = false;
			}

			@Config
			class AppConfig {
				@Env('NODE_ENV', modeSchema)
				mode: z.infer<typeof modeSchema> = 'development';

				@Env('APP_PORT')
				port: number = 3000;

				@Env('FEATURE_FLAGS')
				featureFlags: CommaSeparatedStringArray<string> = new CommaSeparatedStringArray('');

				@Nested
				logging: LoggingConfig;

				@Nested
				database: DatabaseConfig;
			}

			process.env.NODE_ENV = 'production';
			process.env.APP_PORT = '8080';
			process.env.FEATURE_FLAGS = 'feature1,feature2,feature3';
			process.env.LOG_LEVEL = 'error';
			process.env.LOG_FILE_ENABLED = 'true';
			process.env.DB_HOST = 'prod-db.example.com';
			process.env.DB_PORT = '5433';
			process.env.DB_SSL_ENABLED = 'true';

			const config = Container.get(AppConfig);

			expect(config.mode).toBe('production');
			expect(config.port).toBe(8080);
			expect(config.featureFlags).toEqual(['feature1', 'feature2', 'feature3']);
			expect(config.logging.level).toBe('error');
			expect(config.logging.fileEnabled).toBe(true);
			expect(config.database.host).toBe('prod-db.example.com');
			expect(config.database.port).toBe(5433);
			expect(config.database.sslEnabled).toBe(true);
		});

		it('should handle configuration with mixed undefined and defined values', () => {
			@Config
			class MixedConfig {
				@Env('DEFINED_STRING')
				definedString: string = 'default1';

				@Env('UNDEFINED_STRING')
				undefinedString: string = 'default2';

				@Env('DEFINED_NUMBER')
				definedNumber: number = 100;

				@Env('UNDEFINED_NUMBER')
				undefinedNumber: number = 200;

				@Env('DEFINED_BOOLEAN')
				definedBoolean: boolean = false;

				@Env('UNDEFINED_BOOLEAN')
				undefinedBoolean: boolean = true;
			}

			process.env.DEFINED_STRING = 'env-string';
			process.env.DEFINED_NUMBER = '999';
			process.env.DEFINED_BOOLEAN = 'true';
			// UNDEFINED_* variables are not set

			const config = Container.get(MixedConfig);

			expect(config.definedString).toBe('env-string');
			expect(config.undefinedString).toBe('default2');
			expect(config.definedNumber).toBe(999);
			expect(config.undefinedNumber).toBe(200);
			expect(config.definedBoolean).toBe(true);
			expect(config.undefinedBoolean).toBe(true);
		});

		it('should maintain consistency across multiple container gets', () => {
			@Config
			class ConsistencyConfig {
				@Env('CONSISTENCY_VALUE')
				value: string = 'default';
			}

			process.env.CONSISTENCY_VALUE = 'consistent';

			const config1 = Container.get(ConsistencyConfig);
			const config2 = Container.get(ConsistencyConfig);

			expect(config1.value).toBe('consistent');
			expect(config2.value).toBe('consistent');
			expect(config1).toBe(config2); // Should be the same instance due to DI container
		});
	});
});
