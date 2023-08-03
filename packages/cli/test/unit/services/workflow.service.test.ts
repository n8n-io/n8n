import * as Db from '@/Db';
import config from '@/config';
import { User } from '@/databases/entities/User';
import { WorkflowsService } from '@/workflows/workflows.services';

jest.mock('@/Db', () => {
	return {
		collections: { Workflow: { find: jest.fn() } },
	};
});

const COMMON_FIND_MANY_OPTIONS = {
	order: { updatedAt: 'ASC' },
	relations: ['tags'],
	select: {
		id: true,
		name: true,
		active: true,
		createdAt: true,
		updatedAt: true,
		tags: {
			id: true,
			name: true,
		},
	},
};

const MOCK_WORKFLOW_IDS = ['HaqwXxlWE2lJIrHk', 'IuFbmmTtnE22jcma'];

describe('WorkflowService', () => {
	beforeEach(() => {
		config.load(config.default);
		jest.clearAllMocks();
	});

	describe('getMany()', () => {
		test('should return workflows - no options', async () => {
			jest.spyOn(WorkflowsService, 'getWorkflowIdsForUser').mockResolvedValue(MOCK_WORKFLOW_IDS);

			await WorkflowsService.getMany(new User());

			const findManyOptions = expect.objectContaining({
				...COMMON_FIND_MANY_OPTIONS,
				where: expect.objectContaining({
					id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
				}),
			});

			expect(Db.collections.Workflow.find).toHaveBeenCalledWith(findManyOptions);
		});

		test('should return workflows - filtered', async () => {
			jest.spyOn(WorkflowsService, 'getWorkflowIdsForUser').mockResolvedValue(MOCK_WORKFLOW_IDS);

			await WorkflowsService.getMany(new User(), { filter: '{"name":"My Workflow"}' });

			const findManyOptions = expect.objectContaining({
				...COMMON_FIND_MANY_OPTIONS,
				where: expect.objectContaining({
					id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
					name: expect.objectContaining({ _type: 'like', _value: '%My Workflow%' }),
				}),
			});

			expect(Db.collections.Workflow.find).toHaveBeenCalledWith(findManyOptions);
		});

		test('should return workflows - paginated', async () => {
			jest.spyOn(WorkflowsService, 'getWorkflowIdsForUser').mockResolvedValue(MOCK_WORKFLOW_IDS);

			await WorkflowsService.getMany(new User(), { skip: '1', take: '2' });

			const findManyOptions = expect.objectContaining({
				...COMMON_FIND_MANY_OPTIONS,
				skip: 1,
				take: 2,
				where: expect.objectContaining({
					id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
				}),
			});

			expect(Db.collections.Workflow.find).toHaveBeenCalledWith(findManyOptions);
		});

		test('should return workflows - filtered and paginated', async () => {
			jest.spyOn(WorkflowsService, 'getWorkflowIdsForUser').mockResolvedValue(MOCK_WORKFLOW_IDS);

			await WorkflowsService.getMany(new User(), {
				filter: '{"name":"My Workflow"}',
				skip: '1',
				take: '2',
			});

			const findManyOptions = expect.objectContaining({
				...COMMON_FIND_MANY_OPTIONS,
				skip: 1,
				take: 2,
				where: expect.objectContaining({
					id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
					name: expect.objectContaining({ _type: 'like', _value: '%My Workflow%' }),
				}),
			});

			expect(Db.collections.Workflow.find).toHaveBeenCalledWith(findManyOptions);
		});
	});
});
