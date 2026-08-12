import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiFormService } from '../../types';
import { createFormsTool } from '../forms.tool';

function createFormService(overrides: Partial<InstanceAiFormService> = {}): InstanceAiFormService {
	return {
		getFormNode: vi.fn().mockResolvedValue({
			nodeName: 'My Form',
			nodeType: 'n8n-nodes-base.formTrigger',
			overrides: {},
			appendAttribution: true,
			preset: 'light',
		}),
		listFormNodes: vi.fn().mockResolvedValue([
			{
				nodeName: 'My Form',
				nodeType: 'n8n-nodes-base.formTrigger',
				isTrigger: true,
				preset: 'light',
			},
		]),
		getWorkflowName: vi.fn().mockResolvedValue('My Workflow'),
		applyAppearance: vi.fn().mockResolvedValue({ updatedNodeNames: ['My Form'] }),
		renderPreview: vi.fn().mockResolvedValue('<html>preview</html>'),
		...overrides,
	};
}

function createMockContext(formService: InstanceAiFormService): InstanceAiContext {
	return {
		userId: 'user-1',
		formService,
		permissions: {},
	} as unknown as InstanceAiContext;
}

describe('forms tool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('describe', () => {
		it("returns the node's resolved appearance and the workflow's form nodes", async () => {
			const formService = createFormService();
			const tool = createFormsTool(createMockContext(formService));

			const result = await executeTool<{
				node?: { nodeName: string; preset: string };
				formNodes: Array<{ nodeName: string }>;
			}>(tool, { action: 'describe', workflowId: 'wf1', nodeName: 'My Form' }, {} as never);

			expect(formService.getFormNode).toHaveBeenCalledWith('wf1', 'My Form');
			expect(result.node?.nodeName).toBe('My Form');
			expect(result.node?.preset).toBe('light');
			expect(result.formNodes).toHaveLength(1);
		});

		it('reports not-found when the workflow has no form node', async () => {
			const formService = createFormService({
				getFormNode: vi.fn().mockResolvedValue(null),
				listFormNodes: vi.fn().mockResolvedValue([]),
			});
			const tool = createFormsTool(createMockContext(formService));

			const result = await executeTool<{ found: boolean }>(
				tool,
				{ action: 'describe', workflowId: 'wf1' },
				{} as never,
			);

			expect(result.found).toBe(false);
		});
	});

	describe('list-appearance-options', () => {
		it('returns preset ids with descriptions and the CSS-variable catalog', async () => {
			const formService = createFormService();
			const tool = createFormsTool(createMockContext(formService));

			const result = await executeTool<{
				presets: Array<{ id: string; description: string }>;
				variables: Array<{ variable: string; type: string }>;
			}>(tool, { action: 'list-appearance-options' }, {} as never);

			expect(result.presets.some((p) => p.id === 'dark')).toBe(true);
			expect(result.variables.some((v) => v.variable === '--color-background')).toBe(true);
			expect(formService.getFormNode).not.toHaveBeenCalled();
		});
	});

	describe('apply-theme', () => {
		it('suspends with a preview then applies the preset on approval', async () => {
			const formService = createFormService();
			const tool = createFormsTool(createMockContext(formService));
			const suspend = vi.fn();

			// First call — no resume data: renders a preview and suspends.
			await executeTool(
				tool,
				{
					action: 'apply-theme',
					workflowId: 'wf1',
					scope: 'node',
					nodeName: 'My Form',
					preset: 'dark',
				},
				{ suspend, resumeData: undefined } as never,
			);

			expect(formService.renderPreview).toHaveBeenCalledWith('wf1', {
				nodeName: 'My Form',
				customCss: expect.stringContaining(':root'),
			});
			expect(suspend).toHaveBeenCalledTimes(1);
			expect(suspend.mock.calls[0][0]).toMatchObject({
				severity: 'info',
				formAppearance: {
					workflowId: 'wf1',
					nodeName: 'My Form',
					scope: 'node',
					previewHtml: '<html>preview</html>',
					preset: 'dark',
				},
			});
			expect(formService.applyAppearance).not.toHaveBeenCalled();

			// Second call — approved resume data: writes the CSS.
			const result = await executeTool<{ success: boolean; updatedNodeNames: string[] }>(
				tool,
				{
					action: 'apply-theme',
					workflowId: 'wf1',
					scope: 'node',
					nodeName: 'My Form',
					preset: 'dark',
				},
				{ suspend, resumeData: { approved: true } } as never,
			);

			expect(formService.applyAppearance).toHaveBeenCalledWith('wf1', {
				nodeNames: ['My Form'],
				customCss: expect.stringContaining(':root'),
				appendAttribution: true,
			});
			expect(result.success).toBe(true);
			expect(result.updatedNodeNames).toEqual(['My Form']);
		});

		it('does not apply when the user denies', async () => {
			const formService = createFormService();
			const tool = createFormsTool(createMockContext(formService));

			const result = await executeTool<{ success: boolean; denied: boolean }>(
				tool,
				{ action: 'apply-theme', workflowId: 'wf1', scope: 'node', preset: 'dark' },
				{ suspend: vi.fn(), resumeData: { approved: false } } as never,
			);

			expect(result.denied).toBe(true);
			expect(formService.applyAppearance).not.toHaveBeenCalled();
		});

		it('returns validation errors for invalid overrides without suspending', async () => {
			const formService = createFormService();
			const tool = createFormsTool(createMockContext(formService));
			const suspend = vi.fn();

			const result = await executeTool<{
				success: boolean;
				errors?: Array<{ variable: string; reason: string }>;
			}>(
				tool,
				{
					action: 'apply-theme',
					workflowId: 'wf1',
					scope: 'node',
					overrides: { '--not-a-real-variable': 'nope' },
				},
				{ suspend, resumeData: undefined } as never,
			);

			expect(result.success).toBe(false);
			expect(result.errors?.[0]?.variable).toBe('--not-a-real-variable');
			expect(suspend).not.toHaveBeenCalled();
			expect(formService.applyAppearance).not.toHaveBeenCalled();
			expect(formService.renderPreview).not.toHaveBeenCalled();
		});
	});
});
