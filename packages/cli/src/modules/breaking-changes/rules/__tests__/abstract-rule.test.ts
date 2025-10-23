import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { BreakingChangeMetadata, DetectionResult, CommonDetectionInput } from '../../types';
import { BreakingChangeCategory, BreakingChangeSeverity, IssueLevel } from '../../types';
import { AbstractBreakingChangeRule } from '../abstract-rule';

// Concrete implementation for testing the abstract class
class TestBreakingChangeRule extends AbstractBreakingChangeRule {
	private metadata: BreakingChangeMetadata;

	private detectionResult?: DetectionResult;

	constructor(logger: Logger, metadata: BreakingChangeMetadata, detectionResult?: DetectionResult) {
		super(logger);
		this.metadata = metadata;
		this.detectionResult = detectionResult;
	}

	getMetadata(): BreakingChangeMetadata {
		return this.metadata;
	}

	async detect(_input: CommonDetectionInput): Promise<DetectionResult> {
		if (this.detectionResult) {
			return await Promise.resolve(this.detectionResult);
		}
		return this.createEmptyResult();
	}
}

describe('AbstractBreakingChangeRule', () => {
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnThis(),
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	});

	const testMetadata: BreakingChangeMetadata = {
		id: 'test-rule-id',
		version: 'v2',
		title: 'Test Rule',
		description: 'A test rule description',
		category: BreakingChangeCategory.WORKFLOW,
		severity: BreakingChangeSeverity.MEDIUM,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with a scoped logger', () => {
			const scopedLogger = jest.fn().mockReturnThis();
			const testLogger = mock<Logger>({ scoped: scopedLogger });
			const rule = new TestBreakingChangeRule(testLogger, testMetadata);

			expect(rule).toBeDefined();
			expect(scopedLogger).toHaveBeenCalledWith('breaking-changes');
		});

		it('should scope the logger only once', () => {
			const scopedLogger = jest.fn().mockReturnThis();
			const testLogger = mock<Logger>({ scoped: scopedLogger });
			new TestBreakingChangeRule(testLogger, testMetadata);

			expect(scopedLogger).toHaveBeenCalledTimes(1);
		});
	});

	describe('getMetadata()', () => {
		it('should return metadata from concrete implementation', () => {
			const rule = new TestBreakingChangeRule(logger, testMetadata);

			const metadata = rule.getMetadata();

			expect(metadata).toEqual(testMetadata);
		});

		it('should return metadata with all required fields', () => {
			const fullMetadata: BreakingChangeMetadata = {
				...testMetadata,
				documentationUrl: 'https://example.com/docs',
			};
			const rule = new TestBreakingChangeRule(logger, fullMetadata);

			const metadata = rule.getMetadata();

			expect(metadata).toEqual(fullMetadata);
			expect(metadata.documentationUrl).toBe('https://example.com/docs');
		});
	});

	describe('detect()', () => {
		it('should return detection result from concrete implementation', async () => {
			const customResult: DetectionResult = {
				ruleId: 'test-rule-id',
				isAffected: true,
				affectedWorkflows: [
					{
						id: 'wf-1',
						name: 'Test Workflow',
						active: true,
						issues: [
							{
								title: 'Test Issue',
								description: 'Test Description',
								level: IssueLevel.WARNING,
							},
						],
					},
				],
				instanceIssues: [],
				recommendations: [],
			};
			const rule = new TestBreakingChangeRule(logger, testMetadata, customResult);

			const result = await rule.detect({ workflows: [] });

			expect(result).toEqual(customResult);
		});
	});

	describe('createEmptyResult()', () => {
		it('should create an empty result with correct structure', async () => {
			const rule = new TestBreakingChangeRule(logger, testMetadata);

			const result = await rule.detect({ workflows: [] });

			expect(result).toEqual({
				ruleId: 'test-rule-id',
				isAffected: false,
				affectedWorkflows: [],
				instanceIssues: [],
				recommendations: [],
			});
		});

		it('should use the rule ID from metadata', async () => {
			const customMetadata: BreakingChangeMetadata = {
				...testMetadata,
				id: 'custom-rule-id-12345',
			};
			const rule = new TestBreakingChangeRule(logger, customMetadata);

			const result = await rule.detect({ workflows: [] });

			expect(result.ruleId).toBe('custom-rule-id-12345');
		});
	});

	describe('logger integration', () => {
		it('should provide access to scoped logger in concrete implementations', async () => {
			class LoggingTestRule extends AbstractBreakingChangeRule {
				getMetadata(): BreakingChangeMetadata {
					return testMetadata;
				}

				async detect(_input: CommonDetectionInput): Promise<DetectionResult> {
					// Concrete implementations should be able to use this.logger
					this.logger.info('Detection started');
					return this.createEmptyResult();
				}
			}

			const rule = new LoggingTestRule(logger);
			await rule.detect({ workflows: [] });

			expect(logger.info).toHaveBeenCalledWith('Detection started');
		});
	});
});
