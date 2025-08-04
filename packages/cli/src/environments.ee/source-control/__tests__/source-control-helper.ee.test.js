'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const di_1 = require('@n8n/di');
const fs_1 = require('fs');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const path_1 = __importDefault(require('path'));
const constants_1 = require('@/environments.ee/source-control/constants');
const source_control_helper_ee_1 = require('@/environments.ee/source-control/source-control-helper.ee');
function createWorkflowVersion(overrides = {}) {
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
const pushResult = [
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
const pullResult = [
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
const license = (0, jest_mock_extended_1.mock)();
const sourceControlPreferencesService = (0, jest_mock_extended_1.mock)();
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
		const keyPair = await (0, source_control_helper_ee_1.generateSshKeyPair)('ed25519');
		expect(keyPair.privateKey).toBeTruthy();
		expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
		expect(keyPair.publicKey).toBeTruthy();
		expect(keyPair.publicKey).toContain('ssh-ed25519');
	});
	it('should generate an RSA key pair', async () => {
		const keyPair = await (0, source_control_helper_ee_1.generateSshKeyPair)('rsa');
		expect(keyPair.privateKey).toBeTruthy();
		expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
		expect(keyPair.publicKey).toBeTruthy();
		expect(keyPair.publicKey).toContain('ssh-rsa');
	});
	it('should check for git and ssh folders and create them if required', async () => {
		const { n8nFolder } = di_1.Container.get(n8n_core_1.InstanceSettings);
		const sshFolder = path_1.default.join(n8nFolder, constants_1.SOURCE_CONTROL_SSH_FOLDER);
		const gitFolder = path_1.default.join(n8nFolder, constants_1.SOURCE_CONTROL_GIT_FOLDER);
		let hasThrown = false;
		try {
			(0, fs_1.accessSync)(sshFolder, fs_1.constants.F_OK);
		} catch (error) {
			hasThrown = true;
		}
		expect(hasThrown).toBeTruthy();
		hasThrown = false;
		try {
			(0, fs_1.accessSync)(gitFolder, fs_1.constants.F_OK);
		} catch (error) {
			hasThrown = true;
		}
		expect(hasThrown).toBeTruthy();
		expect(
			(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([gitFolder, sshFolder], true),
		).toBe(false);
		expect(
			(0, source_control_helper_ee_1.sourceControlFoldersExistCheck)([gitFolder, sshFolder], true),
		).toBe(true);
		expect((0, fs_1.accessSync)(sshFolder, fs_1.constants.F_OK)).toBeUndefined();
		expect((0, fs_1.accessSync)(gitFolder, fs_1.constants.F_OK)).toBeUndefined();
	});
	it('should get repo type from url', async () => {
		expect(
			(0, source_control_helper_ee_1.getRepoType)('git@github.com:n8ntest/n8n_testrepo.git'),
		).toBe('github');
		expect(
			(0, source_control_helper_ee_1.getRepoType)('git@gitlab.com:n8ntest/n8n_testrepo.git'),
		).toBe('gitlab');
		expect(
			(0, source_control_helper_ee_1.getRepoType)('git@mygitea.io:n8ntest/n8n_testrepo.git'),
		).toBe('other');
	});
	it('should get tracking information from pre-push results', () => {
		const userId = 'userId';
		const trackingResult = (0, source_control_helper_ee_1.getTrackingInformationFromPrePushResult)(
			userId,
			pushResult,
		);
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
		const trackingResult = (0, source_control_helper_ee_1.getTrackingInformationFromPostPushResult)(
			userId,
			pushResult,
		);
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
		const trackingResult = (0, source_control_helper_ee_1.getTrackingInformationFromPullResult)(
			userId,
			pullResult,
		);
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
		expect((0, source_control_helper_ee_1.isWorkflowModified)(local, remote)).toBe(true);
	});
	it('should detect modifications when parent folder IDs differ', () => {
		const local = createWorkflowVersion();
		const remote = createWorkflowVersion({ parentFolderId: 'folder2' });
		expect((0, source_control_helper_ee_1.isWorkflowModified)(local, remote)).toBe(true);
	});
	it('should not detect modifications when version IDs and parent folder IDs are the same', () => {
		const local = createWorkflowVersion();
		const remote = createWorkflowVersion();
		expect((0, source_control_helper_ee_1.isWorkflowModified)(local, remote)).toBe(false);
	});
	it('should not consider it modified when remote parent folder ID is undefined', () => {
		const local = createWorkflowVersion();
		const remote = createWorkflowVersion({ parentFolderId: undefined });
		expect((0, source_control_helper_ee_1.isWorkflowModified)(local, remote)).toBe(false);
	});
	it('should detect modifications when parent folder IDs differ and remote parent folder ID is defined', () => {
		const local = createWorkflowVersion({ parentFolderId: null });
		const remote = createWorkflowVersion();
		expect((0, source_control_helper_ee_1.isWorkflowModified)(local, remote)).toBe(true);
	});
	it('should handle null parent folder IDs correctly', () => {
		const local = createWorkflowVersion({ parentFolderId: null });
		const remote = createWorkflowVersion({ parentFolderId: null });
		expect((0, source_control_helper_ee_1.isWorkflowModified)(local, remote)).toBe(false);
	});
});
describe('readTagAndMappingsFromSourceControlFile', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.unmock('node:fs/promises');
	});
	it('should return default mapping if the file path is not valid', async () => {
		const filePath = 'invalid/path/tags-and-mappings.json';
		const { readTagAndMappingsFromSourceControlFile } = await Promise.resolve().then(() =>
			__importStar(require('@/environments.ee/source-control/source-control-helper.ee')),
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
		jest.resetModules();
		jest.unmock('node:fs/promises');
	});
	it('should return default folders if the file path is not valid', async () => {
		const filePath = 'invalid/path/folders.json';
		const { readFoldersFromSourceControlFile } = await Promise.resolve().then(() =>
			__importStar(require('@/environments.ee/source-control/source-control-helper.ee')),
		);
		const result = await readFoldersFromSourceControlFile(filePath);
		expect(result).toEqual({
			folders: [],
		});
	});
});
//# sourceMappingURL=source-control-helper.ee.test.js.map
