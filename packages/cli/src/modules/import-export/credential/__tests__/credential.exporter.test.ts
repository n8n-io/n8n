import type { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ProjectExportContext } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import { CredentialExporter } from '../credential.exporter';
import type { CredentialSerializer } from '../credential.serializer';

describe('CredentialExporter', () => {
	let exporter: CredentialExporter;
	let mockCredentialsRepository: MockProxy<CredentialsRepository>;
	let mockSerializer: MockProxy<CredentialSerializer>;
	let mockWriter: MockProxy<PackageWriter>;
	let ctx: ProjectExportContext;

	const projectTarget = 'projects/billing-550e84';

	beforeEach(() => {
		jest.clearAllMocks();

		mockCredentialsRepository = mock<CredentialsRepository>();
		mockSerializer = mock<CredentialSerializer>();
		mockWriter = mock<PackageWriter>();

		exporter = new CredentialExporter(mockCredentialsRepository, mockSerializer);

		ctx = {
			projectId: 'project-1',
			projectTarget,
			folderPathMap: new Map(),
			writer: mockWriter,
		};
	});

	it('should return empty array when project has no credentials', async () => {
		mockCredentialsRepository.find.mockResolvedValue([]);

		const entries = await exporter.exportForProject(ctx);

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
		mockSerializer.serialize.mockReturnValue({
			id: credential.id,
			name: credential.name,
			type: 'slackApi',
		});

		const entries = await exporter.exportForProject(ctx);

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
		mockSerializer.serialize
			.mockReturnValueOnce({ id: credentials[0].id, name: 'Slack', type: 'slackApi' })
			.mockReturnValueOnce({ id: credentials[1].id, name: 'GitHub', type: 'githubApi' });

		const entries = await exporter.exportForProject(ctx);

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
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.exportForProject(ctx);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should query credentials by project id', async () => {
		mockCredentialsRepository.find.mockResolvedValue([]);

		await exporter.exportForProject(ctx);

		expect(mockCredentialsRepository.find).toHaveBeenCalledWith({
			where: { shared: { projectId: 'project-1' } },
		});
	});
});
