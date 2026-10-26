CREATE TABLE IF NOT EXISTS `n8n-telemetry.imported_n8n.qa_merge_queue_events_raw` (
  event_id STRING NOT NULL,
  kind STRING NOT NULL,
  repository STRING NOT NULL,
  observed_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP NOT NULL,
  group_sha STRING,
  pr INT64,
  run_id INT64,
  run_attempt INT64,
  payload JSON
)
PARTITION BY DATE(observed_at)
CLUSTER BY kind, group_sha;

CREATE VIEW IF NOT EXISTS `n8n-telemetry.imported_n8n.qa_merge_queue_events` AS
SELECT *
FROM `n8n-telemetry.imported_n8n.qa_merge_queue_events_raw`
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY event_id ORDER BY received_at DESC
) = 1;

SELECT 'ready' AS storage_status;
