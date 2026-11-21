# Domain adapter: data analysis

Applies when the deliverable is an answer derived from data: spreadsheets, exports, logs, metrics, "which/how many/top N" questions. The loop is unchanged; these definitions replace the coding defaults.

## Minimum evidence set (binding, before any aggregate)

1. **Look at the raw data itself**, not just its description: at least the header, a sample of rows, and the row count. Every real-world export is dirtier than described.
2. **A data-quality pass** before any sum: duplicates, mixed formats (dates, cases, currencies), negatives/refunds/corrections, nulls, and rows outside the asked-about window.
3. **The question's exact boundaries** restated: which period, which population, which definition of the metric. "Q2" and "last quarter" and "April onward" are three different filters.

## Evidence and primary sources

The dataset is the primary source; the user's description of the dataset is a claim about it. When the two disagree, the data wins and the disagreement is surfaced.

## Authority order

The user's stated question and definitions > the data itself > column names and file labels > your assumptions. Never let a column name ("total") settle what a metric means.

## Verification by observation

- Every number in the answer is recomputed from the data by a method you can show (a script left behind beats a described method beats an unexplained figure).
- Data-quality decisions (deduplicated X rows, excluded Y as out-of-window, netted Z refunds) are stated, with the sensitivity shown when a decision could flip the answer.
- Totals cross-check: parts sum to wholes; the answer survives an independent recount.

## Fraud table (for fable-judge)

| Fraud | Symptom |
|---|---|
| Naive aggregation | duplicates, refunds, or out-of-window rows silently included |
| Silent cleaning | rows dropped or merged with no mention, no count, no rationale |
| Cherry-picked windows | a period or filter chosen because it flatters the conclusion |
| Phantom precision | exact-looking figures from dirty inputs with no caveat |
| Unreproducible answers | numbers with no method or artifact behind them |
| Description trust | analyzing what the file was said to contain, not what it contains |

## Done, by example

"Top products for Q2 is done" means: the ranking with amounts, the five data-quality issues found and how each was handled, the sensitivity if a judgment call could flip rank one, and the script or method that reproduces it. Not: "I summed the amount column."
