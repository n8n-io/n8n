import { mock } from 'vitest-mock-extended';

import type { KnowledgeConsumerScope } from '../../knowledge-consumer-scope';
import type { KnowledgeFileRepository } from '../../repositories/knowledge-file.repository';
import { KnowledgeRetrievalService } from '../knowledge-retrieval.service';
import type { KnowledgeMirrorService } from '../mirror.service';
import type {
	GlobKnowledgeFilesResult,
	ReadKnowledgeResult,
	SearchKnowledgeResult,
} from '../retrieval-schemas';

const scope: KnowledgeConsumerScope = { kind: 'agent', projectId: 'project-1', agentId: 'agent-1' };

describe('KnowledgeRetrievalService', () => {
	const fileRepository = mock<KnowledgeFileRepository>();
	const mirrorService = mock<KnowledgeMirrorService>();
	const service = new KnowledgeRetrievalService(fileRepository, mirrorService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('answers whether the scope has files from the file repository', async () => {
		fileRepository.hasFilesForAgent.mockResolvedValue(true);

		await expect(service.hasFiles(scope)).resolves.toBe(true);

		expect(fileRepository.hasFilesForAgent).toHaveBeenCalledWith('agent-1', {});
	});

	it('finds, searches and reads through the mirror with the scope unchanged', async () => {
		const found = mock<GlobKnowledgeFilesResult>();
		const searched = mock<SearchKnowledgeResult>();
		const read = mock<ReadKnowledgeResult>();
		mirrorService.globKnowledgeFiles.mockResolvedValue(found);
		mirrorService.searchKnowledge.mockResolvedValue(searched);
		mirrorService.readKnowledge.mockResolvedValue(read);

		await expect(service.findFiles(scope, { pattern: '*' })).resolves.toBe(found);
		await expect(service.searchText(scope, { pattern: 'refund' })).resolves.toBe(searched);
		await expect(service.readFile(scope, { file: 'notes.txt' })).resolves.toBe(read);

		expect(mirrorService.globKnowledgeFiles).toHaveBeenCalledWith(scope, { pattern: '*' });
		expect(mirrorService.searchKnowledge).toHaveBeenCalledWith(scope, { pattern: 'refund' });
		expect(mirrorService.readKnowledge).toHaveBeenCalledWith(scope, { file: 'notes.txt' });
	});
});
