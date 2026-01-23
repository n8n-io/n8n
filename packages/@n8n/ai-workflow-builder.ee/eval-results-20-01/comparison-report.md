# Evaluation Comparison Report: Code-Based vs Multi-Agent

**Generated:** 2026-01-20
**Test Cases:** 142 (pairwise evaluation suite)

## Executive Summary

| Metric | Code-Based | Multi-Agent | Winner |
|--------|----------|-------------|--------|
| **Pass Rate** | 25.4% (36/142) | 50.0% (71/142) | Multi-Agent |
| **Fail Rate** | 65.5% (93/142) | 50.0% (71/142) | Multi-Agent |
| **Error Rate** | 9.2% (13/142) | 0% (0/142) | Multi-Agent |
| **Overall Avg Score** | 54.7% | 74.1% | Multi-Agent |
| **Pairwise Evaluator Avg** | 27.9% | 50.0% | Multi-Agent |
| **Programmatic Evaluator Avg** | 92.6% | 98.2% | Multi-Agent |
| **Avg Judges Passed (of 3)** | 0.82 | 1.50 | Multi-Agent |
| **Total Violations** | 632 (4.9/test) | 500 (3.5/test) | Multi-Agent |
| **Latency P50** | 90.3s | 171.9s | Code-Based |
| **Latency P99** | 206.9s | 345.3s | Code-Based |
| **Cost P50** | $0.09 | $0.39 | Code-Based |
| **Cost P99** | $3.10 | $1.01 | Multi-Agent |
| **Cost Mean** | $0.48 | $0.44 | Multi-Agent |

You can find the full langsmith comparison view here https://smith.langchain.com/o/f3711c2a-fe3f-43a3-96aa-692f8f979c5a/datasets/06956533-5582-4d9c-8b4c-7fe21c31d572/compare?selectedSessions=2b1f9969-8fd4-40b0-a363-07ca111b9454%2Ce34c867d-b938-454d-b4c9-0c9559a7bf87&textDisplayMode=compact&activeSession=2b1f9969-8fd4-40b0-a363-07ca111b9454

## Key Finding

**The multi-agent system significantly outperforms code-based across all quality metrics.** The pairwise evaluation reveals that:
- Multi-agent has **2x the pass rate** (50% vs 25.4%)
- Multi-agent has **zero errors** vs 13 errors for code-based
- Multi-agent scores **35% higher** on the pairwise evaluator (50% vs 27.9%)
- Multi-agent has **28% fewer violations** per test (3.5 vs 4.9)

The trade-off is approximately **1.6x longer generation time** (177s vs 110s average).

---

## Most Common Code-Based Issues

Analysis of 281 pairwise judge violations in code-based results reveals these recurring patterns:

### 1. Wrong Node Type Selection (12+ occurrences)
The code-based agent frequently selects incorrect node variants:
- Using `googleGemini` instead of `embeddingsGoogleGemini` for embedding operations
- Using `lmChatOpenAi` without specifying the correct model (`gpt-5-mini`)
- Confusing similar node types (e.g., Google Gemini vs Gemini image analysis)

### 2. Google Sheets Configuration Errors (12 occurrences)
- Not using `mode: list` for `documentId` and `sheetName` parameters
- Hardcoding values instead of using the list selection mode

### 3. Gemini Image Analysis Misconfiguration (12 occurrences)
- Not properly setting `resource: image` and `operation: analyze` when image analysis is needed
- Using generic Gemini node instead of image-specific configuration

### 4. Missing Structured Output Parser Connections (25+ occurrences)
- AI Agent nodes created without connecting Structured Output Parser
- Output Parser nodes created but not connected to language model inputs
- Incorrect output reference format (using `$json.myfield` instead of `$json.output.myfield`)

### 5. Gmail Trigger Simplify Setting (30 occurrences)
- Failing to disable the "Simplify" option on Gmail trigger nodes
- This causes loss of full email body and attachments needed for processing

### 6. Tool Selection and Connection Issues (108 occurrences)
- Not connecting appropriate tools (SERP API, Perplexity, HTTP) to AI Agents
- Using Code nodes instead of dedicated nodes (e.g., Remove Duplicates, Aggregate)
- Missing tool descriptions in AI Agent system prompts

