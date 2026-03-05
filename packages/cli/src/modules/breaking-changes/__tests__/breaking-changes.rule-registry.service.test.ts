import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import type {
	IBreakingChangeRule,
	BreakingChangeRuleMetadata,
	InstanceDetectionReport,
} from '../types';
import { BreakingChangeCategory } from '../types';

describe('RuleRegistry', () => {
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnThis(),
		debug: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
	});

	let registry: RuleRegistry;

	// Helper to create mock rules
	const createMockRule = (
		id: string,
		version: string = 'v2',
		title: string = 'Test Rule',
	): IBreakingChangeRule => {
		const metadata: BreakingChangeRuleMetadata = {
			version: version as 'v2',
			title,
			description: `Description for ${title}`,
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
		};

		const mockRule: IBreakingChangeRule = {
			id,
			getMetadata: jest.fn(() => metadata),
			detect: jest.fn(async () => {
				return await Promise.resolve({
					isAffected: false,
					instanceIssues: [],
					recommendations: [],
				} as InstanceDetectionReport);
			}),
		};

		return mockRule;
	};

	beforeEach(() => {
		jest.clearAllMocks();
		registry = new RuleRegistry(logger);
	});

	describe('constructor', () => {
		it('should initialize with a scoped logger', () => {
			const scopedLogger = jest.fn().mockReturnThis();
			const testLogger = mock<Logger>({ scoped: scopedLogger });

			new RuleRegistry(testLogger);

			expect(scopedLogger).toHaveBeenCalledWith('breaking-changes');
		});

		it('should initialize with an empty rules map', () => {
			const rules = registry.getRules();

			expect(rules).toEqual([]);
		});
	});

	describe('register()', () => {
		it('should register a single rule', () => {
			const rule = createMockRule('test-rule-1');

			registry.register(rule);

			expect(logger.debug).toHaveBeenCalledWith('Registered rule: test-rule-1');
			expect(registry.getRules()).toHaveLength(1);
		});

		it('should make registered rule retrievable by ID', () => {
			const rule = createMockRule('test-rule-2');

			registry.register(rule);
			const retrieved = registry.getRule('test-rule-2');

			expect(retrieved).toBe(rule);
		});

		it('should register multiple rules with different IDs', () => {
			const rule1 = createMockRule('rule-1');
			const rule2 = createMockRule('rule-2');
			const rule3 = createMockRule('rule-3');

			registry.register(rule1);
			registry.register(rule2);
			registry.register(rule3);

			expect(registry.getRules()).toHaveLength(3);
			expect(logger.debug).toHaveBeenCalledTimes(3);
		});

		it('should overwrite existing rule with same ID', () => {
			const rule1 = createMockRule('duplicate-rule', 'v2', 'Original Rule');
			const rule2 = createMockRule('duplicate-rule', 'v2', 'Updated Rule');

			registry.register(rule1);
			registry.register(rule2);

			const retrieved = registry.getRule('duplicate-rule');
			expect(retrieved).toBe(rule2);
			expect(registry.getRules()).toHaveLength(1);
		});
	});

	describe('registerAll()', () => {
		it('should register multiple rules at once', () => {
			const rules = [createMockRule('rule-1'), createMockRule('rule-2'), createMockRule('rule-3')];

			registry.registerAll(rules);

			expect(registry.getRules()).toHaveLength(3);
			expect(logger.debug).toHaveBeenCalledTimes(3);
		});
	});

	describe('getRule()', () => {
		it('should return undefined for non-existent rule', () => {
			const result = registry.getRule('non-existent-rule');

			expect(result).toBeUndefined();
		});

		it('should return the correct rule by ID', () => {
			const rule1 = createMockRule('find-me-1');
			const rule2 = createMockRule('find-me-2');
			const rule3 = createMockRule('find-me-3');

			registry.registerAll([rule1, rule2, rule3]);

			expect(registry.getRule('find-me-2')).toBe(rule2);
		});
	});

	describe('getRules()', () => {
		it('should return empty array when no rules registered', () => {
			const rules = registry.getRules();

			expect(rules).toEqual([]);
			expect(Array.isArray(rules)).toBe(true);
		});

		it('should return all registered rules without version filter', () => {
			const rules = [
				createMockRule('rule-1', 'v2'),
				createMockRule('rule-2', 'v2'),
				createMockRule('rule-3', 'v2'),
			];

			registry.registerAll(rules);
			const retrieved = registry.getRules();

			expect(retrieved).toHaveLength(3);
			expect(retrieved).toEqual(expect.arrayContaining(rules));
		});

		it('should filter rules by version', () => {
			const v2Rule1 = createMockRule('v2-rule-1', 'v2');
			const v2Rule2 = createMockRule('v2-rule-2', 'v2');
			const v3Rule = createMockRule('v3-rule-1', 'v3');

			registry.registerAll([v2Rule1, v2Rule2, v3Rule]);
			const v2Rules = registry.getRules('v2');

			expect(v2Rules).toHaveLength(2);
			expect(v2Rules).toContain(v2Rule1);
			expect(v2Rules).toContain(v2Rule2);
			expect(v2Rules).not.toContain(v3Rule);
		});
	});
});
