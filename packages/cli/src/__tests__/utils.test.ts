import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { INode, INodeType, Workflow } from 'n8n-workflow';
import { CliWorkflowOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	findCliWorkflowStart,
	findSubworkflowStart,
	shouldAssignExecuteMethod,
	getAllKeyPaths,
	isWorkflowIdValid,
	rightDiff,
	satisfiesToolCapability,
	setMicrosoftObservabilityDefaults,
	stripToolSuffix,
	withExpressionIsolate,
} from '../utils';

describe('rightDiff', () => {
	it.each([
		{ description: 'handles two empty arrays', arr1: [], arr2: [], expected: [] },
		{
			description: 'keeps all entries when the first array is empty',
			arr1: [],
			arr2: ['b', 'a', 'b'],
			expected: ['b', 'a', 'b'],
		},
		{
			description: 'returns no entries when the second array is empty',
			arr1: ['a'],
			arr2: [],
			expected: [],
		},
		{
			description: 'excludes all matching entries',
			arr1: ['a', 'b'],
			arr2: ['b', 'a', 'b'],
			expected: [],
		},
		{
			description: 'keeps entries when no keys match',
			arr1: ['a'],
			arr2: ['c', 'b'],
			expected: ['c', 'b'],
		},
		{
			description: 'preserves the order of the second array',
			arr1: ['b'],
			arr2: ['d', 'b', 'a', 'c'],
			expected: ['d', 'a', 'c'],
		},
		{
			description: 'preserves duplicate entries from the second array',
			arr1: ['a', 'a'],
			arr2: ['b', 'a', 'b', 'c', 'b'],
			expected: ['b', 'b', 'c', 'b'],
		},
	])('$description', ({ arr1, arr2, expected }) => {
		expect(rightDiff([arr1, (item) => item], [arr2, (item) => item])).toEqual(expected);
	});

	it('uses different key extractors for different item types', () => {
		const arr1 = [{ id: 'shared' }];
		const arr2 = [{ projectId: 'shared' }, { projectId: 'new' }];

		expect(rightDiff([arr1, (item) => item.id], [arr2, (item) => item.projectId])).toEqual([
			arr2[1],
		]);
	});

	it('does not mutate inputs and returns the original items in a new array', () => {
		const arr1 = [Object.freeze({ id: 'shared' })];
		const arr2 = [Object.freeze({ id: 'new' }), Object.freeze({ id: 'shared' })];
		Object.freeze(arr1);
		Object.freeze(arr2);

		const result = rightDiff([arr1, (item) => item.id], [arr2, (item) => item.id]);

		expect(result).toEqual([arr2[0]]);
		expect(result[0]).toBe(arr2[0]);
		expect(result).not.toBe(arr2);
	});
});

describe('workflow start selection', () => {
	const manualTrigger = mock<INode>({
		name: 'Manual Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		disabled: false,
	});
	const executeWorkflowTrigger = mock<INode>({
		name: 'Execute Workflow Trigger',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		disabled: false,
	});
	const disabledManualTrigger = mock<INode>({
		name: 'Disabled Manual Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		disabled: true,
	});
	const disabledExecuteWorkflowTrigger = mock<INode>({
		name: 'Disabled Execute Workflow Trigger',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		disabled: true,
	});

	it('prefers an enabled subworkflow trigger for CLI execution', () => {
		expect(findCliWorkflowStart([manualTrigger, executeWorkflowTrigger])).toBe(
			executeWorkflowTrigger,
		);
	});

	it('skips a disabled subworkflow trigger for CLI execution', () => {
		expect(findCliWorkflowStart([disabledExecuteWorkflowTrigger, manualTrigger])).toBe(
			manualTrigger,
		);
	});

	it('skips a disabled manual trigger for CLI execution', () => {
		expect(findCliWorkflowStart([disabledManualTrigger, manualTrigger])).toBe(manualTrigger);
	});

	it('rejects CLI execution when all start nodes are disabled', () => {
		expect(() =>
			findCliWorkflowStart([disabledExecuteWorkflowTrigger, disabledManualTrigger]),
		).toThrow(CliWorkflowOperationError);
	});

	it('keeps disabled subworkflow triggers eligible for subworkflow execution', () => {
		expect(findSubworkflowStart([manualTrigger, disabledExecuteWorkflowTrigger])).toBe(
			disabledExecuteWorkflowTrigger,
		);
	});
});

