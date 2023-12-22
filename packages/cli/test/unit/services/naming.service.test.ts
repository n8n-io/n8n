import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { mockInstance } from '../../shared/mocking';
import { NamingService } from '@/services/naming.service';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { CredentialsEntity } from '@/databases/entities/CredentialsEntity';

describe('NamingService', () => {
	const workflowRepository = mockInstance(WorkflowRepository);
	const credentialsRepository = mockInstance(CredentialsRepository);

	const namingService = new NamingService(workflowRepository, credentialsRepository);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('getUniqueWorkflowName()', () => {
		test('should return requested name if already unique', async () => {
			workflowRepository.findStartingWith.mockResolvedValue([]);

			const name = await namingService.getUniqueWorkflowName('foo');

			expect(name).toEqual('foo');
		});

		test('should return requested name suffixed if already existing once', async () => {
			workflowRepository.findStartingWith.mockResolvedValue([{ name: 'foo' }] as WorkflowEntity[]);

			const name = await namingService.getUniqueWorkflowName('foo');

			expect(name).toEqual('foo 2');
		});

		test('should return requested name with incremented suffix if already suffixed', async () => {
			const existingNames = [{ name: 'foo' }, { name: 'foo 2' }] as WorkflowEntity[];

			workflowRepository.findStartingWith.mockResolvedValue(existingNames);

			const name = await namingService.getUniqueWorkflowName('foo');

			expect(name).toEqual('foo 3');

			existingNames.push({ name: 'foo 3' } as WorkflowEntity);

			const _name = await namingService.getUniqueWorkflowName('foo');

			expect(_name).toEqual('foo 4');
		});
	});

	describe('getUniqueCredentialName()', () => {
		test('should return requested name if already unique', async () => {
			credentialsRepository.findStartingWith.mockResolvedValue([]);

			const name = await namingService.getUniqueCredentialName('foo');

			expect(name).toEqual('foo');
		});

		test('should return requested name suffixed if already existing once', async () => {
			credentialsRepository.findStartingWith.mockResolvedValue([
				{ name: 'foo' },
			] as CredentialsEntity[]);

			const name = await namingService.getUniqueCredentialName('foo');

			expect(name).toEqual('foo 2');
		});

		test('should return requested name with incremented suffix if already suffixed', async () => {
			const existingNames = [{ name: 'foo' }, { name: 'foo 2' }] as CredentialsEntity[];

			credentialsRepository.findStartingWith.mockResolvedValue(existingNames);

			const name = await namingService.getUniqueCredentialName('foo');

			expect(name).toEqual('foo 3');

			existingNames.push({ name: 'foo 3' } as CredentialsEntity);

			const _name = await namingService.getUniqueCredentialName('foo');

			expect(_name).toEqual('foo 4');
		});
	});
});
