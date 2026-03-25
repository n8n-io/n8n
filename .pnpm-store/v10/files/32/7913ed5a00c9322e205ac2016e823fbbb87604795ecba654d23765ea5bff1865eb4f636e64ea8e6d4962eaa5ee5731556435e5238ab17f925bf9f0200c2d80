Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const feedback = require('@sentry-internal/feedback');
const lazyLoadIntegration = require('./utils/lazyLoadIntegration.js');

/**
 * An integration to add user feedback to your application,
 * while loading most of the code lazily only when it's needed.
 */
const feedbackAsyncIntegration = feedback.buildFeedbackIntegration({
  lazyLoadIntegration: lazyLoadIntegration.lazyLoadIntegration,
});

exports.feedbackAsyncIntegration = feedbackAsyncIntegration;
//# sourceMappingURL=feedbackAsync.js.map
