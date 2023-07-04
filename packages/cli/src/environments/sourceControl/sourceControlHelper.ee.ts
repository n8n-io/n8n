import Container from 'typedi';
import { License } from '../../License';
import { generateKeyPairSync } from 'crypto';
import sshpk from 'sshpk';
import type { KeyPair } from './types/keyPair';
import { constants as fsConstants, mkdirSync, accessSync } from 'fs';
import { LoggerProxy } from 'n8n-workflow';
import { SOURCE_CONTROL_GIT_KEY_COMMENT } from './constants';
import type { SourceControlledFile } from './types/sourceControlledFile';
import type { ImportResult } from './types/importResult';

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

export function generateSshKeyPair(keyType: 'ed25519' | 'rsa' = 'ed25519') {
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

export function getTrackingInformationFromSourceControlledFiles(result: SourceControlledFile[]) {
	return {
		cred_conflicts: result.filter((file) => file.type === 'credential' && file.conflict).length,
		workflow_conflicts: result.filter((file) => file.type === 'workflow' && file.conflict).length,
		workflow_updates: result.filter(
			(file) => file.type === 'workflow' && file.status === 'modified',
		).length,
	};
}

export function getTrackingInformationFromImportResult(result: ImportResult): {
	workflow_updates: number;
} {
	return {
		workflow_updates: result.workflows.filter((wf) => wf.name !== 'skipped').length,
	};
}

export function getTrackingInformationFromPrePushResult(result: SourceControlledFile[]): {
	workflows_eligible: number;
	workflows_eligible_with_conflicts: number;
	creds_eligible: number;
	creds_eligible_with_conflicts: number;
	variables_eligible: number;
} {
	return {
		workflows_eligible: result.filter((file) => file.type === 'workflow').length,
		workflows_eligible_with_conflicts: result.filter(
			(file) => file.type === 'workflow' && file.conflict,
		).length,
		creds_eligible: result.filter((file) => file.type === 'credential').length,
		creds_eligible_with_conflicts: result.filter(
			(file) => file.type === 'credential' && file.conflict,
		).length,
		variables_eligible: result.filter((file) => file.type === 'variables').length,
	};
}

export function getTrackingInformationFromPostPushResult(
	result: SourceControlledFile[] | undefined,
): {
	workflows_eligible: number;
	workflows_pushed: number;
	creds_pushed: number;
	variables_pushed: number;
} {
	return {
		workflows_pushed:
			result?.filter((file) => file.pushed && file.type === 'workflow' && file.pushed).length ?? 0,
		workflows_eligible: result?.filter((file) => file.type === 'workflow').length ?? 0,
		creds_pushed:
			result?.filter((file) => file.pushed && file.file.startsWith('credential_stubs')).length ?? 0,
		variables_pushed:
			result?.filter((file) => file.pushed && file.file.startsWith('variable_stubs')).length ?? 0,
	};
}
