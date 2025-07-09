import type { SourceControlledFile } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { constants as fsConstants, accessSync } from 'fs';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import path from 'path';

import {
	SOURCE_CONTROL_SSH_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
} from '@/environments.ee/source-control/constants';
import {
	generateSshKeyPair,
	getRepoType,
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPrePushResult,
	getTrackingInformationFromPullResult,
	isWorkflowModified,
	sourceControlFoldersExistCheck,
} from '@/environments.ee/source-control/source-control-helper.ee';
import type { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import type { License } from '@/license';

import type { SourceControlWorkflowVersionId } from '../types/source-control-workflow-version-id';

function createWorkflowVersion(
	overrides: Partial<SourceControlWorkflowVersionId> = {},
): SourceControlWorkflowVersionId {
	return {
		id: 'workflow123',
		versionId: 'version1',
		filename: 'workflows/workflow123.json',
		parentFolderId: 'folder1',
		updatedAt: '2023-07-10T10:10:59.000Z',
		name: 'Test Workflow',
		...overrides,
	};
}

const pushResult: SourceControlledFile[] = [
	{
		file: 'credential_stubs/kkookWGIeey9K4Kt.json',
		id: 'kkookWGIeey9K4Kt',
		name: '(deleted)',
		type: 'credential',
		status: 'deleted',
		location: 'local',
		conflict: false,
		updatedAt: '',
		pushed: true,
	},
	{
		file: 'variable_stubs.json',
		id: 'variables',
		name: 'variables',
		type: 'variables',
		status: 'modified',
		location: 'local',
		conflict: false,
		updatedAt: '',
		pushed: true,
	},
	{
		file: 'workflows/BpFS26gViuGqrIVP.json',
		id: 'BpFS26gViuGqrIVP',
		name: 'My workflow 5',
		type: 'workflow',
		status: 'modified',
		location: 'remote',
		conflict: true,
		pushed: true,
		updatedAt: '2023-07-10T10:10:59.000Z',
	},
	{
		file: 'workflows/BpFS26gViuGqrIVP.json',
		id: 'BpFS26gViuGqrIVP',
		name: 'My workflow 5',
		type: 'workflow',
		status: 'modified',
		location: 'local',
		conflict: true,
		updatedAt: '2023-07-10T10:10:59.000Z',
	},
	{
		file: 'workflows/dAU6dNthm4TR3gXx.json',
		id: 'dAU6dNthm4TR3gXx',
		name: 'My workflow 7',
		type: 'workflow',
		status: 'created',
		location: 'local',
		conflict: false,
		pushed: true,
		updatedAt: '2023-07-10T10:02:45.186Z',
	},
	{
		file: 'workflows/haQetoXq9GxHSkft.json',
		id: 'haQetoXq9GxHSkft',
		name: 'My workflow 6',
		type: 'workflow',
		status: 'created',
		location: 'local',
		conflict: false,
		updatedAt: '2023-07-10T10:02:39.276Z',
	},
];

const pullResult: SourceControlledFile[] = [
	{
		file: 'credential_stubs/kkookWGIeey9K4Kt.json',
		id: 'kkookWGIeey9K4Kt',
		name: '(deleted)',
		type: 'credential',
		status: 'deleted',
		location: 'local',
		conflict: false,
		updatedAt: '',
	},
	{
		file: 'credential_stubs/abcdeWGIeey9K4aa.json',
		id: 'abcdeWGIeey9K4aa',
		name: 'modfied credential',
		type: 'credential',
		status: 'modified',
		location: 'local',
		conflict: false,
		updatedAt: '',
	},
	{
		file: 'workflows/BpFS26gViuGqrIVP.json',
		id: 'BpFS26gViuGqrIVP',
		name: '(deleted)',
		type: 'workflow',
		status: 'deleted',
		location: 'local',
		conflict: false,
		updatedAt: '',
	},
	{
		file: 'variable_stubs.json',
		id: 'variables',
		name: 'variables',
		type: 'variables',
		status: 'modified',
		location: 'local',
		conflict: false,
		updatedAt: '',
	},
	{
		file: 'workflows/dAU6dNthm4TR3gXx.json',
		id: 'dAU6dNthm4TR3gXx',
		name: 'My workflow 7',
		type: 'workflow',
		status: 'created',
		location: 'local',
		conflict: false,
		updatedAt: '2023-07-10T10:02:45.186Z',
	},
	{
		file: 'workflows/haQetoXq9GxHSkft.json',
		id: 'haQetoXq9GxHSkft',
		name: 'My workflow 6',
		type: 'workflow',
		status: 'modified',
		location: 'local',
		conflict: false,
		updatedAt: '2023-07-10T10:02:39.276Z',
	},
];

const license = mock<License>();
const sourceControlPreferencesService = mock<SourceControlPreferencesService>();

beforeAll(async () => {
	jest.resetAllMocks();
	license.isSourceControlLicensed.mockReturnValue(true);
	sourceControlPreferencesService.getPreferences.mockReturnValue({
		branchName: 'main',
		connected: true,
		repositoryUrl: 'git@example.com:n8ntest/n8n_testrepo.git',
		branchReadOnly: false,
		branchColor: '#5296D6',
		publicKey:
			'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDBSz2nMZAiUBWe6n89aWd5x9QMcIOaznVW3fpuCYC4L n8n deploy key',
	});
});

describe('Source Control', () => {
	it('should generate an SSH key pair', async () => {
		const keyPair = await generateSshKeyPair('ed25519');
		expect(keyPair.privateKey).toBeTruthy();
		expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
		expect(keyPair.publicKey).toBeTruthy();
		expect(keyPair.publicKey).toContain('ssh-ed25519');
	});

	it('should generate an RSA key pair', async () => {
		const keyPair = await generateSshKeyPair('rsa');
		expect(keyPair.privateKey).toBeTruthy();
		expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
		expect(keyPair.publicKey).toBeTruthy();
		expect(keyPair.publicKey).toContain('ssh-rsa');
	});

	it('should check for git and ssh folders and create them if required', async () => {
		const { n8nFolder } = Container.get(InstanceSettings);
		const sshFolder = path.join(n8nFolder, SOURCE_CONTROL_SSH_FOLDER);
		const gitFolder = path.join(n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		let hasThrown = false;
		try {
			accessSync(sshFolder, fsConstants.F_OK);
		} catch (error) {
			hasThrown = true;
		}
		expect(hasThrown).toBeTruthy();
		hasThrown = false;
		try {
			accessSync(gitFolder, fsConstants.F_OK);
		} catch (error) {
			hasThrown = true;
		}
		expect(hasThrown).toBeTruthy();
		// create missing folders
		expect(sourceControlFoldersExistCheck([gitFolder, sshFolder], true)).toBe(false);
		// find folders this time
		expect(sourceControlFoldersExistCheck([gitFolder, sshFolder], true)).toBe(true);
		expect(accessSync(sshFolder, fsConstants.F_OK)).toBeUndefined();
		expect(accessSync(gitFolder, fsConstants.F_OK)).toBeUndefined();
	});

	it('should get repo type from url', async () => {
		expect(getRepoType('git@github.com:n8ntest/n8n_testrepo.git')).toBe('github');
		expect(getRepoType('git@gitlab.com:n8ntest/n8n_testrepo.git')).toBe('gitlab');
		expect(getRepoType('git@mygitea.io:n8ntest/n8n_testrepo.git')).toBe('other');
	});

	it('should get tracking information from pre-push results', () => {
		const userId = 'userId';
		const trackingResult = getTrackingInformationFromPrePushResult(userId, pushResult);
		expect(trackingResult).toEqual({
			userId,
			workflowsEligible: 3,
			workflowsEligibleWithConflicts: 1,
			credsEligible: 1,
			credsEligibleWithConflicts: 0,
			variablesEligible: 1,
		});
	});

	it('should get tracking information from post-push results', () => {
		const userId = 'userId';
		const trackingResult = getTrackingInformationFromPostPushResult(userId, pushResult);
		expect(trackingResult).toEqual({
			userId,
			workflowsPushed: 2,
			workflowsEligible: 3,
			credsPushed: 1,
			variablesPushed: 1,
		});
	});

	it('should get tracking information from pull results', () => {
		const userId = 'userId';
		const trackingResult = getTrackingInformationFromPullResult(userId, pullResult);
		expect(trackingResult).toEqual({
			userId,
			credConflicts: 1,
			workflowConflicts: 1,
			workflowUpdates: 3,
		});
	});
});

describe('isWorkflowModified', () => {
	it('should detect modifications when version IDs differ', () => {
		const local = createWorkflowVersion();
		const remote = createWorkflowVersion({ versionId: 'version2' });

		expect(isWorkflowModified(local, remote)).toBe(true);
	});

	it('should detect modifications when parent folder IDs differ', () => {
		const local = createWorkflowVersion();
		const remote = createWorkflowVersion({ parentFolderId: 'folder2' });

		expect(isWorkflowModified(local, remote)).toBe(true);
	});

	it('should not detect modifications when version IDs and parent folder IDs are the same', () => {
		const local = createWorkflowVersion();
		const remote = createWorkflowVersion();

		expect(isWorkflowModified(local, remote)).toBe(false);
	});

	it('should not consider it modified when remote parent folder ID is undefined', () => {
		const local = createWorkflowVersion();
		const remote = createWorkflowVersion({ parentFolderId: undefined });

		expect(isWorkflowModified(local, remote)).toBe(false);
	});

	it('should detect modifications when parent folder IDs differ and remote parent folder ID is defined', () => {
		const local = createWorkflowVersion({ parentFolderId: null });
		const remote = createWorkflowVersion();

		expect(isWorkflowModified(local, remote)).toBe(true);
	});

	it('should handle null parent folder IDs correctly', () => {
		const local = createWorkflowVersion({ parentFolderId: null });
		const remote = createWorkflowVersion({ parentFolderId: null });

		expect(isWorkflowModified(local, remote)).toBe(false);
	});
});

describe('readTagAndMappingsFromSourceControlFile', () => {
	beforeEach(() => {
		// Reset module registry so we can unmock properly
		jest.resetModules();
		jest.unmock('node:fs/promises');
	});

	it('should return default mapping if the file path is not valid', async () => {
		const filePath = 'invalid/path/tags-and-mappings.json';
		// Import the function after resetting modules
		const { readTagAndMappingsFromSourceControlFile } = await import(
			'@/environments.ee/source-control/source-control-helper.ee'
		);
		const result = await readTagAndMappingsFromSourceControlFile(filePath);
		expect(result).toEqual({
			tags: [],
			mappings: [],
		});
	});
});

describe('readFoldersFromSourceControlFile', () => {
	beforeEach(() => {
		// Reset module registry so we can unmock properly
		jest.resetModules();
		jest.unmock('node:fs/promises');
	});

	it('should return default folders if the file path is not valid', async () => {
		const filePath = 'invalid/path/folders.json';
		// Import the function after resetting modules
		const { readFoldersFromSourceControlFile } = await import(
			'@/environments.ee/source-control/source-control-helper.ee'
		);
		const result = await readFoldersFromSourceControlFile(filePath);
		expect(result).toEqual({
			folders: [],
		});
	});
});
