import { createEnvelope } from './envelope.js';
import { dateTimestampInSeconds } from './time.js';

/**
 * Creates client report envelope
 * @param discarded_events An array of discard events
 * @param dsn A DSN that can be set on the header. Optional.
 */
function createClientReportEnvelope(
  discarded_events,
  dsn,
  timestamp,
) {
  const clientReportItem = [
    { type: 'client_report' },
    {
      timestamp: timestamp || dateTimestampInSeconds(),
      discarded_events,
    },
  ];
  return createEnvelope(dsn ? { dsn } : {}, [clientReportItem]);
}

export { createClientReportEnvelope };
//# sourceMappingURL=clientreport.js.map
