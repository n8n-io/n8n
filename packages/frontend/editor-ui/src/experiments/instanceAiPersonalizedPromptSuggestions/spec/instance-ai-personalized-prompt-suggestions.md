# Instance AI Personalized Prompt Suggestions

## Context

This experiment is the fourth iteration in the Instance AI onboarding series to increase the share of new users exposed to Instance AI who send a first prompt.

- Iteration brief: https://app.notion.com/p/3685b6e0c94f80e19a41d3c9b8ba1a11
- Series page: https://app.notion.com/p/3675b6e0c94f8066af22fa8cbdf691cb
- Prompt matrix source: https://app.notion.com/p/e6498a338a61439282da09685e0d54ee
- V2 concrete examples dashboard: https://eu.hex.tech/n8n/hex/EXP-AI-assistant-onboarding-new-033SzRiLfkPmGxCB7YMuMI/draft/logic?view=app&tab=v2---concrete-examples

## Hypothesis

If the empty-state prompt suggestions match the user's role and main automation use case, more new users will send a first prompt because the suggestions will feel immediately relevant and reduce blank-page friction.

## Experiment Flag

Use a new PostHog multivariant experiment flag:

```ts
export const INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS_EXPERIMENT = createExperiment(
	'093_instance_ai_personalized_prompt_suggestions',
	{
		control: 'control',
		variantCards: 'variant-cards',
		variantList: 'variant-list',
	},
);
```

Add the experiment name to `EXPERIMENTS_TO_TRACK`.

Manual PostHog setup required:

- Create disabled Staging and Production flags with the same key.
- Configure variants exactly as `control`, `variant-cards`, and `variant-list`.
- Do not enable rollout as part of implementation.

## Variants

| Variant | Behavior |
| --- | --- |
| `control` | Current production baseline UI and suggestions. |
| `variant-cards` | New card-style UI with 4 suggestions from the matrix/default prompt catalog when matched, otherwise v2 top-used fallback suggestions. |
| `variant-list` | New list-style UI with 4 suggestions from the matrix/default prompt catalog when matched, otherwise v2 top-used fallback suggestions. |

Both treatment variants test the assigned format every time. If personalization data is missing or unusable, keep the assigned treatment UI and use fallback content.

## Data Source

Keep the experiment self-contained. Do not change:

- `IPersonalizationSurveyAnswersV4`
- CLI survey DTOs
- `/me/survey`
- shared REST client survey types

Read the Typeform/Cloud metadata from:

```ts
useCloudPlanStore().currentUserCloudInfo?.information
```

Define all answer keys, normalized role/use-case unions, and exact matching logic in the experiment folder. Match the expected Cloud metadata values exactly; do not add fuzzy matching, case normalization, or alias tables beyond the explicit mappings below.

### Metadata Keys

| Question | Cloud metadata key |
| --- | --- |
| What team are you on? | `what_team_are_you_on` |
| What do you mainly want to automate in sales? | `what_do_you_automate_sales` |
| What do you mainly want to automate in marketing? | `what_do_you_automate_marketing` |
| What do you mainly want to automate in support? | `what_do_you_automate_support` |
| What do you mainly want to automate in IT? | `what_do_you_automate_it` |
| What do you mainly want to automate in engineering? | `what_do_you_automate_eng` |
| What do you mainly want to automate in product and design? | `what_do_you_automate_pad` |

### Role Mapping

| Answer label | Normalized role |
| --- | --- |
| Executive/Owner | `executive-owner` |
| Support | `support` |
| Product & Design | `product-design` |
| Sales | `sales` |
| IT | `it` |
| Engineering | `engineering` |
| Marketing | `marketing` |
| Other | `other` |

### Use-Case Mapping