### 7. Multiple Trigger Handling (94 occurrences)
- Workflows requiring multiple triggers (e.g., form + email) often misconfigured
- Missing webhook response mode configuration
- Chat trigger nodes missing required settings (`public: true`, `loadPreviousSession: memory`)

### 8. Vector Store Connection Issues (12 occurrences)
- Vector Store Retriever not properly connected to Vector Store
- Missing embedding inputs on vector store nodes
- Text splitter connection errors

### 9. Data Flow Pattern Errors (6+ occurrences each)
- Not using Set nodes to organize data before sending
- Missing Aggregate nodes before AI Agent inputs
- Incorrect Merge node configuration (wrong number of inputs)

### 10. Programmatic Connection Failures
Critical connection errors found in code-based workflows:
- `outputParserStructured` missing `ai_languageModel` input (5 instances)
- AI Agent missing language model connections (4 instances)
- Node types not found errors (`removeDuplicates`, `toolVectorStore`)
- Sticky notes incorrectly receiving main connections (3 instances)

---

## Latency and Cost Analysis

Data from LangSmith (142 runs per agent, 2 repetitions per example).

### Latency (seconds)

| Metric | Code-Based | Multi-Agent | Ratio |
|--------|----------|-------------|-------|
| **P50** | 90.3s | 171.9s | 1.9x |
| **P99** | 206.9s | 345.3s | 1.7x |
| **Mean** | 109.9s | 176.6s | 1.6x |
| **Min** | 34.0s | 42.4s | 1.2x |
| **Max** | 1210.4s | 354.8s | 0.3x |

