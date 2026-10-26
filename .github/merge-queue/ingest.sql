MERGE `n8n-telemetry.imported_n8n.qa_merge_queue_events_raw` AS target
USING (
  SELECT
    JSON_VALUE(@event_json, '$.id') AS event_id,
    JSON_VALUE(@event_json, '$.kind') AS kind,
    JSON_VALUE(@event_json, '$.repository') AS repository,
    TIMESTAMP(JSON_VALUE(@event_json, '$.observed_at')) AS observed_at,
    CURRENT_TIMESTAMP() AS received_at,
    JSON_VALUE(@event_json, '$.merge_group.head_sha') AS group_sha,
    SAFE_CAST(JSON_VALUE(@event_json, '$.pr.number') AS INT64) AS pr,
    SAFE_CAST(JSON_VALUE(@event_json, '$.run.id') AS INT64) AS run_id,
    SAFE_CAST(JSON_VALUE(@event_json, '$.run.attempt') AS INT64) AS run_attempt,
    PARSE_JSON(@event_json) AS payload
) AS source
ON target.event_id = source.event_id
WHEN NOT MATCHED THEN INSERT (
  event_id, kind, repository, observed_at, received_at, group_sha,
  pr, run_id, run_attempt, payload
) VALUES (
  source.event_id, source.kind, source.repository, source.observed_at,
  source.received_at, source.group_sha, source.pr, source.run_id,
  source.run_attempt, source.payload
);

SELECT JSON_VALUE(@event_json, '$.id') AS event_id, TRUE AS accepted;
