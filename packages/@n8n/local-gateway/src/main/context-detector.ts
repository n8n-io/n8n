import {
	captureScreenshotAttachment,
	detectOpenContexts,
	type DetectedContext,
	type ScreenshotAttachment,
	type WindowCaptureTarget,
} from '@n8n/computer-use/context';
import { logger } from '@n8n/computer-use/logger';
import { app } from 'electron';
import { EventEmitter } from 'node:events';

/**
 * Tracks the open windows the user can pick as context for the composer pill.
 *
 * Detection runs locally and in-process — it calls the same `@n8n/computer-use`
 * functions the orchestrator reaches as an MCP tool, but without the cloud
 * round-trip. The key timing detail: the moment our frameless window shows it
 * becomes the frontmost app, so `refresh()` must be awaited *before* the window
 * is shown (from the tray toggle), while the user's other windows are still up.
 * Our own window is filtered out of the list so it's never offered as context.
 */
export class ContextDetector extends EventEmitter {
	/** Bundle ids that are *us*: the packaged appId, and Electron's default in dev. */
	private static readonly SELF_BUNDLE_IDS = new Set(['io.n8n.gateway', 'com.github.Electron']);

	/**
	 * Background / menu-bar / system utilities that aren't meaningful "things the
	 * user is looking at" — they pollute the picker (often by injecting a status
	 * window at the top). Matched by bundle id, with a lowercased-name fallback
	 * for apps whose id we can't rely on.
	 */
	private static readonly EXCLUDED_BUNDLE_IDS = new Set([
		'com.apple.notificationcenterui', // Notification Center ("Mitteilungszentrale")
		'com.apple.controlcenter',
		'com.apple.systemuiserver',
		'com.apple.dock',
		'com.apple.Spotlight',
		'com.apple.WindowManager',
	]);
	private static readonly EXCLUDED_APP_NAMES = new Set([
		'wispr flow',
		'notification center',
		'mitteilungszentrale',
		'control center',
		'spotlight',
	]);

	/** Open windows the user can choose from, front-to-back (first = frontmost). */
	private options: DetectedContext[] = [];

	/** The current pickable context options. */
	getOptions(): DetectedContext[] {
		return this.options;
	}

	/**
	 * Re-detect the open windows. Call this from the tray toggle *before* showing
	 * the window. Filters out our own window and emits `contextChanged` with the
	 * resulting list.
	 */
	async refresh(): Promise<DetectedContext[]> {
		const detected = await detectOpenContexts();
		this.options = detected.filter((context) => !this.isSelf(context) && !this.isExcluded(context));
		logger.debug('Context options detected', {
			count: this.options.length,
			apps: this.options.map((context) => context.app),
		});
		this.emit('contextChanged', this.options);
		return this.options;
	}

	/**
	 * Capture a screenshot attachment for the task request. With a `target` it
	 * grabs just that window (so our own window in front of it isn't captured);
	 * without one it falls back to the full screen.
	 */
	async captureScreenshot(target?: WindowCaptureTarget): Promise<ScreenshotAttachment> {
		return await captureScreenshotAttachment(target);
	}

	/**
	 * True when a detected window belongs to this Electron app itself. Matches on
	 * bundle id (reliable across dev and packaged) with a name fallback —
	 * `app.getName()` can be "Electron" in dev while get-windows reports the
	 * display name "n8n Assistant", so name alone isn't enough.
	 */
	private isSelf(detected: DetectedContext): boolean {
		if (detected.bundleId && ContextDetector.SELF_BUNDLE_IDS.has(detected.bundleId)) return true;
		const ownName = app.getName().toLowerCase();
		return !!detected.app && detected.app.toLowerCase() === ownName;
	}

	/** True for background/menu-bar/system apps that shouldn't be offered as context. */
	private isExcluded(detected: DetectedContext): boolean {
		if (detected.bundleId && ContextDetector.EXCLUDED_BUNDLE_IDS.has(detected.bundleId))
			return true;
		const name = detected.app?.toLowerCase();
		return !!name && ContextDetector.EXCLUDED_APP_NAMES.has(name);
	}
}
