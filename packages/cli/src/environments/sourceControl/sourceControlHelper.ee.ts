import Container from 'typedi';
import { License } from '../../License';
import { generateKeyPairSync } from 'crypto';
import type { KeyPair } from './types/keyPair';
import { constants as fsConstants, mkdirSync, accessSync } from 'fs';
import { LoggerProxy } from 'n8n-workflow';
import { SOURCE_CONTROL_GIT_KEY_COMMENT } from './constants';
import type { SourceControlledFile } from './types/sourceControlledFile';

export function sourceControlFoldersExistCheck(folders: string[]) {
	// running these file access function synchronously to avoid race conditions
	folders.forEach((folder) => {
		try {
			accessSync(folder, fsConstants.F_OK);
		} catch {
			try {
				mkdirSync(folder);
			} catch (error) {
				LoggerProxy.error((error as Error).message);
			}
		}
	});
}

export function isSourceControlLicensed() {
	const license = Container.get(License);
	return license.isSourceControlLicensed();
}

export async function generateSshKeyPair(keyType: 'ed25519' | 'rsa' = 'ed25519') {
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
		cred_conflicts: uniques.filter(
			(file) =>
				file.type === 'credential' && file.status === 'modified' && file.location === 'local',
		).length,
		workflow_conflicts: uniques.filter(
			(file) => file.type === 'workflow' && file.status === 'modified' && file.location === 'local',
		).length,
		workflow_updates: uniques.filter((file) => file.type === 'workflow').length,
	};
}

export function getTrackingInformationFromPrePushResult(result: SourceControlledFile[]): {
	workflows_eligible: number;
	workflows_eligible_with_conflicts: number;
	creds_eligible: number;
	creds_eligible_with_conflicts: number;
	variables_eligible: number;
} {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		workflows_eligible: uniques.filter((file) => file.type === 'workflow').length,
		workflows_eligible_with_conflicts: uniques.filter(
			(file) => file.type === 'workflow' && file.conflict,
		).length,
		creds_eligible: uniques.filter((file) => file.type === 'credential').length,
		creds_eligible_with_conflicts: uniques.filter(
			(file) => file.type === 'credential' && file.conflict,
		).length,
		variables_eligible: uniques.filter((file) => file.type === 'variables').length,
	};
}

export function getTrackingInformationFromPostPushResult(result: SourceControlledFile[]): {
	workflows_eligible: number;
	workflows_pushed: number;
	creds_pushed: number;
	variables_pushed: number;
} {
	const uniques = filterSourceControlledFilesUniqueIds(result);
	return {
		workflows_pushed:
			uniques.filter((file) => file.pushed && file.type === 'workflow' && file.pushed).length ?? 0,
		workflows_eligible: uniques.filter((file) => file.type === 'workflow').length ?? 0,
		creds_pushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('credential_stubs')).length ?? 0,
		variables_pushed:
			uniques.filter((file) => file.pushed && file.file.startsWith('variable_stubs')).length ?? 0,
	};
}
