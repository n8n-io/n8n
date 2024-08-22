import { Container } from 'typedi';
import { License } from '@/license';
import { generateKeyPairSync } from 'crypto';
import type { KeyPair } from './types/keyPair';
import { constants as fsConstants, mkdirSync, accessSync } from 'fs';
import {
	SOURCE_CONTROL_GIT_KEY_COMMENT,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
} from './constants';
import type { SourceControlledFile } from './types/sourceControlledFile';
import path from 'path';
import type { KeyPairType } from './types/keyPairType';
import { Logger } from '@/logger';

export function stringContainsExpression(testString: string): boolean {
	return /^=.*\{\{.*\}\}/.test(testString);
}

export function getWorkflowExportPath(workflowId: string, workflowExportFolder: string): string {
	return path.join(workflowExportFolder, `${workflowId}.json`);
}

export function getCredentialExportPath(
	credentialId: string,
	credentialExportFolder: string,
): string {
	return path.join(credentialExportFolder, `${credentialId}.json`);
}

export function getVariablesPath(gitFolder: string): string {
	return path.join(gitFolder, SOURCE_CONTROL_VARIABLES_EXPORT_FILE);
}

export function getTagsPath(gitFolder: string): string {
	return path.join(gitFolder, SOURCE_CONTROL_TAGS_EXPORT_FILE);
}

export function sourceControlFoldersExistCheck(
	folders: string[],
	createIfNotExists = true,
): boolean {
	// running these file access function synchronously to avoid race conditions
	let existed = true;
	folders.forEach((folder) => {
		try {
			accessSync(folder, fsConstants.F_OK);
		} catch {
			existed = false;
			if (createIfNotExists) {
				try {
					mkdirSync(folder, { recursive: true });
				} catch (error) {
					Container.get(Logger).error((error as Error).message);
				}
			}
		}
	});
	return existed;
}

export function isSourceControlLicensed() {
	const license = Container.get(License);
	return license.isSourceControlLicensed();
}

export async function generateSshKeyPair(keyType: KeyPairType) {
	const sshpk = await import('sshpk');
	const keyPair: KeyPair = {
		publicKey: '',
		privateKey: '',
	};
	let generatedKeyPair: KeyPair;
	switch (keyType) {
		case 'ed25519':
			generatedKeyPair = generateKeyPairSync('ed25519', {
				privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
				publicKeyEncoding: { format: 'pem', type: 'spki' },
			});
			break;
		case 'rsa':
			generatedKeyPair = generateKeyPairSync('rsa', {
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
	keyPublic.comment = SOURCE_CONTROL_GIT_KEY_COMMENT;
	keyPair.publicKey = keyPublic.toString('ssh');
	const keyPrivate = sshpk.parsePrivateKey(generatedKeyPair.privateKey, 'pem');
	keyPrivate.comment = SOURCE_CONTROL_GIT_KEY_COMMENT;
	keyPair.privateKey = keyPrivate.toString('ssh-private');
	return {
		privateKey: keyPair.privateKey,
		publicKey: keyPair.publicKey,
	};
}

export function getRepoType(repoUrl: string): 'github' | 'gitlab' | 'other' {
	if (repoUrl.includes('github.com')) {
		return 'github';
	} else if (repoUrl.includes('gitlab.com')) {
		return 'gitlab';
	}
	return 'other';
}

function filterSourceControlledFilesUniqueIds(files: SourceControlledFile[]) {
	return (
		files.filter((file, index, self) => {
			return self.findIndex((f) => f.id === file.id) === index;
		}) || []
	);
}

export function getTrackingInformationFromPullResult(result: SourceControlledFile[]) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
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

export function getTrackingInformationFromPrePushResult(result: SourceControlledFile[]) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
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

export function getTrackingInformationFromPostPushResult(result: SourceControlledFile[]) {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		workflowsPushed: uniques.filter((file) => file.pushed && file.type === 'workflow').length ?? 0,
		workflowsEligible: uniques.filter((file) => file.type === 'workflow').length ?? 0,
		credsPushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('credential_stubs')).length ?? 0,
		variablesPushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('variable_stubs')).length ?? 0,
	};
}
