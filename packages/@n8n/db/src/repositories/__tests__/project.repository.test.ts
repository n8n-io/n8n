import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { Project } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ProjectRepository } from '../project.repository';

describe('ProjectRepository', () => {
	const entityManager = mockEntityManager(Project);
	const projectRepository = Container.get(ProjectRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('deleteByIds', () => {
		it('does not query when there are no ids', async () => {
			await projectRepository.deleteByIds([]);

			expect(entityManager.delete).not.toHaveBeenCalled();
		});

		it('deletes every project with a matching id', async () => {
			await projectRepository.deleteByIds(['proj-1', 'proj-2']);

			expect(entityManager.delete).toHaveBeenCalledWith(Project, {
				id: In(['proj-1', 'proj-2']),
			});
		});
	});
});
