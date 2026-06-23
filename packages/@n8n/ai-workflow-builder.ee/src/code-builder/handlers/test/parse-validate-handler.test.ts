/**
 * Tests for ParseValidateHandler
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { parseWorkflowCodeToBuilder, validateWorkflow, workflow } from '@n8n/workflow-sdk';
import type { Mock } from 'vitest';

import { ParseValidateHandler } from '../parse-validate-handler';

// Mock the workflow-sdk module
vi.mock('@n8n/workflow-sdk', () => ({
	parseWorkflowCodeToBuilder: vi.fn(),
	validateWorkflow: vi.fn(),
	workflow: { fromJSON: vi.fn() },
	stripImportStatements: vi.fn((code: string) => code),
}));

// Typed mock references
const mockParseWorkflowCodeToBuilder = parseWorkflowCodeToBuilder as Mock;
const mockValidateWorkflow = validateWorkflow as Mock;
const mockFromJSON = workflow.fromJSON as Mock;

describe('ParseValidateHandler', () => {
	let handler: ParseValidateHandler;

	beforeEach(() => {
		vi.clearAllMocks();

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
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue(mockWorkflow),
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
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({
					valid: false,
					errors: [{ code: 'ERR001', message: 'Graph error', nodeName: 'TestNode' }],
					warnings: [],
				}),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue(mockWorkflow),
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
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({
					valid: true,
					errors: [],
					warnings: [{ code: 'WARN001', message: 'Graph warning', nodeName: 'Node1' }],
				}),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue(mockWorkflow),
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
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue(mockWorkflow),
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
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue(mockWorkflow),
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
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue(mockWorkflow),
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
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue(mockWorkflow),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			await handler.parseAndValidate('code', currentWorkflow);

			expect(mockBuilder.generatePinData).toHaveBeenCalledWith({ beforeWorkflow: currentWorkflow });
		});

		it('should preserve existing node IDs (matched by name) when regenerating', async () => {
			const currentWorkflow = {
				id: 'current',
				name: 'Current',
				nodes: [
					{ id: 'manual-id-1', name: 'Set A', type: 'n8n-nodes-base.set' },
					{ id: 'manual-id-2', name: 'Set B', type: 'n8n-nodes-base.set' },
				],
				connections: {},
			} as unknown as WorkflowJSON;

			const mockBuilder = {
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue({ id: 'test', name: 'Test', nodes: [], connections: {} }),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			await handler.parseAndValidate('code', currentWorkflow);

			expect(mockBuilder.regenerateNodeIds).toHaveBeenCalledWith(
				new Map([
					['Set A', 'manual-id-1'],
					['Set B', 'manual-id-2'],
				]),
			);
		});

		it('should regenerate with an empty name map when no currentWorkflow is provided', async () => {
			const mockBuilder = {
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue({ id: 'test', name: 'Test', nodes: [], connections: {} }),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			await handler.parseAndValidate('code');

			expect(mockBuilder.regenerateNodeIds).toHaveBeenCalledWith(new Map());
		});

		it('should preserve existing group IDs (matched by name) when serializing', async () => {
			const currentWorkflow = {
				id: 'current',
				name: 'Current',
				nodes: [],
				connections: {},
				nodeGroups: [
					{ id: 'group-random-1', name: 'Ingestion', nodeIds: [] },
					{ id: 'group-random-2', name: 'Processing', nodeIds: [] },
				],
			} as unknown as WorkflowJSON;

			const mockBuilder = {
				regenerateNodeIds: vi.fn(),
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				generatePinData: vi.fn(),
				toJSON: vi.fn().mockReturnValue({ id: 'test', name: 'Test', nodes: [], connections: {} }),
			};

			mockParseWorkflowCodeToBuilder.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			await handler.parseAndValidate('code', currentWorkflow);

			expect(mockBuilder.toJSON).toHaveBeenCalledWith({
				tidyUp: true,
				existingGroupIdsByName: new Map([
					['Ingestion', 'group-random-1'],
					['Processing', 'group-random-2'],
				]),
			});
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
				validate: vi.fn().mockReturnValue({
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
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
			};

			mockFromJSON.mockReturnValue(mockBuilder);

			const result = handler.validateExistingWorkflow(nonEmptyJson);

			expect(result).toHaveLength(0);
		});

		it('should collect both graph errors and warnings', () => {
			const mockBuilder = {
				validate: vi.fn().mockReturnValue({
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
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
				toJSON: vi.fn(),
			};

			mockFromJSON.mockReturnValue(mockBuilder);

			handler.validateExistingWorkflow(nonEmptyJson);

			expect(mockBuilder.toJSON).not.toHaveBeenCalled();
			expect(mockValidateWorkflow).not.toHaveBeenCalled();
		});
	});

	describe('validateJSON', () => {
		const nonEmptyJson = {
			id: 'test',
			name: 'Test',
			nodes: [{ type: 'n8n-nodes-base.set' }],
			connections: {},
		} as unknown as WorkflowJSON;

		it('should return empty array when workflow has no nodes', () => {
			const emptyJson = { id: 'test', name: 'Test', nodes: [], connections: {} };

			const result = handler.validateJSON(emptyJson);

			expect(result).toHaveLength(0);
			expect(mockFromJSON).not.toHaveBeenCalled();
			expect(mockValidateWorkflow).not.toHaveBeenCalled();
		});

		it('should return empty array when no graph or JSON issues', () => {
			const mockBuilder = {
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
			};
			mockFromJSON.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			const result = handler.validateJSON(nonEmptyJson);

			expect(result).toHaveLength(0);
		});

		it('should collect graph errors and warnings', () => {
			const mockBuilder = {
				validate: vi.fn().mockReturnValue({
					valid: false,
					errors: [{ code: 'GRAPH_ERR', message: 'Graph error', nodeName: 'A' }],
					warnings: [{ code: 'GRAPH_WARN', message: 'Graph warning' }],
				}),
			};
			mockFromJSON.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({ valid: true, errors: [], warnings: [] });

			const result = handler.validateJSON(nonEmptyJson);

			expect(result.map((w) => w.code)).toEqual(['GRAPH_ERR', 'GRAPH_WARN']);
		});

		it('should collect JSON errors and warnings', () => {
			const mockBuilder = {
				validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
			};
			mockFromJSON.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({
				valid: false,
				errors: [{ code: 'JSON_ERR', message: 'JSON error' }],
				warnings: [{ code: 'JSON_WARN', message: 'JSON warning', nodeName: 'B' }],
			});

			const result = handler.validateJSON(nonEmptyJson);

			expect(result.map((w) => w.code)).toEqual(['JSON_ERR', 'JSON_WARN']);
		});

		it('should combine graph and JSON validation issues into a single warnings array', () => {
			const mockBuilder = {
				validate: vi.fn().mockReturnValue({
					valid: false,
					errors: [{ code: 'GRAPH_ERR', message: 'Graph error' }],
					warnings: [],
				}),
			};
			mockFromJSON.mockReturnValue(mockBuilder);
			mockValidateWorkflow.mockReturnValue({
				valid: false,
				errors: [{ code: 'JSON_ERR', message: 'JSON error' }],
				warnings: [],
			});

			const result = handler.validateJSON(nonEmptyJson);

			expect(result.map((w) => w.code)).toEqual(['GRAPH_ERR', 'JSON_ERR']);
			expect(mockFromJSON).toHaveBeenCalledWith(nonEmptyJson);
			expect(mockValidateWorkflow).toHaveBeenCalledWith(nonEmptyJson);
		});
	});
});
