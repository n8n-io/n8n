import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import {
	WORKFLOW_PATTERNS_DETAILED,
	WORKFLOW_SDK_PATTERNS,
} from '@n8n/workflow-sdk/prompts/sdk-reference';

import { createGetWorkflowSdkReferenceTool } from '../tools/workflow-builder/get-workflow-sdk-reference.tool';
import { getSdkReferenceContent } from '../tools/workflow-builder/sdk-reference-content';

import { Telemetry } from '@/telemetry';

jest.mock('@n8n/ai-workflow-builder', () => ({
	SDK_IMPORT_STATEMENT: "import { workflow } from '@n8n/workflow-sdk';",
	MCP_GET_SDK_REFERENCE_TOOL: {
		toolName: 'get_sdk_reference',
		displayTitle: 'Get SDK Reference',
	},
}));

describe('get-workflow-sdk-reference MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let telemetry: Telemetry;

	beforeEach(() => {
		jest.clearAllMocks();
		telemetry = mockInstance(Telemetry, { track: jest.fn() });
	});

	test('returns canonical workflow SDK patterns', () => {
		const content = getSdkReferenceContent('patterns');

		expect(content).toContain(WORKFLOW_SDK_PATTERNS);
		expect(content).toContain('<zero_item_safety>');
		expect(content).toContain('Every IF/Filter `conditions` parameter MUST include');
	});

	test('returns detailed workflow SDK patterns', () => {
		const content = getSdkReferenceContent('patterns_detailed');

		expect(content).toContain(WORKFLOW_PATTERNS_DETAILED);
		expect(content).toContain('output: [{}]');
	});

	test('includes both workflow pattern sections in the full reference', () => {
		const content = getSdkReferenceContent('all');

		expect(content).toContain('## Workflow Patterns');
		expect(content).toContain('<zero_item_safety>');
		expect(content).toContain('## Workflow Patterns Detailed');
		expect(content).toContain('output: [{}]');
	});

	test('accepts patterns_detailed as a tool section', async () => {
		const tool = createGetWorkflowSdkReferenceTool(user, telemetry);
		const sectionSchema = tool.config.inputSchema?.section;

		expect(tool.config.description).toContain('Required reference');
		expect(tool.config.description).toContain('BEFORE writing workflow code');
		expect(tool.config.inputSchema?.section.description).toContain(
			'Omit this for the full reference',
		);
		expect(sectionSchema?.safeParse('patterns_detailed').success).toBe(true);

		const result = await tool.handler({ section: 'patterns_detailed' }, {} as never);

		expect(result.structuredContent).toEqual({
			reference: getSdkReferenceContent('patterns_detailed'),
		});
	});
});
