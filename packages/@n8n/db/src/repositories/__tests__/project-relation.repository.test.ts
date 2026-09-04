import { Container } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ProjectRelation } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { ProjectRelationRepository } from '../project-relation.repository';

describe('ProjectRelationRepository', () => {
	mockEntityManager(ProjectRelation);
	const projectRelationRepository = Container.get(ProjectRelationRepository);

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('findPersonalOwnerEmails', () => {
		it('should map each personal project id to the email of its owner', async () => {
			const queryBuilder = mock<SelectQueryBuilder<ProjectRelation>>();
			queryBuilder.innerJoin.mockReturnThis();
			queryBuilder.select.mockReturnThis();
			queryBuilder.addSelect.mockReturnThis();
			queryBuilder.where.mockReturnThis();
			queryBuilder.andWhere.mockReturnThis();
			queryBuilder.getRawMany.mockResolvedValue([
				{ projectId: 'project1', email: 'owner@example.com' },
			]);
			vi.spyOn(projectRelationRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

			const result = await projectRelationRepository.findPersonalOwnerEmails([
				'project1',
				'project1',
				'project2',
			]);

			expect(queryBuilder.where).toHaveBeenCalledWith(
				'projectRelation.projectId IN (:...projectIds)',
				{ projectIds: ['project1', 'project2'] },
			);
			expect(queryBuilder.andWhere).toHaveBeenCalledWith('projectRelation.role = :role', {
				role: PROJECT_OWNER_ROLE_SLUG,
			});
			expect(result).toEqual(new Map([['project1', 'owner@example.com']]));
		});

		it('should not query when there are no project ids', async () => {
			const createQueryBuilder = vi.spyOn(projectRelationRepository, 'createQueryBuilder');

			const result = await projectRelationRepository.findPersonalOwnerEmails([]);

			expect(createQueryBuilder).not.toHaveBeenCalled();
			expect(result).toEqual(new Map());
		});
	});
});
