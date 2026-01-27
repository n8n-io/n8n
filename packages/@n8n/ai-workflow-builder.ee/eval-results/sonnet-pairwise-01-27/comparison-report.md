# Evaluation Comparison Report: Sonnet One-Shot vs Multi-Agent

**Generated:** 2026-01-27
**Test Cases:** 71 examples (pairwise evaluation suite)

## Executive Summary

| Metric | Sonnet One-Shot (01-27) | Multi-Agent (01-20) | Winner |
|--------|------------------------|---------------------|--------|
| **Pass Rate** | 42.3% (30/71) | 50.0% (71/142) | Multi-Agent |
| **Fail Rate** | 54.9% (39/71) | 50.0% (71/142) | Multi-Agent |
| **Error Rate** | 2.8% (2/71) | 0% (0/142) | Multi-Agent |
| **Overall Avg Score** | 68.3% | 74.1% | Multi-Agent |
| **Pairwise Evaluator Avg** | 43.5% | 50.0% | Multi-Agent |
| **Programmatic Evaluator Avg** | 97.1% | 98.2% | Multi-Agent |

---

## Key Finding

The Sonnet one-shot approach has **closed about half the gap** between the original code-based POC and multi-agent:

```
Original Code-Based → Sonnet One-Shot → Multi-Agent
     25.4%                42.3%            50.0%
         ├─────── +17pp ───────┼──── -7.7pp ────┤
```

---

## Gap Analysis vs Multi-Agent

| Metric | Gap (One-Shot vs Multi-Agent) |
|--------|------------------------------|
| Pass Rate | -7.7pp (42.3% vs 50.0%) |
| Pairwise Evaluator | -6.5pp (43.5% vs 50.0%) |
| Overall Score | -5.8pp (68.3% vs 74.1%) |
| Programmatic Evaluator | -1.1pp (97.1% vs 98.2%) |
| Error Rate | +2.8pp (2.8% vs 0%) |

---

## Resource Usage (Sonnet One-Shot 01-27)

### Token Usage

| Metric | Value |
|--------|-------|
| Total Input Tokens | 5,097,595 |
| Total Output Tokens | 342,276 |
| Avg Input per Example | ~71,800 |
| Avg Output per Example | ~4,800 |

### Duration

| Metric | Value |
|--------|-------|
| Total Duration | 97.9 minutes |
| Avg per Example | ~83 seconds |

---

## Error Analysis

Only 2 errors occurred in the Sonnet one-shot run:

1. **Example 13** - "One-shot agent did not produce a workflow"
   - Prompt: Complex multi-company lead processing workflow

2. **Example 48** - "One-shot agent did not produce a workflow"
   - Prompt: HubSpot lead generation email automation

Both failures involved complex multi-step workflows with multiple integrations.

---

## Recommendations

### To Close Remaining Gap

1. **Address multi-integration workflows** - The 2 errors both involved complex multi-system integrations
2. **Improve pairwise quality** - Still 6.5pp behind multi-agent on best practices
3. **Eliminate remaining errors** - Multi-agent achieves 0% error rate

---

