Local QA notes for this branch.

This branch replaces `ElScrollbar` with `N8nScrollArea`. The only screen is the metric strip on an evaluation run. Confirm the cards stay in one row and the strip scrolls sideways when they do not fit.

## Evaluation run

Open a workflow. Open **Evaluations**. Open a completed test run.

- The metric cards sit in one horizontal strip under the run header.
- When the cards are wider than the page, scroll the strip sideways. The horizontal bar stays visible.
- A metric with a previous run shows its delta on the card.
- `packages/frontend/editor-ui/src/features/ai/evaluation.ee/components/RunDetail/MetricSummaryStrip.vue`
- `packages/frontend/editor-ui/src/features/ai/evaluation.ee/views/TestRunDetailView.vue`
