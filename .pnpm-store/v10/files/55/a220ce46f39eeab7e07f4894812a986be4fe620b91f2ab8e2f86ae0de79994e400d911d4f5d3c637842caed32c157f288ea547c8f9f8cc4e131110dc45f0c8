import { dsnToString, createEnvelope } from '@sentry/core';

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
    ...(!!tunnel && !!dsn && { dsn: dsnToString(dsn) }),
  };
  const item = createUserFeedbackEnvelopeItem(feedback);

  return createEnvelope(headers, [item]);
}

function createUserFeedbackEnvelopeItem(feedback) {
  const feedbackHeaders = {
    type: 'user_report',
  };
  return [feedbackHeaders, feedback];
}

export { createUserFeedbackEnvelope };
//# sourceMappingURL=userfeedback.js.map
