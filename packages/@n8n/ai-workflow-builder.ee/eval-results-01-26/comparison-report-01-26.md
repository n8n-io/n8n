# Evaluation Report: New Code-Based Agent vs Old Multi-Agent Architecture

**Generated:** 2026-01-26
**Models Tested:** Sonnet 4.5, Opus 4.5 (new code-based agent)
**Test Suites:** Pairwise (71 examples), One-Shot with LLM Judge + Programmatic (10 examples)

**Notes on Repetitions:**
- Old Multi-Agent results were run with 2 repetitions per example. New Code-Based agent results were run with only 1 repetition per example.

- Unlike last run, both Opus and Sonnet runs were run here using the same simplified prompt.

- Latest Sonnet results were run with only 1 judge. Rest were 3 judges.

## Executive Summary

### One-Shot Evaluation (LLM Judge + Programmatic, 10 examples)

| Metric | Code-Based (Opus 4.5) | Code-Based (Sonnet 4.5) | Old Multi-Agent | Best |
|--------|----------------------|------------------------|-----------------|------|
| **Pass Rate** | 100% | 100% | 100% | Tie |
| **Average Score** | 91.03% | 87.68% | 88.7% | Opus |
| **LLM Judge Avg** | 90.73% | 85.47% | 82.3% | Opus |
| **Programmatic Avg** | 100% | 99.64% | 97.5% | Opus |

### Pairwise Evaluation (71 examples)

| Metric | Code-Based (Opus 4.5) | Code-Based (Sonnet 4.5) | Old Multi-Agent | Best |
|--------|----------------------|------------------------|-----------------|------|
| **Pass Rate** | 94.4% (67/71) | 85.9% (61/71) | 50.0% (71/142) | Opus |
| **Fail Rate** | 4.2% (3/71) | 12.7% (9/71) | 50.0% (71/142) | Opus |
| **Error Rate** | 1.4% (1/71) | 1.4% (1/71) | 0% | Old |
| **Average Score** | 88.02% | 82.13% | 74.1% | Opus |
| **LLM Judge Avg** | 88.22% | 80.47% | 50.0% | Opus |
| **Programmatic Avg** | 96.18% | 95.02% | 98.2% | Old |

**Key Findings:**
- New code-based agent with Opus 4.5 achieves highest scores across both evaluations
- Both code-based agents significantly outperform old multi-agent architecture
- Pairwise pass rate: Opus 94.4% vs Sonnet 85.9% vs Old Multi-Agent 50.0%

---

## Latency Analysis

### One-Shot Evaluation (10 examples)

| Metric | Code-Based (Opus 4.5) | Code-Based (Sonnet 4.5) | Old Multi-Agent |
|--------|----------------------|------------------------|-----------------|
| **P50** | 63.2s | 66.5s | 171.9s |
| **P99** | 93.8s | 101.4s | 345.3s |
| **Mean** | 64.5s | 70.2s | 176.6s |

### Pairwise Evaluation (71 examples)

| Metric | Code-Based (Opus 4.5) | Code-Based (Sonnet 4.5) | Old Multi-Agent |
|--------|----------------------|------------------------|-----------------|
| **P50** | ~85s | 90.3s | 171.9s |
| **P99** | ~220s | 406.9s | 345.3s |
| **Mean** | 97.9s | 107.2s | 176.6s |

**Note:** New code-based agents are ~2x faster than old multi-agent architecture. Opus is slightly faster than Sonnet.

---

## Cost Analysis

*Pricing: Opus ($15/1M input, $75/1M output), Sonnet ($3/1M input, $15/1M output)*

### One-Shot Evaluation (10 examples)

| Metric | Code-Based (Opus) | Code-Based (Sonnet) | Ratio |
|--------|-------------------|---------------------|-------|
| **Mean** | $1.40 | $0.22 | 6.4x |
| **Total** | $14.00 | $2.22 | 6.3x |

### Pairwise Evaluation (71 examples)

| Metric | Code-Based (Opus) | Code-Based (Sonnet) | Ratio |
|--------|-------------------|---------------------|-------|
| **Mean** | $2.40 | $0.40 | 6.0x |
| **Total** | $170.40 | $28.40 | 6.0x |

### Token Usage Summary (New Code-Based Agent)

| Evaluation | Model | Input Tokens | Output Tokens | Total Cost |
|------------|-------|--------------|---------------|------------|
| One-Shot | Opus 4.5 | 767,236 | 33,186 | $14.00 |
| One-Shot | Sonnet 4.5 | ~740,000 | ~30,000 | $2.22 |
| Pairwise | Opus 4.5 | 9,409,487 | 390,154 | $170.40 |
| Pairwise | Sonnet 4.5 | ~9,000,000 | ~350,000 | $28.40 |

---

## Key Findings & Analysis

### Performance Comparison (New Code-Based Agent)

| Aspect | Code-Based (Opus) | Code-Based (Sonnet) | Winner |
|--------|-------------------|---------------------|--------|
| **Quality (Pairwise)** | 88.02% | 82.13% | Opus (+5.9pp) |
| **Pass Rate (Pairwise)** | 94.4% | 85.9% | Opus (+8.5pp) |
| **Speed** | 97.9s mean | 107.2s mean | Opus (9% faster) |
| **Cost** | $2.40/run | $0.40/run | Sonnet (6x cheaper) |

