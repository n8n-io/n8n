# Evaluation Report: Code-Based Agent vs Multi-Agent

**Generated:** 2026-01-23
**Models Tested:** Sonnet 4.5, Opus 4.5 (code-based agent)
**Test Suite:** Pairwise evaluation (71-89 examples), LLM Judge + Programmatic (10 examples)

> **Important Note on Prompt Differences:**
>
> Opus 4.5 and Sonnet 4.5 are using **different prompts** optimized using Anthropic's prompt optimizer tool:
> - **Opus 4.5:** Uses a prompt with the **full SDK API**
> - **Sonnet 4.5:** Uses a simpler prompt without the full SDK API
>
> This makes the comparison not strictly apples-to-apples. Opus's lower pairwise performance may be due to the complexity of the full SDK API in its prompt. **Future iterations will test Opus with a simplified SDK** to determine if this improves performance.

## Executive Summary

### Model Comparison (LLM Judge + Programmatic, 10 examples)

| Metric | Opus 4.5 | Sonnet 4.5 | Multi-Agent | Best |
|--------|----------|------------|-------------|------|
| **Pass Rate** | 100% | 100% | 100% | Tie |
| **Average Score** | 93.1% | 89.4% | 88.7% | Opus |
| **LLM Judge Avg** | 89.6% | 84.3% | 82.3% | Opus |
| **Programmatic Avg** | 97.9% | 96.4% | 97.5% | Opus |

### Pairwise Evaluation Comparison

| Metric | Opus 4.5 (71) | Sonnet 4.5 (89) | Multi-Agent (142) | Best |
|--------|---------------|-----------------|-------------------|------|
| **Pass Rate** | 32.4% (23/71) | 36.0% (32/89) | 50.0% (71/142) | Multi-Agent |
| **Fail Rate** | 67.6% (48/71) | 62.9% (56/89) | 50.0% (71/142) | Multi-Agent |
| **Error Rate** | 0% | 1.1% (1/89) | 0% | Opus/Multi |
| **Avg Score** | 62.8% | 64.3% | 74.1% | Multi-Agent |
| **Pairwise Evaluator Avg** | 32.4% | 36.4% | 50.0% | Multi-Agent |
| **Programmatic Avg** | 93.3% | 93.8% | 98.2% | Multi-Agent |
| **Violations** | 209 (2.9/test) | 262 (2.9/test) | 500 (3.5/test) | Opus/Sonnet |

---

## Latency Analysis

### Pairwise Evaluation

| Metric | Opus 4.5 (71) | Sonnet 4.5 (89) | Multi-Agent (142) |
|--------|---------------|-----------------|-------------------|
| **P50** | 58.7s | 73.6s | 171.9s |
| **P99** | 183.0s | 308.7s | 345.3s |
| **Mean** | 69.4s | 80.4s | 176.6s |
| **Min** | 28.8s | 33.5s | 42.4s |
| **Max** | 183.0s | 308.7s | 354.8s |

### LLM Judge + Programmatic (10 examples)

| Metric | Opus 4.5 | Sonnet 4.5 | Multi-Agent |
|--------|----------|------------|-------------|
| **P50** | 58.0s | 56.6s | 171.9s |
| **P99** | 101.1s | 77.5s | 345.3s |
| **Mean** | 60.4s | 58.9s | 176.6s |

### Sonnet 4.5 by Evaluation Type

| Eval Type | P50 | P99 | Mean | Min | Max |
|-----------|-----|-----|------|-----|-----|
| **Pairwise (89 runs)** | 73.6s | 308.7s | 80.4s | 33.5s | 308.7s |
| **LLM Judge (10 runs)** | 56.6s | 77.5s | 58.9s | 49.1s | 77.5s |
| **Programmatic (10 runs)** | 43.2s | 58.7s | 40.9s | 27.2s | 58.7s |

---

## Cost Analysis

### Pairwise Evaluation

| Metric | Opus 4.5 (71) | Sonnet 4.5 (89) | Ratio |
|--------|---------------|-----------------|-------|
| **P50** | $1.20 | $0.22 | 5.5x |
| **P99** | $5.42 | $0.92 | 5.9x |
| **Mean** | $1.51 | $0.27 | 5.6x |
| **Total** | $107.35 | $23.57 | 4.6x |

