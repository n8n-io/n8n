import {
	captureFullScreenJpegBase64,
	captureWindowJpegBase64,
	type WindowCaptureTarget,
} from '../screenshot/screenshot';

export type { WindowCaptureTarget };

/** A screenshot shaped for the desktop-assistant `attachments` channel. */
export interface ScreenshotAttachment {
	/** Base64-encoded JPEG. */
	data: string;
	mimeType: 'image/jpeg';
	fileName: string;
}

/** Filesystem-safe-ish base name for the attachment, derived from the app. */
function fileNameFor(target?: WindowCaptureTarget): string {
	const app = target?.app
		?.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return app ? `${app}.jpg` : 'screen.jpg';
}

/**
 * Capture a screenshot as an attachment-shaped object the desktop picker can
 * drop straight into a task request's `context.attachments`.
 *
 * When a `target` window is given, capture *just that window* — its backing
 * store, so the assistant window in front of it is never included. Falls back
 * to a full-screen grab when there's no target or the window can't be captured.
 */
export async function captureScreenshotAttachment(
	target?: WindowCaptureTarget,
): Promise<ScreenshotAttachment> {
	let data: string | undefined;
	if (target && (target.windowId || target.app)) {
		data = await captureWindowJpegBase64(target).catch(() => undefined);
	}
	data ??= await captureFullScreenJpegBase64();
	return { data, mimeType: 'image/jpeg', fileName: fileNameFor(target) };
}
