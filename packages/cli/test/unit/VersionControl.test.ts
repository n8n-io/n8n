import { generateSshKeyPair } from '../../src/environments/sourceControl/sourceControlHelper.ee';

describe('Source Control', () => {
	it('should generate an SSH key pair', () => {
		const keyPair = generateSshKeyPair();
		expect(keyPair.privateKey).toBeTruthy();
		expect(keyPair.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
		expect(keyPair.publicKey).toBeTruthy();
		expect(keyPair.publicKey).toContain('ssh-ed25519');
	});
});
