-- Apply hr-interview-feedback.sql first. Only verified staff may call the workflow.
CREATE TABLE IF NOT EXISTS hr_hiring_decisions (
  id bigserial PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES candidates(id),
  event_id text NOT NULL,
  request_id text NOT NULL,
  manager_email text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('offer', 'reject', 'on_hold', 'more_info')),
  notes text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text,
  UNIQUE (candidate_id, event_id, request_id)
);

CREATE INDEX IF NOT EXISTS hr_hiring_decisions_due
  ON hr_hiring_decisions (next_attempt_at, id)
  WHERE status IN ('pending', 'processing');

-- Lock the candidate before recording a human decision and its delivery state.
CREATE OR REPLACE FUNCTION hr_record_hiring_decision(
  p_candidate_id text, p_event_id text, p_request_id text,
  p_manager_email text, p_decision text, p_notes text
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  candidate candidates%ROWTYPE;
  previous hr_hiring_decisions%ROWTYPE;
  reviewers text[];
  manager text := lower(btrim(p_manager_email));
  next_stage text;
  decision_id bigint;
BEGIN
  IF p_candidate_id IS NULL OR btrim(p_candidate_id) = ''
    OR p_event_id IS NULL OR btrim(p_event_id) = ''
    OR p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 1 AND 100
    OR p_request_id !~ '^[A-Za-z0-9_-]+$'
    OR manager IS NULL OR manager = ''
    OR p_decision IS NULL OR p_decision NOT IN ('offer', 'reject', 'on_hold', 'more_info')
    OR p_notes IS NULL OR btrim(p_notes) = '' OR length(p_notes) > 10000 THEN
    RETURN jsonb_build_object('error', 'INVALID_DECISION');
  END IF;

  SELECT * INTO candidate FROM candidates WHERE id = p_candidate_id FOR UPDATE;
  IF NOT FOUND OR lower(btrim(candidate.hiring_manager_email)) IS DISTINCT FROM manager
    OR candidate.final_event_id IS DISTINCT FROM p_event_id THEN
    RETURN jsonb_build_object('error', 'DECISION_NOT_AVAILABLE');
  END IF;

  SELECT * INTO previous FROM hr_hiring_decisions
    WHERE candidate_id = p_candidate_id AND event_id = p_event_id AND request_id = p_request_id;
  IF FOUND THEN
    IF previous.manager_email IS DISTINCT FROM manager
      OR previous.decision IS DISTINCT FROM p_decision OR previous.notes IS DISTINCT FROM p_notes THEN
      RETURN jsonb_build_object('error', 'REQUEST_CONFLICT');
    END IF;
    RETURN jsonb_build_object('accepted', true, 'duplicate', true,
      'decisionId', previous.id, 'decision', previous.decision, 'stage', candidate.stage,
      'superseded', EXISTS (SELECT 1 FROM hr_hiring_decisions
        WHERE candidate_id = p_candidate_id AND event_id = p_event_id AND id > previous.id));
  END IF;

  IF candidate.stage IS NULL OR candidate.stage NOT IN ('final_completed', 'on_hold', 'more_info') THEN
    RETURN jsonb_build_object('error', 'DECISION_NOT_AVAILABLE');
  END IF;
  SELECT reviewer_emails INTO reviewers FROM hr_interview_sessions
    WHERE candidate_id = p_candidate_id AND interview_type = 'final' AND event_id = p_event_id;
  IF NOT FOUND OR cardinality(reviewers) = 0 OR EXISTS (
    SELECT 1 FROM unnest(reviewers) AS reviewer WHERE NOT EXISTS (
      SELECT 1 FROM hr_interview_feedback f WHERE f.candidate_id = p_candidate_id
        AND f.interview_type = 'final' AND f.event_id = p_event_id AND f.reviewer_email = reviewer
    )
  ) THEN
    RETURN jsonb_build_object('error', 'FEEDBACK_INCOMPLETE');
  END IF;

  next_stage := CASE p_decision WHEN 'reject' THEN 'rejected' ELSE p_decision END;
  INSERT INTO hr_hiring_decisions (candidate_id, event_id, request_id, manager_email, decision, notes)
    VALUES (p_candidate_id, p_event_id, p_request_id, manager, p_decision, p_notes)
    RETURNING id INTO decision_id;
  UPDATE candidates SET stage = next_stage, updated_at = now() WHERE id = p_candidate_id;
  RETURN jsonb_build_object('accepted', true, 'duplicate', false, 'superseded', false,
    'decisionId', decision_id, 'decision', p_decision, 'stage', next_stage);
END;
$$;
