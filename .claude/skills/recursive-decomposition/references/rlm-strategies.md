# RLM decomposition strategies

Strategies taken from Recursive Language Models (Zhang, Kraska, Khattab, arXiv:2512.24601). Numbers below are from that paper, v3.

## Context rot

Quality falls as the prompt gets longer. The paper (citing Hong et al., 2025) calls this context rot:

- retrieval misses
- details dropped in long documents
- invented links between distant passages
- weaker reasoning over a large evidence set

The fix in the paper is to keep the active window small and reach the rest of the prompt through tools: peek, slice, recurse.

## What models actually do

Section 5 of the paper describes how current models behave as RLMs: probe the input, then split the work into sub-calls. The patterns below are the ones this skill turns into a protocol.

### Filter with code before you read

Narrow the set with a pattern, then open what remains.

```text
pattern = (database|connection|auth)
keep files whose content matches pattern
read only those files
```

In an agent session: grep before read, glob to cut the file set, then chain filters (type, then keyword, then meaning).

### Chunk

Uniform: split a 1000-line file into ten 100-line windows, merge with overlap.

By meaning: one function, class, or section per chunk. Prefer a complete unit over equal sizes.

By keyword: all error-handling in one batch, all API definitions in another, each with a prompt that matches that batch.

### Recurse

This skill uses one level only. Sub-agents answer; they do not spawn sub-agents.

```text
main agent
├── sub-agent (chunk A)
├── sub-agent (chunk B)
└── sub-agent (chunk C)
then merge
```

The paper's OOLONG-Pairs numbers move with recursion depth (GPT-5: 58.0% F1 at depth=1, 76.0% at depth=3). Extra depth is not free: Qwen3-Coder-480B-A35B often makes syntax errors, and those errors spread into sub-calls, so depth 2 and 3 can score worse than depth 1 on that model (arXiv:2512.24601, Table 1 and Figure 4b). This skill stays at depth 1.

### Verify by reading less

1. Write an answer from the large pass.
2. Pull the cited locations.
3. Re-read only those locations.
4. Check the answer against that small window.
5. If it disagrees, re-read the disagreement, not the whole corpus.

### Build long output in pieces

Generate each section on its own, store the pieces, then stitch. That is how an RLM writes past the model's output limit (paper, section 5).

## Size limits

These match the skill body. They are session limits, not paper results.

- Files over 2,000 lines or 50 KB: read by line range, never in one shot.
- PDFs over 100 pages or 30 MB: metadata or a split, not a full ingest.
- Stay under about 30k tokens in the active window when you can.

## Task shape

| Shape | Typical job | Approach |
|-------|-------------|----------|
| O(1) | one needle | filter until the set is small, then read |
| O(n) | count, list, summarise every item | map-reduce over disjoint batches |
| O(n²) | pairwise relations | blocked pairs, sample first if the full grid is too large |
| O(log n) | search in ordered or nested data | divide and conquer |

Figure 1 in the paper scales S-NIAH, OOLONG, and OOLONG-Pairs from 2^13 to 2^20 tokens. GPT-5 drops faster on the linear and quadratic tasks. Past 2^14 tokens the RLM beats GPT-5 on those plots.

## Model differences (from the paper)

GPT-5 as an RLM: fewer syntax errors in trajectories, more stable as depth increases (Table 1).

Qwen3-Coder-480B-A35B as an RLM: more syntax errors even on correct runs (Figure 4b). Extra recursion depth can hurt. Prefer coarser batches and a hard depth cap with this class of model.

In-context decomposition examples in the system prompt change the first split and the final score on OOLONG, even when the example is from another task (Figure 4a). Put a concrete split in the sub-agent brief.

## Failure modes

Infinite recursion: this skill is depth 1; sub-agents must not launch sub-agents.

The same span processed twice: partition once into disjoint batches; deduplicate before merge.

Sub-agent missing the question or the schema: the brief is the whole context that agent gets.

Merged answer contradicts the files: spot-check cited lines; re-read the conflict.

## Numbers from Table 1 (GPT-5 unless noted)

| Task | Without RLM | RLM (depth=1) |
|------|-------------|----------------|
| BrowseComp-Plus, 6 to 11M tokens | compaction 70.5%; GPT-5 base hits the context limit | 91.3% at $0.99 average |
| OOLONG | GPT-5 44.0 | 56.0 (+28.4% vs base; Qwen3-Coder +33.3%) |
| OOLONG-Pairs | F1 0.1 | F1 58.0 (76.0 at depth=3) |

A linear extrapolation of GPT-5-mini ingesting 6 to 11M tokens is $1.50 to $2.75. Median RLM cost is comparable or lower than the base model; the average can rise on long outlier trajectories.

## Skip decomposition when

- the job is one file, one function, or a single needle
- the answer sits in one obvious range
- latency matters more than completeness
- coordination would cost more than a direct read
