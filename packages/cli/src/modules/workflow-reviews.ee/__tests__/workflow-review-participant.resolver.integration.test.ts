import { testDb } from '@n8n/backend-test-utils';
import {
	GLOBAL_MEMBER_ROLE,
	ServiceAccountRepository,
	UserRepository,
	type WorkflowReviewRequest,
	type WorkflowReviewRequestAuthorRepository,
	type WorkflowReviewRequestReviewerRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { createMember } from '@test-integration/db/users';

import { WorkflowReviewParticipantResolver } from '../workflow-review-participant.resolver';

describe('WorkflowReviewParticipantResolver against the database', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	it('names a service account author by its name, and a person as before', async () => {
		const person = await createMember();
		const serviceAccount = await Container.get(ServiceAccountRepository).create({
			name: 'Deploy bot',
			role: GLOBAL_MEMBER_ROLE,
		});
		const authorRepository = mock<WorkflowReviewRequestAuthorRepository>();
		authorRepository.findByRequestIds.mockResolvedValue([
			mock({ workflowReviewRequestId: 'req-1', userId: serviceAccount.id }),
		]);
		const reviewerRepository = mock<WorkflowReviewRequestReviewerRepository>();
		reviewerRepository.findByRequestIds.mockResolvedValue([]);
		const resolver = new WorkflowReviewParticipantResolver(
			reviewerRepository,
			authorRepository,
			Container.get(UserRepository),
		);

		const participants = (
			await resolver.resolve([mock<WorkflowReviewRequest>({ id: 'req-1', createdById: person.id })])
		).for('req-1');

		expect(participants.requester).toEqual({
			id: person.id,
			email: person.email,
			firstName: person.firstName,
			lastName: person.lastName,
		});
		expect(participants.authors).toContainEqual({
			id: serviceAccount.id,
			email: '',
			firstName: 'Deploy bot',
			lastName: null,
		});
	});
});
