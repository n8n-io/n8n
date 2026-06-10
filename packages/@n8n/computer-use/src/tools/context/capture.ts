import { captureFullScreenJpegBase64 } from '../screenshot/screenshot';

/** A screenshot shaped for the desktop-assistant `attachments` channel. */
export interface ScreenshotAttachment {
	/** Base64-encoded JPEG. */
	data: string;
	mimeType: 'image/jpeg';
	fileName: string;
}

/**
 * Capture the primary screen as an attachment-shaped object the desktop picker
 * can drop straight into a task request's `context.attachments`. Reuses the
 * exact `screen_screenshot` capture pipeline (downscaled JPEG).
 */
export async function captureScreenshotAttachment(): Promise<ScreenshotAttachment> {
	return {
		data: await captureFullScreenJpegBase64(),
		mimeType: 'image/jpeg',
		fileName: 'screen.jpg',
	};
}
