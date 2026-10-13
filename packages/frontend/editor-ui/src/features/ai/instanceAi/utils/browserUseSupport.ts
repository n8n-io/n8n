import Bowser from 'bowser';

/**
 * Browser extensions don't exist on phones and tablets
 */
export function isBrowserUseSupportedOnDevice(): boolean {
	const { platform } = Bowser.parse(navigator.userAgent);
	// iPadOS in desktop mode sends a Mac user agent; real Macs have no touch points
	const isIpadInDesktopMode = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
	return platform.type !== 'mobile' && platform.type !== 'tablet' && !isIpadInDesktopMode;
}

/**
 * Browser Use only supports Chromium through n8n Browser Use Chrome extension
 */
export function isBrowserUseSupportedForBrowser(): boolean {
	return Bowser.parse(navigator.userAgent).engine.name === 'Blink';
}
