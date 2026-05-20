import { isPlatformCredential } from '../webauthn.service';

describe('isPlatformCredential', () => {
	it('classifies a credential with internal-only transports as a passkey', () => {
		expect(isPlatformCredential({ transports: ['internal'], deviceType: 'singleDevice' })).toBe(
			true,
		);
	});

	it('classifies a hybrid+internal credential as a passkey', () => {
		// Real-world: cross-device passkey signed in via QR ("hybrid") then bound to
		// the local device — reports `internal` alongside `hybrid`.
		expect(
			isPlatformCredential({ transports: ['hybrid', 'internal'], deviceType: 'multiDevice' }),
		).toBe(true);
	});

	it('classifies a multi-device credential as a passkey even without internal transport', () => {
		// Password-manager passkeys (1Password, iCloud Keychain) sometimes report no
		// transport at all but always set `multiDevice`.
		expect(isPlatformCredential({ transports: [], deviceType: 'multiDevice' })).toBe(true);
	});

	it('classifies a USB-only security key as not a passkey', () => {
		expect(isPlatformCredential({ transports: ['usb'], deviceType: 'singleDevice' })).toBe(false);
	});

	it('classifies an NFC security key as not a passkey', () => {
		expect(isPlatformCredential({ transports: ['nfc'], deviceType: 'singleDevice' })).toBe(false);
	});

	it('classifies a credential with no transports and no deviceType as not a passkey', () => {
		expect(isPlatformCredential({})).toBe(false);
	});

	it('handles null transports the same as missing transports', () => {
		expect(isPlatformCredential({ transports: null, deviceType: 'singleDevice' })).toBe(false);
	});

	it('handles null deviceType the same as missing deviceType', () => {
		expect(isPlatformCredential({ transports: ['internal'], deviceType: null })).toBe(true);
	});
});