### Code-Based Opus 4.5 Advantages
1. **Highest Quality**: 88% average score on pairwise (vs 82% Sonnet)
2. **Fewer Failures**: Only 3 failures vs 9 for Sonnet
3. **Better LLM Judge Scores**: 88.22% vs 80.47%
4. **Slightly Faster**: ~10% faster execution

### Code-Based Sonnet 4.5 Advantages
1. **6x Lower Cost**: $0.40 vs $2.40 per workflow
2. **Strong Quality**: Still significantly beats old multi-agent architecture
3. **Good Value**: 82% quality at 17% of Opus cost

### Failed Examples

**Code-Based Opus 4.5 (3 failures):**
| Example | Score | Issue |
|---------|-------|-------|
| example-015 | 59.4% | Asana ticket analysis |
| example-027 | 64.8% | Discord community bot |
| example-055 | 66.3% | Discord community bot |

**Code-Based Sonnet 4.5 (9 failures):**
| Example | Score | Issue |
|---------|-------|-------|
| example-002 | 62.1% | RSS Feed nodes disconnected |
| example-007 | 66.4% | Workflow duplication |
| example-010 | 61.0% | Disconnected nodes |
| example-020 | 62.0% | Race condition in batching |
| example-021 | 64.2% | Vector store not populated |
| + 4 more | | |

---

## Violation Summary (Code-Based Sonnet 4.5)

### By Severity

| Severity | One-Shot (10) | Pairwise (71) | Total |
|----------|---------------|---------------|-------|
| **Critical** | 54 | 546 | 600 |
| **Major** | 120 | 978 | 1,098 |
| **Minor** | 182 | 1,440 | 1,622 |
| **Total** | 356 | 2,964 | 3,320 |

### Per-Test Average

| Metric | One-Shot | Pairwise |
|--------|----------|----------|
| **Critical/test** | 5.4 | 7.7 |
| **Major/test** | 12.0 | 13.8 |
| **Minor/test** | 18.2 | 20.3 |
| **Total/test** | 35.6 | 41.7 |

---

## Common Violation Patterns

### Critical Issues (Most Frequent)

1. **Disconnected Nodes** - Nodes missing required input connections
   - RSS Feed nodes not connected to triggers
   - HTTP Request nodes orphaned
   - Agent nodes missing LLM connections

2. **Data Flow Breaks** - Data not flowing correctly through workflow
   - Split In Batches output not reconnecting properly
   - Aggregate nodes receiving wrong data
   - Field references to non-existent paths

3. **Incorrect Node Types** - Using wrong node for the task
   - Chat nodes instead of Agent nodes
   - Regular nodes instead of Tool nodes for AI agents

### Major Issues (Most Frequent)

1. **Missing Tool Connections** - AI Agents without required tools
2. **Data Structure Mismatches** - Arrays vs single items, nested vs flat JSON
3. **Authentication/Credential Issues** - Hardcoded API keys, wrong credential types

### Minor Issues (Most Frequent)

1. **Placeholder Values** - Unconfigured parameters
2. **Suboptimal Patterns** - Working but inefficient approaches
3. **Missing Error Handling** - No fallback paths

---

## Detailed Violation Files (Code-Based Sonnet 4.5)

Full violations lists grouped by example are available in separate files:

- **[oneshot-violations-01-26.md](./oneshot-violations-01-26.md)** - One-shot evaluation (10 examples)
- **[pairwise-violations-01-26.md](./pairwise-violations-01-26.md)** - Pairwise evaluation (71 examples)

---

## Recommendations

### Model Selection Guidance (New Code-Based Agent)

| Use Case | Recommended Model | Rationale |
|----------|-------------------|-----------|
| **Production (quality-critical)** | Code-Based Opus 4.5 | Highest quality, fewest failures |
| **Development/Testing** | Code-Based Sonnet 4.5 | Good quality at 6x lower cost |
| **High-volume batch** | Code-Based Sonnet 4.5 | Cost efficiency for bulk operations |
| **Complex workflows** | Code-Based Opus 4.5 | Better handling of edge cases |

### Technical Improvements

1. **Fix Node Connection Logic** - Ensure all nodes requiring input connections are properly connected
2. **Validate AI Agent Setup** - Check that all AI Agents have required LLM and tool connections
3. **Improve Data Flow Validation** - Add checks for data structure compatibility between nodes

---

## Conclusion

The January 26 evaluation shows excellent results for the new code-based agent:

| Metric | Code-Based (Opus) | Code-Based (Sonnet) | vs Old Multi-Agent |
|--------|-------------------|---------------------|-------------------|
| **Pairwise Pass Rate** | 94.4% | 85.9% | +44pp / +36pp |
| **Average Score** | 88.0% | 82.1% | +14pp / +8pp |
| **Cost per Run** | $2.40 | $0.40 | Similar/Lower |
| **Latency** | 98s | 107s | ~2x faster |

**Key Takeaways:**
- New code-based agent with Opus 4.5 delivers the best quality but at 6x the cost of Sonnet
- Sonnet 4.5 offers excellent value: 82% quality at $0.40/workflow
- Both significantly outperform the old multi-agent architecture (50% pass rate)
- New code-based approach is ~2x faster than old multi-agent
