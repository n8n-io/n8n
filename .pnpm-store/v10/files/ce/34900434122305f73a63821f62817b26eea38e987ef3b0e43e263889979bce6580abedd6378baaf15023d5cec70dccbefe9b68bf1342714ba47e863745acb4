import { buildFeedbackIntegration, feedbackScreenshotIntegration, feedbackModalIntegration } from '@sentry-internal/feedback';

/** Add a widget to capture user feedback to your application. */
const feedbackSyncIntegration = buildFeedbackIntegration({
  getModalIntegration: () => feedbackModalIntegration,
  getScreenshotIntegration: () => feedbackScreenshotIntegration,
});

export { feedbackSyncIntegration };
//# sourceMappingURL=feedbackSync.js.map
