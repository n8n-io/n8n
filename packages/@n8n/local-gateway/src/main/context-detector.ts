import {
	captureScreenshotAttachment,
	detectActiveContext,
	type DetectedContext,
	type ScreenshotAttachment,
} from '@n8n/computer-use/context';
import { logger } from '@n8n/computer-use/logger';
import { app } from 'electron';
import { EventEmitter } from 'node:events';

/**
 * Tracks "what the user is looking at" for the composer's context pill.
 *
 * Detection runs locally and in-process — it calls the same `@n8n/computer-use`
 * functions the orchestrator reaches as an MCP tool, but without the cloud
 * round-trip. The key timing detail: the moment our frameless window shows it
 * becomes the frontmost app, so `refresh()` must be called *before* the window
 * is shown (from the tray toggle), while the user's previous app is still in
 * front. As a safety net we also ignore any reading that resolves to our own
 * app, keeping the last genuine external context instead.
 */
export class ContextDetector extends EventEmitter {
	/** Bundle ids that are *us*: the packaged appId, and Electron's default in dev. */
	private static readonly SELF_BUNDLE_IDS = new Set(['io.n8n.gateway', 'com.github.Electron']);

	private current: DetectedContext = { kind: 'other' };

	/** The last detected external context. */
	getCurrent(): DetectedContext {
		return this.current;
	}

	/**
	 * Re-detect the frontmost context. Call this from the tray toggle *before*
	 * showing the window. Emits `contextChanged` with the new value (unless the
	 * reading is our own window, which is ignored).
	 */
	async refresh(): Promise<DetectedContext> {
		const detected = await detectActiveContext();
		if (this.isSelf(detected)) {
			logger.debug('Context detection skipped (own window frontmost)');
			return this.current;
		}
		this.current = detected;
		logger.debug('Active context detected', { kind: detected.kind, app: detected.app });
		this.emit('contextChanged', detected);
		return detected;
	}

	/** Capture the current screen as an attachment for the task request. */
	async captureScreenshot(): Promise<ScreenshotAttachment> {
		return await captureScreenshotAttachment();
	}

	/**
	 * True when the detected frontmost app is this Electron app itself. Matches on
	 * bundle id (reliable across dev and packaged) with a name fallback —
	 * `app.getName()` can be "Electron" in dev while get-windows reports the
	 * display name "n8n Assistant", so name alone isn't enough.
	 */
	private isSelf(detected: DetectedContext): boolean {
		if (detected.bundleId && ContextDetector.SELF_BUNDLE_IDS.has(detected.bundleId)) return true;
		const ownName = app.getName().toLowerCase();
		return !!detected.app && detected.app.toLowerCase() === ownName;
	}
}
