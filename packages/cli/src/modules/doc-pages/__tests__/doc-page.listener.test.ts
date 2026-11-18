import { mock } from 'vitest-mock-extended';

import type { DocPageAiService } from '../doc-page-ai.service';
import { DocPageListener } from '../doc-page.listener';
import type { DocPageService, DocResource } from '../doc-page.service';

describe('DocPageListener', () => {
	const docPageService = mock<DocPageService>();
	const docPageAiService = mock<DocPageAiService>();
	const listener = new DocPageListener(mock(), mock(), docPageService, docPageAiService, mock());
	const resource = mock<DocResource>({ type: 'workflow', id: 'wf1', kind: 'api' });

	beforeEach(() => {
		vi.resetAllMocks();
		docPageService.loadResource.mockResolvedValue(resource);
	});

	it('refreshes the properties of an existing page on a later publish', async () => {
		docPageService.hasPage.mockResolvedValue(true);

		await listener.onPublish('workflow', 'wf1', 'user1');

		expect(docPageService.refreshProperties).toHaveBeenCalledWith(resource);
		expect(docPageService.ensureForResource).not.toHaveBeenCalled();
		expect(docPageAiService.generateForPage).not.toHaveBeenCalled();
	});

	it('creates the page on the first publish', async () => {
		docPageService.hasPage.mockResolvedValue(false);

		await listener.onPublish('workflow', 'wf1', 'user1');

		expect(docPageService.ensureForResource).toHaveBeenCalledWith(resource, 'user1');
		expect(docPageService.refreshProperties).not.toHaveBeenCalled();
	});
});
