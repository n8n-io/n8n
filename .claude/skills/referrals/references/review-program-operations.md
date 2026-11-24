# Review Program Operations

Use for a repeatable invitation or reputation-triage program. Start with the smallest useful cohort and the user's existing tools; avoid building a sending system for a one-off request.

## Invitation Cohort

Define eligibility before looking at predicted sentiment:

- Genuine experience milestone and minimum time needed to evaluate it.
- Product/service/account boundary and region/channel authorization.
- Deduplication key and last-invited window.
- Opt-out, delivery failure, or documented platform ineligibility.
- Request/reminder limits, owner, and stop condition.

For example: "customers who completed their first project in the past seven days, not previously invited in this campaign, with an authorized contact channel." Include dissatisfied customers who meet the same rule. Route their service issues separately. Do not add an NPS/CSAT cutoff to create a favorable public-review cohort.

Review recipients and content before a send or workflow configuration unless those exact actions are already authorized. Use the platform's supported invitation mechanism. A read-only CLI result is not evidence of invitation permission.

## Neutral Invitation Draft

> Subject: Share your experience with [Product]
>
> You've completed [real experience milestone] with [Product]. If you'd like, please share an honest review at [verified platform/profile link]. Positive, neutral, and critical feedback all help people evaluate whether we're a fit. Thanks for your time.

Keep the invitation factual. Avoid prewritten customer claims, five-star requests, guilt, or a service remedy tied to reviewing. For an incentive permitted by the selected platform, use that platform's approved terms/disclosures; do not improvise a generic reward footer.

A bounded reminder can repeat the same neutral request for eligible nonresponders after a stated interval. Deduplicate actual prior invitations, honor opt-outs, and stop after the agreed limit. Don't interpret lack of response as permission for more channels.

## Reputation Queue

| Field | Purpose |
|-------|---------|
| Review URL, platform, date | Source and scope |
| Customer assertion | Exact relevant claim, separate from internal facts |
| Evidence status | Verified, unverified, or conflicting |
| Issue class | Service, product gap, misunderstanding, privacy/safety, suspected policy breach |
| Owner and next step | Specific accountable follow-up |
| Public response status | Draft, authorized, published with link, or deferred |
| Resolution status | Open, investigated, action agreed, resolved with evidence |

Use urgency proportional to the actual allegation. Safety/security or disclosure of private information needs the responsible team's handling; a disliked opinion does not become an emergency. Record what is uncertain, and do not assert that the business has fixed an issue merely because a reply was sent.

## Quote Permission Ledger

Record: source URL/date, exact quote, customer-approved attribution, consent evidence, allowed channels, permitted edits, material-connection disclosure, validity window, and withdrawal/update status. Proposed use stays unpublished when permission or platform rights are unknown. Redact private records from shared marketing briefs.

Example reuse packet:

- Quote: [exact, permissioned words]
- Source: [URL and date]
- Claim boundary: [what the quote supports; what it does not]
- Rights: [specific allowed channel and approval]
- Attribution/disclosure: [approved text]
- Proposed placement: [page/ad/sales asset]

Do not manufacture a "4.7 converts better than 5.0" rule. If testing proof placement, use a defined hypothesis and the actual conversion data; ratings, source mix, sample size, and selection all affect interpretation.

## Program Dashboard

Start with a private sheet or existing CRM/support workflow. Track unique eligible customers, unique invitations, delivery, published-review source/window, recurring issues, response latency, and evidence-backed resolution. Report unknowns rather than joining unrelated review growth to a campaign denominator.

An initial program proposal should fit one page: cohort, platform method and policy check, request/reminder draft, permissions, owner, review cadence, success measure, and stop condition. Use a separate sending/automation implementation only when requested and authorized.
