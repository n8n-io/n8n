import Container from 'typedi';
import { License } from '../../License';
import { generateKeyPairSync } from 'crypto';

export function isVersionControlEnabled() {
	const license = Container.get(License);
	return license.isVersionControlLicensed();
}

export async function generateSshKeyPair() {
	const keyPair = generateKeyPairSync('ed25519', {
		privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
		publicKeyEncoding: { format: 'pem', type: 'spki' },
	});

	console.log(keyPair.privateKey);
	console.log(keyPair.publicKey);
}
