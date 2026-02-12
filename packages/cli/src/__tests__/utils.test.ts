import { generateNanoId } from '@n8n/utils';
import type { INodeType } from 'n8n-workflow';

import {
	shouldAssignExecuteMethod,
	getAllKeyPaths,
	isWorkflowIdValid,
	setMicrosoftObservabilityDefaults,
} from '../utils';

describe('shouldAssignExecuteMethod', () => {
	it('should return true when node has no execute, poll, trigger, webhook (unless declarative), or methods', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			execute: undefined,
			poll: undefined,
			trigger: undefined,
			webhook: undefined,
			methods: undefined,
		} as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});

	it('should return false when node has execute', () => {
		const nodeType = {
			execute: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has poll', () => {
		const nodeType = {
			poll: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has trigger', () => {
		const nodeType = {
			trigger: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has webhook and is not declarative', () => {
		const nodeType = {
			description: {},
			webhook: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return true when node has webhook but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			webhook: jest.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});

	it('should return false when node has methods and is not declarative', () => {
		const nodeType = {
			methods: {},
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return true when node has methods but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			methods: {},
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(true);
	});
});

describe('getAllKeyPaths', () => {
	const testCases = [
		{
			description: 'should return empty array for null or undefined',
			obj: null,
			valueFilter: (value: string) => value.includes('test'),
			expected: [],
		},
		{
			description: 'should return empty array for undefined',
			obj: undefined,
			valueFilter: (value: string) => value.includes('test'),
			expected: [],
		},
		{
			description: 'should find keys with matching string values in objects',
			obj: {
				name: 'test',
				age: 25,
				description: 'contains test data',
				other: 'no match',
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['name', 'description'],
		},
		{
			description: 'should recursively search nested objects',
			obj: {
				user: {
					name: 'testuser',
					profile: {
						bio: 'test bio',
					},
				},
				settings: {
					theme: 'dark',
				},
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['user.name', 'user.profile.bio'],
		},
		{
			description: 'should search arrays',
			obj: [{ name: 'test1' }, { name: 'other' }, { name: 'test2' }],
			valueFilter: (value: string) => value.includes('test'),
			expected: ['[0].name', '[2].name'],
		},
		{
			description: 'should handle mixed arrays and objects',
			obj: {
				items: [{ label: 'test item' }, { label: 'normal item' }],
				title: 'test title',
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['items[0].label', 'title'],
		},
		{
			description: 'should handle non-string values by ignoring them',
			obj: {
				name: 'test',
				count: 42,
				active: true,
				data: null,
			},
			valueFilter: (value: string) => value.includes('test'),
			expected: ['name'],
		},
	];

	it.each(testCases)('$description', ({ obj, valueFilter, expected }) => {
		const result = getAllKeyPaths(obj, '', [], valueFilter);
		expect(result).toEqual(expected);
	});
});

describe('isWorkflowIdValid', () => {
	describe('valid IDs', () => {
		it('should accept n8n-generated workflow ID (16 characters)', () => {
			const id = generateNanoId();
			expect(id).toHaveLength(16);
			expect(isWorkflowIdValid(id)).toBe(true);
		});

		it('should accept multiple generated workflow IDs', () => {
			// Test 10 randomly generated IDs to ensure consistency
			for (let i = 0; i < 10; i++) {
				const id = generateNanoId();
				expect(isWorkflowIdValid(id)).toBe(true);
			}
		});

		it('should accept 21-character IDs (standard nanoid length)', () => {
			const id = 'Gi4nXQITSnE_lj8ZA9hRa'; // 21 characters
			expect(isWorkflowIdValid(id)).toBe(true);
		});

		it('should accept minimum length (1 character)', () => {
			expect(isWorkflowIdValid('a')).toBe(true);
		});

		it('should accept maximum allowed length (21 characters)', () => {
			const id = 'a'.repeat(21);
			expect(isWorkflowIdValid(id)).toBe(true);
		});

		it('should accept various lengths between 1 and 21', () => {
			[1, 8, 16, 20, 21].forEach((length) => {
				const id = 'a'.repeat(length);
				expect(isWorkflowIdValid(id)).toBe(true);
			});
		});
	});

	describe('invalid IDs', () => {
		it('should reject null', () => {
			expect(isWorkflowIdValid(null)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(isWorkflowIdValid(undefined)).toBe(false);
		});

		it('should reject empty string', () => {
			expect(isWorkflowIdValid('')).toBe(false);
		});

		it('should reject IDs longer than maximum allowed length (22+ characters)', () => {
			const tooLong = 'a'.repeat(22);
			expect(isWorkflowIdValid(tooLong)).toBe(false);
		});

		it('should reject non-string values', () => {
			expect(isWorkflowIdValid(123 as any)).toBe(false);
			expect(isWorkflowIdValid({} as any)).toBe(false);
			expect(isWorkflowIdValid([] as any)).toBe(false);
		});

		it('should reject very long strings', () => {
			const veryLong = 'a'.repeat(100);
			expect(isWorkflowIdValid(veryLong)).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in valid length IDs', () => {
			expect(isWorkflowIdValid('abc-def_123')).toBe(true);
			expect(isWorkflowIdValid('workflow.id.test')).toBe(true);
		});

		it('should accept IDs with numbers only', () => {
			expect(isWorkflowIdValid('1234567890')).toBe(true);
		});

		it('should accept IDs with mixed case', () => {
			expect(isWorkflowIdValid('AbCdEfGhIjKlMnOp')).toBe(true);
		});
	});
});

describe('setMicrosoftObservabilityDefaults', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	test('should set ENABLE_OBSERVABILITY to true when undefined', () => {
		delete process.env.ENABLE_OBSERVABILITY;

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_OBSERVABILITY).toBe('true');
	});

	test('should set ENABLE_OBSERVABILITY to true when empty string', () => {
		process.env.ENABLE_OBSERVABILITY = '';

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_OBSERVABILITY).toBe('true');
	});

	test('should not override ENABLE_OBSERVABILITY when already set', () => {
		process.env.ENABLE_OBSERVABILITY = 'false';

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_OBSERVABILITY).toBe('false');
	});

	test('should set ENABLE_A365_OBSERVABILITY_EXPORTER to true when undefined', () => {
		delete process.env.ENABLE_A365_OBSERVABILITY_EXPORTER;

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER).toBe('true');
	});

	test('should set ENABLE_A365_OBSERVABILITY_EXPORTER to true when empty string', () => {
		process.env.ENABLE_A365_OBSERVABILITY_EXPORTER = '';

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER).toBe('true');
	});

	test('should not override ENABLE_A365_OBSERVABILITY_EXPORTER when already set', () => {
		process.env.ENABLE_A365_OBSERVABILITY_EXPORTER = 'false';

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER).toBe('false');
	});

	test('should set both environment variables when both are undefined', () => {
		delete process.env.ENABLE_OBSERVABILITY;
		delete process.env.ENABLE_A365_OBSERVABILITY_EXPORTER;

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_OBSERVABILITY).toBe('true');
		expect(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER).toBe('true');
	});

	test('should set both environment variables when both are empty strings', () => {
		process.env.ENABLE_OBSERVABILITY = '';
		process.env.ENABLE_A365_OBSERVABILITY_EXPORTER = '';

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_OBSERVABILITY).toBe('true');
		expect(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER).toBe('true');
	});

	test('should handle mixed scenarios correctly', () => {
		process.env.ENABLE_OBSERVABILITY = 'custom-value';
		delete process.env.ENABLE_A365_OBSERVABILITY_EXPORTER;

		setMicrosoftObservabilityDefaults();

		expect(process.env.ENABLE_OBSERVABILITY).toBe('custom-value');
		expect(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER).toBe('true');
	});
});
