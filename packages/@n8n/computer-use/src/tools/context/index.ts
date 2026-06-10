export {
	detectActiveContext,
	detectOpenContexts,
	detectActiveWindow,
	detectFinderFolder,
	detectDocumentPath,
	deriveKind,
} from './detect';
export type { DetectedContext, DetectedContextKind } from './detect';
export { captureScreenshotAttachment } from './capture';
export type { ScreenshotAttachment } from './capture';
export { ContextModule, detectContextTool } from './context-tool';
