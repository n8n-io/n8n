import { getConfigFromMetaTag, getAndParseConfigFromMetaTag } from '../metaTagConfig';

describe('metaTagConfig', () => {
	beforeEach(() => {
		document.head.innerHTML = '';
		vi.clearAllMocks();
	});

	/**
	 * Helper function to create and insert a meta tag into the document head
	 */
	function createMetaTag(configName: string, content?: string): void {
		const metaTag = document.createElement('meta');
		metaTag.setAttribute('name', `n8n:config:${configName}`);

		if (content !== undefined) {
			metaTag.setAttribute('content', content);
		}

		document.head.appendChild(metaTag);
	}

	/**
	 * Helper function to create a meta tag with base64-encoded content
	 */
	function createMetaTagWithBase64Content(configName: string, value: string): void {
		const base64Value = btoa(value);
		createMetaTag(configName, base64Value);
	}

	/**
	 * Helper function to create a meta tag with JSON content (base64-encoded)
	 */
	function createMetaTagWithJsonContent(configName: string, value: unknown): void {
		const jsonString = JSON.stringify(value);
		createMetaTagWithBase64Content(configName, jsonString);
	}

	describe('getConfigFromMetaTag', () => {
		it('should return null when meta tag does not exist', () => {
			const result = getConfigFromMetaTag('testConfig');
			expect(result).toBeNull();
		});

		it('should return null when meta tag exists but has no content attribute', () => {
			createMetaTag('testConfig');

			const result = getConfigFromMetaTag('testConfig');
			expect(result).toBeNull();
		});

		it('should return null when meta tag has empty content attribute', () => {
			createMetaTag('testConfig', '');

			const result = getConfigFromMetaTag('testConfig');
			expect(result).toBeNull();
		});

		it('should decode and return base64 content successfully', () => {
			const originalValue = 'Hello World';
			createMetaTagWithBase64Content('testConfig', originalValue);

			const result = getConfigFromMetaTag('testConfig');
			expect(result).toBe(originalValue);
		});

		it('should handle complex string content correctly', () => {
			const originalValue = 'This is a test with special chars: !@#$%^&*()';
			createMetaTagWithBase64Content('complexConfig', originalValue);

			const result = getConfigFromMetaTag('complexConfig');
			expect(result).toBe(originalValue);
		});

		it('should return null and log warning when base64 decoding fails', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			createMetaTag('invalidConfig', 'invalid-base64!!!');

			const result = getConfigFromMetaTag('invalidConfig');

			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to read n8n config for "n8n:config:invalidConfig":',
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});

		it.each([
			{ name: 'config1', value: 'value1' },
			{ name: 'config2', value: 'value2' },
			{ name: 'special-config', value: 'special-value' },
		])('should handle different config names correctly: $name', ({ name, value }) => {
			createMetaTagWithBase64Content(name, value);

			const result = getConfigFromMetaTag(name);
			expect(result).toBe(value);
		});
	});

	describe('getAndParseConfigFromMetaTag', () => {
		it('should return null when meta tag does not exist', () => {
			const result = getAndParseConfigFromMetaTag('nonExistentConfig');
			expect(result).toBeNull();
		});

		it('should return null when getConfigFromMetaTag returns null', () => {
			createMetaTag('emptyConfig');

			const result = getAndParseConfigFromMetaTag('emptyConfig');
			expect(result).toBeNull();
		});

		it('should parse and return valid JSON object', () => {
			const originalObject = {
				key1: 'value1',
				key2: 42,
				key3: true,
				nested: { prop: 'nestedValue' },
			};
			createMetaTagWithJsonContent('jsonConfig', originalObject);

			const result = getAndParseConfigFromMetaTag<typeof originalObject>('jsonConfig');
			expect(result).toEqual(originalObject);
		});

		it('should parse and return valid JSON array', () => {
			const originalArray = [1, 2, 3, { name: 'test' }];
			createMetaTagWithJsonContent('arrayConfig', originalArray);

			const result = getAndParseConfigFromMetaTag<typeof originalArray>('arrayConfig');
			expect(result).toEqual(originalArray);
		});

		it('should parse and return primitive JSON values', () => {
			const testCases = [
				{ value: 'simple string', name: 'stringConfig' },
				{ value: 42, name: 'numberConfig' },
				{ value: true, name: 'booleanConfig' },
				{ value: null, name: 'nullConfig' },
			];

			testCases.forEach((testCase) => {
				createMetaTagWithJsonContent(testCase.name, testCase.value);

				const result = getAndParseConfigFromMetaTag(testCase.name);
				expect(result).toEqual(testCase.value);
			});
		});

		it('should return null and log warning when JSON parsing fails', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const invalidJson = 'this is not json';
			createMetaTagWithBase64Content('invalidJsonConfig', invalidJson);

			const result = getAndParseConfigFromMetaTag('invalidJsonConfig');

			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to parse n8n config for "n8n:config:invalidJsonConfig":',
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});

		it('should handle complex nested objects with type safety', () => {
			interface TestConfig {
				api: {
					url: string;
					version: number;
					features: string[];
				};
				user: {
					id: number;
					permissions: Record<string, boolean>;
				};
			}

			const originalConfig: TestConfig = {
				api: {
					url: 'https://api.example.com',
					version: 2,
					features: ['feature1', 'feature2'],
				},
				user: {
					id: 123,
					permissions: {
						read: true,
						write: false,
						admin: false,
					},
				},
			};

			createMetaTagWithJsonContent('complexConfig', originalConfig);

			const result = getAndParseConfigFromMetaTag<TestConfig>('complexConfig');
			expect(result).toEqual(originalConfig);

			assert(result);
			// Type assertions to ensure type safety works
			expect(result.api.url).toBe('https://api.example.com');
			expect(result.user.permissions.read).toBe(true);
			expect(result.api.features).toHaveLength(2);
		});

		it('should handle empty JSON objects and arrays', () => {
			const testCases = [
				{ value: {}, name: 'emptyObject' },
				{ value: [], name: 'emptyArray' },
			];

			testCases.forEach((testCase) => {
				createMetaTagWithJsonContent(testCase.name, testCase.value);

				const result = getAndParseConfigFromMetaTag(testCase.name);
				expect(result).toEqual(testCase.value);
			});
		});
	});

	describe('integration tests', () => {
		it('should handle multiple config retrieval operations', () => {
			const configs = {
				stringConfig: 'test string',
				objectConfig: { key: 'value', num: 42 },
				arrayConfig: [1, 2, 3],
			};

			Object.entries(configs).forEach(([name, value]) => {
				if (typeof value === 'string') {
					createMetaTagWithBase64Content(name, value);
				} else {
					createMetaTagWithJsonContent(name, value);
				}
			});

			const stringResult = getConfigFromMetaTag('stringConfig');
			expect(stringResult).toBe('test string');

			const objectResult = getAndParseConfigFromMetaTag('objectConfig');
			expect(objectResult).toEqual({ key: 'value', num: 42 });

			const arrayResult = getAndParseConfigFromMetaTag('arrayConfig');
			expect(arrayResult).toEqual([1, 2, 3]);
		});

		it('should handle edge case of config name with special characters', () => {
			const configName = 'config-with-dashes_and_underscores.123';
			const configValue = { test: true };
			createMetaTagWithJsonContent(configName, configValue);

			const result = getAndParseConfigFromMetaTag(configName);
			expect(result).toEqual(configValue);
		});
	});
});