| Role | Answer label | Normalized use case | Matrix use case |
| --- | --- | --- | --- |
| Sales | Lead generation & qualification | `lead-generation-qualification` | Lead generation and qualification |
| Sales | Lead nurturing | `lead-nurturing` | Lead nurturing |
| Sales | Market research | `market-research` | Market research |
| Marketing | Content creation | `content-creation` | Content creation |
| Marketing | Campaigns & audience engagement | `campaign-audience-engagement` | Campaign and audience engagement |
| Marketing | Data & insights | `data-insights` | Data insights for campaigns |
| Support | Customer inquiries | `customer-inquiries` | Customer inquiry handling |
| Support | Issue resolution | `issue-resolution` | Issue resolution |
| Support | Inbox & process automation | `inbox-process-automation` | Process optimization |
| IT | Scam & phishing detection | `scam-phishing-detection` | Scam detection and prevention |
| IT | Data protection | `data-protection` | Data protection |
| IT | IT service desk | `it-service-desk` | IT service desk |
| Engineering | Data management | `data-management` | Data management |
| Engineering | Development support | `development-support` | Development support |
| Engineering | Insights & reporting | `insights-reporting` | Insights and reporting |
| Product & Design | User & market research | `user-market-research` | Market research |
| Product & Design | Insights & reporting | `insights-reporting` | Insights and reporting |
| Product & Design | Content & asset creation | `content-asset-creation` | Content creation |

### Default Mapping

| Input | Prompt catalog role | Prompt catalog use case | Normalized source |
| --- | --- | --- | --- |
| Sales with missing, skipped, or `Something else` use case | Sales | Role default | `role_default` |
| Marketing with missing, skipped, or `Something else` use case | Marketing | Role default | `role_default` |
| Support with missing, skipped, or `Something else` use case | Support | Role default | `role_default` |
| IT with missing, skipped, or `Something else` use case | IT | Role default | `role_default` |
| Engineering with missing, skipped, or `Something else` use case | Engineering | Role default | `role_default` |
| Product & Design with missing, skipped, or `Something else` use case | Product & Design | Role default | `role_default` |
| Executive/Owner | Executive/Owner | Global top performers | `global_top_performers` |
| Other | Other | Role default | `role_default` |

Missing role, unrecognized role, unrecognized use-case value, malformed metadata, Cloud metadata failure, Cloud metadata timeout, and non-Cloud users fall back to v2 top-used suggestions.

Manually verify the Production Cloud metadata payload before rollout. Staging already writes the expected keys; before enabling the experiment, confirm that Production values use the exact labels above.

### QA Profile Override

Support an experiment-only browser override so the team can test personalized buckets on deployed instances without changing database or Cloud metadata.

- Read `instanceAiPersonalizedPromptProfile` from the page URL.
- Persist valid values in `N8N_INSTANCE_AI_PERSONALIZED_PROMPT_PROFILE_OVERRIDE` so testers can navigate and refresh.
- Accept only exact prompt catalog bucket keys in the form `<role>:<use-case>`, for example `sales:lead-nurturing`, `marketing:role-default`, or `executive-owner:global-top-performers`.
- Accept `fallback` to force the v2 top-used fallback suggestions.
- Accept `clear` or an empty value to remove the persisted override.
- Ignore impossible combinations such as `sales:data-protection`.
- Apply the override only in `variant-cards` and `variant-list`.
- When an override is active, resolve suggestions immediately, skip Cloud metadata waiting, and set `metadata_load_state: 'loaded'` plus `profile_override: true` in telemetry.
- Do not change Cloud metadata, survey answers, database settings, or control behavior.

## Prompt Catalog

Store the matrix as static experiment-local data, copied from the Notion prompt DB. Raw strings are allowed inside this experiment folder for this matrix.

Recommended file:

```text
packages/frontend/editor-ui/src/experiments/instanceAiPersonalizedPromptSuggestions/prompts.ts
```

Each prompt entry should include:

```ts
type PersonalizedPromptSuggestion = {
	id: string;
	role: Role;
	useCase: UseCase;
	order: number;
	style: 'tool-specific' | 'generic';
	shortTitle: string;
	description: string;
	builderPrompt: string;
};
```