### LLM Judge + Programmatic (10 examples)

| Metric | Opus 4.5 | Sonnet 4.5 | Ratio |
|--------|----------|------------|-------|
| **P50** | $1.00 | $0.17 | 5.9x |
| **P99** | $4.23 | $0.20 | 21x |
| **Mean** | $1.34 | $0.17 | 7.9x |
| **Total** | $13.43 | $1.66 | 8.1x |

*Pricing: Opus ($15/1M input, $75/1M output), Sonnet ($3/1M input, $15/1M output)*

### Sonnet 4.5 by Evaluation Type

| Eval Type | P50 | P99 | Mean | Total |
|-----------|-----|-----|------|-------|
| **Pairwise (88 runs)** | $0.22 | $0.92 | $0.27 | $23.57 |
| **LLM Judge (10 runs)** | $0.17 | $0.20 | $0.17 | $1.66 |
| **Programmatic (10 runs)** | $0.17 | $0.25 | $0.18 | $1.77 |

### Historical Comparison (Pairwise Evaluation)

| Metric | Jan 20 Code-Based (142 runs) | Jan 23 Sonnet 4.5 (89 runs) | Multi-Agent (142 runs) |
|--------|------------------------------|-----------------------------|-----------------------|
| **Latency P50** | 90.3s | 73.6s | 171.9s |
| **Latency P99** | 206.9s | 308.7s | 345.3s |
| **Latency Mean** | 109.9s | 80.4s | 176.6s |
| **Latency Max** | 1210.4s (timeout bug) | 308.7s | 354.8s |
| **Cost P50** | $0.09 | $0.22 | $0.39 |
| **Cost P99** | $3.10 | $0.92 | $1.01 |
| **Cost Mean** | $0.48 | $0.27 | $0.44 |
| **Total Cost** | $34.31 (71 examples) | $23.57 (89 examples) | $30.98 (71 examples) |

*Note: Jan 20 had timeout bugs causing extreme outliers (1210s max, $9.34 max cost). Jan 23 fixed these issues.*

---

## Key Findings

### Opus 4.5 vs Sonnet 4.5

**LLM Judge + Programmatic (10 examples):**
- Opus scores **3.7 points higher** overall (93.1% vs 89.4%)
- Opus LLM Judge is **5.3 points better** (89.6% vs 84.3%)
- Both have similar programmatic scores (~97-98%)

**Pairwise Evaluation (71 vs 89 examples):**
- **Sonnet outperforms Opus** on pass rate (36.0% vs 32.4%)
- Sonnet has higher pairwise evaluator avg (36.4% vs 32.4%)
- Opus has fewer violations per test (2.9 vs 3.7)
- Opus is faster at P50 (58.7s vs 73.6s)

**Cost-Effectiveness:**
- Opus pairwise: **$107.35** for 71 examples (~$1.51/example)
- Sonnet pairwise: **$23.57** for 89 examples (~$0.27/example)
- **Opus is 5.6x more expensive per example** with lower pass rate
- **Recommendation:** Sonnet 4.5 is the clear winner for pairwise workflows

### Improvements from Previous Code-Based Agent (Jan 20) - Pairwise Eval

| Metric | Jan 20 (142 runs) | Jan 23 Sonnet 4.5 (89 runs) | Change |
|--------|-------------------|-----------------------------| -------|
| **Pairwise Pass Rate** | 25.4% | 36.0% | +10.6 points |
| **Pairwise Error Rate** | 9.2% | 1.1% | -8.1 points |
| **Programmatic Avg** | 92.6% | 93.8% | +1.2 points |
| **Violations per Test** | 4.9 | 3.7 | -1.2 fewer |
| **Latency P50** | 90.3s | 73.6s | -18% faster |
| **Latency Max** | 1210.4s | 308.7s | timeout bugs fixed |
| **Cost P99** | $3.10 | $0.92 | -70% variance |
| **Cost Mean** | $0.48 | $0.27 | -44% cheaper |

### Analysis

