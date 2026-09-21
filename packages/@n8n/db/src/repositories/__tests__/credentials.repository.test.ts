import { Container } from '@n8n/di';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { In, Like, Not, QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { CredentialsEntity, SharedCredentials } from '../../entities';
import { TypeOrmTransaction } from '../../services/typeorm-transaction';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { CredentialsRepository } from '../credentials.repository';
import { InstanceCredentialAssignmentRepository } from '../instance-credential-assignment.repository';

describe('CredentialsRepository', () => {
	const entityManager = mockEntityManager(CredentialsEntity);
	const credentialsRepository = Container.get(CredentialsRepository);
	const assignmentRepository = Container.get(InstanceCredentialAssignmentRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('finds non-project credentials by ID', async () => {
		entityManager.find.mockResolvedValueOnce([]);

		await credentialsRepository.findNonProjectCredentialsByIds(['credential-id']);

		expect(entityManager.find).toHaveBeenCalledWith(CredentialsEntity, {
			where: { id: In(['credential-id']), usageScope: Not('project') },
			select: ['id'],
		});
	});

	it('filters ids down to global project credentials', async () => {
		entityManager.find.mockResolvedValueOnce([mock<CredentialsEntity>({ id: 'global-id' })]);

		const ids = await credentialsRepository.findGlobalProjectCredentialIds(['global-id', 'other']);

		expect(ids).toEqual(['global-id']);
		expect(entityManager.find).toHaveBeenCalledWith(CredentialsEntity, {
			where: { id: In(['global-id', 'other']), isGlobal: true, usageScope: 'project' },
			select: ['id'],
		});
	});

	it('does not query for an empty id list', async () => {
		await expect(credentialsRepository.findGlobalProjectCredentialIds([])).resolves.toEqual([]);

		expect(entityManager.find).not.toHaveBeenCalled();
	});

	it('loads only binding metadata and preserves credential and project pairs', async () => {
		entityManager.find
			.mockResolvedValueOnce([
				{ id: 'cred-a', type: 'githubApi', usageScope: 'project', isGlobal: false },
				{ id: 'cred-b', type: 'slackApi', usageScope: 'project', isGlobal: true },
			])
			.mockResolvedValueOnce([
				{ credentialsId: 'cred-a', projectId: 'alpha' },
				{ credentialsId: 'cred-b', projectId: 'beta' },
			]);
		expect(
			await credentialsRepository.findPromotionBindingAccess(
				['cred-a', 'cred-b'],
				['alpha', 'beta'],
			),
		).toEqual([
			{
				id: 'cred-a',
				type: 'githubApi',
				usageScope: 'project',
				isGlobal: false,
				projectIds: ['alpha'],
			},
			{
				id: 'cred-b',
				type: 'slackApi',
				usageScope: 'project',
				isGlobal: true,
				projectIds: ['beta'],
			},
		]);
		expect(entityManager.find).toHaveBeenCalledTimes(2);
		expect(entityManager.find).toHaveBeenNthCalledWith(1, CredentialsEntity, {
			where: { id: In(['cred-a', 'cred-b']) },
			select: ['id', 'type', 'usageScope', 'isGlobal'],
		});
		expect(entityManager.find).toHaveBeenNthCalledWith(2, SharedCredentials, {
			where: { credentialsId: In(['cred-a', 'cred-b']), projectId: In(['alpha', 'beta']) },
			select: ['credentialsId', 'projectId'],
		});
	});

	it('reads binding metadata without target projects and skips an empty credential list', async () => {
		entityManager.find.mockResolvedValueOnce([
			{ id: 'cred-a', type: 'githubApi', usageScope: 'project', isGlobal: true },
		]);
		expect(await credentialsRepository.findPromotionBindingAccess(['cred-a'], [])).toEqual([
			{ id: 'cred-a', type: 'githubApi', usageScope: 'project', isGlobal: true, projectIds: [] },
		]);
		expect(await credentialsRepository.findPromotionBindingAccess([], ['alpha'])).toEqual([]);
		expect(entityManager.find).toHaveBeenCalledTimes(1);
	});

	it('finds only dangling project credentials', async () => {
		const queryBuilder = mock<SelectQueryBuilder<CredentialsEntity>>();
		queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
		queryBuilder.where.mockReturnValue(queryBuilder);
		queryBuilder.andWhere.mockReturnValue(queryBuilder);
		queryBuilder.getMany.mockResolvedValue([]);
		vi.spyOn(credentialsRepository, 'createQueryBuilder').mockReturnValue(queryBuilder);

		await credentialsRepository.findDanglingProjectCredentials();

		expect(queryBuilder.andWhere).toHaveBeenCalledWith('credentials.usageScope = :usageScope', {
			usageScope: 'project',
		});
	});

	it('uses the operation transaction for instance credential writes', async () => {
		const transactionManager = mock<EntityManager>();
		const ctx = { trx: new TypeOrmTransaction(transactionManager) };
		const credential = mock<CredentialsEntity>({
			id: 'credential-id',
			usageScope: 'instance',
		});
		transactionManager.save.mockResolvedValue(credential);
		transactionManager.findOneBy.mockResolvedValue(credential);
		transactionManager.find.mockResolvedValue([]);
		transactionManager.delete.mockRejectedValue(
			new QueryFailedError('DELETE', [], new Error('foreign key constraint')),
		);

		await credentialsRepository.saveInstanceCredential(credential, ctx);
		await credentialsRepository.updateInstanceCredential(
			credential.id,
			{ ...credential, name: 'Updated', type: 'openAiApi', data: 'encrypted' },
			ctx,
		);
		await expect(
			credentialsRepository.deleteInstanceCredentialIfUnassigned(credential.id, ctx),
		).rejects.toThrow('foreign key constraint');

		expect(transactionManager.save).toHaveBeenCalledWith(CredentialsEntity, credential);
		expect(transactionManager.update).toHaveBeenCalledWith(
			CredentialsEntity,
			{ id: credential.id, usageScope: 'instance' },
			expect.objectContaining({ name: 'Updated' }),
		);
		expect(transactionManager.delete).toHaveBeenCalledWith(CredentialsEntity, {
			id: credential.id,
			usageScope: 'instance',
		});
		expect(transactionManager.find).toHaveBeenCalledTimes(1);
		expect(entityManager.save).not.toHaveBeenCalled();
	});

	it('keeps instance credentials that are assigned', async () => {
		const credential = mock<CredentialsEntity>({ id: 'credential-id', usageScope: 'instance' });
		entityManager.findOneBy.mockResolvedValue(credential);
		vi.spyOn(assignmentRepository, 'findCredentialUseIds').mockResolvedValue([
			'example:primary',
			'example:secondary',
		]);

		await expect(
			credentialsRepository.deleteInstanceCredentialIfUnassigned(credential.id),
		).resolves.toEqual({
			status: 'assigned',
			credentialUseIds: ['example:primary', 'example:secondary'],
		});
		expect(entityManager.delete).not.toHaveBeenCalled();
	});

	it('reports an assignment created concurrently with deletion', async () => {
		const credential = mock<CredentialsEntity>({ id: 'credential-id', usageScope: 'instance' });
		entityManager.findOneBy.mockResolvedValue(credential);
		vi.spyOn(assignmentRepository, 'findCredentialUseIds')
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(['example:primary']);
		entityManager.delete.mockRejectedValue(
			new QueryFailedError('DELETE', [], new Error('foreign key constraint')),
		);

		await expect(
			credentialsRepository.deleteInstanceCredentialIfUnassigned(credential.id),
		).resolves.toEqual({
			status: 'assigned',
			credentialUseIds: ['example:primary'],
		});
	});

	describe('findManyAndCount', () => {
		it('should find with options from toFindManyOptions, count on the filter, and return [entities, count]', async () => {
			const mockCredentials = [
				{ id: '1', name: 'Cred 1', type: 'githubApi' },
				{ id: '2', name: 'Cred 2', type: 'githubApi' },
			] as CredentialsEntity[];
			const count = 2;
			entityManager.find.mockResolvedValueOnce(mockCredentials);
			entityManager.count.mockResolvedValueOnce(count);

			const [credentials, total] = await credentialsRepository.findManyAndCount({
				take: 10,
				skip: 0,
			});

			expect(credentials).toEqual(mockCredentials);
			expect(total).toBe(count);
			expect(entityManager.find).toHaveBeenCalledTimes(1);
			const callArg = entityManager.find.mock.calls[0]?.[1];
			expect(callArg).toBeDefined();
			expect(callArg!.take).toBe(10);
			expect(callArg!.select).toBeDefined();
			expect(callArg!.relations).toEqual(['shared', 'shared.project']);
			expect(callArg!.order).toBeUndefined();
			// The count sees only the filter, never the relations or the page window.
			expect(entityManager.count).toHaveBeenCalledWith(CredentialsEntity, {
				where: callArg!.where,
			});
		});

		it('should honor a caller-provided relations array', async () => {
			entityManager.find.mockResolvedValueOnce([]);
			entityManager.count.mockResolvedValueOnce(0);

			await credentialsRepository.findManyAndCount({
				take: 10,
				skip: 0,
				relations: ['shared', 'shared.project'],
			});

			const callArg = entityManager.find.mock.calls[0]?.[1];
			expect(callArg?.relations).toEqual(['shared', 'shared.project']);
		});

		it('should apply credentialIds filter when provided', async () => {
			entityManager.find.mockResolvedValueOnce([]);
			entityManager.count.mockResolvedValueOnce(0);

			await credentialsRepository.findManyAndCount({ take: 5, skip: 0 }, ['id1', 'id2']);

			expect(entityManager.find).toHaveBeenCalledTimes(1);
			const callArg = entityManager.find.mock.calls[0]?.[1];
			expect(callArg).toBeDefined();
			expect(callArg!.where).toEqual(expect.objectContaining({ id: In(['id1', 'id2']) }));
		});

		it('should apply sortBy as TypeORM order', async () => {
			entityManager.find.mockResolvedValueOnce([]);
			entityManager.count.mockResolvedValueOnce(0);

			await credentialsRepository.findManyAndCount({
				take: 10,
				skip: 0,
				sortBy: 'createdAt:desc',
			});

			const callArg = entityManager.find.mock.calls[0]?.[1];
			expect(callArg?.order).toEqual({ createdAt: 'DESC' });
		});

		it('should default sort direction to ASC when omitted', async () => {
			entityManager.find.mockResolvedValueOnce([]);
			entityManager.count.mockResolvedValueOnce(0);

			await credentialsRepository.findManyAndCount({ sortBy: 'name' });

			const callArg = entityManager.find.mock.calls[0]?.[1];
			expect(callArg?.order).toEqual({ name: 'ASC' });
		});

		it('should ignore unknown sortBy columns', async () => {
			entityManager.find.mockResolvedValueOnce([]);
			entityManager.count.mockResolvedValueOnce(0);

			await credentialsRepository.findManyAndCount({ sortBy: 'data:desc' });

			const callArg = entityManager.find.mock.calls[0]?.[1];
			expect(callArg?.order).toBeUndefined();
		});
	});

	describe('findManyAndCount with includeGlobal', () => {
		it('matches globals as an alternative to the sharing filter, keeping column filters', async () => {
			entityManager.find.mockResolvedValueOnce([]);
			entityManager.count.mockResolvedValueOnce(0);

			await credentialsRepository.findManyAndCount({
				includeGlobal: true,
				filter: { type: 'githubApi', projectId: 'p1' },
			});

			const callArg = entityManager.find.mock.calls[0]?.[1];
			expect(callArg?.where).toEqual([
				{ type: Like('%githubApi%'), shared: { projectId: 'p1' }, usageScope: 'project' },
				{ type: Like('%githubApi%'), usageScope: 'project', isGlobal: true },
			]);
			expect(entityManager.count).toHaveBeenCalledWith(CredentialsEntity, {
				where: callArg?.where,
			});
		});
	});
});