describe('withExpressionIsolate', () => {
	const acquireIsolate = vi.fn();
	const releaseIsolate = vi.fn();
	const workflow = { expression: { acquireIsolate, releaseIsolate } } as unknown as Workflow;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should acquire before the callback and release after when newly acquired', async () => {
		acquireIsolate.mockResolvedValue(true);
		const fn = vi.fn().mockResolvedValue('result');

		await expect(withExpressionIsolate(workflow, fn)).resolves.toBe('result');

		expect(acquireIsolate.mock.invocationCallOrder[0]).toBeLessThan(fn.mock.invocationCallOrder[0]);
		expect(releaseIsolate.mock.invocationCallOrder[0]).toBeGreaterThan(
			fn.mock.invocationCallOrder[0],
		);
	});

	it('should release when the callback throws', async () => {
		acquireIsolate.mockResolvedValue(true);
		const error = new Error('boom');

		await expect(
			withExpressionIsolate(workflow, async () => await Promise.reject(error)),
		).rejects.toThrow(error);

		expect(releaseIsolate).toHaveBeenCalledTimes(1);
	});

	it('should not release an isolate the caller already held', async () => {
		acquireIsolate.mockResolvedValue(false);

		await withExpressionIsolate(workflow, async () => await Promise.resolve());

		expect(releaseIsolate).not.toHaveBeenCalled();
	});
});

describe('stripToolSuffix', () => {
	it.each([
		['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain.openAi'],
		['@n8n/n8n-nodes-langchain.openAiTool', '@n8n/n8n-nodes-langchain.openAi'],
		['@n8n/n8n-nodes-langchain.openAiHitlTool', '@n8n/n8n-nodes-langchain.openAi'],
		['@n8n/n8n-nodes-langchain.slackTool', '@n8n/n8n-nodes-langchain.slack'],
		['plain', 'plain'],
		['n8n-nodes-base.set', 'n8n-nodes-base.set'],
	])('strips %s -> %s', (input, expected) => {
		expect(stripToolSuffix(input)).toBe(expected);
	});
});

describe('satisfiesToolCapability', () => {
	const nodeWith = (usableAsTool: boolean | undefined) =>
		({ description: { usableAsTool } }) as INodeType;

	it('exempts HITL tool names from the capability requirement', () => {
		expect(satisfiesToolCapability('n8n-nodes-base.gmailHitlTool', nodeWith(undefined))).toBe(true);
	});

	it('accepts a tool name when the resolved node declares usableAsTool', () => {
		expect(satisfiesToolCapability('n8n-nodes-base.gmailTool', nodeWith(true))).toBe(true);
	});

	it.each([undefined, false])(
		'rejects a tool name when the resolved node has usableAsTool: %s',
		(usableAsTool) => {
			expect(satisfiesToolCapability('n8n-nodes-base.gmailTool', nodeWith(usableAsTool))).toBe(
				false,
			);
		},
	);
});

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
			execute: vi.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has poll', () => {
		const nodeType = {
			poll: vi.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has trigger', () => {
		const nodeType = {
			trigger: vi.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return false when node has webhook and is not declarative', () => {
		const nodeType = {
			description: {},
			webhook: vi.fn(),
		} as unknown as INodeType;

		expect(shouldAssignExecuteMethod(nodeType)).toBe(false);
	});

	it('should return true when node has webhook but is declarative', () => {
		const nodeType = {
			description: { requestDefaults: {} }, // Declarative node
			webhook: vi.fn(),
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
		vi.resetModules();
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
