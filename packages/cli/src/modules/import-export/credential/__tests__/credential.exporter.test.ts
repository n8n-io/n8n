import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ExportScope } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import { CredentialExporter } from '../credential.exporter';

describe('CredentialExporter', () => {
	let exporter: CredentialExporter;
	let mockCredentialsRepository: MockProxy<CredentialsRepository>;
	let mockWriter: MockProxy<PackageWriter>;
	let scope: ExportScope;

	const basePath = 'projects/billing-550e84';

	beforeEach(() => {
		jest.clearAllMocks();

		mockCredentialsRepository = mock<CredentialsRepository>();
		mockWriter = mock<PackageWriter>();

		exporter = new CredentialExporter(mockCredentialsRepository);

		scope = {
			basePath,
			projectId: 'project-1',
			writer: mockWriter,
			entityOptions: {},
			state: { folderPathMap: new Map(), nodesByWorkflow: [] },
		};
	});

	it('should return empty array when project has no credentials', async () => {
		mockCredentialsRepository.find.mockResolvedValue([]);

		const entries = await exporter.export(scope);

		expect(entries).toEqual([]);
		expect(mockWriter.writeDirectory).not.toHaveBeenCalled();
		expect(mockWriter.writeFile).not.toHaveBeenCalled();
	});

	it('should export a credential', async () => {
		const credential = {
			id: 'cred1100-0000-0000-0000-000000000000',
			name: 'My Slack Token',
			type: 'slackApi',
		} as CredentialsEntity;

		mockCredentialsRepository.find.mockResolvedValue([credential]);

		const entries = await exporter.export(scope);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe(credential.id);
		expect(entries[0].name).toBe('My Slack Token');
		expect(entries[0].target).toBe('projects/billing-550e84/credentials/my-slack-token-cred11');

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith(
			'projects/billing-550e84/credentials/my-slack-token-cred11',
		);
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/credentials/my-slack-token-cred11/credential.json',
			expect.any(String),
		);
	});

	it('should export multiple credentials', async () => {
		const credentials = [
			{ id: 'aaa11100-0000-0000-0000-000000000000', name: 'Slack', type: 'slackApi' },
			{ id: 'bbb22200-0000-0000-0000-000000000000', name: 'GitHub', type: 'githubApi' },
		] as CredentialsEntity[];

		mockCredentialsRepository.find.mockResolvedValue(credentials);

		const entries = await exporter.export(scope);

		expect(entries).toHaveLength(2);
		expect(mockWriter.writeDirectory).toHaveBeenCalledTimes(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});

	it('should serialize credential data as JSON in the written file', async () => {
		const credential = {
			id: 'cred1100-0000-0000-0000-000000000000',
			name: 'My Slack Token',
			type: 'slackApi',
		} as CredentialsEntity;

		const serialized = { id: credential.id, name: credential.name, type: 'slackApi' };
		mockCredentialsRepository.find.mockResolvedValue([credential]);

		await exporter.export(scope);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should query credentials by project id with select clause excluding data blob', async () => {
		mockCredentialsRepository.find.mockResolvedValue([]);

		await exporter.export(scope);

		expect(mockCredentialsRepository.find).toHaveBeenCalledWith({
			select: { id: true, name: true, type: true },
			where: { shared: { projectId: 'project-1' } },
		});
	});

	it('should return empty array when no projectId', async () => {
		scope = {
			basePath: '.',
			writer: mockWriter,
			entityOptions: {},
			state: { folderPathMap: new Map(), nodesByWorkflow: [] },
		};

		const entries = await exporter.export(scope);

		expect(entries).toEqual([]);
		expect(mockCredentialsRepository.find).not.toHaveBeenCalled();
	});
});
