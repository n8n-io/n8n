import Container from 'typedi';
import {
	generateSshKeyPair,
	getRepoType,
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPrePushResult,
	getTrackingInformationFromPullResult,
	sourceControlFoldersExistCheck,
} from '@/environments/sourceControl/sourceControlHelper.ee';
import { License } from '@/License';
import { SourceControlPreferencesService } from '@/environments/sourceControl/sourceControlPreferences.service.ee';
import { UserSettings } from 'n8n-core';
import path from 'path';
import {
	SOURCE_CONTROL_SSH_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_SSH_KEY_NAME,
} from '@/environments/sourceControl/constants';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { constants as fsConstants, accessSync } from 'fs';
import type { SourceControlledFile } from '@/environments/sourceControl/types/sourceControlledFile';

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

beforeAll(async () => {
	LoggerProxy.init(getLogger());
	Container.get(License).isSourceControlLicensed = () => true;
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
		const keyPair = await generateSshKeyPair();
		expect(keyPair.privateKey).toBeTruthy();
		expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
		expect(keyPair.publicKey).toBeTruthy();
		expect(keyPair.publicKey).toContain('ssh-ed25519');
	});

	it('should check for git and ssh folders and create them if required', async () => {
		const userFolder = UserSettings.getUserN8nFolderPath();
		const sshFolder = path.join(userFolder, SOURCE_CONTROL_SSH_FOLDER);
		const gitFolder = path.join(userFolder, SOURCE_CONTROL_GIT_FOLDER);
		const sshKeyName = path.join(sshFolder, SOURCE_CONTROL_SSH_KEY_NAME);
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

	it('should check if source control is licensed', async () => {
		expect(Container.get(License).isSourceControlLicensed()).toBe(true);
	});

	it('should get repo type from url', async () => {
		expect(getRepoType('git@github.com:n8ntest/n8n_testrepo.git')).toBe('github');
		expect(getRepoType('git@gitlab.com:n8ntest/n8n_testrepo.git')).toBe('gitlab');
		expect(getRepoType('git@mygitea.io:n8ntest/n8n_testrepo.git')).toBe('other');
	});

	it('should get tracking information from pre-push results', () => {
		const trackingResult = getTrackingInformationFromPrePushResult(pushResult);
		expect(trackingResult).toEqual({
			workflows_eligible: 3,
			workflows_eligible_with_conflicts: 1,
			creds_eligible: 1,
			creds_eligible_with_conflicts: 0,
			variables_eligible: 1,
		});
	});

	it('should get tracking information from post-push results', () => {
		const trackingResult = getTrackingInformationFromPostPushResult(pushResult);
		expect(trackingResult).toEqual({
			workflows_pushed: 2,
			workflows_eligible: 3,
			creds_pushed: 1,
			variables_pushed: 1,
		});
	});

	it('should get tracking information from pull results', () => {
		const trackingResult = getTrackingInformationFromPullResult(pullResult);
		expect(trackingResult).toEqual({
			cred_conflicts: 1,
			workflow_conflicts: 1,
			workflow_updates: 3,
		});
	});

	it('should class validate correct preferences', async () => {
		const validPreferences = {
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
