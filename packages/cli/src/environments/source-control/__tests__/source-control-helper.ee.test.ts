import { constants as fsConstants, accessSync } from 'fs';
import { InstanceSettings } from 'n8n-core';
import path from 'path';
import Container from 'typedi';

import {
	SOURCE_CONTROL_SSH_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
} from '@/environments/source-control/constants';
import {
	generateSshKeyPair,
	getRepoType,
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPrePushResult,
	getTrackingInformationFromPullResult,
	sourceControlFoldersExistCheck,
} from '@/environments/source-control/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/environments/source-control/source-control-preferences.service.ee';
import type { SourceControlPreferences } from '@/environments/source-control/types/source-control-preferences';
import type { SourceControlledFile } from '@/environments/source-control/types/source-controlled-file';
import { License } from '@/license';
import { mockInstance } from '@test/mocking';

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

const license = mockInstance(License);

beforeAll(async () => {
	jest.resetAllMocks();
	license.isSourceControlLicensed.mockReturnValue(true);
	Container.get(SourceControlPreferencesService).getPreferences = () => ({
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
		const trackingResult = getTrackingInformationFromPrePushResult(pushResult);
		expect(trackingResult).toEqual({
			workflowsEligible: 3,
			workflowsEligibleWithConflicts: 1,
			credsEligible: 1,
			credsEligibleWithConflicts: 0,
			variablesEligible: 1,
		});
	});

	it('should get tracking information from post-push results', () => {
		const trackingResult = getTrackingInformationFromPostPushResult(pushResult);
		expect(trackingResult).toEqual({
			workflowsPushed: 2,
			workflowsEligible: 3,
			credsPushed: 1,
			variablesPushed: 1,
		});
	});

	it('should get tracking information from pull results', () => {
		const trackingResult = getTrackingInformationFromPullResult(pullResult);
		expect(trackingResult).toEqual({
			credConflicts: 1,
			workflowConflicts: 1,
			workflowUpdates: 3,
		});
	});

	it('should class validate correct preferences', async () => {
		const validPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'git@example.com:n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
		};
		const validationResult = await Container.get(
			SourceControlPreferencesService,
		).validateSourceControlPreferences(validPreferences);
		expect(validationResult).toBeTruthy();
	});
});
