import Bowser from 'bowser';

/**
 * Suggest a sensible default label for a freshly-registered passkey based on
 * the current device. Returns `''` for security keys (the user is more likely
 * to want a specific, inventory-style name like "YubiKey 5C (primary)") and
 * for unknown platforms. The result is purely a UX hint — users can edit it
 * freely before registration.
 */
export function suggestCredentialLabel(
	userAgent: string,
	method: 'passkey' | 'security_key',
): string {
	if (method !== 'passkey') return '';

	const { os } = Bowser.parse(userAgent);
	switch (os.name) {
		case 'iOS':
			return 'iPhone';
		case 'iPadOS':
			return 'iPad';
		case 'macOS':
			return 'Mac';
		case 'Android':
			return 'Android device';
		case 'Windows':
			return 'Windows PC';
		case 'Linux':
		case 'Chrome OS':
			return `${os.name} PC`;
		default:
			return '';
	}
}
