import { dsnToString } from '../utils/dsn.js';
import { createEnvelope } from '../utils/envelope.js';

/**
 * Creates a log container envelope item for a list of logs.
 *
 * @param items - The logs to include in the envelope.
 * @returns The created log container envelope item.
 */
function createLogContainerEnvelopeItem(items) {
  return [
    {
      type: 'log',
      item_count: items.length,
      content_type: 'application/vnd.sentry.items.log+json',
    },
    {
      items,
    },
  ];
}

/**
 * Creates an envelope for a list of logs.
 *
 * Logs from multiple traces can be included in the same envelope.
 *
 * @param logs - The logs to include in the envelope.
 * @param metadata - The metadata to include in the envelope.
 * @param tunnel - The tunnel to include in the envelope.
 * @param dsn - The DSN to include in the envelope.
 * @returns The created envelope.
 */
function createLogEnvelope(
  logs,
  metadata,
  tunnel,
  dsn,
) {
  const headers = {};

  if (metadata?.sdk) {
    headers.sdk = {
      name: metadata.sdk.name,
      version: metadata.sdk.version,
    };
  }

  if (!!tunnel && !!dsn) {
    headers.dsn = dsnToString(dsn);
  }

  return createEnvelope(headers, [createLogContainerEnvelopeItem(logs)]);
}

export { createLogContainerEnvelopeItem, createLogEnvelope };
//# sourceMappingURL=envelope.js.map
