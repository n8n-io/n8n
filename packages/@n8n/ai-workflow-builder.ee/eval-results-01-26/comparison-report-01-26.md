# Evaluation Report: New Code-Based Agent vs Old Multi-Agent Architecture

**Generated:** 2026-01-26
**Model Tested:** Sonnet 4.5 (new code-based agent)
**Test Suites:** Pairwise (71 examples), One-Shot with LLM Judge + Programmatic (10 examples)

> **Note on Repetitions:** Old Multi-Agent results were run with 2 repetitions per example. New Code-Based agent results were run with only 1 repetition per example.

## Executive Summary

### One-Shot Evaluation (LLM Judge + Programmatic, 10 examples)

| Metric | Code-Based (Sonnet 4.5) | Old Multi-Agent | Best |
|--------|------------------------|-----------------|------|
| **Pass Rate** | 100% | 100% | Tie |
| **Average Score** | 87.68% | 88.7% | Old |
| **LLM Judge Avg** | 85.47% | 82.3% | Code-Based |
| **Programmatic Avg** | 99.64% | 97.5% | Code-Based |

### Pairwise Evaluation (71 examples)

| Metric | Code-Based (Sonnet 4.5) | Old Multi-Agent | Best |
|--------|------------------------|-----------------|------|
| **Pass Rate** | 39.4% (28/71) | 50.0% (71/142) | Old |
| **Fail Rate** | 59.2% (42/71) | 50.0% (71/142) | Old |
| **Error Rate** | 1.4% (1/71) | 0% | Old |
| **Average Score** | 67.4% | 74.1% | Old |
| **Pairwise Evaluator Avg** | 40.0% | 50.0% | Old |
| **Programmatic Avg** | 96.64% | 98.2% | Old |

**Key Findings:**
- Code-Based Sonnet 4.5 underperforms Old Multi-Agent on pairwise evaluation
- One-shot evaluation shows comparable performance
- Pairwise pass rate: Code-Based 39.4% vs Old Multi-Agent 50.0%

---

## Latency Analysis

### One-Shot Evaluation (10 examples)

| Metric | Code-Based (Sonnet 4.5) | Old Multi-Agent |
|--------|------------------------|-----------------|
| **P50** | 66.5s | 171.9s |
| **P99** | 101.4s | 345.3s |
| **Mean** | 70.2s | 176.6s |

### Pairwise Evaluation (71 examples)

| Metric | Code-Based (Sonnet 4.5) | Old Multi-Agent |
|--------|------------------------|-----------------|
| **Mean** | 81.6s | 176.6s |

**Note:** New code-based agent is ~2x faster than old multi-agent architecture.

---

## Cost Analysis

*Pricing: Sonnet ($3/1M input, $15/1M output)*

### Pairwise Evaluation (71 examples)

| Metric | Code-Based (Sonnet) | Old Multi-Agent |
|--------|---------------------|-----------------|
| **Mean** | $0.38 | $0.44 |
| **Total** | $27.18 | $30.98 |

### One-Shot Evaluation (10 examples)

| Metric | Code-Based (Sonnet) |
|--------|---------------------|
| **Mean** | $0.22 |
| **Total** | $2.22 |

### Token Usage Summary (New Code-Based Agent)

| Evaluation | Model | Input Tokens | Output Tokens | Total Cost |
|------------|-------|--------------|---------------|------------|
| One-Shot | Sonnet 4.5 | ~740,000 | ~30,000 | $2.22 |
| Pairwise | Sonnet 4.5 | 7,356,848 | 340,548 | $27.18 |

**Note:** Code-Based Sonnet 4.5 has similar cost to Old Multi-Agent (~$0.38/run vs $0.44/run).

---

## Key Findings & Analysis

### Performance Comparison

| Aspect | Code-Based (Sonnet) | Old Multi-Agent | Winner |
|--------|---------------------|-----------------|--------|
| **Quality (Pairwise)** | 67.4% | 74.1% | Old (+6.7pp) |
| **Pass Rate (Pairwise)** | 39.4% | 50.0% | Old (+10.6pp) |
| **Speed** | 81.6s mean | 176.6s mean | Code-Based (2x faster) |
| **Cost** | $0.38/run | $0.44/run | Code-Based (14% cheaper) |

### Code-Based Sonnet 4.5 Advantages
1. **2x Faster**: 81.6s vs 176.6s mean latency
2. **Slightly Cheaper**: $0.38 vs $0.44 per workflow
3. **Strong One-Shot Performance**: 100% pass rate, comparable to multi-agent

### Code-Based Sonnet 4.5 Disadvantages
1. **Lower Pairwise Pass Rate**: 39.4% vs 50.0%
2. **Lower Average Score**: 67.4% vs 74.1%
3. **More Failures**: 42 failures vs multi-agent's balanced performance

### Failed Examples (42 failures + 1 error)

Notable failures include:
- Wound image processing workflows
- Tableau to Google Sheets transfers
- Investor research workflows
- Discord community bots
- Regulatory compliance RAG workflows
- Various lead generation and automation tasks

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

### Technical Improvements Needed

1. **Fix Node Connection Logic** - Ensure all nodes requiring input connections are properly connected
2. **Validate AI Agent Setup** - Check that all AI Agents have required LLM and tool connections
3. **Improve Data Flow Validation** - Add checks for data structure compatibility between nodes

### Next Steps

1. Investigate why pairwise performance dropped compared to multi-agent
2. Analyze common failure patterns in the 42 failed examples
3. Consider prompt improvements to address critical violations

---

## Conclusion

The January 26 evaluation shows mixed results for the new code-based agent with Sonnet 4.5:

| Metric | Code-Based (Sonnet) | Old Multi-Agent |
|--------|---------------------|-----------------|
| **Pairwise Pass Rate** | 39.4% | 50.0% |
| **Average Score** | 67.4% | 74.1% |
| **Cost per Run** | $0.38 | $0.44 |
| **Latency** | 82s | 177s |

**Key Takeaways:**
- Code-Based Sonnet 4.5 is **2x faster** and **14% cheaper** than Old Multi-Agent
- However, it has **lower quality** on pairwise evaluation (39.4% vs 50.0% pass rate)
- One-shot performance remains strong at 100% pass rate
- Further investigation needed to improve pairwise performance
