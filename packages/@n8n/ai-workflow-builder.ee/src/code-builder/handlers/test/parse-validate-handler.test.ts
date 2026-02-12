/**
 * Tests for ParseValidateHandler
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { parseWorkflowCodeToBuilder, validateWorkflow, workflow } from '@n8n/workflow-sdk';

import { ParseValidateHandler } from '../parse-validate-handler';

// Mock the workflow-sdk module
jest.mock('@n8n/workflow-sdk', () => ({
	parseWorkflowCodeToBuilder: jest.fn(),
	validateWorkflow: jest.fn(),
	workflow: { fromJSON: jest.fn() },
	stripImportStatements: jest.fn((code: string) => code),
}));

// Typed mock references
const mockParseWorkflowCodeToBuilder = parseWorkflowCodeToBuilder as jest.Mock;
const mockValidateWorkflow = validateWorkflow as jest.Mock;
const mockFromJSON = workflow.fromJSON as jest.Mock;

describe('ParseValidateHandler', () => {
	let handler: ParseValidateHandler;

	beforeEach(() => {
		jest.clearAllMocks();

		handler = new ParseValidateHandler({});
	});

	describe('parseAndValidate', () => {
		it('should parse valid code and return workflow', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test Workflow',
				nodes: [{ id: 'node1', name: 'Node 1', type: 'test' }],
				connections: {},
			};

			const mockBuilder = {
				regenerateNodeIds: jest.fn(),
				validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: jest.fn(),
				toJSON: jest.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			const result = await handler.parseAndValidate('const workflow = {}');

			expect(result.workflow).toEqual(mockWorkflow);
			expect(result.warnings).toHaveLength(0);
			expect(mockBuilder.regenerateNodeIds).toHaveBeenCalled();
			expect(mockBuilder.validate).toHaveBeenCalled();
		});

		it('should collect errors from graph validation as warnings for agent self-correction', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			};

			const mockBuilder = {
				regenerateNodeIds: jest.fn(),
				validate: jest.fn().mockReturnValue({
					valid: false,
					errors: [{ code: 'ERR001', message: 'Graph error', nodeName: 'TestNode' }],
					warnings: [],
				}),
				generatePinData: jest.fn(),
				toJSON: jest.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			const result = await handler.parseAndValidate('code');

			// Graph validation errors should be included as warnings for agent self-correction
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].code).toBe('ERR001');
			expect(result.warnings[0].message).toBe('Graph error');
			expect(result.warnings[0].nodeName).toBe('TestNode');
		});

		it('should collect warnings from graph validation', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			};

			const mockBuilder = {
				regenerateNodeIds: jest.fn(),
				validate: jest.fn().mockReturnValue({
					valid: true,
					errors: [],
					warnings: [{ code: 'WARN001', message: 'Graph warning', nodeName: 'Node1' }],
				}),
				generatePinData: jest.fn(),
				toJSON: jest.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			const result = await handler.parseAndValidate('code');

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].code).toBe('WARN001');
		});

		it('should collect warnings from JSON validation', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			};

			const mockBuilder = {
				regenerateNodeIds: jest.fn(),
				validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: jest.fn(),
				toJSON: jest.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({
				valid: true,
				errors: [],
				warnings: [{ code: 'JSON_WARN', message: 'JSON warning' }],
			});

			const result = await handler.parseAndValidate('code');

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].code).toBe('JSON_WARN');
		});

		it('should collect errors from JSON validation as warnings for agent self-correction', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			};

			const mockBuilder = {
				regenerateNodeIds: jest.fn(),
				validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: jest.fn(),
				toJSON: jest.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({
				valid: false,
				errors: [{ code: 'JSON_ERR', message: 'JSON validation error', nodeName: 'TestNode' }],
				warnings: [],
			});

			const result = await handler.parseAndValidate('code');

			// JSON validation errors should be included as warnings for agent self-correction
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].code).toBe('JSON_ERR');
			expect(result.warnings[0].message).toBe('JSON validation error');
			expect(result.warnings[0].nodeName).toBe('TestNode');
		});

		it('should collect both errors and warnings from JSON validation', async () => {
			const mockWorkflow = {
				id: 'test',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			};

			const mockBuilder = {
				regenerateNodeIds: jest.fn(),
				validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: jest.fn(),
				toJSON: jest.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({
				valid: false,
				errors: [{ code: 'JSON_ERR', message: 'JSON error' }],
				warnings: [{ code: 'JSON_WARN', message: 'JSON warning' }],
			});

			const result = await handler.parseAndValidate('code');

			// Both errors and warnings should be collected for agent self-correction
			expect(result.warnings).toHaveLength(2);
			expect(result.warnings.map((w) => w.code)).toContain('JSON_ERR');
			expect(result.warnings.map((w) => w.code)).toContain('JSON_WARN');
		});

		it('should pass currentWorkflow to generatePinData', async () => {
			const currentWorkflow = { id: 'current', name: 'Current', nodes: [], connections: {} };
			const mockWorkflow = {
				id: 'test',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			};

			const mockBuilder = {
				regenerateNodeIds: jest.fn(),
				validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: jest.fn(),
				toJSON: jest.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			await handler.parseAndValidate('code', currentWorkflow);

			expect(mockBuilder.generatePinData).toHaveBeenCalledWith({ beforeWorkflow: currentWorkflow });
		});

		it('should throw on parse error', async () => {
			mockParseWorkflowCodeToBuilder.mockImplementation(() => {
				throw new Error('Syntax error at line 5');
			});

			await expect(handler.parseAndValidate('invalid syntax')).rejects.toThrow(
				'Failed to parse generated workflow code',
			);
		});
	});

	describe('getErrorContext', () => {
		it('should extract context around error line', () => {
			const code = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10';

			const context = handler.getErrorContext(code, 'error at line 5');

			expect(context).toContain('5:');
			expect(context).toContain('line5');
		});

		it('should show first lines when no line number found', () => {
			const code = 'line1\nline2\nline3\nline4\nline5';

			const context = handler.getErrorContext(code, 'generic error');

			expect(context).toContain('1:');
			expect(context).toContain('line1');
		});

		// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
		it('should append hint when ${{ pattern is detected near the error line', () => {
			const code = [
				'const x = node({',
				'  config: {',
				'    parameters: {',
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				'      message: expr(`Amount: ${{ $json.amount }}`)',
				'    }',
				'  }',
				'});',
			].join('\n');

			const context = handler.getErrorContext(code, 'Unexpected token at line 4');

			expect(context).toContain('HINT:');
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			expect(context).toContain('${{');
			expect(context).toContain('single quotes');
		});

		// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
		it('should not append hint when ${{ is not present near the error line', () => {
			const code = [
				'const x = node({',
				'  config: {',
				'    parameters: {',
				"      message: expr('Hello {{ $json.name }}')",
				'    }',
				'  }',
				'});',
			].join('\n');

			const context = handler.getErrorContext(code, 'error at line 4');

			expect(context).not.toContain('HINT:');
		});

		// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
		it('should not false-positive on ${{ in single-quoted expr', () => {
			const code = [
				'const x = node({',
				'  config: {',
				'    parameters: {',
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				"      message: expr('Amount: ${{ $json.amount }}')",
				'    }',
				'  }',
				'});',
			].join('\n');

			const context = handler.getErrorContext(code, 'error at line 4');

			expect(context).not.toContain('HINT:');
		});
	});

	describe('validateExistingWorkflow', () => {
		const nonEmptyJson = {
			id: 'test',
			name: 'Test',
			nodes: [{ type: 'n8n-nodes-base.set' }],
			connections: {},
		} as unknown as WorkflowJSON;

		it('should return graph warnings from an existing workflow JSON', () => {
			const mockBuilder = {
				validate: jest.fn().mockReturnValue({
					valid: true,
					errors: [],
					warnings: [{ code: 'WARN001', message: 'Existing warning', nodeName: 'Node1' }],
				}),
			};

			mockFromJSON.mockReturnValue(mockBuilder);

			const result = handler.validateExistingWorkflow(nonEmptyJson);

			expect(mockFromJSON).toHaveBeenCalledWith(nonEmptyJson);
			expect(mockBuilder.validate).toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				code: 'WARN001',
				message: 'Existing warning',
				nodeName: 'Node1',
			});
		});

		it('should return empty array when no warnings', () => {
			const mockBuilder = {
				validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
			};

			mockFromJSON.mockReturnValue(mockBuilder);

			const result = handler.validateExistingWorkflow(nonEmptyJson);

			expect(result).toHaveLength(0);
		});

		it('should collect both graph errors and warnings', () => {
			const mockBuilder = {
				validate: jest.fn().mockReturnValue({
					valid: false,
					errors: [{ code: 'GRAPH_ERR', message: 'Graph error' }],
					warnings: [{ code: 'GRAPH_WARN', message: 'Graph warning' }],
				}),
			};

			mockFromJSON.mockReturnValue(mockBuilder);

			const result = handler.validateExistingWorkflow(nonEmptyJson);

			expect(result).toHaveLength(2);
			expect(result.map((w) => w.code)).toEqual(['GRAPH_ERR', 'GRAPH_WARN']);
		});

		it('should skip validation and return empty array when workflow has no nodes', () => {
			const emptyJson = { id: 'test', name: 'Test', nodes: [], connections: {} };

			const result = handler.validateExistingWorkflow(emptyJson);

			expect(result).toHaveLength(0);
			expect(mockFromJSON).not.toHaveBeenCalled();
		});

		it('should not call toJSON or validateWorkflow', () => {
			const mockBuilder = {
				validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				toJSON: jest.fn(),
			};

			mockFromJSON.mockReturnValue(mockBuilder);

			handler.validateExistingWorkflow(nonEmptyJson);

			expect(mockBuilder.toJSON).not.toHaveBeenCalled();
			expect(mockValidateWorkflow).not.toHaveBeenCalled();
		});
	});
});
