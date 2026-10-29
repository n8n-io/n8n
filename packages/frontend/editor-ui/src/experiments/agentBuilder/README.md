# Agent builder experiments

[AGENT-1181](https://linear.app/n8n/issue/AGENT-1181) defines two experiments. Both apply only to the standalone Agents UI. The full Assistant and its agent artifacts keep the master layout and behavior.

## Allocation

Use person bucketing (`distinct_id`) for all three flags. The shared allocation flag, `133_agent_builder_experiment_cohort`, assigns 20% to `chat-width`, 30% to `test-toggle`, and 50% to `outside`. The experiment flags split their assigned cohort as follows:

| Experiment | Variant | Chat width | Test chat | Eligible audience |
| --- | --- | --- | --- | --- |
| `134_agent_builder_chat_width` | `control` | Current | Separate | 10% |
| `134_agent_builder_chat_width` | `wide` | 65% | Separate | 10% |
| `135_agent_builder_test_toggle` | `control` | Current | Separate | 10% |
| `135_agent_builder_test_toggle` | `toggle-wide` | 65% | Build/Test toggle | 10% |
| `135_agent_builder_test_toggle` | `toggle-current` | Current | Build/Test toggle | 10% |

These are expected audience shares, not exact user counts. The width flag splits its cohort 50/50. The toggle flag splits its cohort into three equal parts. Do not set each experiment flag to 10% rollout: the allocation flag controls total enrollment.

The frontend requires both the matching cohort and a valid experiment variant. Missing, disabled, or unknown values use the current layout with a separate test chat. A user cannot enter both experiments through this store.

Wide layouts start at 65% chat and 35% configuration. Panel minimum widths still apply on small screens. The Agents UI keeps its resize preference in `N8N_AGENT_BUILDER_CONFIG_RATIO`, separate from the current layout.

## PostHog drafts

| Record | Production | Staging flag |
| --- | --- | --- |
| Allocation | [Flag 330736](https://eu.posthog.com/project/122356/feature-flags/330736) | [Flag 330741](https://eu.posthog.com/project/142235/feature-flags/330741) |
| Chat width | [Experiment 105182](https://eu.posthog.com/project/122356/experiments/105182), [flag 330738](https://eu.posthog.com/project/122356/feature-flags/330738) | [Flag 330742](https://eu.posthog.com/project/142235/feature-flags/330742) |
| Build/Test toggle | [Experiment 105183](https://eu.posthog.com/project/122356/experiments/105183), [flag 330739](https://eu.posthog.com/project/122356/feature-flags/330739) | [Flag 330743](https://eu.posthog.com/project/142235/feature-flags/330743) |

All flags were created inactive with 0% rollout. No experiment was launched.

The draft metrics use existing events. Width measures conversion to `Builder modified agent`. Toggle measures conversion to `User submitted message to agent`, which is emitted by test chat. Each metric uses a proposed seven-day conversion window. Review these definitions and the required sample size before launch.

The standalone builder calls `trackExposure()` when it is visible. Assistant artifacts do not record exposure. The central PostHog store deduplicates exposure per flag and variant. Each draft uses `$feature_flag_called`, filtered by its `$feature_flag` key. Central enrollment telemetry also checks the allocation flag. Assignment alone does not count as exposure.

## Launch setup

1. Deploy the UI and validate all variants in Staging.
2. Confirm the eligible audience, metrics, and sample size. Apply audience rules to the allocation flag.
3. Review other running Assistant tests. Ignore flags that have shipped fully. At setup time, Preferences (`111`), conversation history (`109`), and folder exploration (`110`) still had control and treatment arms. Preferences enrolled all instances with a 50/50 split. Excluding every participant would leave no eligible audience. Resolve this overlap before launch if strict exclusion is required.
4. Activate the allocation flag at 0% rollout. PostHog rejects dependencies on inactive flags.
5. Add a flag dependency to the width flag: allocation evaluates to `chat-width`. Add a dependency to the toggle flag: allocation evaluates to `test-toggle`. Use allocation flag ID `330736` in Production or `330741` in Staging. The property shape is `{ "key": "330736", "type": "flag", "operator": "flag_evaluates_to", "value": "chat-width" }`.
6. Set each experiment flag to 100% of its matching allocation cohort. Keep the 50/50 and three-way variant splits. Launch the two experiments only after the dependencies are saved.
7. Set allocation rollout to 100% of the agreed eligible audience. Its 20/30/50 variant split produces the five 10% arms and the 50% outside group.
8. Verify exposure events and arm counts before interpreting results. Do not change the allocation split during the measurement period.

The dependency filters are not saved in the inactive drafts because PostHog requires an active dependency. The frontend enforces the same restriction independently.

## Local review

Run these commands in the browser console after the app loads:

```js
// Toggle with the wide layout.
window.featureFlags.override('133_agent_builder_experiment_cohort', 'test-toggle');
window.featureFlags.override('135_agent_builder_test_toggle', 'toggle-wide');
```

Use `toggle-current` or `control` for the other toggle variants. For the width experiment, set the cohort to `chat-width` and override `134_agent_builder_chat_width` with `wide` or `control`.

To clear local overrides and saved wide ratios:

```js
localStorage.removeItem('N8N_EXPERIMENT_OVERRIDES');
localStorage.removeItem('N8N_AGENT_BUILDER_CONFIG_RATIO');
location.reload();
```