Copy `Short Title`, `Description`, `Builder prompt`, `Role`, `Use case`, `Order`, and `Style` exactly from the Notion prompt DB. Generate stable committed IDs from role, use case, order, and short title, e.g. `v4-sales-lead-nurturing-1-qualify-hot-leads`.

Selection rules:

1. Resolve the user's normalized role from `what_team_are_you_on` using exact answer-label matching.
2. Resolve that role's normalized second-question answer using exact answer-label matching.
3. If both values map to a specific matrix bucket, show that bucket's 4 prompts ordered by `order` with `suggestion_source: 'matrix'`.
4. If the role is known and the use case is missing, skipped, or `Something else`, show that role's `Role default` bucket with `suggestion_source: 'role_default'`.
5. If the role is `Executive/Owner`, show `Executive/Owner` / `Global top performers` with `suggestion_source: 'global_top_performers'`.
6. If the role is `Other`, show `Other` / `Role default` with `suggestion_source: 'role_default'`.
7. If there is no usable role, any value is unrecognized, metadata is malformed, metadata fails, metadata times out, or the user is not on Cloud, show v2 top-used fallback prompts with `suggestion_source: 'v2_top_used_fallback'`.
8. Always return exactly 4 suggestions for treatment variants.

### V2 Top-Used Fallback

Use this fixed order for the top v2 suggestions by selected/submitted usage from the v2 dashboard/PostHog readout:

1. `whatsapp-support-agent`
2. `process-invoices`
3. `schedule-social-posts`
4. `qualify-inbound-leads`

These should use the same title/prompt content as the existing `instanceAiPromptSuggestionsV2` catalog, adapted to the new card/list display shape. Use this set for no usable role, unrecognized values, malformed metadata, metadata failure, metadata timeout, non-Cloud users, and the `See more` generic set.

## Loading Behavior

Current app startup does not await Cloud metadata. `cloudPlanStore.initialize()` is fired asynchronously during authenticated feature initialization.

Treatment behavior:

- `control`: render baseline immediately.
- `variant-cards` and `variant-list`: render the empty state and input immediately, but do not render suggestions until Cloud metadata resolves, fails, or times out.
- If Cloud metadata resolves with a recognized matrix segment, render matrix suggestions.
- If Cloud metadata resolves with a recognized default segment, render the role default or global top performers suggestions.
- If Cloud metadata resolves without a usable segment, render v2 top-used fallback suggestions.
- If Cloud metadata fails to load, render v2 top-used fallback suggestions.
- If Cloud metadata has not resolved after 2 seconds, render v2 top-used fallback suggestions with `metadata_load_state: 'timed_out'`.
- If Cloud metadata arrives after the timeout, do not replace the visible suggestions until the view remounts.
- Do not block the input or full empty state indefinitely.
- Do not show a loading state or reserve empty space for the suggestions area while metadata is pending.
- If the user types before metadata resolves, keep suggestions hidden while the composer is dirty. If the user clears the composer after metadata resolves, show the resolved suggestions.

## UI Behavior

### Shared Treatment Behavior

- Show 4 suggestions.
- Clicking a suggestion inserts the full `builderPrompt` into the composer.
- Clicking a suggestion does not auto-send.
- Focus the composer after insertion.
- Hover/focus preview uses the full `builderPrompt` as the ghost placeholder, matching current v2 behavior.
- When no suggestion hover/focus preview is active, use the experiment placeholder `Tip: Ask me for suggestions if you're not sure what to build`.
- Suggestions are hidden once the composer is dirty, busy, gated by setup, or unavailable, matching the current input behavior.
- Show a `See more` CTA above the suggestions, aligned to the right, only when the initial suggestion source is `matrix`, `role_default`, or `global_top_performers`.
- The `See more` label stays `See more` in both states.
- Clicking `See more` toggles between the initial 4 suggestions and the 4 v2 top-used fallback suggestions. Toggling back restores the original first set and order.
- Hide `See more` whenever suggestions are hidden.

### `variant-cards`

- Two-column card layout on desktop.
- Each card shows `shortTitle` and `description`.
- Preserve responsive behavior so cards do not overflow on narrow viewports.

