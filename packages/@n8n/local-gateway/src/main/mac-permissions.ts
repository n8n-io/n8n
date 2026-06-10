import { logger } from '@n8n/computer-use/logger';
import { desktopCapturer, systemPreferences } from 'electron';

/**
 * Ask for the macOS permissions the context layer needs, upfront.
 *
 * Context detection reads the frontmost window (Accessibility) and can attach a
 * screenshot (Screen Recording). macOS only surfaces these prompts when an app
 * first reaches for the capability, so we provoke them once at sign-in rather
 * than mid-task. No-op off macOS; never throws — a denied permission just means
 * detection degrades to a coarser context later.
 */
export async function requestMacPermissions(): Promise<void> {
	if (process.platform !== 'darwin') return;

	try {
		// Prompts (and returns the trust state) for Accessibility — needed for the
		// frontmost app / window title and browser URL.
		const trusted = systemPreferences.isTrustedAccessibilityClient(true);
		logger.info('Accessibility permission', { trusted });
	} catch (error) {
		logger.debug('Accessibility permission request failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	try {
		const screenStatus = systemPreferences.getMediaAccessStatus('screen');
		logger.info('Screen Recording permission', { status: screenStatus });
		if (screenStatus !== 'granted') {
			// There's no direct "request screen recording" API; touching the screen
			// capturer is what makes macOS show its prompt. Smallest possible probe.
			await desktopCapturer.getSources({
				types: ['screen'],
				thumbnailSize: { width: 1, height: 1 },
			});
		}
	} catch (error) {
		logger.debug('Screen Recording permission probe failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
