# Cost and when to decompose

When to read directly, when to split the work, and what the paper actually measured. Paper figures: Zhang, Kraska, Khattab, Recursive Language Models, arXiv:2512.24601 (v3).

30k and 50k below are harness caps, not a claim that a bigger window removes rot. Density first. In the paper, OOLONG-Pairs is 32k tokens (arXiv:2512.24601, Table 1).

## Decision

| Situation | Approach |
|-----------|----------|
| One file, one function, or a single needle | Read directly |
| Linear aggregate or list-everything, and completeness matters | Decompose |
| Pairwise, quadratic, or multi-hop across scattered sources | Decompose, even under 30k tokens |
| 10+ files or 50k+ tokens | Decompose |
| Under 30k tokens and a localised answer | Read directly |

Skip decomposition when the answer is one needle, when latency matters more than completeness, or when coordination would cost more than a direct read.

Recursion depth is 1. Sub-agents must not launch sub-agents. Write the batch count, run one parallel wave, merge, then another wave if batches remain.

## What you pay for

Direct: one call, input tokens times the price. Quality falls as the window fills (context rot).

Decomposed: sum of sub-call tokens plus the parent coordinating them. Latency is the slowest batch plus the merge, if batches run in parallel. Quality holds if each batch stays small and the merge is checked.

## Paper costs (Table 1, Figure 11)

BrowseComp-Plus, 6 to 11M tokens, GPT-5:

- RLM(depth=1): 91.3% at $0.99 average ($1.22 std)
- compaction: 70.5% at $0.57 average
- GPT-5 base: hits the context limit (0.0*)
- linear extrapolation of GPT-5-mini ingesting that input: $1.50 to $2.75

RLM is not cheaper than compaction on that row. It is cheaper than stuffing 6 to 11M tokens into the model, and the paper reports it outperforms compaction and retrieval by over 29%.

OOLONG (131k tokens): RLM(GPT-5, depth=1) 56.0 versus GPT-5 44.0 (+28.4%). RLM(Qwen3-Coder, depth=1) 48.0 versus 36.0 (+33.3%).

OOLONG-Pairs (32k tokens): GPT-5 F1 0.1 versus RLM 58.0 at depth=1 (76.0 at depth=3).

Median RLM cost is comparable or lower than the base model (Figure 11, 50th percentile). The average can sit higher because of long outlier trajectories. The 95th percentile of runtime is dominated by sequential sub-LLM calls. The paper does not publish a 99th-percentile multiplier.

## Parallel batches

If batches are independent:

```text
serial:    T = t1 + t2 + ... + tn
parallel:  T = max(t1, t2, ..., tn) + merge
```

Toy timing, not a paper result: ten batches at 30 seconds each, 10-second merge. Serial 300 seconds, parallel about 40.

## Variance

RLM trajectories are long-tailed (paper, Observation 4 and Figure 11). Common causes: too many sub-calls, the same span processed twice, deep recursion, clumsy chunks.

Caps that help: a sub-call budget, disjoint partitions, a depth limit, a running token count.

## Cut cost before you recurse

Filter first. A 1000-file tree that greps down to 20 files is a cheaper problem. The 10x in that sketch is arithmetic on the example, not a measured speedup.

For aggregates, sample a slice. If the distribution is obvious, stop. If it is not, process the rest.

For search, stop when the answer is found, then verify. Do not finish the remaining batches out of habit.

If the same tree will be queried again, cache per-chunk notes and drop them when the source changes.

## Tool choice

| Job | Approach |
|-----|----------|
| One file by name | glob or find, then read |
| One function definition | grep, then read that range |
| One module | read it and follow imports |
| About 5 related files | read them |
| A pattern across the tree | grep, then decompose the hits |
| Aggregate across 50+ files | disjoint batches, parallel sub-agents |
| Multi-hop across scattered sources | this skill |

Read directly on the first four rows. The last three are why the skill exists.
