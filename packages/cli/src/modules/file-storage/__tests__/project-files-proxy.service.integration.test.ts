import type { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import type { INode, Workflow } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { OwnershipService } from '@/services/ownership.service';
import type { Telemetry } from '@/telemetry';

import { ProjectFileNotFoundError } from '../errors/project-file-not-found.error';
import type { ProjectFileService } from '../file-storage.service';
import type { ProjectFile } from '../project-file.entity';
import { ProjectFilesProxyService } from '../project-files-proxy.service';

const PROJECT_ID = 'project-id';

beforeAll(async () => {
	await testModules.loadModules(['file-storage']);
	await testDb.init();
});

describe('ProjectFilesProxyService', () => {
	let projectFileServiceMock = mock<ProjectFileService>();
	let ownershipServiceMock = mock<OwnershipService>();
	let sourceControlPreferencesServiceMock = mock<SourceControlPreferencesService>();
	let proxyService: ProjectFilesProxyService;

	let workflow: Workflow;
	let node: INode;

	const fileRow = mock<ProjectFile>({
		id: 'file-1',
		name: 'pricing.csv',
		mimeType: 'text/csv',
		fileSizeBytes: 18,
		projectId: PROJECT_ID,
	});

	beforeEach(() => {
		projectFileServiceMock = mock<ProjectFileService>();
		ownershipServiceMock = mock<OwnershipService>();
		sourceControlPreferencesServiceMock = mock<SourceControlPreferencesService>();
		sourceControlPreferencesServiceMock.getPreferences.mockReturnValue({
			branchReadOnly: false,
		} as ReturnType<SourceControlPreferencesService['getPreferences']>);

		proxyService = new ProjectFilesProxyService(
			projectFileServiceMock,
			ownershipServiceMock,
			mock<Logger>(),
			sourceControlPreferencesServiceMock,
			mock<Telemetry>(),
		);

		workflow = mock<Workflow>({ id: 'workflow-id' });
		node = mock<INode>({ type: 'n8n-nodes-base.files' });
		ownershipServiceMock.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: PROJECT_ID }),
		);
	});

	it('rejects nodes outside the allowlist', async () => {
		node = mock<INode>({ type: 'n8n-nodes-base.httpRequest' });

		await expect(proxyService.getProjectFilesProxy(workflow, node)).rejects.toThrow(
			'This proxy is only available for Files nodes',
		);
	});

	it('resolves the project from the workflow home project', async () => {
		const proxy = await proxyService.getProjectFilesProxy(workflow, node);

		expect(ownershipServiceMock.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-id');
		expect(proxy.getProjectId()).toBe(PROJECT_ID);
	});

	it('prefers an explicitly provided projectId', async () => {
		const proxy = await proxyService.getProjectFilesProxy(workflow, node, 'other-project');

		expect(ownershipServiceMock.getWorkflowProjectCached).not.toHaveBeenCalled();
		expect(proxy.getProjectId()).toBe('other-project');
	});

	it('denies mutations on a read-only instance but allows reads', async () => {
		sourceControlPreferencesServiceMock.getPreferences.mockReturnValue({
			branchReadOnly: true,
		} as ReturnType<SourceControlPreferencesService['getPreferences']>);
		projectFileServiceMock.getManyAndCount.mockResolvedValue({ count: 0, data: [] });

		const proxy = await proxyService.getProjectFilesProxy(workflow, node);

		await expect(proxy.upload('pricing.csv', Buffer.from('x'), {}, 'replace')).rejects.toThrow(
			'read-only',
		);
		await expect(proxy.deleteFile('file-1')).rejects.toThrow('read-only');
		await expect(proxy.getManyAndCount({})).resolves.toEqual({ count: 0, data: [] });
	});

	it('scopes listing to the resolved project and maps rows to metadata', async () => {
		projectFileServiceMock.getManyAndCount.mockResolvedValue({ count: 1, data: [fileRow] });

		const proxy = await proxyService.getProjectFilesProxy(workflow, node);
		const result = await proxy.getManyAndCount({ sortBy: 'sizeBytes:desc' });

		expect(projectFileServiceMock.getManyAndCount).toHaveBeenCalledWith(
			expect.objectContaining({
				sortBy: 'size:desc',
				filter: expect.objectContaining({ projectId: PROJECT_ID }),
			}),
		);
		expect(result.data[0]).toMatchObject({
			id: 'file-1',
			name: 'pricing.csv',
			sizeBytes: 18,
		});
	});

	it('uploads through the service with the node-write surface', async () => {
		projectFileServiceMock.upload.mockResolvedValue(fileRow);

		const proxy = await proxyService.getProjectFilesProxy(workflow, node);
		const body = Readable.from(Buffer.from('x'));
		await proxy.upload('pricing.csv', body, { mimeType: 'text/csv' }, 'keepBoth');

		expect(projectFileServiceMock.upload).toHaveBeenCalledWith(
			PROJECT_ID,
			body,
			{ name: 'pricing.csv', mimeType: 'text/csv' },
			'keepBoth',
			'node-write',
		);
	});

	it('maps domain errors to NodeOperationError', async () => {
		projectFileServiceMock.download.mockRejectedValue(new ProjectFileNotFoundError('gone.csv'));

		const proxy = await proxyService.getProjectFilesProxy(workflow, node);

		await expect(proxy.download('missing')).rejects.toThrow(NodeOperationError);
	});
});
