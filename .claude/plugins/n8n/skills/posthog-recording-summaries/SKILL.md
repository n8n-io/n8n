---
name: posthog-recording-summaries
description: >-
  Summarizes PostHog session recordings for cohorts defined by IDs, events,
  versions, experiment variants, person properties, or group properties. Use
  when asked to analyze PostHog recordings, replay cohorts, funnel drop-offs,
  `session-recording-summarize`, or behavioral recordings for a product flow.
---

# PostHog Recording Summaries

Use this skill to summarize batches of PostHog session recordings for an
explicit cohort, then separate observable behavior from interpretation.

## Requirements

- Requires PostHog access, usually through the PostHog MCP tools.
- If using the PostHog MCP, follow its tool discovery and `info` flow before
  calling any PostHog tool.
- If the MCP is unavailable, ask the user for exported summaries or recording
  links rather than inventing observations.

## Workflow

1. **Identify the cohort**
   - Confirm the source PostHog project and how the cohort is defined.
   - Common cohort definitions include explicit recording/session IDs,
     experiment variants, product versions, instance IDs, person properties,
     group properties, events, or funnel steps.
   - Keep cohorts separate when the user wants comparison, for example version
     A versus version B or variant 1 versus variant 2.
   - Use explicit IDs exactly as supplied. If IDs must be queried, record the
     query criteria and time window.

2. **Set PostHog context**
   - Switch the PostHog MCP context to the source project when a project context
     tool is available.
   - Keep the project ID in notes because replay links depend on it.

3. **Summarize recordings**
   - Use PostHog's `session-recording-summarize` capability.
   - Prefer batches of about 10 IDs to avoid response truncation.
   - Reuse cached summaries on retries; do not reclassify from memory if a tool
     call failed or returned no usable summary.

   Use a focused prompt like:

   ```text
   Summarize this cohort: {cohort_definition}. Focus on observed engagement,
   progression, friction, errors, confusion, drop-offs, and actions relevant to
   the product question. Include event/timestamp evidence when available.
   ```

4. **Classify every recording**
   - First classify tool quality:
     - `usable summary`
     - `too short or no usable events`
     - `summary failed and needs retry`
   - For usable summaries, classify behavioral outcome using labels that match
     the product question, such as `progressed`, `dropped off`, `completed`,
     `encountered friction`, `passive/no engagement`, or `ambiguous`.

5. **Separate observations from interpretation**
   - Observations are what the recording or event stream directly shows.
     Example: "Several users clicked enable successfully, then dropped out of
     the funnel; the next expected event is not visible."
   - Interpretations are explanations, hypotheses, or product judgments based on
     observations. Label them explicitly and include confidence.
   - Do not present an interpretation as a fact. Tie every interpretation back
     to one or more observations.
   - Report repeated patterns, notable outliers, and missing evidence.
   - Avoid overstating conversion impact from short or ambiguous recordings.

6. **Include evidence links**
   - For notable moments, create replay links:

   ```text
   https://eu.posthog.com/project/{project_id}/replay/{session_id}?t={seconds}
   ```

   - Use `milliseconds_since_start / 1000` for `seconds`.
   - If no timestamp is available, link to the replay without `?t=`.

## Output Format

Use the report template in [reference.md](reference.md) unless the user asks
for a different artifact.
