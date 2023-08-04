import * as Db from '@/Db';
import config from '@/config';
import { User } from '@/databases/entities/User';
import { WorkflowsService } from '@/workflows/workflows.services';

jest.mock('@/Db', () => {
	return {
		collections: { Workflow: { findAndCount: jest.fn() } },
	};
});

const MOCK_WORKFLOW_IDS = ['HaqwXxlWE2lJIrHk', 'IuFbmmTtnE22jcma'];

const dbFind = Db.collections.Workflow.findAndCount;

describe('WorkflowService', () => {
	beforeEach(() => {
		config.load(config.default);
		jest.spyOn(WorkflowsService, 'getWorkflowIdsForUser').mockResolvedValue(MOCK_WORKFLOW_IDS);
	});

	const user = new User();

	describe('getMany()', () => {
		describe('should query for workflows', () => {
			test('no options passed', async () => {
				await WorkflowsService.getMany(user);

				const findManyOptions = expect.objectContaining({
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
					where: expect.objectContaining({
						id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
					}),
				});

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});

			test('filter by name', async () => {
				await WorkflowsService.getMany(user, { filter: '{"name":"My Workflow"}' });

				const findManyOptions = expect.objectContaining({
					where: expect.objectContaining({
						id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
						name: expect.objectContaining({ _type: 'like', _value: '%My Workflow%' }),
					}),
				});

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});

			test('filter by name - empty string', async () => {
				await WorkflowsService.getMany(user, { filter: '{"name":""}' });

				const findManyOptions = expect.objectContaining({
					where: expect.objectContaining({
						id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
					}),
				});

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});

			test('paginate', async () => {
				await WorkflowsService.getMany(user, { skip: '1', take: '2' });

				const findManyOptions = expect.objectContaining({
					skip: 1,
					take: 2,
					where: expect.objectContaining({
						id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
					}),
				});

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});

			test('filter by name and paginate', async () => {
				await WorkflowsService.getMany(user, {
					filter: '{"name":"My Workflow"}',
					skip: '1',
					take: '2',
				});

				const findManyOptions = expect.objectContaining({
					where: expect.objectContaining({
						id: expect.objectContaining({ _type: 'in', _value: MOCK_WORKFLOW_IDS }),
						name: expect.objectContaining({ _type: 'like', _value: '%My Workflow%' }),
					}),
					skip: 1,
					take: 2,
				});

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});

			test('paginate - `take` capped at 50', async () => {
				await WorkflowsService.getMany(user, { skip: '1', take: '51' });

				const findManyOptions = expect.objectContaining({ skip: 1, take: 50 });

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});

			test('paginate - `skip` defaults to 0', async () => {
				await WorkflowsService.getMany(user, { take: '50' });

				const findManyOptions = expect.objectContaining({ skip: 0, take: 50 });

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});

			test('select', async () => {
				await WorkflowsService.getMany(user, { select: '["name"]' });

				const findManyOptions = expect.objectContaining({
					select: expect.objectContaining({ name: true }),
				});

				expect(dbFind).toHaveBeenCalledWith(findManyOptions);
			});
		});
	});
});
