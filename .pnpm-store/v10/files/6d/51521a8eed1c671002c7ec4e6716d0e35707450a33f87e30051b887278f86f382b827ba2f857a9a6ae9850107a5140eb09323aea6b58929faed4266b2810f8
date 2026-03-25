const code = {};

code.RUNNING = 'RUNNING';
code.ABORTING = 'ABORTING';
code.SUCCESS = 'SUCCESS';
code.FAILED_WITH_ERROR = 'FAILED_WITH_ERROR';
code.ABORTED = 'ABORTED';
code.QUEUED = 'QUEUED';
code.FAILED_WITH_INCIDENT = 'FAILED_WITH_INCIDENT';
code.DISCONNECTED = 'DISCONNECTED';
code.RESUMING_WAREHOUSE = 'RESUMING_WAREHOUSE';
// purposeful typo.Is present in QueryDTO.java
code.QUEUED_REPARING_WAREHOUSE = 'QUEUED_REPARING_WAREHOUSE';
code.RESTARTED = 'RESTARTED';
code.BLOCKED = 'BLOCKED';
code.NO_DATA = 'NO_DATA';
code.NO_QUERY_DATA = 'NO_QUERY_DATA';

// All running query statuses
const runningStatuses =
  [
    code.RUNNING,
    code.RESUMING_WAREHOUSE,
    code.QUEUED,
    code.QUEUED_REPARING_WAREHOUSE,
    code.NO_DATA,
  ];

// All error query statuses
const errorStatuses =
  [
    code.ABORTING,
    code.FAILED_WITH_ERROR,
    code.ABORTED,
    code.FAILED_WITH_INCIDENT,
    code.DISCONNECTED,
    code.BLOCKED,
  ];

exports.code = code;
exports.runningStatuses = runningStatuses;
exports.errorStatuses = errorStatuses;
