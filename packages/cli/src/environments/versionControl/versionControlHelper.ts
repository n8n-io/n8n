import Container from 'typedi';
import { License } from '../../License';
import { generateKeyPairSync } from 'crypto';
import sshpk from 'sshpk';
import type { KeyPair } from './types/keyPair';

export function isVersionControlLicensed() {
	const license = Container.get(License);
	return license.isVersionControlLicensed();
}

export function isVersionControlEnabled() {
	// TODO: VERSION CONTROL check if enabled
	return true;
}

export function isVersionControlLicensedAndEnabled() {
	return isVersionControlLicensed() && isVersionControlEnabled();
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
	keyPair.publicKey = keyPublic.toString('ssh');
	const keyPrivate = sshpk.parsePrivateKey(generatedKeyPair.privateKey, 'pem');
	keyPair.privateKey = keyPrivate.toString('ssh-private');
	return {
		privateKey: keyPair.privateKey,
		publicKey: keyPair.publicKey,
	};
}
