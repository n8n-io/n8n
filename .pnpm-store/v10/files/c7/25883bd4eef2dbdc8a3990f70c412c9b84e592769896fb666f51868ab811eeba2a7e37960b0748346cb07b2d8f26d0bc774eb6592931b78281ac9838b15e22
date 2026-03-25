Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const envelope = require('./envelope.js');
const time = require('./time.js');

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
      timestamp: timestamp || time.dateTimestampInSeconds(),
      discarded_events,
    },
  ];
  return envelope.createEnvelope(dsn ? { dsn } : {}, [clientReportItem]);
}

exports.createClientReportEnvelope = createClientReportEnvelope;
//# sourceMappingURL=clientreport.js.map
