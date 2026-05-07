import type {
	CredentialsRepository,
	SharedCredentialsRepository,
	CredentialsEntity,
} from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ImportScope } from '../../../import-export.types';
import type { PackageReader } from '../../../io/package-reader';
import type { PackageCredentialRequirement } from '../../../spec/requirements.types';
import { CredentialImporter } from '../credential.finalize';
import type { CredentialResolver } from '../credential.resolver';

jest.mock('n8n-core', () => ({
	Credentials: jest.fn().mockImplementation(() => ({
		setData: jest.fn(),
		getDataToSave: jest.fn().mockReturnValue({ data: 'encrypted-empty-data' }),
	})),
}));

describe('CredentialImporter', () => {
	let importer: CredentialImporter;
	let mockCredentialsRepository: MockProxy<CredentialsRepository>;
	let mockSharedCredentialsRepository: MockProxy<SharedCredentialsRepository>;
	let mockCredentialResolver: MockProxy<CredentialResolver>;
	let mockReader: MockProxy<PackageReader>;
	let scope: ImportScope;

	beforeEach(() => {
		jest.clearAllMocks();

		mockCredentialsRepository = mock<CredentialsRepository>();
		mockSharedCredentialsRepository = mock<SharedCredentialsRepository>();
		mockCredentialResolver = mock<CredentialResolver>();
		mockReader = mock<PackageReader>();

		const mockTransactionManager = {
			save: jest
				.fn()
				.mockImplementation((entity) => Promise.resolve({ id: 'new-cred-id', ...entity })),
		};
		Object.defineProperty(mockCredentialsRepository, 'manager', {
			value: {
				transaction: jest
					.fn()
					.mockImplementation(async (cb: (manager: unknown) => Promise<unknown>) =>
						cb(mockTransactionManager),
					),
			},
			writable: true,
		});

		mockCredentialsRepository.create.mockImplementation((data) => data as CredentialsEntity);
		mockSharedCredentialsRepository.create.mockImplementation((data) => data as never);
		// Default: existing share row found, so no new share is inserted
		mockSharedCredentialsRepository.findOne.mockResolvedValue({} as never);

		importer = new CredentialImporter(
			mockCredentialsRepository,
			mockSharedCredentialsRepository,
			mockCredentialResolver,
		);

		scope = {
			user: mock(),
			targetProjectId: 'target-project-1',
			reader: mockReader,
			entityOptions: {},
		};
	});

	const makeRequirement = (
		id: string,
		name: string,
		type: string,
	): PackageCredentialRequirement => ({
		id,
		name,
		type,
		usedByWorkflows: [],
	});

	describe('finalize', () => {
		it('should return passed bindings unchanged when there is nothing to do', async () => {
			const result = await importer.finalize(scope, {
				bindings: new Map(),
				unresolvedRequirements: [],
				createStubs: false,
			});

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
			expect(mockCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
		});

		it('should preserve passed bindings', async () => {
			const incoming = new Map([['source-cred-1', 'target-cred-1']]);

			const result = await importer.finalize(scope, {
				bindings: incoming,
				unresolvedRequirements: [],
				createStubs: false,
			});

			expect(result.get('source-cred-1')).toBe('target-cred-1');
		});

		it('should not create stubs when createStubs=false even with unresolved requirements', async () => {
			const result = await importer.finalize(scope, {
				bindings: new Map(),
				unresolvedRequirements: [makeRequirement('cred-1', 'Slack', 'slackApi')],
				createStubs: false,
			});

			expect(result.size).toBe(0);
			expect(mockCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
		});

		it('should create stubs for unresolved requirements when createStubs=true', async () => {
			mockCredentialResolver.findInProject.mockResolvedValue(null);

			const result = await importer.finalize(scope, {
				bindings: new Map(),
				unresolvedRequirements: [makeRequirement('cred-1', 'Slack', 'slackApi')],
				createStubs: true,
			});

			expect(mockCredentialsRepository.manager.transaction).toHaveBeenCalledTimes(1);
			expect(mockCredentialsRepository.create).toHaveBeenCalledWith({
				name: 'Slack',
				type: 'slackApi',
				data: 'encrypted-empty-data',
			});
			expect(mockSharedCredentialsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					role: 'credential:owner',
					projectId: 'target-project-1',
				}),
			);
			expect(result.get('cred-1')).toBe('new-cred-id');
		});

		it('should reuse existing credential when name + type match in target project', async () => {
			mockCredentialResolver.findInProject.mockResolvedValue({ id: 'existing-cred' });

			const result = await importer.finalize(scope, {
				bindings: new Map(),
				unresolvedRequirements: [makeRequirement('cred-1', 'Slack', 'slackApi')],
				createStubs: true,
			});

			expect(result.get('cred-1')).toBe('existing-cred');
			expect(mockCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
		});

		it('should skip requirements already present in bindings', async () => {
			const incoming = new Map([['cred-1', 'pre-bound']]);

			const result = await importer.finalize(scope, {
				bindings: incoming,
				unresolvedRequirements: [makeRequirement('cred-1', 'Slack', 'slackApi')],
				createStubs: true,
			});

			expect(result.get('cred-1')).toBe('pre-bound');
			expect(mockCredentialResolver.findInProject).not.toHaveBeenCalled();
			expect(mockCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
		});

		it('should ensure every bound credential is shared with the target project', async () => {
			// Pretend NO share exists for any of the bound credentials.
			mockSharedCredentialsRepository.findOne.mockResolvedValue(null);

			await importer.finalize(scope, {
				bindings: new Map([
					['source-a', 'target-a'],
					['source-b', 'target-b'],
				]),
				unresolvedRequirements: [],
				createStubs: false,
			});

			expect(mockSharedCredentialsRepository.findOne).toHaveBeenCalledTimes(2);
			expect(mockSharedCredentialsRepository.save).toHaveBeenCalledTimes(2);
			expect(mockSharedCredentialsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					credentialsId: expect.any(String),
					projectId: 'target-project-1',
					role: 'credential:user',
				}),
			);
		});

		it('should not duplicate existing share rows', async () => {
			// findOne returns truthy → already shared
			mockSharedCredentialsRepository.findOne.mockResolvedValue({} as never);

			await importer.finalize(scope, {
				bindings: new Map([['source-a', 'target-a']]),
				unresolvedRequirements: [],
				createStubs: false,
			});

			expect(mockSharedCredentialsRepository.save).not.toHaveBeenCalled();
		});

		it('should deduplicate target IDs when sharing', async () => {
			mockSharedCredentialsRepository.findOne.mockResolvedValue(null);

			await importer.finalize(scope, {
				// Two source IDs pointing at the same target
				bindings: new Map([
					['source-a', 'target-shared'],
					['source-b', 'target-shared'],
				]),
				unresolvedRequirements: [],
				createStubs: false,
			});

			expect(mockSharedCredentialsRepository.findOne).toHaveBeenCalledTimes(1);
			expect(mockSharedCredentialsRepository.save).toHaveBeenCalledTimes(1);
		});
	});

	describe('createStubsFromRequirements (legacy alias)', () => {
		it('should delegate to finalize with createStubs=true', async () => {
			mockCredentialResolver.findInProject.mockResolvedValue(null);

			const result = await importer.createStubsFromRequirements(
				scope,
				[makeRequirement('cred-1', 'Slack', 'slackApi')],
				new Map(),
			);

			expect(result.get('cred-1')).toBe('new-cred-id');
			expect(mockCredentialsRepository.manager.transaction).toHaveBeenCalledTimes(1);
		});

		it('should preserve existing bindings', async () => {
			const result = await importer.createStubsFromRequirements(
				scope,
				[],
				new Map([['pre-existing', 'pre-existing-target']]),
			);

			expect(result.get('pre-existing')).toBe('pre-existing-target');
		});
	});
});