### `variant-list`

- Single-column list layout.
- Each row shows `shortTitle`.
- Rows should be compact and scan-friendly.

## Telemetry

Reuse existing event names:

- `Instance AI prompt suggestions shown`
- `Instance AI prompt suggestion selected`
- `Instance AI prompt suggestion submitted`
- `Instance AI prompt suggestions cycled` for each `See more` toggle in either direction.

When this experiment is active, add these properties to the relevant existing events:

| Property | Values |
| --- | --- |
| `suggestion_catalog_version` | `v4-personalized` |
| `suggestion_format` | `cards`, `list` |
| `suggestion_source` | `matrix`, `role_default`, `global_top_performers`, `v2_top_used_fallback` |
| `profile_role` | normalized role when available |
| `profile_use_case` | normalized use case when available |
| `segment_key` | normalized key such as `sales:lead-generation-qualification`, `sales:role-default`, or `executive-owner:global-top-performers`; omit for v2 fallback |
| `metadata_load_state` | `loaded`, `failed`, `timed_out`, `not_cloud` |
| `profile_override` | `true` when the QA profile override is active; otherwise omitted |

Keep `suggestion_id`, `suggestion_kind`, `position`, `prompt_modified`, and `thread_id` behavior aligned with the existing suggestion telemetry.

For `Instance AI prompt suggestions cycled`, include `visible_suggestion_ids`, `cycle_count`, `suggestion_catalog_version`, `suggestion_format`, `suggestion_source`, `profile_role`, `profile_use_case`, `segment_key`, and `metadata_load_state` where available.

## Metrics

Primary metric:

- Percentage of new users exposed to Instance AI who send a prompt on the same day.

Secondary/diagnostic metrics:

- Prompt suggestion shown rate.
- Prompt suggestion selected rate.
- Prompt suggestion submitted rate.
- `See more` toggle rate.
- Percentage of prompt senders who result in a workflow being built.
- Matrix/default coverage: share of treatment users with recognized role/use-case metadata.
- Source performance split by `suggestion_source`.
- Cards vs list performance split by `suggestion_format`.

## Feedback Follow-up

Source: Notion feedback from 2026-06-22.

Must change:

- [x] Align card content to the top instead of vertically centering it.
- [x] Make the card variant feel more clickable.

Nice to have:

- [x] Replace `Suggested for you` with `Start from an example`.
- [x] Add helper copy under the header: `Picked for you. Change anything.`
- [x] Use the experiment placeholder: `Tip: Ask me for suggestions if you're not sure what to build`.
- [x] Add an `AI Assistant` pill near the top so users recognize the feature/icon faster.

## Implementation TODO

- [x] Create `packages/frontend/editor-ui/src/experiments/instanceAiPersonalizedPromptSuggestions/`.
- [x] Add the experiment constant and `EXPERIMENTS_TO_TRACK` entry.
- [x] Add experiment-local metadata keys, exact matching logic, and mapping tests.
- [x] Add static prompt matrix data copied from the Notion prompt DB.
- [x] Add tests proving every supported matrix/default bucket returns exactly 4 ordered prompts.
- [x] Add v2 top-used fallback prompt set.
- [x] Add card and list treatment components.
- [x] Add `See more` toggle behavior for treatment suggestions.
- [x] Wire the experiment into `InstanceAiEmptyView.vue` without changing control behavior.
- [x] Wait for Cloud metadata resolution, failure, or 2-second timeout before rendering treatment suggestions.
- [x] Extend existing suggestion telemetry payloads with experiment properties.
- [x] Add an experiment-only QA profile override for deployed testing.
- [x] Add focused component/composable tests for control, cards, list, matrix, role default, global top performers, fallback, `See more`, metadata failure, metadata timeout, and profile override behavior.
- [ ] Manually verify Production Cloud metadata keys and exact labels before rollout.
- [ ] Manually create disabled PostHog flags in Staging and Production.

## Open Questions

- None.
