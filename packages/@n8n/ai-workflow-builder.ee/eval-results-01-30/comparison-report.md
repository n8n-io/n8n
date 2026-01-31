# Evaluation Comparison Report: Code-Based Agent (Sonnet 4.5) vs Multi-Agent

**Generated:** 2026-01-30
**Test Cases:** 141 (pairwise evaluation suite)
**Code-Based Model:** Claude Sonnet 4.5
**Multi-Agent Baseline:** From January 20, 2026 run (142 test cases)

## Executive Summary (Sonnet 4.5)

| Metric | Code-Based (Sonnet 4.5) | Multi-Agent | Winner |
|--------|-------------------------|-------------|--------|
| **Pass Rate** | 55.3% (78/141) | 50.0% (71/142) | Code-Based |
| **Fail Rate** | 44.7% (63/141) | 50.0% (71/142) | Code-Based |
| **Error Rate** | 0% (0/141) | 0% (0/142) | Tie |
| **Overall Avg Score** | 77.3% | 74.1% | Code-Based |
| **Pairwise Evaluator Avg** | 55.3% | 50.0% | Code-Based |
| **Programmatic Evaluator Avg** | 99.3% | 98.2% | Code-Based |
| **Avg Judges Passed (of 3)** | 1.66 | 1.50 | Code-Based |
| **Total Violations** | 455 (3.2/test) | 500 (3.5/test) | Code-Based |
| **Latency P50** | 96.8s | 171.9s | Code-Based |
| **Latency P99** | 254.6s | 345.3s | Code-Based |
| **Cost P50** | $0.24 | $0.39 | Code-Based |
| **Cost P99** | $0.87 | $1.01 | Code-Based |
| **Cost Mean** | $0.28 | $0.44 | Code-Based |

Langsmith run https://smith.langchain.com/o/f3711c2a-fe3f-43a3-96aa-692f8f979c5a/datasets/06956533-5582-4d9c-8b4c-7fe21c31d572/compare?selectedSessions=74b50dba-ce56-4ea8-acfe-20d4bbdae652

## Key Finding (Sonnet 4.5)

**The code-based agent (Sonnet 4.5) outperforms the multi-agent system across all key metrics:**

- Code-based has **10.6% higher pass rate** (55.3% vs 50.0%)
- Code-based scores **10.6% higher** on the pairwise evaluator (55.3% vs 50.0%)
- Code-based has **9% fewer violations** per test (3.2 vs 3.5)
- Code-based is **1.8x faster** at P50 (96.8s vs 171.9s)
- Code-based is **36% cheaper** at mean cost ($0.28 vs $0.44)
- Code-based has **zero errors** matching multi-agent

---

## Most Common Code-Based Issues (Sonnet 4.5)

Analysis of pairwise judge violations reveals these recurring patterns:

### 1. GPT Model Specification (15 occurrences)
- Evals require specifying `gpt-5-mini` in lmChatOpenAi nodes
- The code agent actually sets this correclty but fails because judge thinks gpt-5-mini does not exist
`Node 'OpenAI Chat Model' (id: e6d28322-66bb-49e8-8fbf-3a751841a1a4) of type '@n8n/n8n-nodes-langchain.lmChatOpenAi' has the model parameter set to 'gpt-5-mini'. However, 'gpt-5-mini' is not a valid OpenAI model name. ...`
- Basically impossible to beat.

### 2. Google Sheets Configuration (9 occurrences)
- Not using `mode: list` for `documentId` and `sheetName` parameters
- The agent uses url here because the prompt literally says `I have a URL` and `using the URL`. I am not going to fix this. What the agent is doing makes sense.

### 3. Embeddings Node Selection (9 occurrences)
- Not using `embeddingsGoogleGemini` for image generation with Banana API
- Using HTTP Request nodes directly instead of embedding nodes
- Here's the agent's thinking and confusion. Basically it does not understand how to use this. Hopefully this is something best practices/planning can help resolve?
```
 "Let me reconsider: Perhaps the user wants to use Google Gemini's image analysis capabilities instead? That would make more sense for processing an uploaded photo before sending to Banana.\n" +
    '\n' +
    '**Revised Architecture:**\n' +
    '1. Form Trigger (file upload)\n' +
    '2. Google Gemini Image Analysis (analyze the uploaded photo)\n' +
    '3. HTTP Request to Banana API (generate 3D model using the image)\n' +
    '4. Respond to Webhook (return result)\n' +
    '\n' +
    `But the user specifically said "embeddingsGoogleGemini" - I'll include it but note this is unusual. Let me search for more context on how embeddings might be used here.\n` +
