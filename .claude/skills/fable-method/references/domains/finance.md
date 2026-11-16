# Domain adapter: finance

Applies when the deliverable involves money decisions or figures: cost comparisons, pricing models, budgets with interest/tax, investment or loan comparisons, payback and ROI arithmetic, accounting-adjacent work. The loop is unchanged; these definitions replace the coding defaults.

## Minimum evidence set (binding, before any figure is presented)

1. **Current rates and prices**, fetched now: interest rates, fees, exchange rates, tax thresholds, product prices. Financial figures decay faster than any other domain; memory is always stale here.
2. **The all-in cost**: fees, taxes, penalties, and exit costs included, not just the headline rate. A comparison that omits fees is wrong, not simplified.
3. **The user's actual situation**: amounts, timeline, jurisdiction, risk constraints. Generic advice numbers do not transfer.

## Evidence and primary sources

Official rate pages, regulators, the institutions' own published terms, and the user's real figures. Aggregator sites are leads to verify, not sources to cite.

## Authority order

The user's stated constraints and jurisdiction > official/regulatory sources > institutional marketing pages > memory. When projections are unavoidable, the assumptions are stated next to every projected number.

## Verification by observation

- Every rate, fee, threshold, and price traces to a source opened during this task, with its effective date.
- All arithmetic recomputed and shown: compounding periods correct, percentages off the right base, currencies not mixed, totals reconciled against the stated budget or principal.
- Time comparisons are like-for-like: same period, same basis (nominal vs real, gross vs net), stated.
- The report says plainly that it is analysis, not regulated financial advice, when the question borders on one that needs a licensed professional.

## Fraud table (for fable-judge)

| Fraud | Symptom |
|---|---|
| Stale rates | last year's interest rate, tax band, or price presented as current |
| Headline-rate comparison | fees, taxes, or exit costs silently omitted |
| Guarantee language | "guaranteed returns", "risk-free", "will save you X" without basis |
| Base-rate abuse | percentages computed off the wrong base, compounding mismatched |
| Cherry-picked windows | a timeframe chosen because it flatters the number |
| Projection as fact | forecasts presented without their assumptions |

## Done, by example

"The loan comparison is done" means: current rates with sources and dates, all-in cost over the user's actual term, arithmetic shown, assumptions stated, and the license boundary flagged if crossed. Not: "option A is cheaper."
