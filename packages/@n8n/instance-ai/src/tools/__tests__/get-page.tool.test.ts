import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiPage, InstanceAiPageService } from '../../types';
import { createGetPageTool, GET_PAGE_DESCRIPTION } from '../get-page.tool';
import { createOrchestratorDomainTools, getActiveOrchestratorDomainToolNames } from '../index';
import { ALWAYS_LOADED_TOOL_NAMES } from '../tool-ids';

const page: InstanceAiPage = {
	id: 'page-1',
	title: 'Orders runbook',
	content: 'Rotate the API key first.',
	projectId: 'project-1',
	updatedAt: '2026-11-18T10:00:00.000Z',
};

function makePageService(): InstanceAiPageService {
	return {
		createPage: vi.fn(),
		getPage: vi.fn().mockResolvedValue(page),
		updatePageContent: vi.fn(),
	};
}

function makeContext(pageService: InstanceAiPageService | undefined): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.pageService = pageService;
	return context;
}

describe('get_page tool', () => {
	it('is named get_page', () => {
		expect(createGetPageTool(makeContext(makePageService())).name).toBe('get_page');
	});

	it('reads the page with the given id', async () => {
		const pageService = makePageService();

		await executeTool(createGetPageTool(makeContext(pageService)), { page: 'page-1' });

		expect(pageService.getPage).toHaveBeenCalledWith('page-1');
	});

	it.each(['/page/page-1', '/page/page-1/', '/page/page-1?peek=1', '/projects/p/pages/page-1'])(
		'reads the page id from the path %s',
		async (path) => {
			const pageService = makePageService();

			await executeTool(createGetPageTool(makeContext(pageService)), { page: path });

			expect(pageService.getPage).toHaveBeenCalledWith('page-1');
		},
	);

	it('returns the title, the content, the project, the date and the instance-relative url', async () => {
		const result = await executeTool(createGetPageTool(makeContext(makePageService())), {
			page: 'page-1',
		});

		expect(result).toEqual({
			pageId: 'page-1',
			title: 'Orders runbook',
			content: 'Rotate the API key first.',
			projectId: 'project-1',
			updatedAt: '2026-11-18T10:00:00.000Z',
			url: '/page/page-1',
		});
	});

	it('passes the failure of the page service on', async () => {
		const pageService = makePageService();
		vi.mocked(pageService.getPage).mockRejectedValue(new Error('Page not found'));

		await expect(
			executeTool(createGetPageTool(makeContext(pageService)), { page: 'missing' }),
		).rejects.toThrow('Page not found');
	});

	it('throws an UnexpectedError when it runs without the page service', async () => {
		await expect(
			executeTool(createGetPageTool(makeContext(undefined)), { page: 'page-1' }),
		).rejects.toThrow(UnexpectedError);
	});

	it('rejects an empty page', () => {
		const tool = createGetPageTool(makeContext(makePageService()));
		expect(parseToolInput(tool, { page: '  ' }).success).toBe(false);
	});

	it('tells the model when to read a page and how to cite it', () => {
		expect(GET_PAGE_DESCRIPTION).toContain('before you answer a question about a page');
		expect(GET_PAGE_DESCRIPTION).toContain('`/page/<pageId>`');
		expect(GET_PAGE_DESCRIPTION).toContain('cite it as a Markdown link');
	});
});

describe('get_page registration', () => {
	it('registers the tool when the page service is wired', () => {
		const context = makeContext(makePageService());
		expect(getActiveOrchestratorDomainToolNames(context).has('get_page')).toBe(true);
		expect(createOrchestratorDomainTools(context).has('get_page')).toBe(true);
	});

	it('leaves the tool out when the page module is inactive', () => {
		expect(getActiveOrchestratorDomainToolNames(makeContext(undefined)).has('get_page')).toBe(
			false,
		);
	});

	it('is always loaded, so the model reads a linked page in one call', () => {
		expect(ALWAYS_LOADED_TOOL_NAMES.has('get_page')).toBe(true);
	});
});
