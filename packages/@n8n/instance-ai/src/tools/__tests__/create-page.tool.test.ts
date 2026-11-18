import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiPageService } from '../../types';
import { createCreatePageTool, CREATE_PAGE_DESCRIPTION } from '../create-page.tool';
import { createOrchestratorDomainTools, getActiveOrchestratorDomainToolNames } from '../index';
import { ALWAYS_LOADED_TOOL_NAMES } from '../tool-ids';

function makePageService(): InstanceAiPageService {
	return {
		createPage: vi
			.fn()
			.mockResolvedValue({ id: 'page-1', title: 'Invoice Sync', projectId: 'project-1' }),
		getPage: vi.fn(),
	};
}

function makeContext(pageService: InstanceAiPageService | undefined): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.pageService = pageService;
	return context;
}

describe('create_page tool', () => {
	it('is named create_page', () => {
		expect(createCreatePageTool(makeContext(makePageService())).name).toBe('create_page');
	});

	it('sends the title, the content and the project to the page service', async () => {
		const pageService = makePageService();
		const input = { title: 'Invoice Sync', content: '# Summary', projectId: 'project-1' };

		await executeTool(createCreatePageTool(makeContext(pageService)), input);

		expect(pageService.createPage).toHaveBeenCalledWith(input);
	});

	it('leaves the project out when the model names none', async () => {
		const pageService = makePageService();

		await executeTool(createCreatePageTool(makeContext(pageService)), {
			title: 'Invoice Sync',
			content: '',
		});

		expect(pageService.createPage).toHaveBeenCalledWith({ title: 'Invoice Sync', content: '' });
	});

	it('returns the page id, the title and the instance-relative url', async () => {
		const result = await executeTool(createCreatePageTool(makeContext(makePageService())), {
			title: 'Invoice Sync',
			content: '',
		});

		expect(result).toEqual({ pageId: 'page-1', title: 'Invoice Sync', url: '/page/page-1' });
	});

	it('throws an UnexpectedError when it runs without the page service', async () => {
		await expect(
			executeTool(createCreatePageTool(makeContext(undefined)), { title: 'x', content: '' }),
		).rejects.toThrow(UnexpectedError);
	});

	it('rejects an empty title', () => {
		const tool = createCreatePageTool(makeContext(makePageService()));
		expect(parseToolInput(tool, { title: '  ', content: '' }).success).toBe(false);
	});

	it('teaches every reference link format', () => {
		expect(CREATE_PAGE_DESCRIPTION).toContain('(/workflow/<workflowId>)');
		expect(CREATE_PAGE_DESCRIPTION).toContain('(/workflow/<workflowId>/<nodeId>)');
		expect(CREATE_PAGE_DESCRIPTION).toContain('(/page/<pageId>)');
		expect(CREATE_PAGE_DESCRIPTION).toContain('(/projects/<projectId>/credentials/<credentialId>)');
		expect(CREATE_PAGE_DESCRIPTION).toContain('(/projects/<projectId>/datatables/<dataTableId>)');
	});

	it('keeps a workflow page short', () => {
		expect(CREATE_PAGE_DESCRIPTION).toContain('under 200 words');
		expect(CREATE_PAGE_DESCRIPTION).toContain('Seven steps at most');
		expect(CREATE_PAGE_DESCRIPTION).toContain('Write only these sections');
		expect(CREATE_PAGE_DESCRIPTION).toContain('only when the workflow has an error branch');
	});

	it('gives the writing rules for a workflow page', () => {
		expect(CREATE_PAGE_DESCRIPTION).toContain('a teammate who has never seen it');
		expect(CREATE_PAGE_DESCRIPTION).toContain('## How it works');
		expect(CREATE_PAGE_DESCRIPTION).toContain('## When it fails');
		expect(CREATE_PAGE_DESCRIPTION).not.toContain('## Things to know');
		expect(CREATE_PAGE_DESCRIPTION).toContain('Never invent an id');
		expect(CREATE_PAGE_DESCRIPTION).toContain('Do not paste the workflow JSON');
	});
});

describe('create_page registration', () => {
	it('registers the tool when the page service is present', () => {
		const context = makeContext(makePageService());
		expect(getActiveOrchestratorDomainToolNames(context).has('create_page')).toBe(true);
		expect(createOrchestratorDomainTools(context).has('create_page')).toBe(true);
	});

	it('hides the tool when the page service is absent', () => {
		expect(getActiveOrchestratorDomainToolNames(makeContext(undefined)).has('create_page')).toBe(
			false,
		);
	});

	it('is sent to the model in full, not through the tool catalog', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('create_page')).toBe(true);
	});
});