**Key Insight:** While multi-agent is consistently slower at median (1.9x), code-based has extreme outliers (max 1210s vs 355s) (there's some bug that the POC did not address leading to timeouts and these extremes). Multi-agent is more predictable.

### Cost (USD)

| Metric | Code-Based | Multi-Agent | Ratio |
|--------|----------|-------------|-------|
| **P50** | $0.09 | $0.39 | 4.3x |
| **P99** | $3.10 | $1.01 | 0.3x |
| **Mean** | $0.48 | $0.44 | 0.9x |

**Key Insight:** One-shot has lower median cost but extreme variance. At P99, code-based costs 3x more than multi-agent. Mean costs are nearly identical ($0.48 vs $0.44). (Again there's some bug that the POC did not address leading to timeouts and these extremes)

### Token Usage

| Metric | Code-Based | Multi-Agent | Ratio |
|--------|----------|-------------|-------|
| **P50** | 19,891 | 36,823 | 1.9x |
| **P99** | 911,572 | 122,976 | 0.1x |
| **Mean** | 135,046 | 42,122 | 0.3x |

**Key Insight:** One-shot shows extreme token variance - P99 is 46x its P50 (vs 3.3x for multi-agent).

### Total Dataset Run (71 examples)

| Metric | Code-Based | Multi-Agent |
|--------|----------|-------------|
| **Total Time** | 130.0 min (2.2 hr) | 209.0 min (3.5 hr) |
| **Total Cost** | $34.31 | $30.98 |

**Key Insight:** Running the full 71-example dataset costs **$3.33 less with multi-agent** ($30.98 vs $34.31) while taking 1.6x longer. The cost savings come from multi-agent's more predictable token usage.

### Code-Based Agent: Slowest/Most Expensive Examples

**Timed Out (20+ minutes):**

1. **example-048** ([`one-shot-pairwise-eval-results/example-048-f44cba21/`](../one-shot-pairwise-eval-results/example-048-f44cba21/workflow.json))
   - Duration: 1210s (20 min timeout)
   - Prompt: "Design a production‑ready n8n workflow implementing the TUKE Helpdesk F1‑Chat process using: HTTP Webhook, Supabase (pgvector), Azure OpenAI, Guardrails, chat_sessions..."
   - Issue: Extremely complex multi-system integration with RAG
	 - Result: Empty workflow with an error.

2. **example-138** ([`one-shot-pairwise-eval-results/example-138-039d8610/`](../one-shot-pairwise-eval-results/example-138-039d8610/workflow.json))
   - Duration: 1207s (20 min timeout)
   - Prompt: "Build an automation where I provide a list of companies... AI agent scrapes them... prepare emails... rag system with pinecone..."
   - Issue: Multi-step workflow with scraping, RAG, and email drafting
	 - Result: Empty workflow with an error.

**Most Expensive (from LangSmith):**

| Cost | Latency | Pattern |
|------|---------|---------|
| $9.34 | 51.7s | High token churn without timeout |
| $5.64 | 65.1s | Expensive retry loops |
| $3.10 | 46.5s | Multiple generation attempts |

**Common Pattern:** Complex prompts requiring RAG, multi-system integration, or multi-step workflows cause the code-based agent to enter expensive generation loops or timeout entirely.

**There's some bug here.** In these cases the coding agent generated an empty workflow.

### Summary

Multi-agent provides:
- **More predictable latency** - tighter distribution, no extreme outliers
- **More predictable cost** - P99 cost 3x lower than code-based
- **Consistent token usage** - less variance in API consumption
- **Lower total cost** - $30.98 vs $34.31 for full dataset run

---

## Detailed Results

### Code-Based Agent Performance
- **Pass:** 36 (25.4%)
- **Fail:** 93 (65.5%)
- **Error:** 13 (9.2%)
- **Overall Average Score:** 54.7%
- **Evaluator Averages:**
  - Pairwise: 27.9%
  - Programmatic: 92.6%

### Multi-Agent Performance
- **Pass:** 71 (50.0%)
- **Fail:** 71 (50.0%)
- **Error:** 0 (0%)
- **Overall Average Score:** 74.1%
- **Evaluator Averages:**
  - Pairwise: 50.0%
  - Programmatic: 98.2%

---

## Comparative Analysis

### Why Multi-Agent Performs Better

1. **Iterative Refinement**: Multi-agent can review and correct its own work, catching connection errors that code-based misses
	Right now code-based agent one-shots the first workflow. There's no validation or iterative loop.
2. **Specialized Reasoning**: Separate planning and execution phases allow for better node selection
	That can be added to coding agent.
3. **Better Tool Integration**: Higher programmatic scores (98.2% vs 92.6%) show more correct node connections
	Right now code-based agent still has some edge cases that were not addressed in the POC.
4. **Best Practices**: Multi-agent has a lot of best practices that were not ported over to the coding agent. These are what are our pairwise evals are looking for.
5. **Bugs**: 20+ minutes timeouts indicate either there's a bug in the POC.

### Code-Based Failure Patterns

The code-based agent struggles most with:
1. **Complex configurations** - Multi-step node setups like Structured Output Parsers
	- This is a missing piece in the workflow-sdk that needs to be addressed.
2. **Mode/option selection** - Choosing correct modes (list vs manual, simplify vs full)
	- We can add modes as a split parameter similar to resource and operation.
	- For gmail simplify specifically, we need to add some hint to the node itself to guide the agent to select this.
3. **Connection topology** - Ensuring all required inputs are connected
4. **Node variant selection** - Picking the right node from similar options
	- We don't have best practices included here. Current implementation defaults to code node for example, which the evals look for and frown upon.

### Areas Where Both Struggle

Even multi-agent shows 50% fail rate, indicating shared challenges:
- Very specific node configurations (e.g., exact model names)
- Edge case handling in complex workflows
- Domain-specific patterns not well represented in training

---

## Recommendations

### For Improving Code-Based

1. **Add configuration validation** before finalizing workflows
2. **Enhance node selection logic** with better disambiguation.
	- right now we split the node types by version. We can also split them by resource/operation.
	- search_nodes would search by node, that would return resource/operations.
	- get_nodes would return types just for that resource operation
3. **Include mode/option defaults** based on common patterns
4. Experiment with adding common node-used types to initial prompt for caching.
5. Fix bug leading to timeout and empty generations.
6. Fix sdk to support the subconnection issue that's failing a lot. And other workflow representation issues that I did not get to finish.
