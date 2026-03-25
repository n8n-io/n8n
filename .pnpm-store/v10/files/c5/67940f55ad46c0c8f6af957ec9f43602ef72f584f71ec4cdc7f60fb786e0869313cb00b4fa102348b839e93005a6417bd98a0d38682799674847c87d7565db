Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * Creates an envelope from a user feedback.
 */
function createUserFeedbackEnvelope(
  feedback,
  {
    metadata,
    tunnel,
    dsn,
  }

,
) {
  const headers = {
    event_id: feedback.event_id,
    sent_at: new Date().toISOString(),
    ...(metadata?.sdk && {
      sdk: {
        name: metadata.sdk.name,
        version: metadata.sdk.version,
      },
    }),
    ...(!!tunnel && !!dsn && { dsn: core.dsnToString(dsn) }),
  };
  const item = createUserFeedbackEnvelopeItem(feedback);

  return core.createEnvelope(headers, [item]);
}

function createUserFeedbackEnvelopeItem(feedback) {
  const feedbackHeaders = {
    type: 'user_report',
  };
  return [feedbackHeaders, feedback];
}

exports.createUserFeedbackEnvelope = createUserFeedbackEnvelope;
//# sourceMappingURL=userfeedback.js.map
