import Bowser from 'bowser';

/**
 * Browser extensions don't exist on phones and tablets
 */
export function isBrowserUseSupportedOnDevice(): boolean {
	const { platform } = Bowser.parse(navigator.userAgent);
	return platform.type !== 'mobile' && platform.type !== 'tablet';
}

/**
 * Browser Use only supports Chromium through n8n Browser Use Chrome extension
 */
export function isBrowserUseSupportedForBrowser(): boolean {
	return Bowser.parse(navigator.userAgent).engine.name === 'Blink';
}
