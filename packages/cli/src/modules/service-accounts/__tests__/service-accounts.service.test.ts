import type { CreateServiceAccountRequestDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	Project,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { isValidEmail } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { SERVICE_ACCOUNT_EMAIL_DOMAIN } from '@/constants/service-accounts';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { EventService } from '@/events/event.service';
import { ServiceAccountsService } from '@/modules/service-accounts/service-accounts.service';
import type { OwnershipTransferService } from '@/services/ownership-transfer/ownership-transfer.service';
import type { UserService } from '@/services/user.service';
import type { WorkflowService } from '@/workflows/workflow.service';

describe('ServiceAccountsService', () => {
	// `manager` must be supplied: vitest-mock-extended auto-creates mocks for
	// function properties only, so a bare `mock<UserRepository>()` leaves it undefined.
	const entityManager = mock<EntityManager>();
	const userRepository = mock<UserRepository>({ manager: entityManager });
	const userService = mock<UserService>();
	const eventService = mock<EventService>();

	const service = new ServiceAccountsService(
		mock<Logger>(),
		userRepository,
		userService,
		mock<ProjectRepository>(),
		mock<SharedWorkflowRepository>(),
		mock<SharedCredentialsRepository>(),
		mock<WorkflowService>(),
		mock<CredentialsService>(),
		mock<OwnershipTransferService>(),
		eventService,
	);

	const actor = mock<User>({ id: 'human-1' });

	/** Capture what `create` hands to `createUserWithProject`. */
	const captureCreatedUser = () => {
		const created: Array<Record<string, unknown>> = [];

		// `transaction` is overloaded, so the mock's callable isn't narrowed to a Mock
		// by type. Run the callback straight through.
		(entityManager.transaction as unknown as Mock).mockImplementation(
			async (cb: (em: EntityManager) => Promise<unknown>) => await cb(entityManager),
		);

		userRepository.createUserWithProject.mockImplementation(async (user) => {
			created.push(user as Record<string, unknown>);
			return {
				user: mock<User>({ id: 'sa-1', firstName: user.firstName as string }),
				project: mock<Project>(),
			};
		});

		return created;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('create', () => {
		const dto = (overrides: Partial<CreateServiceAccountRequestDto> = {}) =>
			({
				name: 'Deploy Bot',
				role: 'global:member',
				...overrides,
			}) as CreateServiceAccountRequestDto;

		it('synthesizes an email on the reserved .invalid domain that passes isValidEmail', async () => {
			const created = captureCreatedUser();

			await service.create(dto(), actor);

			const email = created[0].email as string;
			expect(email).toMatch(
				new RegExp(`^deploy-bot-[0-9a-f]{8}@${SERVICE_ACCOUNT_EMAIL_DOMAIN.replace('.', '\\.')}$`),
			);
			// The synthesized address must survive `User.preUpsertHook`'s validation
			// and `userBaseSchema.email`'s `.email()` check.
			expect(isValidEmail(email)).toBe(true);
		});

		it('synthesizes a distinct email for identically named accounts', async () => {
			const created = captureCreatedUser();

			await service.create(dto(), actor);
			await service.create(dto(), actor);

			expect(created[0].email).not.toBe(created[1].email);
		});

		it('falls back to a slug when the name has no alphanumeric characters', async () => {
			const created = captureCreatedUser();

			await service.create(dto({ name: '!!!' }), actor);

			expect(created[0].email).toMatch(/^service-account-[0-9a-f]{8}@/);
		});

		it('creates a passwordless, MFA-less service-account principal', async () => {
			const created = captureCreatedUser();

			await service.create(dto(), actor);

			expect(created[0]).toMatchObject({
				type: 'serviceAccount',
				password: null,
				mfaEnabled: false,
				firstName: 'Deploy Bot',
				role: { slug: 'global:member' },
			});
		});

		it('attributes the creation event to the human actor, not the service account', async () => {
			captureCreatedUser();

			await service.create(dto(), actor);

			expect(eventService.emit).toHaveBeenCalledWith('service-account-created', {
				userId: 'human-1',
				serviceAccountId: 'sa-1',
				serviceAccountRole: 'global:member',
			});
		});

		it.each(['global:owner', 'global:chatUser'])('rejects the %s role', async (role) => {
			captureCreatedUser();

			await expect(service.create(dto({ role }), actor)).rejects.toThrow(
				`Service accounts cannot have the "${role}" role`,
			);
			expect(userRepository.createUserWithProject).not.toHaveBeenCalled();
		});
	});

	describe('changeRole', () => {
		it.each(['global:owner', 'global:chatUser'])(
			'rejects a change to %s before touching the DB',
			async (newRoleName) => {
				await expect(service.changeRole('sa-1', { newRoleName }, actor)).rejects.toThrow(
					`Service accounts cannot have the "${newRoleName}" role`,
				);
				expect(userService.changeUserRole).not.toHaveBeenCalled();
			},
		);

		it('404s when the target is not a service account', async () => {
			userRepository.findOne.mockResolvedValue(null);

			await expect(
				service.changeRole('some-human-id', { newRoleName: 'global:admin' }, actor),
			).rejects.toThrow('Service account not found');
		});
	});

	describe('list', () => {
		it('always forces the serviceAccount type filter', async () => {
			const queryBuilder = mock<ReturnType<UserRepository['buildUserQuery']>>();
			queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
			userRepository.buildUserQuery.mockReturnValue(queryBuilder);

			// A caller trying to widen the filter must not be able to.
			await service.list({ filter: { type: 'all' } } as never);

			expect(userRepository.buildUserQuery).toHaveBeenCalledWith(
				expect.objectContaining({ filter: expect.objectContaining({ type: 'serviceAccount' }) }),
			);
		});
	});
});
