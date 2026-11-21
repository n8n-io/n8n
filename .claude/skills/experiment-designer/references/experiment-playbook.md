# Experiment Playbook

## Experiment Types

### A/B Test
- Compare one control versus one variant.
- Best for high-confidence directional decisions.

### Multivariate Test
- Test combinations of multiple factors.
- Useful for interaction effects, requires larger traffic.

### Holdout Test
- Keep a percentage unexposed to intervention.
- Useful for measuring incremental lift over broader changes.

## Metric Design

### Primary Metric
- One metric that decides ship/no-ship.
- Must align with user value and business objective.

### Guardrail Metrics
- Prevent local optimization damage.
- Examples: error rate, latency, churn proxy, support contacts.

### Diagnostic Metrics
- Explain why change happened.
- Do not use as decision gate unless pre-specified.

## Stopping Rules

Define before launch:
- Fixed sample size per group
- Minimum run duration (to capture weekday/weekend behavior)
- Guardrail breach thresholds (pause criteria)

Avoid:
- Continuous peeking with fixed-horizon inference
- Changing success metric mid-test
- Retroactive segmentation without correction

## Novelty and Primacy Effects

- Novelty effect: short-term spike due to newness, not durable value.
- Primacy effect: early exposure creates bias in user behavior.

Mitigation:
- Run long enough for behavior stabilization.
- Check returning users and delayed cohorts separately.
- Re-run key tests when stakes are high.

## Pre-Launch Checklist

- [ ] Hypothesis complete (If/Then/Because)
- [ ] Metric definitions frozen
- [ ] Instrumentation validated
- [ ] Randomization and assignment verified
- [ ] Sample size and duration approved
- [ ] Rollback plan documented

## Post-Test Readout Template

1. Hypothesis and scope
2. Experiment setup and quality checks
3. Primary metric effect size + confidence interval
4. Guardrail status
5. Segment-level observations (pre-registered only)
6. Decision: ship, iterate, or reject
7. Follow-up experiments