**Code-Based Agent (Sonnet 4.5) shows significant improvement over Jan 20 (pairwise):**
- **41% higher pass rate** (36.0% vs 25.4%) in pairwise evaluation
- **Near-zero errors** (1.1% vs 9.2%) - timeout/empty workflow bugs fixed
- **18% faster** at P50 (73.6s vs 90.3s)
- **No extreme outliers** - max 308.7s vs 1210.4s (timeout bug fixed)
- **More predictable costs** - P99 dropped from $3.10 to $0.92 (-70%)
- **44% cheaper** mean cost ($0.27 vs $0.48)

**Multi-agent still outperforms on pairwise:**
- **14 percentage points higher pass rate** (50% vs 36%)
- **Zero errors** vs occasional errors in code-based
- **Better programmatic scores** (98.2% vs 93.8%)

**Code-based shows strength in LLM Judge evaluation:**
- Opus achieves highest score (93.1%)
- Both code-based models beat multi-agent on this eval
- Better on functionality, efficiency, and maintainability metrics

---

## Detailed Results by Evaluation Type

### Pairwise Evaluation - Opus 4.5 (71 examples)

| Metric | Value |
|--------|-------|
| Total Examples | 71 |
| Passed | 23 (32.4%) |
| Failed | 48 (67.6%) |
| Errors | 0 (0%) |
| Average Score | 62.8% |
| Pairwise Evaluator Avg | 32.4% |
| Programmatic Evaluator Avg | 93.3% |
| Total Violations | 209 (2.9/test) |
| Total Duration | 4,930s (~82 min) |
| Total Tokens | 6.1M |
| Total Cost | $107.35 |

### Pairwise Evaluation - Sonnet 4.5 (89 examples)

| Metric | Value |
|--------|-------|
| Total Examples | 89 |
| Passed | 32 (36.0%) |
| Failed | 56 (62.9%) |
| Errors | 1 (1.1%) |
| Average Score | 64.3% |
| Pairwise Evaluator Avg | 36.4% |
| Programmatic Evaluator Avg | 93.8% |
| Total Violations | 262 (2.9/test) |
| Total Cost | $23.57 |

### LLM Judge + Programmatic - All Models (10 examples)

| Metric | Opus 4.5 | Sonnet 4.5 | Multi-Agent |
|--------|----------|------------|-------------|
| Passed | 10 (100%) | 10 (100%) | 10 (100%) |
| Average Score | 93.1% | 89.4% | 88.7% |
| LLM Judge Avg | 89.6% | 84.3% | 82.3% |
| Programmatic Avg | 97.9% | 96.4% | 97.5% |
| Duration | 604s | 588s | 1632s |
| Total Tokens | 795K | 464K | N/A |
| Total Cost | $13.43 | $1.66 | ~$4.40* |

*Multi-agent cost estimated from previous report data*

### Programmatic-Only - Sonnet 4.5 (10 examples)

| Metric | Value |
|--------|-------|
| Total Examples | 10 |
| Passed | 10 (100%) |
| Average Score | 99.1% |
| Total Duration | 409s (~7 min) |
| Total Tokens | 493K |
| Total Cost | $1.77 |

---

## Violation Analysis

### Violation Counts - Pairwise Evaluation

| Type | Opus 4.5 (71) | Sonnet 4.5 (89) |
|------|---------------|-----------------|
| Pairwise Judge Violations | 167 | 210 |
| Programmatic Violations | 42 | 52 |
| **Total** | 209 (2.9/test) | 262 (2.9/test) |

*Violations per test are similar despite Opus having lower pass rate*

*Note: Sonnet ran on 89 examples vs Opus 71 examples*

### Violation Counts - LLM Judge + Programmatic (10 examples)

| Type | Opus 4.5 | Sonnet 4.5 |
|------|----------|------------|
| LLM Judge Violations | 71 | 61 |
| Programmatic Violations | 4 | 4 |

### Opus 4.5 Programmatic Violations (4 total)

1. [major] HTTP Request node "Fetch News from NewsAPI" has hardcoded apiKey query parameter
2. [major] Agent node "Qualify Lead with AI" has no expression in prompt field
3. [critical] Node Classification Parser (outputParserStructured) missing required ai_languageModel input
4. [major] Agent node "Classify Issue with AI" has no expression in prompt field

---

## Common Violation Patterns (Sonnet 4.5)

### Top Pairwise Violations (from judge feedback)

