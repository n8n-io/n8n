jest.mock('@n8n/workflow-sdk', () => ({
	parseWorkflowCodeToBuilder: jest.fn(),
	validateWorkflow: jest.fn(),
}));

jest.mock('../extract-code', () => ({
	stripImportStatements: jest.fn((code: string) => code),
}));

import { parseWorkflowCodeToBuilder, validateWorkflow } from '@n8n/workflow-sdk';
import { mock } from 'jest-mock-extended';
import type { INodeTypes } from 'n8n-workflow';

import { stripImportStatements } from '../extract-code';
import { parseAndValidate, partitionWarnings } from '../parse-validate';

const mockedParseWorkflowCodeToBuilder = jest.mocked(parseWorkflowCodeToBuilder);
const mockedValidateWorkflow = jest.mocked(validateWorkflow);
const mockedStripImportStatements = jest.mocked(stripImportStatements);

function makeBuilder(overrides: Record<string, unknown> = {}) {
	return {
		regenerateNodeIds: jest.fn(),
		validate: jest.fn().mockReturnValue({ errors: [], warnings: [] }),
		toJSON: jest.fn().mockReturnValue({ name: 'Test', nodes: [], connections: {} }),
		...overrides,
	};
}

describe('parseAndValidate', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedStripImportStatements.mockImplementation((code) => code);
		mockedValidateWorkflow.mockReturnValue({ errors: [], warnings: [] } as never);
	});

	it('strips imports, parses code, regenerates IDs, and validates', () => {
		const builder = makeBuilder();
		mockedParseWorkflowCodeToBuilder.mockReturnValue(builder as never);

		const result = parseAndValidate('const w = workflow("test");');

		expect(mockedStripImportStatements).toHaveBeenCalledWith('const w = workflow("test");');
		expect(mockedParseWorkflowCodeToBuilder).toHaveBeenCalled();
		expect(builder.regenerateNodeIds).toHaveBeenCalled();
		expect(builder.validate).toHaveBeenCalled();
		expect(builder.toJSON).toHaveBeenCalled();
		expect(mockedValidateWorkflow).toHaveBeenCalled();
		expect(result.workflow).toEqual({ name: 'Test', nodes: [], connections: {} });
		expect(result.warnings).toEqual([]);
	});

	it('collects graph validation errors and warnings', () => {
		const builder = makeBuilder({
			validate: jest.fn().mockReturnValue({
				errors: [{ code: 'GRAPH_ERROR', message: 'Cycle detected' }],
				warnings: [{ code: 'MISSING_TRIGGER', message: 'No trigger found' }],
			}),
		});
		mockedParseWorkflowCodeToBuilder.mockReturnValue(builder as never);

		const result = parseAndValidate('code');

		expect(result.warnings).toHaveLength(2);
		expect(result.warnings[0]).toEqual({ code: 'GRAPH_ERROR', message: 'Cycle detected' });
		expect(result.warnings[1]).toEqual({ code: 'MISSING_TRIGGER', message: 'No trigger found' });
	});

	it('collects schema validation errors', () => {
		const builder = makeBuilder();
		mockedParseWorkflowCodeToBuilder.mockReturnValue(builder as never);
		mockedValidateWorkflow.mockReturnValue({
			errors: [{ code: 'INVALID_PARAM', message: 'Bad param', nodeName: 'HTTP' }],
			warnings: [],
		} as never);

		const result = parseAndValidate('code');

		expect(result.warnings).toContainEqual({
			code: 'INVALID_PARAM',
			message: 'Bad param',
			nodeName: 'HTTP',
		});
	});

	it('combines graph and schema validation issues', () => {
		const builder = makeBuilder({
			validate: jest.fn().mockReturnValue({
				errors: [{ code: 'E1', message: 'graph error' }],
				warnings: [],
			}),
		});
		mockedParseWorkflowCodeToBuilder.mockReturnValue(builder as never);
		mockedValidateWorkflow.mockReturnValue({
			errors: [{ code: 'E2', message: 'schema error' }],
			warnings: [{ code: 'W1', message: 'schema warning' }],
		} as never);

		const result = parseAndValidate('code');

		expect(result.warnings).toHaveLength(3);
	});

	it('throws when parsing fails', () => {
		mockedParseWorkflowCodeToBuilder.mockImplementation(() => {
			throw new Error('Syntax error at line 5');
		});

		expect(() => parseAndValidate('bad code')).toThrow(
			'Failed to parse workflow code: Syntax error at line 5',
		);
	});

	it('wraps non-Error exceptions', () => {
		mockedParseWorkflowCodeToBuilder.mockImplementation(() => {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw 'string error';
		});

		expect(() => parseAndValidate('bad code')).toThrow(
			'Failed to parse workflow code: Unknown error',
		);
	});

	it('forwards nodeTypesProvider to both validators with strictMode on for schema validation', () => {
		const builder = makeBuilder();
		mockedParseWorkflowCodeToBuilder.mockReturnValue(builder as never);
		const nodeTypesProvider = mock<INodeTypes>();

		parseAndValidate('code', { nodeTypesProvider });

		expect(builder.validate).toHaveBeenCalledWith({ nodeTypesProvider });
		expect(mockedValidateWorkflow).toHaveBeenCalledWith(expect.any(Object), {
			nodeTypesProvider,
			strictMode: true,
		});
	});

	it('passes undefined provider but keeps strictMode on when no options are supplied', () => {
		const builder = makeBuilder();
		mockedParseWorkflowCodeToBuilder.mockReturnValue(builder as never);

		parseAndValidate('code');

		expect(builder.validate).toHaveBeenCalledWith({ nodeTypesProvider: undefined });
		expect(mockedValidateWorkflow).toHaveBeenCalledWith(expect.any(Object), {
			nodeTypesProvider: undefined,
			strictMode: true,
		});
	});
});

describe('partitionWarnings', () => {
	it('returns empty arrays for no warnings', () => {
		expect(partitionWarnings([])).toEqual({ errors: [], informational: [] });
	});

	it('classifies MISSING_TRIGGER as informational', () => {
		const warnings = [{ code: 'MISSING_TRIGGER', message: 'No trigger' }];
		const result = partitionWarnings(warnings);

		expect(result.informational).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
	});

	it('classifies DISCONNECTED_NODE as informational', () => {
		const warnings = [{ code: 'DISCONNECTED_NODE', message: 'Orphan node' }];
		const result = partitionWarnings(warnings);

		expect(result.informational).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
	});

	it('classifies unknown codes as errors', () => {
		const warnings = [
			{ code: 'INVALID_PARAM', message: 'Bad param' },
			{ code: 'UNKNOWN_NODE', message: 'Node not found' },
		];
		const result = partitionWarnings(warnings);

		expect(result.errors).toHaveLength(2);
		expect(result.informational).toHaveLength(0);
	});

	it('correctly partitions mixed warnings', () => {
		const warnings = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger' },
			{ code: 'INVALID_PARAM', message: 'Bad param' },
			{ code: 'DISCONNECTED_NODE', message: 'Orphan' },
			{ code: 'GRAPH_CYCLE', message: 'Cycle detected' },
		];
		const result = partitionWarnings(warnings);

		expect(result.informational).toHaveLength(2);
		expect(result.errors).toHaveLength(2);
	});
});
