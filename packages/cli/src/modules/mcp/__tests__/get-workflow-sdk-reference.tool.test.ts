import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import {
	NODE_GROUPS_REFERENCE,
	WORKFLOW_PATTERNS_DETAILED,
	WORKFLOW_SDK_PATTERNS,
} from '@n8n/workflow-sdk/prompts/sdk-reference';

import { Telemetry } from '@/telemetry';

import { createGetWorkflowSdkReferenceTool } from '../tools/workflow-builder/get-workflow-sdk-reference.tool';
import { getSdkReferenceContent } from '../tools/workflow-builder/sdk-reference-content';

// v2 SDK types structuredContent as an arbitrary JSON value; narrow for assertions.
const structuredOf = (result: { structuredContent?: unknown }) =>
	result.structuredContent as Record<string, unknown> | undefined;

vi.mock('@n8n/ai-workflow-builder', () => ({
	SDK_IMPORT_STATEMENT: "import { workflow } from '@n8n/workflow-sdk';",
	MCP_GET_SDK_REFERENCE_TOOL: {
		toolName: 'get_workflow_sdk_reference',
		displayTitle: 'Get SDK Reference',
	},
}));

describe('get-workflow-sdk-reference MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let telemetry: Telemetry;

	beforeEach(() => {
		vi.clearAllMocks();
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
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

	describe('SDK language rules in the full reference', () => {
		test('includes the language reference', () => {
			const content = getSdkReferenceContent('all');

			expect(content).toContain('restricted subset of TypeScript');
			expect(content).toContain('## Forbidden constructs');
			expect(content).toContain('## Global objects are unavailable');
			expect(content).toContain('## Where to put runtime logic');
		});

		test('embeds the groups docs exactly once', () => {
			expect(getSdkReferenceContent().split('## Node groups')).toHaveLength(2);
		});
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

	describe('node groups', () => {
		describe('getSdkReferenceContent', () => {
			test('embeds verbatim the exact shared contents with the IAI in the full reference', () => {
				expect(getSdkReferenceContent()).toContain(NODE_GROUPS_REFERENCE);
			});

			test('returns only the group section for section="groups"', () => {
				const content = getSdkReferenceContent('groups');

				expect(content).toContain(NODE_GROUPS_REFERENCE);
				// Just the group section — not the rest of the reference.
				expect(content).not.toContain('## Workflow Patterns');
				expect(content).not.toContain('<zero_item_safety>');
			});
		});

		describe('createGetWorkflowSdkReferenceTool', () => {
			test('the tool accepts section="groups"', () => {
				const tool = createGetWorkflowSdkReferenceTool(user, telemetry);

				expect(tool.config.inputSchema?.section.safeParse('groups').success).toBe(true);
			});

			test('the tool handler serves the groups reference', async () => {
				const tool = createGetWorkflowSdkReferenceTool(user, telemetry);

				const result = await tool.handler({ section: 'groups' }, {} as never);
				expect(structuredOf(result)?.reference).toContain(NODE_GROUPS_REFERENCE);
			});
		});
	});

	describe('engine section', () => {
		test('the full reference carries the engine section only with engine v2', () => {
			expect(getSdkReferenceContent()).not.toContain('## Execution engine');
			expect(getSdkReferenceContent(undefined, { engineV2Available: true })).toContain(
				'## Execution engine',
			);
		});

		test('section="engine" describes v2 with engine v2, and warns off engineType without', () => {
			const withV2 = getSdkReferenceContent('engine', { engineV2Available: true });
			expect(withV2).toContain('run in parallel');
			expect(withV2).toContain("engineType: 'v1'");

			const withoutV2 = getSdkReferenceContent('engine');
			expect(withoutV2).toContain('engine v1 only');
			expect(withoutV2).not.toContain('run in parallel');
		});

		test('the tool serves the engine section it was built with', async () => {
			const tool = createGetWorkflowSdkReferenceTool(user, telemetry, { engineV2Available: true });

			const result = await tool.handler({ section: 'engine' }, {} as never);
			expect(structuredOf(result)?.reference).toContain('run in parallel');
		});
	});
});
