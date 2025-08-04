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
exports.stringContainsExpression = stringContainsExpression;
exports.getWorkflowExportPath = getWorkflowExportPath;
exports.getCredentialExportPath = getCredentialExportPath;
exports.getVariablesPath = getVariablesPath;
exports.getTagsPath = getTagsPath;
exports.getFoldersPath = getFoldersPath;
exports.readTagAndMappingsFromSourceControlFile = readTagAndMappingsFromSourceControlFile;
exports.readFoldersFromSourceControlFile = readFoldersFromSourceControlFile;
exports.sourceControlFoldersExistCheck = sourceControlFoldersExistCheck;
exports.isSourceControlLicensed = isSourceControlLicensed;
exports.generateSshKeyPair = generateSshKeyPair;
exports.getRepoType = getRepoType;
exports.getTrackingInformationFromPullResult = getTrackingInformationFromPullResult;
exports.getTrackingInformationFromPrePushResult = getTrackingInformationFromPrePushResult;
exports.getTrackingInformationFromPostPushResult = getTrackingInformationFromPostPushResult;
exports.normalizeAndValidateSourceControlledFilePath = normalizeAndValidateSourceControlledFilePath;
exports.isWorkflowModified = isWorkflowModified;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const crypto_1 = require('crypto');
const fs_1 = require('fs');
const n8n_workflow_1 = require('n8n-workflow');
const strict_1 = require('node:assert/strict');
const promises_1 = require('node:fs/promises');
const path_1 = __importDefault(require('path'));
const license_1 = require('@/license');
const constants_1 = require('./constants');
function stringContainsExpression(testString) {
	return /^=.*\{\{.*\}\}/.test(testString);
}
function getWorkflowExportPath(workflowId, workflowExportFolder) {
	return (0, backend_common_1.safeJoinPath)(workflowExportFolder, `${workflowId}.json`);
}
function getCredentialExportPath(credentialId, credentialExportFolder) {
	return (0, backend_common_1.safeJoinPath)(credentialExportFolder, `${credentialId}.json`);
}
function getVariablesPath(gitFolder) {
	return (0, backend_common_1.safeJoinPath)(
		gitFolder,
		constants_1.SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
	);
}
function getTagsPath(gitFolder) {
	return (0, backend_common_1.safeJoinPath)(gitFolder, constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE);
}
function getFoldersPath(gitFolder) {
	return (0, backend_common_1.safeJoinPath)(
		gitFolder,
		constants_1.SOURCE_CONTROL_FOLDERS_EXPORT_FILE,
	);
}
async function readTagAndMappingsFromSourceControlFile(file) {
	try {
		return (0, n8n_workflow_1.jsonParse)(
			await (0, promises_1.readFile)(file, { encoding: 'utf8' }),
			{ fallbackValue: { tags: [], mappings: [] } },
		);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return { tags: [], mappings: [] };
		}
		throw error;
	}
}
async function readFoldersFromSourceControlFile(file) {
	try {
		return (0, n8n_workflow_1.jsonParse)(
			await (0, promises_1.readFile)(file, { encoding: 'utf8' }),
			{
				fallbackValue: { folders: [] },
			},
		);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return { folders: [] };
		}
		throw error;
	}
}
function sourceControlFoldersExistCheck(folders, createIfNotExists = true) {
	let existed = true;
	folders.forEach((folder) => {
		try {
			(0, fs_1.accessSync)(folder, fs_1.constants.F_OK);
		} catch {
			existed = false;
			if (createIfNotExists) {
				try {
					(0, fs_1.mkdirSync)(folder, { recursive: true });
				} catch (error) {
					di_1.Container.get(backend_common_1.Logger).error(error.message);
				}
			}
		}
	});
	return existed;
}
function isSourceControlLicensed() {
	const license = di_1.Container.get(license_1.License);
	return license.isSourceControlLicensed();
}
async function generateSshKeyPair(keyType) {
	const sshpk = await Promise.resolve().then(() => __importStar(require('sshpk')));
	const keyPair = {
		publicKey: '',
		privateKey: '',
	};
	let generatedKeyPair;
	switch (keyType) {
		case 'ed25519':
			generatedKeyPair = (0, crypto_1.generateKeyPairSync)('ed25519', {
				privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
				publicKeyEncoding: { format: 'pem', type: 'spki' },
			});
			break;
		case 'rsa':
			generatedKeyPair = (0, crypto_1.generateKeyPairSync)('rsa', {
				modulusLength: 4096,
				publicKeyEncoding: {
					type: 'spki',
					format: 'pem',
				},
				privateKeyEncoding: {
					type: 'pkcs8',
					format: 'pem',
				},
			});
			break;
	}
	const keyPublic = sshpk.parseKey(generatedKeyPair.publicKey, 'pem');
	keyPublic.comment = constants_1.SOURCE_CONTROL_GIT_KEY_COMMENT;
	keyPair.publicKey = keyPublic.toString('ssh');
	const keyPrivate = sshpk.parsePrivateKey(generatedKeyPair.privateKey, 'pem');
	keyPrivate.comment = constants_1.SOURCE_CONTROL_GIT_KEY_COMMENT;
	keyPair.privateKey = keyPrivate.toString('ssh-private');
	return {
		privateKey: keyPair.privateKey,
		publicKey: keyPair.publicKey,
	};
}
function getRepoType(repoUrl) {
	if (repoUrl.includes('github.com')) {
		return 'github';
	} else if (repoUrl.includes('gitlab.com')) {
		return 'gitlab';
	}
	return 'other';
}
function filterSourceControlledFilesUniqueIds(files) {
	return (
		files.filter((file, index, self) => {
			return self.findIndex((f) => f.id === file.id) === index;
		}) || []
	);
}
function getTrackingInformationFromPullResult(userId, result) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		userId,
		credConflicts: uniques.filter(
			(file) =>
				file.type === 'credential' && file.status === 'modified' && file.location === 'local',
		).length,
		workflowConflicts: uniques.filter(
			(file) => file.type === 'workflow' && file.status === 'modified' && file.location === 'local',
		).length,
		workflowUpdates: uniques.filter((file) => file.type === 'workflow').length,
	};
}
function getTrackingInformationFromPrePushResult(userId, result) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		userId,
		workflowsEligible: uniques.filter((file) => file.type === 'workflow').length,
		workflowsEligibleWithConflicts: uniques.filter(
			(file) => file.type === 'workflow' && file.conflict,
		).length,
		credsEligible: uniques.filter((file) => file.type === 'credential').length,
		credsEligibleWithConflicts: uniques.filter(
			(file) => file.type === 'credential' && file.conflict,
		).length,
		variablesEligible: uniques.filter((file) => file.type === 'variables').length,
	};
}
function getTrackingInformationFromPostPushResult(userId, result) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		userId,
		workflowsPushed: uniques.filter((file) => file.pushed && file.type === 'workflow').length ?? 0,
		workflowsEligible: uniques.filter((file) => file.type === 'workflow').length ?? 0,
		credsPushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('credential_stubs')).length ?? 0,
		variablesPushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('variable_stubs')).length ?? 0,
	};
}
function normalizeAndValidateSourceControlledFilePath(gitFolderPath, filePath) {
	(0, strict_1.ok)(path_1.default.isAbsolute(gitFolderPath), 'gitFolder must be an absolute path');
	const normalizedPath = path_1.default.isAbsolute(filePath)
		? filePath
		: (0, backend_common_1.safeJoinPath)(gitFolderPath, filePath);
	if (!(0, backend_common_1.isContainedWithin)(gitFolderPath, filePath)) {
		throw new n8n_workflow_1.UserError(`File path ${filePath} is invalid`);
	}
	return normalizedPath;
}
function isWorkflowModified(local, remote) {
	return (
		remote.versionId !== local.versionId ||
		(remote.parentFolderId !== undefined && remote.parentFolderId !== local.parentFolderId)
	);
}
//# sourceMappingURL=source-control-helper.ee.js.map
