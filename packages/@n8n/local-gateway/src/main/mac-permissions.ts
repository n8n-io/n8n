import { logger } from '@n8n/computer-use/logger';
import { desktopCapturer, shell, systemPreferences } from 'electron';

import type { MacPermissionKind, MacPermissionStatus } from '../shared/types';

/** Deep links to the exact System Settings → Privacy & Security panes. */
const SETTINGS_PANE_URLS: Record<MacPermissionKind, string> = {
	accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
	screenRecording: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
};

/**
 * Read the current grant state of the macOS permissions the context layer uses.
 * Never prompts (pass `false` to the Accessibility check). Off macOS it reports
 * `supported: false` so the UI can hide the whole section.
 *
 * Caveat: this reflects the *host app's* (Electron's) TCC state. In a packaged
 * build the get-windows helper binary runs under the app bundle's responsibility
 * so this is accurate; in dev (Electron launched from a terminal) it's
 * indicative rather than authoritative.
 */
export function getMacPermissionStatus(): MacPermissionStatus {
	if (process.platform !== 'darwin') {
		return { supported: false, accessibility: 'unknown', screenRecording: 'unknown' };
	}
	let accessibility: MacPermissionStatus['accessibility'] = 'unknown';
	let screenRecording: MacPermissionStatus['screenRecording'] = 'unknown';
	try {
		accessibility = systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'denied';
	} catch (error) {
		logger.debug('Accessibility status check failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
	try {
		const status = systemPreferences.getMediaAccessStatus('screen');
		screenRecording =
			status === 'granted' ? 'granted' : status === 'not-determined' ? 'unknown' : 'denied';
	} catch (error) {
		logger.debug('Screen Recording status check failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return { supported: true, accessibility, screenRecording };
}

/**
 * Open the System Settings pane for a permission so the user can grant it. For
 * Accessibility we also call the trusted-client check with `prompt: true`, which
 * adds the app to the list (otherwise it may not appear until first use).
 */
export async function openMacPermissionSettings(kind: MacPermissionKind): Promise<void> {
	if (process.platform !== 'darwin') return;
	if (kind === 'accessibility') {
		try {
			systemPreferences.isTrustedAccessibilityClient(true);
		} catch {
			// Best-effort: the deep link below still takes the user to the pane.
		}
	}
	await shell.openExternal(SETTINGS_PANE_URLS[kind]);
}

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