1. **Memory/Chat Trigger Connection Issues** (12+ occurrences)
   - Memory node connects only to AI Agent, not to Telegram/Chat trigger
   - Memory disconnected from news generation pipeline
   - Users cannot query AI-generated content through chat

2. **Missing Multiple Triggers** (8+ occurrences)
   - Workflow requires 2 triggers (e.g., website form + Gmail) but only has 1
   - Missing Gmail trigger for email-based lead capture

3. **Wrong Tool Node Types** (8+ occurrences)
   - Using `googleCalendar` instead of `googleCalendarTool` for AI Agent tools
   - Missing second Google Calendar tool with Create operation

4. **Missing Set/Aggregate Nodes** (6+ occurrences)
   - Using Code nodes instead of Set nodes for data preparation
   - Missing Aggregate nodes to group data before AI processing
   - Missing Structured Output Parser connections

5. **Gmail Simplify Setting** (6+ occurrences)
   - Gmail trigger has Simplify enabled, limiting access to full email body
   - Should add another Gmail node to fetch full body

6. **Missing Perplexity/SERP Nodes** (4+ occurrences)
   - Using HTTP Request instead of dedicated Perplexity node for news discovery
   - Using Code nodes for formatting instead of Set nodes

7. **Job ID Anti-Pattern** (4+ occurrences)
   - Using date-based Job IDs (JOB-YYYYMMDD-XXX) that change on every execution
   - Breaks upsert functionality for deduplication

8. **Single Keyword Filtering** (4+ occurrences)
   - Using single keyword (e.g., "delivery") instead of multiple keywords
   - Should search for delivery, shipment, package, tracking

### Top Programmatic Violations

1. **Agent Prompt Issues** (40+ occurrences)
   - Agent node has no expression in prompt field (missing chatInput/dynamic context)
   - Agent node has no system message (system-level instructions missing)

2. **Missing Required Inputs** (12+ occurrences)
   - HTTP Request nodes missing required main input
   - Output Parser Structured missing ai_languageModel input
   - Vector Store nodes missing required connections

3. **Hardcoded Credentials** (8+ occurrences)
   - HTTP Request nodes with hardcoded Authorization headers
   - API keys embedded in query parameters instead of using n8n credentials

4. **Node Type Errors** (4+ occurrences)
   - Node type not found (removeDuplicates, toolVectorStore)
   - Unsupported connection types to nodes

5. **Merge Node Issues** (2+ occurrences)
   - Merge nodes with only 1 input (requires at least 2)
   - Missing connections for input slots

### Top LLM Judge Violations

1. **Functionality Issues**
   - Workflow doesn't send/save output anywhere (missing email, Slack, or storage)
   - Manual trigger instead of schedule trigger for automated workflows
   - Hardcoded scheduling without availability checks

2. **Expression Syntax Errors**
   - Missing `=` prefix for expressions with text interpolation
   - Invalid object literal syntax in expressions

