# Self-healing workflows (UI prototype)

Clickable prototype of "self-healing workflows". An AI agent watches a
project's workflows, fixes failing executions, and submits each fix as a
workflow review for a person to approve. Configuration lives at project level.

**Frontend only.** Nothing here calls a backend. The store seeds itself from
fixtures and fakes the agent. State resets on reload.

## Toggle

Everything is behind the `self_healing_workflows_prototype` PostHog flag. On
any instance, open the browser console and run:

```js
window.featureFlags.override('self_healing_workflows_prototype', 'variant');
```

Then reload. The override persists in local storage. To turn it off:

```js
window.featureFlags.override('self_healing_workflows_prototype', 'control');
```

## Surfaces

| Surface | Component | Host |
| --- | --- | --- |
| Project settings section | `components/ProjectSelfHealingSection.vue`, `components/SelfHealingConfigDialog.vue` | `ProjectSettings.vue` |
| Read-only trace of the Assistant's work | `components/SelfHealingTrace.vue` | Trace tab in `WorkflowReviewDetailTabs.vue` |
| Three inbox kinds: Fix ready, Action needed, Could not fix | `components/SelfHealingOutcomeNotice.vue` (notice with the reason and the next step), `components/SelfHealingOutcomeActions.vue`, `selfHealingStatus.ts` | `WorkflowReviewRequestsSidebar.vue` (status colour only), `WorkflowReviewDetailTabs.vue` (next step in the description, Review disabled, no Changes tab) |
| Sub-workflows of selected workflows | `SelfHealingConfigDialog.vue`, `composables/useSubWorkflowScope.ts` | Selected-workflows scope (reads the real workflow dependency index) |
| Reviewers per configuration | `SelfHealingConfigDialog.vue` (project members picker) | seeded and live reviews list them as reviewers |
| Workflow list badge | `components/SelfHealingWorkflowBadge.vue` | `WorkflowCard.vue` |
| Failed execution banner | `components/SelfHealingExecutionBanner.vue` | `WorkflowExecutionsPreview.vue` |
| Workflow settings row | `components/SelfHealingWorkflowSettingsValue.vue` | `WorkflowSettings.vue` |
| Reviews inbox | `composables/useSelfHealingReviewMocks.ts` | `reviewInbox.store.ts`, `reviewActivity.store.ts` |

The review inbox route and nav item open when the flag is on, even when the
Workflow Reviews backend feature is off. See `isReviewInboxEnabled` in
`useWorkflowReviewsFeature.ts`.

## Demo script

1. Turn the flag on and open a project's **Settings**. The **Self-healing**
   section lists one default configuration. Edit it, add another, pause it.
   In a new configuration, choose **Selected workflows** and add a workflow
   that calls sub-workflows. Its row reads "Calls 3 sub-workflows"; click it
   to see them. **Include sub-workflows** is on by default,
   so the configuration covers them too. A sub-workflow in another project
   shows as **Other project** and is not covered. This step reads real
   Execute Workflow nodes, so the project must have such workflows.
2. Open the project's **Workflows**. Enrolled workflows show a chip:
   "Monitoring" or "Healed 3 hours ago". Workflows outside the scope show nothing.
3. Open the project's **Executions** tab. A coachmark points at the newest
   failed execution on every visit; **Try now** opens the project's
   Self-healing settings. To run a fix, open a failed execution and click
   **Let AI Assistant fix this**. After a short delay the banner links to the
   new review, and the workflow's chip reads "Fix in review".
4. Open **Reviews**. Two seeded auto-fix reviews plus the one you started sit
   in the inbox with the assistant avatar. Open one:
   the Activity tab explains the fix and the Changes tab shows the diff.
   Approve it; the workflow's chip flips to "Healed just now".
   On the "Could not fix" item, **Continue in chat** opens a new Assistant
   chat. Its first message carries the Assistant's report, so it can take
   over. Demo items open the chat in your personal project and attach no
   workflow, because their workflows do not exist.
5. Switch the configuration to **Deploy fixes automatically** and repeat
   step 3. The fix lands already approved and published. Switch it to
   **Diagnose and notify** instead and the banner shows a root-cause summary
   with a suggested fix, and nothing is changed.

## Files

- `selfHealing.store.ts` – configurations, per-workflow status, fix jobs,
  assistant-authored reviews.
- `selfHealing.fixtures.ts` – demo data and builders.
- `selfHealing.constants.ts` – the assistant actor and id helpers.
- `selfHealing.types.ts` – shared types.
