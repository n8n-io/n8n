import { UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiPage, InstanceAiPageService } from '../../types';
import { getActiveOrchestratorDomainToolNames } from '../index';
import { ALWAYS_LOADED_TOOL_NAMES } from '../tool-ids';
import { createUpdatePageTool, UPDATE_PAGE_DESCRIPTION } from '../update-page.tool';

const savedPage: InstanceAiPage = {
	id: 'page-1',
	title: 'Orders runbook',
	content: 'Rotate the API key every 30 days.',
	projectId: 'project-1',
	updatedAt: '2026-11-18T10:00:00.000Z',
};

function makePageService(): InstanceAiPageService {
	return {
		createPage: vi.fn(),
		getPage: vi.fn(),
		updatePageContent: vi.fn().mockResolvedValue(savedPage),
	};
}

function makeContext(pageService: InstanceAiPageService | undefined): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.pageService = pageService;
	return context;
}

describe('update_page tool', () => {
	it('is named update_page', () => {
		expect(createUpdatePageTool(makeContext(makePageService())).name).toBe('update_page');
	});

	it.each(['page-1', '/page/page-1', '/projects/p/pages/page-1'])(
		'saves the new content of the page %s',
		async (page) => {
			const pageService = makePageService();

			await executeTool(createUpdatePageTool(makeContext(pageService)), {
				page,
				content: 'Rotate the API key every 30 days.',
			});

			expect(pageService.updatePageContent).toHaveBeenCalledWith({
				pageId: 'page-1',
				content: 'Rotate the API key every 30 days.',
			});
		},
	);

	it('returns the saved page without its content, with the instance-relative url', async () => {
		const result = await executeTool(createUpdatePageTool(makeContext(makePageService())), {
			page: 'page-1',
			content: 'New',
		});

		expect(result).toEqual({
			pageId: 'page-1',
			title: 'Orders runbook',
			projectId: 'project-1',
			updatedAt: '2026-11-18T10:00:00.000Z',
			url: '/page/page-1',
		});
	});

	it('fails when the page service is not wired', async () => {
		await expect(
			executeTool(createUpdatePageTool(makeContext(undefined)), { page: 'page-1', content: 'x' }),
		).rejects.toThrow(UnexpectedError);
	});

	it('tells the model to read the page first and to keep the correct text', () => {
		expect(UPDATE_PAGE_DESCRIPTION).toContain('Read the page with `get_page` first');
		expect(UPDATE_PAGE_DESCRIPTION).toContain('Keep each sentence that is still correct');
	});

	it('is registered and always loaded only when the page service is wired', () => {
		expect(getActiveOrchestratorDomainToolNames(makeContext(makePageService()))).toContain(
			'update_page',
		);
		expect(getActiveOrchestratorDomainToolNames(makeContext(undefined))).not.toContain(
			'update_page',
		);
		expect(ALWAYS_LOADED_TOOL_NAMES).toContain('update_page');
	});
});
