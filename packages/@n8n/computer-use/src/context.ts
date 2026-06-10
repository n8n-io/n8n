/**
 * Public entry for local context detection, exported as `@n8n/computer-use/context`.
 *
 * Callers (e.g. the desktop app's main process) import these to detect what the
 * user is looking at directly, in-process — the same functions the orchestrator
 * reaches via the `context_active` MCP tool.
 */
export {
	detectActiveContext,
	detectOpenContexts,
	detectActiveWindow,
	detectFinderFolder,
	detectDocumentPath,
	deriveKind,
	captureScreenshotAttachment,
} from './tools/context';
export type {
	DetectedContext,
	DetectedContextKind,
	ScreenshotAttachment,
	WindowCaptureTarget,
} from './tools/context';
