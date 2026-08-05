import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import {
	WorkflowReviewActivityCommentRepository,
	WorkflowReviewActivityRepository,
	WorkflowReviewRequestRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

describe('WorkflowReviewActivityCommentRepository', () => {
	let requestRepository: WorkflowReviewRequestRepository;
	let activityRepository: WorkflowReviewActivityRepository;
	let commentRepository: WorkflowReviewActivityCommentRepository;

	beforeAll(async () => {
		await testDb.init();
		requestRepository = Container.get(WorkflowReviewRequestRepository);
		activityRepository = Container.get(WorkflowReviewActivityRepository);
		commentRepository = Container.get(WorkflowReviewActivityCommentRepository);
	});

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowReviewActivityComment',
			'WorkflowReviewActivity',
			'WorkflowReviewRequest',
			'ProjectRelation',
			'Project',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findManyByActivityIds', () => {
		/** A review holding one comment thread with a single message. */
		async function seedThread(projectId: string, body: string) {
			const request = await requestRepository.createRequest({
				projectId,
				title: 'Please review',
				createdById: null,
			});
			const activity = await activityRepository.createActivity(
				{
					workflowReviewRequestId: request.id,
					type: 'comment.created',
					data: null,
					createdById: null,
				},
				{},
			);
			await commentRepository.createComment(
				{ activityId: activity.id, createdById: null, body },
				{},
			);
			return { requestId: request.id, activityId: activity.id };
		}

		test('drops activity ids that belong to another review', async () => {
			// Comment ids are globally enumerable, so the review id is what authorises a read.
			// No HTTP fixture can reach this: the ids always come from the review's own rows.
			const project = await createTeamProject();
			const own = await seedThread(project.id, 'Own review comment');
			const other = await seedThread(project.id, 'Other review comment');

			expect(
				await commentRepository.findManyByActivityIds(
					{ workflowReviewRequestId: own.requestId, activityIds: [other.activityId] },
					{},
				),
			).toEqual([]);

			const mixed = await commentRepository.findManyByActivityIds(
				{
					workflowReviewRequestId: own.requestId,
					activityIds: [own.activityId, other.activityId],
				},
				{},
			);
			expect(mixed.map((comment) => comment.body)).toEqual(['Own review comment']);
		});
	});
});
