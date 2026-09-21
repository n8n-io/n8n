-- Run this setup against the HR database before enabling booking and feedback.
-- The candidates table must use the contract in README.md.
CREATE TABLE IF NOT EXISTS hr_interview_sessions (
  candidate_id text NOT NULL REFERENCES candidates(id),
  interview_type text NOT NULL CHECK (interview_type IN ('recruiter', 'technical', 'final')),
  event_id text NOT NULL,
  reviewer_emails text[] NOT NULL CHECK (cardinality(reviewer_emails) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, interview_type, event_id)
);

CREATE TABLE IF NOT EXISTS hr_interview_feedback (
  candidate_id text NOT NULL,
  interview_type text NOT NULL,
  event_id text NOT NULL,
  reviewer_email text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('strong_yes', 'yes', 'no', 'strong_no')),
  notes text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, interview_type, event_id, reviewer_email),
  FOREIGN KEY (candidate_id, interview_type, event_id)
    REFERENCES hr_interview_sessions(candidate_id, interview_type, event_id)
);

-- Keep delivery separate from the transaction that records feedback.
CREATE TABLE IF NOT EXISTS hr_interview_notifications (
  id bigserial PRIMARY KEY,
  candidate_id text NOT NULL,
  interview_type text NOT NULL,
  event_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('next_interview', 'manager_review', 'feedback_reminder')),
  recipient text NOT NULL,
  period date NOT NULL DEFAULT DATE '1970-01-01',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, interview_type, event_id, kind, recipient, period),
  FOREIGN KEY (candidate_id, interview_type, event_id)
    REFERENCES hr_interview_sessions(candidate_id, interview_type, event_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS hr_interview_notifications_due
  ON hr_interview_notifications (next_attempt_at, id)
  WHERE status IN ('pending', 'processing');

-- The workflow derives the reviewer from its identity service.
-- It supplies the end time from the verified current Calendar event.
CREATE OR REPLACE FUNCTION hr_submit_interview_feedback(
  p_candidate_id text,
  p_interview_type text,
  p_event_id text,
  p_reviewer_email text,
  p_rating text,
  p_notes text,
  p_event_end timestamptz
) RETURNS TABLE (
  error text,
  accepted boolean,
  duplicate boolean,
  stage_complete boolean,
  expected_count integer,
  received_count integer
) LANGUAGE plpgsql AS $$
DECLARE
  candidate candidates%ROWTYPE;
  session hr_interview_sessions%ROWTYPE;
  current_event_id text;
  reviewer text := lower(btrim(p_reviewer_email));
  inserted_count integer;
BEGIN
  IF p_interview_type IS NULL OR p_interview_type NOT IN ('recruiter', 'technical', 'final')
    OR p_rating IS NULL OR p_rating NOT IN ('strong_yes', 'yes', 'no', 'strong_no')
    OR p_notes IS NULL OR btrim(p_notes) = '' OR length(p_notes) > 10000
    OR reviewer IS NULL OR reviewer = '' OR p_event_end IS NULL THEN
    RETURN QUERY SELECT 'INVALID_FEEDBACK', false, false, false, 0, 0;
    RETURN;
  END IF;

  -- Serialize responses for this candidate before counting the completed panel.
  SELECT * INTO candidate FROM candidates WHERE id = p_candidate_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'INTERVIEW_NOT_AVAILABLE', false, false, false, 0, 0;
    RETURN;
  END IF;
  current_event_id := CASE p_interview_type
    WHEN 'recruiter' THEN candidate.recruiter_event_id
    WHEN 'technical' THEN candidate.technical_event_id
    WHEN 'final' THEN candidate.final_event_id
  END;
  IF current_event_id IS DISTINCT FROM p_event_id
    OR candidate.stage IS NULL
    OR candidate.stage NOT IN (p_interview_type || '_scheduled', p_interview_type || '_completed') THEN
    RETURN QUERY SELECT 'INTERVIEW_NOT_AVAILABLE', false, false, false, 0, 0;
    RETURN;
  END IF;

  SELECT * INTO session FROM hr_interview_sessions
    WHERE candidate_id = p_candidate_id AND interview_type = p_interview_type AND event_id = p_event_id;
  IF NOT FOUND OR NOT (reviewer = ANY(session.reviewer_emails)) THEN
    RETURN QUERY SELECT 'INTERVIEW_NOT_AVAILABLE', false, false, false, 0, 0;
    RETURN;
  END IF;
  IF p_event_end > now() THEN
    RETURN QUERY SELECT 'INTERVIEW_NOT_FINISHED', false, false, false, 0, 0;
    RETURN;
  END IF;

  INSERT INTO hr_interview_feedback (candidate_id, interview_type, event_id, reviewer_email, rating, notes)
    VALUES (p_candidate_id, p_interview_type, p_event_id, reviewer, p_rating, p_notes)
    ON CONFLICT (candidate_id, interview_type, event_id, reviewer_email) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  SELECT count(DISTINCT email)::integer INTO expected_count FROM unnest(session.reviewer_emails) AS email;
  SELECT count(*)::integer INTO received_count FROM hr_interview_feedback
    WHERE candidate_id = p_candidate_id AND interview_type = p_interview_type AND event_id = p_event_id
      AND reviewer_email = ANY(session.reviewer_emails);
  stage_complete := expected_count > 0 AND received_count = expected_count;
  IF stage_complete AND candidate.stage = p_interview_type || '_scheduled' THEN
    UPDATE candidates SET stage = p_interview_type || '_completed', updated_at = now()
      WHERE id = p_candidate_id;
    INSERT INTO hr_interview_notifications (candidate_id, interview_type, event_id, kind, recipient)
      VALUES (
        p_candidate_id, p_interview_type, p_event_id,
        CASE WHEN p_interview_type = 'final' THEN 'manager_review' ELSE 'next_interview' END,
        COALESCE(CASE WHEN p_interview_type = 'final' THEN candidate.hiring_manager_email ELSE candidate.email END, '')
      ) ON CONFLICT (candidate_id, interview_type, event_id, kind, recipient, period) DO NOTHING;
  END IF;
  error := NULL;
  accepted := true;
  duplicate := inserted_count = 0;
  RETURN NEXT;
END;
$$;
