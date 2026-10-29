import type {
	ActivityEventRepository,
	Project,
	ProjectRelation,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	User,
	UserRepository,
	WorkflowHistoryRepository,
	WorkflowPublishHistoryRepository,
} from '@n8n/db';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import {
	MigrationOwnerSuggestionService,
	RECENT_ACTIONS_PER_WORKFLOW,
} from '../migration-owner-suggestion.service';

const at = (iso: string) => new Date(iso);

function user(id: string, firstName: string, lastName: string, flags: Partial<User> = {}): User {
	return { id, firstName, lastName, disabled: false, isPending: false, ...flags } as User;
}

describe('MigrationOwnerSuggestionService', () => {
	let activityEventRepository: MockProxy<ActivityEventRepository>;
	let workflowPublishHistoryRepository: MockProxy<WorkflowPublishHistoryRepository>;
	let workflowHistoryRepository: MockProxy<WorkflowHistoryRepository>;
	let sharedWorkflowRepository: MockProxy<SharedWorkflowRepository>;
	let projectRelationRepository: MockProxy<ProjectRelationRepository>;
	let userRepository: MockProxy<UserRepository>;
	let service: MigrationOwnerSuggestionService;

	const alice = user('alice', 'Alice', 'Adams');
	const bob = user('bob', 'Bob', 'Brown');
	const carol = user('carol', 'Carol', 'Clark');

	function givenUsers(...users: User[]) {
		userRepository.findAllWithRoleAndAuthIdentities.mockResolvedValue(users);
	}

	/** Each workflow's recent entries, newest first, as the repositories return them. */
	type Recent<T> = Record<string, T | T[]>;
	const asLists = <T>(entries: Recent<T>) =>
		new Map(
			Object.entries(entries).map(([id, value]) => [id, Array.isArray(value) ? value : [value]]),
		);

	function givenActivity(entries: Recent<{ userId: string; at: Date }>) {
		activityEventRepository.findRecentAttributedByResource.mockResolvedValue(asLists(entries));
	}

	function givenPublishes(entries: Recent<{ userId: string; at: Date }>) {
		workflowPublishHistoryRepository.findRecentAttributedByWorkflowIds.mockResolvedValue(
			asLists(entries),
		);
	}

	function givenVersions(entries: Recent<{ authors: string; at: Date }>) {
		workflowHistoryRepository.findRecentAuthorsByWorkflowIds.mockResolvedValue(asLists(entries));
	}

	function givenProjects(
		byWorkflow: Record<string, { id: string; type: 'personal' | 'team' }>,
		personalOwners: Record<string, string> = {},
		admins: Record<string, string[]> = {},
	) {
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
			new Map(Object.entries(byWorkflow).map(([id, project]) => [id, project as Project])),
		);
		projectRelationRepository.getPersonalProjectOwners.mockResolvedValue(
			Object.entries(personalOwners).map(
				([projectId, userId]) => ({ projectId, userId }) as ProjectRelation,
			),
		);
		projectRelationRepository.findAdminUserIdsByProjectIds.mockResolvedValue(
			new Map(Object.entries(admins)),
		);
	}

	beforeEach(() => {
		activityEventRepository = mock<ActivityEventRepository>();
		workflowPublishHistoryRepository = mock<WorkflowPublishHistoryRepository>();
		workflowHistoryRepository = mock<WorkflowHistoryRepository>();
		sharedWorkflowRepository = mock<SharedWorkflowRepository>();
		projectRelationRepository = mock<ProjectRelationRepository>();
		userRepository = mock<UserRepository>();

		givenUsers(alice, bob, carol);
		givenActivity({});
		givenPublishes({});
		givenVersions({});
		givenProjects({});

		service = new MigrationOwnerSuggestionService(
			activityEventRepository,
			workflowPublishHistoryRepository,
			workflowHistoryRepository,
			sharedWorkflowRepository,
			projectRelationRepository,
			userRepository,
		);
	});

	it('returns nothing for no workflows without touching the database', async () => {
		expect(await service.suggestOwners([])).toEqual([]);

		expect(userRepository.findAllWithRoleAndAuthIdentities).not.toHaveBeenCalled();
	});

	it('asks each source for the same bounded number of recent actions per workflow', async () => {
		await service.suggestOwners(['wf-1']);

		expect(activityEventRepository.findRecentAttributedByResource).toHaveBeenCalledWith(
			'workflow',
			['wf-1'],
			RECENT_ACTIONS_PER_WORKFLOW,
		);
		expect(workflowPublishHistoryRepository.findRecentAttributedByWorkflowIds).toHaveBeenCalledWith(
			['wf-1'],
			RECENT_ACTIONS_PER_WORKFLOW,
		);
		expect(workflowHistoryRepository.findRecentAuthorsByWorkflowIds).toHaveBeenCalledWith(
			['wf-1'],
			RECENT_ACTIONS_PER_WORKFLOW,
		);
		expect(RECENT_ACTIONS_PER_WORKFLOW).toBe(10);
	});

	describe('most recent attributable activity', () => {
		it('picks the user of the newest action across the activity feed and publish history', async () => {
			givenActivity({ 'wf-1': { userId: 'alice', at: at('2026-09-01T10:00:00Z') } });
			givenPublishes({ 'wf-1': { userId: 'bob', at: at('2026-09-02T10:00:00Z') } });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'bob' },
			]);
		});

		it('prefers a newer activity entry over an older publish', async () => {
			givenActivity({ 'wf-1': { userId: 'alice', at: at('2026-09-03T10:00:00Z') } });
			givenPublishes({ 'wf-1': { userId: 'bob', at: at('2026-09-02T10:00:00Z') } });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'alice' },
			]);
		});

		it('resolves the author name of the newest version to the one user with that name', async () => {
			givenVersions({ 'wf-1': { authors: 'Carol Clark', at: at('2026-09-05T10:00:00Z') } });
			givenPublishes({ 'wf-1': { userId: 'bob', at: at('2026-09-02T10:00:00Z') } });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'carol' },
			]);
		});

		it('strips the MCP marker from an author name before matching', async () => {
			givenVersions({
				'wf-1': { authors: 'Carol Clark (via MCP)', at: at('2026-09-05T10:00:00Z') },
			});

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'carol' },
			]);
		});

		it('ignores an author name that matches two users', async () => {
			givenUsers(alice, bob, user('bob-2', 'Bob', 'Brown'));
			givenVersions({ 'wf-1': { authors: 'Bob Brown', at: at('2026-09-05T10:00:00Z') } });
			givenPublishes({ 'wf-1': { userId: 'alice', at: at('2026-09-01T10:00:00Z') } });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'alice' },
			]);
		});

		it('ignores an author name that matches no user', async () => {
			givenVersions({ 'wf-1': { authors: 'eval-snapshot', at: at('2026-09-05T10:00:00Z') } });

			expect(await service.suggestOwners(['wf-1'])).toEqual([]);
		});

		it('skips a disabled or pending user and falls through to the next signal', async () => {
			givenUsers(
				user('dan', 'Dan', 'Dole', { disabled: true }),
				user('eve', 'Eve', 'Evans', { isPending: true }),
				bob,
			);
			givenActivity({ 'wf-1': { userId: 'dan', at: at('2026-09-09T10:00:00Z') } });
			givenPublishes({ 'wf-1': { userId: 'eve', at: at('2026-09-08T10:00:00Z') } });
			givenVersions({ 'wf-1': { authors: 'Bob Brown', at: at('2026-09-01T10:00:00Z') } });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'bob' },
			]);
		});

		it('falls back to an older attributable action when the newest one is by a user who cannot own', async () => {
			givenUsers(
				user('dan', 'Dan', 'Dole', { disabled: true }),
				alice,
				bob,
				user('bob-2', 'Bob', 'Brown'),
			);
			givenActivity({
				'wf-1': [
					{ userId: 'dan', at: at('2026-09-09T10:00:00Z') },
					{ userId: 'alice', at: at('2026-09-07T10:00:00Z') },
				],
			});
			givenVersions({
				'wf-1': [
					{ authors: 'Bob Brown', at: at('2026-09-08T10:00:00Z') },
					{ authors: 'Bob Brown', at: at('2026-09-01T10:00:00Z') },
				],
			});

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'alice' },
			]);
		});

		it('skips a user that no longer exists', async () => {
			givenActivity({ 'wf-1': { userId: 'gone', at: at('2026-09-09T10:00:00Z') } });
			givenProjects({ 'wf-1': { id: 'p-1', type: 'personal' } }, { 'p-1': 'alice' });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'alice' },
			]);
		});
	});

	describe('project owner fallback', () => {
		it('uses the personal project owner when no activity is attributable', async () => {
			givenProjects({ 'wf-1': { id: 'p-1', type: 'personal' } }, { 'p-1': 'alice' });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'alice' },
			]);
		});

		it('uses one admin of a team project, the same one each time', async () => {
			givenProjects({ 'wf-1': { id: 'p-team', type: 'team' } }, {}, { 'p-team': ['bob', 'carol'] });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'bob' },
			]);
			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'bob' },
			]);
		});

		it('skips an admin who cannot own and takes the next one', async () => {
			givenUsers(user('bob', 'Bob', 'Brown', { disabled: true }), carol);
			givenProjects({ 'wf-1': { id: 'p-team', type: 'team' } }, {}, { 'p-team': ['bob', 'carol'] });

			expect(await service.suggestOwners(['wf-1'])).toEqual([
				{ workflowId: 'wf-1', userId: 'carol' },
			]);
		});

		it('suggests nobody for a team project without an eligible admin', async () => {
			givenProjects({ 'wf-1': { id: 'p-team', type: 'team' } }, {}, {});

			expect(await service.suggestOwners(['wf-1'])).toEqual([]);
		});

		it('only looks up projects for the workflows that activity did not resolve', async () => {
			givenActivity({ 'wf-1': { userId: 'alice', at: at('2026-09-01T10:00:00Z') } });
			givenProjects({ 'wf-2': { id: 'p-2', type: 'personal' } }, { 'p-2': 'bob' });

			const suggestions = await service.suggestOwners(['wf-1', 'wf-2']);

			expect(sharedWorkflowRepository.findOwnerProjectsByWorkflowIds).toHaveBeenCalledWith([
				'wf-2',
			]);
			expect(suggestions).toEqual([
				{ workflowId: 'wf-1', userId: 'alice' },
				{ workflowId: 'wf-2', userId: 'bob' },
			]);
		});
	});
});
