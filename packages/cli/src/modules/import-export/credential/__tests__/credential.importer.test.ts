import type {
	CredentialsRepository,
	SharedCredentialsRepository,
	CredentialsEntity,
} from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type {
	ImportScope,
	ManifestEntry,
	PackageCredentialRequirement,
} from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { CredentialImporter } from '../credential.importer';
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

	const makeEntry = (id: string, name: string, target: string): ManifestEntry => ({
		id,
		name,
		target,
	});

	beforeEach(() => {
		jest.clearAllMocks();

		mockCredentialsRepository = mock<CredentialsRepository>();
		mockSharedCredentialsRepository = mock<SharedCredentialsRepository>();
		mockCredentialResolver = mock<CredentialResolver>();
		mockReader = mock<PackageReader>();

		// Set up transaction mock to execute the callback
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
			state: {
				folderIdMap: new Map(),
				credentialBindings: new Map(),
				subWorkflowBindings: new Map(),
			},
		};
	});

	it('should do nothing when entries are empty', async () => {
		const result = await importer.import(scope, [], new Map());

		expect(mockReader.readFile).not.toHaveBeenCalled();
		expect(result).toBeInstanceOf(Map);
	});

	it('should reuse existing credential when name + type match in target project', async () => {
		const entry = makeEntry('source-cred-1', 'My Slack', 'credentials/my-slack-source');

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-cred-1', name: 'My Slack', type: 'slackApi' }),
		);

		mockCredentialResolver.findInProject.mockResolvedValue({
			id: 'existing-cred-id',
		});

		const result = await importer.import(scope, [entry], new Map());

		expect(result.get('source-cred-1')).toBe('existing-cred-id');
		expect(mockCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
	});

	it('should create a new credential stub when no match exists', async () => {
		const entry = makeEntry('source-cred-1', 'My Slack', 'credentials/my-slack-source');

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-cred-1', name: 'My Slack', type: 'slackApi' }),
		);

		mockCredentialResolver.findInProject.mockResolvedValue(null);

		const result = await importer.import(scope, [entry], new Map());

		expect(mockCredentialsRepository.manager.transaction).toHaveBeenCalledTimes(1);
		expect(mockCredentialsRepository.create).toHaveBeenCalledWith({
			name: 'My Slack',
			type: 'slackApi',
			data: 'encrypted-empty-data',
		});
		expect(mockSharedCredentialsRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				role: 'credential:owner',
				projectId: 'target-project-1',
			}),
		);
		expect(result.get('source-cred-1')).toBe('new-cred-id');
	});

	it('should handle multiple entries with mix of existing and new credentials', async () => {
		const entries = [
			makeEntry('cred-a', 'Slack', 'credentials/slack'),
			makeEntry('cred-b', 'GitHub', 'credentials/github'),
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'cred-a', name: 'Slack', type: 'slackApi' }))
			.mockReturnValueOnce(JSON.stringify({ id: 'cred-b', name: 'GitHub', type: 'githubApi' }));

		// First exists, second does not
		mockCredentialResolver.findInProject
			.mockResolvedValueOnce({ id: 'existing-slack' })
			.mockResolvedValueOnce(null);

		const result = await importer.import(scope, entries, new Map());

		expect(result.get('cred-a')).toBe('existing-slack');
		expect(result.get('cred-b')).toBe('new-cred-id');
		expect(mockCredentialsRepository.manager.transaction).toHaveBeenCalledTimes(1);
	});

	it('should return a new Map with bindings', async () => {
		const entry = makeEntry('source-cred-1', 'My Slack', 'credentials/my-slack');

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-cred-1', name: 'My Slack', type: 'slackApi' }),
		);
		mockCredentialResolver.findInProject.mockResolvedValue({
			id: 'existing-id',
		});

		const result = await importer.import(scope, [entry], new Map());

		expect(result).toBeInstanceOf(Map);
		expect(result.get('source-cred-1')).toBe('existing-id');
	});

	it('should preserve existing credential bindings passed in', async () => {
		const existingBindings = new Map([['pre-existing', 'pre-existing-target']]);

		const entry = makeEntry('source-cred-1', 'My Slack', 'credentials/my-slack');

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'source-cred-1', name: 'My Slack', type: 'slackApi' }),
		);
		mockCredentialResolver.findInProject.mockResolvedValue({
			id: 'existing-id',
		});

		const result = await importer.import(scope, [entry], existingBindings);

		expect(result.get('pre-existing')).toBe('pre-existing-target');
		expect(result.get('source-cred-1')).toBe('existing-id');
	});

	describe('createStubsFromRequirements', () => {
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

		it('should do nothing when requirements are empty', async () => {
			const result = await importer.createStubsFromRequirements(scope, [], new Map());

			expect(mockCredentialResolver.findInProject).not.toHaveBeenCalled();
			expect(result).toBeInstanceOf(Map);
		});

		it('should create stubs from requirement data without reading from package', async () => {
			const req = makeRequirement('cred-1', 'My Slack', 'slackApi');

			mockCredentialResolver.findInProject.mockResolvedValue(null);

			const result = await importer.createStubsFromRequirements(scope, [req], new Map());

			expect(mockReader.readFile).not.toHaveBeenCalled();
			expect(mockCredentialsRepository.manager.transaction).toHaveBeenCalledTimes(1);
			expect(mockCredentialsRepository.create).toHaveBeenCalledWith({
				name: 'My Slack',
				type: 'slackApi',
				data: 'encrypted-empty-data',
			});
			expect(result.get('cred-1')).toBe('new-cred-id');
		});

		it('should reuse existing credential when name + type match', async () => {
			const req = makeRequirement('cred-1', 'My Slack', 'slackApi');

			mockCredentialResolver.findInProject.mockResolvedValue({
				id: 'existing-cred',
			});

			const result = await importer.createStubsFromRequirements(scope, [req], new Map());

			expect(result.get('cred-1')).toBe('existing-cred');
			expect(mockCredentialsRepository.manager.transaction).not.toHaveBeenCalled();
		});

		it('should handle multiple requirements', async () => {
			const reqs = [
				makeRequirement('cred-1', 'Slack', 'slackApi'),
				makeRequirement('cred-2', 'GitHub', 'githubApi'),
			];

			mockCredentialResolver.findInProject
				.mockResolvedValueOnce({ id: 'existing-slack' })
				.mockResolvedValueOnce(null);

			const result = await importer.createStubsFromRequirements(scope, reqs, new Map());

			expect(result.get('cred-1')).toBe('existing-slack');
			expect(result.get('cred-2')).toBe('new-cred-id');
		});
	});
});
