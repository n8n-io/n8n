import { Container } from 'typedi';
import { generateKeyPairSync } from 'crypto';
import sshpk from 'sshpk';
import { constants as fsConstants, mkdirSync, accessSync } from 'fs';
import { LoggerProxy } from 'n8n-workflow';
import { License } from '@/License';
import type { KeyPair } from './types/keyPair';
import { SOURCE_CONTROL_GIT_KEY_COMMENT } from './constants';

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
