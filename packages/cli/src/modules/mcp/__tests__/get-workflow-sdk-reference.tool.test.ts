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

vi.mock('@n8n/ai-workflow-builder', () => ({
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

	test('accepts patterns_detailed as a tool section', async () => {
		const tool = createGetWorkflowSdkReferenceTool(user, telemetry, { canvasGroupsEnabled: false });
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

	describe('node groups (canvasGroupsEnabled)', () => {
		describe('getSdkReferenceContent', () => {
			test('embeds verbatim the exact shared contents with the IAI in the full reference when enabled', () => {
				expect(getSdkReferenceContent(undefined, { includeGroups: true })).toContain(
					NODE_GROUPS_REFERENCE,
				);
			});

			test('returns only the group section for section="groups" when enabled', () => {
				const content = getSdkReferenceContent('groups', { includeGroups: true });

				expect(content).toContain(NODE_GROUPS_REFERENCE);
				// Just the group section — not the rest of the reference.
				expect(content).not.toContain('## Workflow Patterns');
				expect(content).not.toContain('<zero_item_safety>');
			});

			test('omits the groups description when disabled, leaving today’s output unchanged', () => {
				const withFlagOff = getSdkReferenceContent(undefined, { includeGroups: false });

				expect(withFlagOff).not.toContain(NODE_GROUPS_REFERENCE);

				expect(withFlagOff).toBe(getSdkReferenceContent());
			});

			test('section="groups" yields no group content when disabled', () => {
				expect(getSdkReferenceContent('groups', { includeGroups: false })).not.toContain(
					NODE_GROUPS_REFERENCE,
				);
			});
		});

		describe('createGetWorkflowSdkReferenceTool', () => {
			describe('When canvasGroupsEnabled is true', () => {
				test('the tool accepts section="groups"', () => {
					const enabled = createGetWorkflowSdkReferenceTool(user, telemetry, {
						canvasGroupsEnabled: true,
					});

					expect(enabled.config.inputSchema?.section.safeParse('groups').success).toBe(true);
				});

				test('the tool handler serves the groups reference', async () => {
					const enabled = createGetWorkflowSdkReferenceTool(user, telemetry, {
						canvasGroupsEnabled: true,
					});

					const enabledResult = await enabled.handler({ section: 'groups' }, {} as never);
					expect(enabledResult.structuredContent?.reference).toContain(NODE_GROUPS_REFERENCE);
				});
			});

			describe('When canvasGroupsEnabled is false', () => {
				test('the tool does not accept section="groups"', () => {
					const disabled = createGetWorkflowSdkReferenceTool(user, telemetry, {
						canvasGroupsEnabled: false,
					});

					expect(disabled.config.inputSchema?.section.safeParse('groups').success).toBe(false);
				});

				test('the tool handler does not serve the groups reference', async () => {
					const disabled = createGetWorkflowSdkReferenceTool(user, telemetry, {
						canvasGroupsEnabled: false,
					});

					const disabledResult = await disabled.handler({ section: undefined }, {} as never);
					expect(disabledResult.structuredContent?.reference).not.toContain(NODE_GROUPS_REFERENCE);
				});
			});
		});
	});
});