```

### 4. Vector Store Retriever Connections (9 occurrences)
- Vector Store Retriever not properly connected to Vector Store
- Missing embedding inputs on vector store nodes

### 5. Approval Workflow Patterns (6 occurrences)
- Not using `sendAndWait` operation for approval workflows
- Using generic wait nodes instead of message-based approval

### 6. Tool Selection (6 occurrences each)
- Not using Perplexity node for news discovery
- Not using PhantomBuster/Apify for LinkedIn scraping
- Not using AI Agent node when required

### 7. Node Configuration (6 occurrences each)
- Merge node not using correct `numberInputs` and `mode: append`
- Missing webhook nodes or incorrect webhook configuration
- HighLevel node configuration issues

---

## Latency and Cost Analysis (Sonnet 4.5)

### Latency (seconds)

| Metric | Code-Based (Sonnet 4.5) | Multi-Agent | Ratio |
|--------|-------------------------|-------------|-------|
| **P50** | 96.8s | 171.9s | **0.56x** |
| **P99** | 254.6s | 345.3s | **0.74x** |
| **Mean** | 104.3s | 176.6s | **0.59x** |
| **Min** | 23.0s | 42.4s | 0.54x |
| **Max** | 255.7s | 354.8s | 0.72x |

**Key Insight:** Code-based (Sonnet 4.5) is consistently faster across all percentiles with no extreme outliers.

### Cost (USD)

| Metric | Code-Based (Sonnet 4.5) | Multi-Agent | Ratio |
|--------|-------------------------|-------------|-------|
| **P50** | $0.24 | $0.39 | **0.62x** |
| **P99** | $0.87 | $1.01 | **0.86x** |
| **Mean** | $0.28 | $0.44 | **0.64x** |
| **Max** | $1.07 | - | - |

**Key Insight:** Code-based (Sonnet 4.5) is significantly cheaper with tight variance.

### Total Dataset Run (Sonnet 4.5)

| Metric | Code-Based (Sonnet 4.5) | Multi-Agent |
|--------|-------------------------|-------------|
| **Total Time** | 245.2 min (4.1 hr) | 417.4 min (7.0 hr) |
| **Total Cost** | $40.38 | ~$62.48 (142 examples) |

**Key Insight:** Code-based completes the full dataset in approximately **half the time** and at **35% lower cost**.

---

## Detailed Results (Sonnet 4.5)

### Code-Based Agent Performance (Sonnet 4.5)
- **Pass:** 78 (55.3%)
- **Fail:** 63 (44.7%)
- **Error:** 0 (0%)
- **Overall Average Score:** 77.3%
- **Evaluator Averages:**
  - Pairwise: 55.3%
  - Programmatic: 99.3%

### Multi-Agent Performance (January 20, 2026 Baseline)
- **Pass:** 71 (50.0%)
- **Fail:** 71 (50.0%)
- **Error:** 0 (0%)
- **Overall Average Score:** 74.1%
- **Evaluator Averages:**
  - Pairwise: 50.0%
  - Programmatic: 98.2%

---

## Comparative Analysis (Sonnet 4.5)

### Why Code-Based (Sonnet 4.5) Performs Better

1. **Zero Errors**: No timeout or empty generation issues
2. **High Programmatic Score**: Better handling of node connections and configurations (99.3%)
3. **Better Node Selection**: Fewer violations for node type selection and configuration
4. **Consistent Performance**: No extreme outliers in latency or cost

### Remaining Code-Based Challenges (Sonnet 4.5)

The code-based agent still struggles with:
1. **Specific model requirements** - Using exact model names like `gpt-5-mini`
2. **Google Sheets mode configuration** - list vs url/name modes
3. **Embedding node selection** - Choosing correct embedding nodes for specific use cases
4. **Approval workflow patterns** - Using sendAndWait operations

### Areas Where Both Struggle

Both systems show similar challenges with:
- Very specific node configurations (exact model names, specific modes)
- Complex multi-step workflows with specialized patterns
- Domain-specific integrations (HighLevel, PhantomBuster, etc.)

---

## Recommendations (Sonnet 4.5)

### Further Improving Code-Based

1. **Add model hints** - Include guidance for specific model requirements in node schemas
2. **Default modes** - Configure Google Sheets to default to `mode: list`
3. **Node disambiguation** - Better guidance for choosing between similar node types (e.g., Google Gemini vs embeddingsGoogleGemini)
4. **Pattern library** - Include common workflow patterns like approval workflows with sendAndWait

---

## Appendix: Test Environment (Sonnet 4.5)

- **Code-Based Run Date:** January 30, 2026
- **Code-Based Model:** Claude Sonnet 4.5
- **Multi-Agent Baseline Date:** January 20, 2026
- **Evaluation Framework:** Pairwise evaluation with 3 judges
- **Test Dataset:** 141-142 workflow generation prompts
