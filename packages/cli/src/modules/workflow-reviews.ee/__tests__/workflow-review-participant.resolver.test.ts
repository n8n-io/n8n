import type {
	User,
	UserRepository,
	WorkflowReviewRequest,
	WorkflowReviewRequestAuthorRepository,
	WorkflowReviewRequestReviewerRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewParticipantResolver } from '../workflow-review-participant.resolver';

describe('WorkflowReviewParticipantResolver', () => {
	const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
	const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
	const userRepository = mock<UserRepository>();

	const resolver = new WorkflowReviewParticipantResolver(
		reviewerRepository,
		authorRepository,
		userRepository,
	);

	function request(id: string, createdById: string | null = 'requester-1') {
		return mock<WorkflowReviewRequest>({ id, createdById });
	}

	function mockUsers(...ids: string[]) {
		userRepository.findManyByIds.mockResolvedValue(
			ids.map((id) => mock<User>({ id, email: `${id}@example.com`, firstName: id, lastName: id })),
		);
	}

	beforeEach(() => {
		vi.resetAllMocks();
		reviewerRepository.findByRequestIds.mockResolvedValue([]);
		authorRepository.findByRequestIds.mockResolvedValue([]);
		userRepository.findManyByIds.mockResolvedValue([]);
	});

	it('returns the requester, every author, and the reviewers', async () => {
		authorRepository.findByRequestIds.mockResolvedValue([
			mock({ workflowReviewRequestId: 'req-1', userId: 'requester-1' }),
			mock({ workflowReviewRequestId: 'req-1', userId: 'author-2' }),
		]);
		reviewerRepository.findByRequestIds.mockResolvedValue([
			mock({ workflowReviewRequestId: 'req-1', userId: 'reviewer-1' }),
		]);
		mockUsers('requester-1', 'author-2', 'reviewer-1');

		const participants = (await resolver.resolve([request('req-1')])).for('req-1');

		expect(authorRepository.findByRequestIds).toHaveBeenCalledWith(['req-1']);
		expect(reviewerRepository.findByRequestIds).toHaveBeenCalledWith(['req-1']);
		expect(participants.requester).toMatchObject({
			id: 'requester-1',
			email: 'requester-1@example.com',
			firstName: 'requester-1',
			lastName: 'requester-1',
		});
		// The requester stays in `authors`; deduplication is the frontend's job.
		expect(participants.authors.map((author) => author.id)).toEqual(['requester-1', 'author-2']);
		expect(participants.reviewers.map((reviewer) => reviewer.id)).toEqual(['reviewer-1']);
	});

	it('keys participants by request across a batch', async () => {
		authorRepository.findByRequestIds.mockResolvedValue([
			mock({ workflowReviewRequestId: 'req-1', userId: 'author-1' }),
			mock({ workflowReviewRequestId: 'req-2', userId: 'author-2' }),
		]);
		mockUsers('requester-1', 'requester-2', 'author-1', 'author-2');

		const participants = await resolver.resolve([
			request('req-1'),
			request('req-2', 'requester-2'),
		]);

		expect(participants.for('req-1').requester).toMatchObject({ id: 'requester-1' });
		expect(participants.for('req-1').authors.map((author) => author.id)).toEqual(['author-1']);
		expect(participants.for('req-2').requester).toMatchObject({ id: 'requester-2' });
		expect(participants.for('req-2').authors.map((author) => author.id)).toEqual(['author-2']);
	});

	it('resolves a user holding several roles with a single deduplicated lookup', async () => {
		authorRepository.findByRequestIds.mockResolvedValue([
			mock({ workflowReviewRequestId: 'req-1', userId: 'requester-1' }),
			mock({ workflowReviewRequestId: 'req-1', userId: 'reviewer-1' }),
		]);
		reviewerRepository.findByRequestIds.mockResolvedValue([
			mock({ workflowReviewRequestId: 'req-1', userId: 'reviewer-1' }),
		]);
		mockUsers('requester-1', 'reviewer-1');

		const participants = (await resolver.resolve([request('req-1')])).for('req-1');

		expect(userRepository.findManyByIds).toHaveBeenCalledTimes(1);
		expect(userRepository.findManyByIds).toHaveBeenCalledWith(['requester-1', 'reviewer-1']);
		expect(participants.authors.map((author) => author.id)).toEqual(['requester-1', 'reviewer-1']);
	});

	it('omits an author whose user no longer resolves, keeping the others', async () => {
		authorRepository.findByRequestIds.mockResolvedValue([
			mock({ workflowReviewRequestId: 'req-1', userId: 'requester-1' }),
			mock({ workflowReviewRequestId: 'req-1', userId: 'deleted-author' }),
		]);
		mockUsers('requester-1');

		const participants = (await resolver.resolve([request('req-1')])).for('req-1');

		expect(participants.authors.map((author) => author.id)).toEqual(['requester-1']);
	});

	it('leaves the requester null when their user no longer resolves', async () => {
		const participants = (await resolver.resolve([request('req-1')])).for('req-1');

		expect(participants.requester).toBeNull();
		expect(participants.authors).toEqual([]);
		expect(participants.reviewers).toEqual([]);
	});

	it('skips the user lookup when no request carries a participant', async () => {
		const participants = await resolver.resolve([request('req-1', null)]);

		expect(userRepository.findManyByIds).not.toHaveBeenCalled();
		expect(participants.for('req-1')).toEqual({ requester: null, authors: [], reviewers: [] });
	});

	it('returns empty participants for a request outside the resolved batch', async () => {
		const participants = await resolver.resolve([]);

		expect(participants.for('req-1')).toEqual({ requester: null, authors: [], reviewers: [] });
	});
});
