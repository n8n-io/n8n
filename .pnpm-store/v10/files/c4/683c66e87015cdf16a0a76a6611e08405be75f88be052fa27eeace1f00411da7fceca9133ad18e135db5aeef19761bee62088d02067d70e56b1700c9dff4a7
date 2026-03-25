import type { IntegrationFn } from '@sentry/core';
declare const LazyLoadableIntegrations: {
    readonly replayIntegration: "replay";
    readonly replayCanvasIntegration: "replay-canvas";
    readonly feedbackIntegration: "feedback";
    readonly feedbackModalIntegration: "feedback-modal";
    readonly feedbackScreenshotIntegration: "feedback-screenshot";
    readonly captureConsoleIntegration: "captureconsole";
    readonly contextLinesIntegration: "contextlines";
    readonly linkedErrorsIntegration: "linkederrors";
    readonly dedupeIntegration: "dedupe";
    readonly extraErrorDataIntegration: "extraerrordata";
    readonly graphqlClientIntegration: "graphqlclient";
    readonly httpClientIntegration: "httpclient";
    readonly reportingObserverIntegration: "reportingobserver";
    readonly rewriteFramesIntegration: "rewriteframes";
    readonly browserProfilingIntegration: "browserprofiling";
    readonly moduleMetadataIntegration: "modulemetadata";
    readonly instrumentAnthropicAiClient: "instrumentanthropicaiclient";
    readonly instrumentOpenAiClient: "instrumentopenaiclient";
    readonly instrumentGoogleGenAIClient: "instrumentgooglegenaiclient";
    readonly instrumentLangGraph: "instrumentlanggraph";
    readonly createLangChainCallbackHandler: "createlangchaincallbackhandler";
};
/**
 * Lazy load an integration from the CDN.
 * Rejects if the integration cannot be loaded.
 */
export declare function lazyLoadIntegration(name: keyof typeof LazyLoadableIntegrations, scriptNonce?: string): Promise<IntegrationFn>;
export {};
//# sourceMappingURL=lazyLoadIntegration.d.ts.map