3. **Data Flow Problems**
   - Data loss in transformation nodes (discarding processed data)
   - Incorrect field references (accessing fields that don't exist)
   - Missing data aggregation after batch processing

4. **Best Practice Violations**
   - Using HTTP Request instead of dedicated nodes
   - Missing error handling for API failures
   - Missing file type detection before Extract from File
   - No rate limiting for multiple API calls

5. **Node Configuration Issues**
   - GitHub nodes missing required owner/repository parameters
   - Incorrect node types for operations (AI model for document processing)
   - Missing authentication on webhooks

---

## Full Violation Lists

*Paths are relative to `eval-results-23-01/`. Each example folder contains `workflow.json` and `feedback.json`.*

### Sonnet 4.5 LLM Judge Violations (61 total)

*Source: `code-agent-llm-judge/`*

#### functionality (6)
1. [`example-001-f1b1d9b7`] [major] The workflow does not send or save the summary report anywhere. The user requested to 'create a summary report' which implies the report should be delivered (via email, Slack, saved to a file, etc.) or stored somewhere accessible. The workflow ends after formatting the data with no output action.
2. [`example-003-6d770bf0`] [major] Workflow uses manual trigger instead of a scheduled trigger for a 'morning weather report' that should be sent automatically each morning. The user requested a morning report, which implies automatic daily execution, not manual triggering.
3. [`example-004-9c543c85`] [critical] The workflow uses an Anthropic chat model node (claude-3-5-sonnet) for document analysis, but this node type is not designed for extracting structured data from PDF/image invoices.
4. [`example-005-05fd23ad`] [major] Calendar appointment scheduling is hardcoded to a fixed time (2 days from now at 2 PM) without any mechanism to check availability or allow the prospect to choose a time.
5. [`example-007-ca13700c`] [minor] Parse AI Response node attempts to access issue data from $input.first().json, but the input at that point is from the AI Agent node, not the GitHub trigger.
6. [`example-010-92237768`] [minor] Workflow uses manualTrigger which requires manual execution, but the user requested a workflow that 'reviews user-submitted content'.

#### connections (3)
1. [major] Split in Batches loop completion path is incorrect: 'Format Final Output' should connect back to 'Process Each Story' to signal batch completion.
2. [critical] Broken data dependency: 'Is Valid?' node connects directly to both 'Aggregate Valid Invoices' and 'Generate Weekly Report' in parallel on the true branch.
3. [major] Orphaned node output: 'Aggregate Valid Invoices' processes data but its output is not connected to any downstream node.

#### expressions (8)
1. [major] In 'Format Summary Report' node, assignment 'reportTitle': Missing '=' prefix for expression with text interpolation.
2. [major] Missing '=' prefix in 'Summarize Article with OpenAI' node user content parameter.
3. [major] In 'Log Invalid Invoice' node: jsonBody uses incorrect object literal syntax within expression.
4. [major] AI Lead Qualifier node uses invalid expression syntax: `{{ $json }}` attempts to stringify entire object.
5. [major] In 'Classify Issue' node: Missing '=' prefix for expression in text parameter.
6. [minor] Using outdated $input.first().json syntax instead of modern $('GitHub Issue Created').first().json.
7. [minor] String concatenation uses outdated syntax (="text" + $json.field) instead of modern template literal syntax.
8. [critical] In 'Notify Moderators' node: jsonBody uses invalid syntax - missing quotes around object keys and missing = prefix.

#### nodeConfiguration (8)
1. [minor] Summarize Article with OpenAI node uses 'responses' parameter which appears to be incorrect for the OpenAI text completion operation.
2. [major] Code node 'Format Weather Report' contains invalid JavaScript syntax.
3. [major] Extract Invoice Data node uses incorrect node type '@n8n/n8n-nodes-langchain.anthropic' with invalid parameters.
4. [minor] Webhook node uses placeholder value for 'path' parameter.
5. [minor] Code node returns object without json wrapper.
6. [major] GitHub nodes 'Add Labels to Issue' and 'Assign Issue' are missing required 'owner' and 'repository' parameters.
7. [minor] Extract CSV Data node: binaryPropertyName uses verbose placeholder format.
8. [minor] Guardrails node uses placeholder text for the 'text' parameter.

#### efficiency (6)
1. [minor] 'Format Final Output' node only creates a simple completion message.
2. [minor] Unnecessary Aggregate node before Generate Weekly Report.
3. [major] Two separate GitHub API calls to edit the same issue - could be consolidated.
4. [major] Two separate Set nodes that could potentially be consolidated.
5. [minor] The 'Parse Order Data' Set node extracts fields that could be referenced directly.
6. [minor] The 'Mark as Approved' Set node could potentially be eliminated.

#### dataFlow (10)
1. [major] The 'receivedAfter' filter uses 'minus({ days: 2 })' which only covers 2 days, not the full weekend period.
2. [critical] Complete data loss in 'Format Final Output' node - discards all processed article data.
3. [major] Hardcoded recipient name in Code node instead of receiving it as input data.
4. [critical] Incorrect data flow: 'Is Valid?' node connects to BOTH 'Aggregate Valid Invoices' AND 'Generate Weekly Report' on the true branch.
5. [major] Calendar event 'attendees' field expects an array but receives a string.
6. [major] Code node returns only 'summary' field, discarding all original database fields.
7. [critical] Parse AI Response node attempts to access 'issueData.issue.number' from $input.first().json, but the AI agent output only contains the 'output' field.
8. [major] Transform Data node uses spread operator on item.json which may not preserve all CSV fields correctly.
9. [critical] Data loss in 'Update Inventory' node - the parsed data is completely overwritten by HTTP response.
10. [major] Incorrect field reference in 'Check If Flagged' node - references '$json.flagged' but Guardrails node likely outputs different structure.

#### bestPractices (11)
1. [minor] Using AI Agent node for simple text summarization instead of more appropriate AI nodes.
2. [major] Missing rate limiting protection for OpenAI API calls.
3. [major] Using HTTP Request node instead of a dedicated weather API node.
4. [major] Missing file type detection before Extract from File node.
5. [major] No OCR fallback strategy implemented.
6. [major] Missing raw form data storage.
7. [minor] Missing empty notification prevention check.
8. [minor] AI Agent node lacks structured output configuration.
9. [major] Missing file type detection before Extract from File node for CSV processing.
10. [major] Webhook node configured with 'responseMode: onReceived' and 'authentication: none'.
11. [major] Missing data persistence for moderation results.

### Sonnet 4.5 Programmatic Violations - LLM Judge Eval (4 total)

*Source: `code-agent-programmatic/`*

1. [`example-002-00a012f0`] [major] HTTP Request node "Fetch News from NewsAPI" has a hardcoded value for credential-like query parameter "apiKey". Use n8n credentials instead.
2. [`example-005-05fd23ad`] [major] Agent node "AI Lead Qualifier" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context; Agent node has no system message.
3. [`example-006-7f622f05`] [major] HTTP Request node "Query Database for New Entries" has a hardcoded value for sensitive header "Authorization".
4. [`example-009-7b389a23`] [major] HTTP Request node "Send Confirmation Email" has a hardcoded value for sensitive header "Authorization".

### Sonnet 4.5 Programmatic Violations - Pairwise Eval (52 total)

*Source: `code-agent-pairwise-eval-results/`*

1. [`example-001-33763b6d`] [major] Agent node "AI News Chat Agent" has no expression in its prompt field; has no system message
2. [`example-002-58647169`] [major] Agent node "Story Creation Agent (Morning/Afternoon/Night)" has no expression in prompt; has no system message (x3)
3. [`example-003-17ee2ea7`] [major] Agent node "File Organizer Agent" has no expression in its prompt field
4. [`example-003-79d6182e`] [major] Agent node "Delivery Calendar Agent" has no expression in prompt; has no system message
5. [`example-004-36651780`] [critical] Node Fetch TechCrunch AI News/Hacker News AI/MIT Tech Review AI (httpRequest) missing required input of type main (x3)
6. [`example-004-b9f9e559`] [critical] Node JSON Output Parser (outputParserStructured) missing required input of type ai_languageModel
7. [`example-004-b9f9e559`] [major] Agent node "Job Analysis AI Agent" has no expression in prompt; has no system message
8. [`example-006-8533afd1`] [critical] Node Format for Email (set) missing required input of type main
9. [`example-006-fce0a71b`] [major] Agent node "Summarize Article" has no expression in prompt; has no system message
10. [`example-008-171b0a80`] [major] Agent node "Analyze Emails with AI" has no expression in prompt
11. [`example-009-57573854`] [major] Agent node "Ebook Creation Agent" has no expression in prompt; has no system message
12. [`example-010-58639ef3`] [major] Agent node "Google Sheets AI Agent" has no expression in prompt; has no system message
13. [`example-012-a1671930`] [major] Agent node "Research 3 Investors" has no expression in prompt; has no system message
14. [`example-015-0b3c6eec`] [critical] Node Fetch Hacker News AI/Reddit AI News/AI News API missing required input of type main (x3)
15. [`example-016-993bacf8`] [major] Agent node "Drone News Research Agent" has no expression in prompt
16. [`example-018-b164cf4a`] [critical] Node Structured Output (outputParserStructured) missing required input of type ai_languageModel
17. [`example-018-b164cf4a`] [major] Agent node "Eco Rules Assistant" has no expression in prompt; has no system message
18. [`example-019-8b00793e`] [major] Agent node "Categorize Files with AI" has no expression in prompt; has no system message
19. [`example-021-2492a84d`] [critical] Node type n8n-nodes-base.removeDuplicates not found
20. [`example-022-d9b067bf`] [critical] Node Lead Data Structure (outputParserStructured) missing required input of type ai_languageModel
21. [`example-022-d9b067bf`] [major] Agent node "Lead Qualification Agent" has no expression in prompt; has no system message
22. [`example-023-3e122382`] [major] Agent node "Email Analysis Agent" has no expression in prompt; has no system message
23. [`example-024-23151ab2`] [major] Agent node "Summarize News" and "AI News Chat Agent" have no expression in prompt; have no system message (x2)
24. [`example-028-09b633cb`] [critical] Node Compliance Review Agent (chainRetrievalQa) missing required input of type ai_retriever; received unsupported connection type ai_vectorStore
25. [`example-028-09b633cb`] [critical] Node Regulatory Knowledge Base (vectorStoreInMemory) received unsupported connection types ai_document and ai_textSplitter
26. [`example-028-09b633cb`] [critical] Node Load Regulatory PDFs (documentDefaultDataLoader) missing required input of type ai_textSplitter
27. [`example-029-a271a348`] [major] Agent node "Lead Generation AI Agent" has no expression in prompt
28. [`example-031-851575d1`] [major] Agent node "B2B Lead Generation Agent" has no expression in prompt; has no system message
29. [`example-036-f65d8a69`] [major] Merge node "Merge Session Data" has only 1 input connection; needs at least 2
30. [`example-036-f65d8a69`] [major] HTTP Request node "Vector Similarity Search" has hardcoded apikey header
31. [`example-038-b1d6c97e`] [major] Agent node "AI Assistant" has no expression in prompt; has no system message
32. [`example-043-348d1a76`] [critical] Node Rules Knowledge Base (vectorStoreInMemory) missing required inputs: main and ai_document
33. [`example-044-dc437cb5`] [major] HTTP Request node "Generate 3D Avatar with Banana" has hardcoded Authorization header
34. [`example-047-eeef4d9a`] [major] Agent node "News Scraping Agent" has no expression in prompt; has no system message
35. [`example-049-c92f418e`] [major] Agent node "Analyze and Enrich Ticket" has no expression in prompt; has no system message
36. [`example-050-d0df0a23`] [major] Agent nodes "Select Ebook Topic" and "Generate Ebook Content" have no expression in prompt; have no system message (x2)
37. [`example-053-c6ae76aa`] [major] HTTP Request node "Generate 3D Avatar via Banana" has hardcoded Authorization header
38. [`example-054-b9d88f13`] [major] Agent node "Ticket Completion Agent" has no expression in prompt; has no system message
39. [`example-055-7c5ecd2d`] [critical] Node Pinecone RAG (vectorStorePinecone) missing required input of type ai_embedding
40. [`example-055-7c5ecd2d`] [major] Agent nodes "Company Research Agent" and "Email Generation Agent" have no expression in prompt; have no system message (x2)
41. [`example-056-5f4e0659`] [major] Agent node "Lead Outreach Agent" has no expression in prompt; has no system message
42. [`example-057-9993f79f`] [major] Agent node "AI Article Selector" has no expression in prompt; has no system message
43. [`example-061-0a81ca75`] [major] Agent node "News Analyzer Agent" has no expression in prompt; has no system message
44. [`example-062-bbbdba86`] [major] Agent node "Sales Expert AI Agent" has no expression in prompt; has no system message
45. [`example-063-fc13aca7`] [major] Agent node "Generate Weather Report" has no system message
46. [`example-064-aa1fb6c8`] [major] Agent node "Warren Buffett Stock Analyst" has no expression in prompt; has no system message
47. [`example-065-551ad151`] [major] HTTP Request node "Call Azure OpenAI (with timeout)" has hardcoded api-key header
48. [`example-066-f82b0a11`] [critical] Node type @n8n/n8n-nodes-langchain.toolVectorStore not found; Regulatory Database Vector Store missing ai_embedding; received unsupported connection ai_document
49. [`example-066-f82b0a11`] [major] Agent node "Compliance Review Agent" has no expression in prompt; has no system message
50. [`example-067-da8e471c`] [major] Agent node "Select Top 10 Articles" has no expression in prompt; has no system message
51. [`example-069-60025f2f`] [major] Agent node "News Scraping Agent" has no expression in prompt; has no system message
52. [`example-071-31b6dcf2`] [major] Agent node "Process Zoom Summary" has no expression in prompt; has no system message

### Pairwise Judge Violations (122 entries, 210 individual violations)

*Source: `code-agent-pairwise-eval-results/` - see individual `feedback.json` files for full details*

Common patterns across all pairwise judge violations:

1. **Memory Connection Issues** (24 violations)
   - Memory node connects only to AI Agent, not to Telegram/Chat trigger
   - Memory disconnected from news generation/content pipeline
   - Users cannot query AI-generated content through memory

2. **Missing Multiple Triggers** (16 violations)
   - Workflow requires 2 triggers (website form + Gmail) but only has 1
   - Missing Gmail trigger for email-based workflows

3. **Wrong Node Type Selection** (16 violations)
   - Using `googleCalendar` instead of `googleCalendarTool`
   - Using HTTP Request instead of Perplexity node
   - Missing second calendar tool with Create operation

4. **Missing Set/Aggregate Nodes** (12 violations)
   - Using Code nodes instead of Set nodes for data preparation
   - Missing Aggregate nodes for grouping
   - Missing Structured Output Parser

5. **Gmail Simplify Anti-Pattern** (12 violations)
   - Gmail trigger has Simplify enabled (simple: true)
   - Limiting access to full email body and attachments

6. **Single Keyword Filtering** (8 violations)
   - Using single keyword filter instead of multiple
   - Missing shipment, package, tracking keywords

7. **Job/Session ID Issues** (8 violations)
   - Date-based IDs that change on every execution
   - Breaking upsert deduplication functionality

8. **Missing Tool Name in Prompts** (8 violations)
   - AI Agent prompt mentions "Google Calendar" generically
   - Should specify exact tool name to match sub-node

9. **Code Node Anti-Pattern** (6 violations)
   - Using Code nodes to set topics instead of Set nodes
   - Using Code nodes for formatting instead of Set nodes

10. **Missing Output/Data Persistence** (6 violations)
    - Workflow ends without outputting results
    - Missing dataTable node for saving leads

---

## Recommendations

### Model Selection

| Use Case | Recommended Model | Rationale |
|----------|-------------------|-----------|
| **Production (all workflows)** | Sonnet 4.5 | Best quality/cost ratio, higher pairwise pass rate than Opus |
| **Highest quality (simple workflows)** | Opus 4.5 | +3.7 points on LLM Judge eval (10 examples) |
| **Complex multi-step workflows** | Multi-Agent | 50% pairwise pass rate vs 36% (Sonnet) / 32% (Opus) |

### Key Insight: Opus Underperforms on Pairwise

**Opus 4.5 has a lower pairwise pass rate than Sonnet 4.5** (32.4% vs 36.0%) despite being 5.6x more expensive. Possible explanations:
- **Different prompts:** Opus uses the full SDK API (more complex), Sonnet uses a simpler prompt
- The full SDK API may overwhelm the context, reducing accuracy on specific n8n patterns
- Opus might benefit from a simplified SDK similar to Sonnet's approach
- Future testing will evaluate Opus with simplified SDK to isolate the effect

### For Improving Code-Based Agent

1. **Fix Agent Node Configuration** - Ensure all AI Agent nodes have:
   - Expression in prompt field (chatInput/dynamic context)
   - System message with role and instructions

2. **Add Connection Validation** - Verify:
   - All required inputs are connected
   - Memory nodes connect to both AI and trigger nodes
   - Merge nodes have at least 2 inputs

3. **Use Correct Node Types** - Prefer:
   - `googleCalendarTool` over `googleCalendar` for AI Agent tools
   - Perplexity node over HTTP Request for news discovery
   - Set nodes over Code nodes for simple data preparation

4. **Fix Credential Handling** - Never hardcode:
   - API keys in query parameters
   - Authorization headers in HTTP Request nodes
   - Use n8n credentials system instead

5. **Address Best Practices** - Include:
   - Multiple triggers when workflow handles multiple input sources
   - Multiple keywords for filtering (delivery, shipment, package, tracking)
   - Disable Simplify on Gmail when full body needed
   - Aggregate nodes before AI processing
