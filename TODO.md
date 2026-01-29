# TODO (MVP)

## workflow-sdk
- [ ] add runtime type validation
- [ ] Better clarify/test how output data maps to expressions in types and referenced
- [ ] why is model and other subnodes accepting arrays?

## agent
- [ ] test out disabling agent static prompt warning
	- [ ] improve understanding of expressions. often hitting MISSING_EXPRESSION_PREFIX.
- [ ] fix new code llm judge, review how it works. fix code-typecheck also. both should reference the api directly instead of hardcoding. (remove code-typecheck. rely on runtime validation)
- [ ] Add relevant best practice pieces, esp to better handling (let evals guide this)
	- [ ] a lot of pairwise seem to be about preferring certain nodes, how can we add that as part of the node definition
	- [ ] add section for pref of other nodes over code node
	- [ ] best practices:
		- [ ] reasonable defaults? using placeholder for parameters like Country code in packages/@n8n/ai-workflow-builder.ee/eval-results-01-26/opus-one-shot-test-dataset-01-26/example-002-00a012f0
		- [ ] Best practices documentation recommends using Wait nodes and batching options to avoid hitting API rate limits.
			- "The workflow uses returnAll: true for Gmail without batching." packages/@n8n/ai-workflow-builder.ee/eval-results-01-26/opus-one-shot-test-dataset-01-26/example-001-f1b1d9b7
- [ ] Make sure conversation history is included in request
- [ ] in programmatic checks validation step, only skip warnings if repeated for the same node
- [ ] investigate failed syntax in prompt in this example packages/@n8n/ai-workflow-builder.ee/eval-results/sonnet-one-shot-all/example-005-05fd23ad. also packages/@n8n/ai-workflow-builder.ee/eval-results/sonnet-one-shot-all/example-007-ca13700c
- [ ] Add more programmatic validations: [based-on-evals]
		- [ ] chat memory issue
		- [ ] expression without '='
		- [ ] invalid expression syntax
		- [ ] .json.key references are correct based on output data
		- [ ] .json is used when referencing data in expressions or code node
		- [ ] invalid .item or .all keys in code nodes based on mode
		- [ ] optional warning for code node?
- [ ] handling of large workflows
	- [ ] context limits with many types of nodes?
- [ ] improve understanding of items

## iteration
- [ ] test iteration, inserting nodes in between
- [ ] strip away previous contexts from previous messages.
- [ ] add in execution schema/expression data, whatever we are passing now

## evaluate
- [ ] test out prompt with/without sdk reference [maybe-later]
- [ ] Evaluate with thinking enabled for each model. uses <planning> now [maybe-later]

## ready to release
- [ ] review security implications of Function. Use task runner for mvp?
	- [maybe-later] parsing AST
- [ ] pull in master
- [ ] remove FE changes
- [ ] collapse <planning> in FE
- [ ] integrate with planning agent
- [ ] How to do we store the template workflows? zip folder
- [ ] Review PR (lots of AI generated code that I did not look at)
- [ ] Remove logging from agent. lots of logging for debugging.
- [ ] Add some tracking if code parsing or generation step fails in prod.
- [ ] put Behind a/b test.
- [ ] test how unknown nodes handled?
- [ ] fix up sticky sizing and positioning to cover nodes
- [ ] caching the requests. make sure system prompt + caching the type requests
- [ ] Update telemetry and prompt viewer app to support the code and workflow generated

## Nice to haves / tech debt
- [ ] make display options more clear in node types @displayOption.show { node: ["operation"]}
- [ ] move node-specific builder validations to node level rather than at sdk level
- [ ] format the workflows into multi lines. might make it easier for workflow to handle parsing errors better
- [ ] remove / @ts-nocheck - Generated file may have unused from generated files
- [ ] Test more of the template library
- [ ] Make it more clear that SDK api file is for LLM consumption. To avoid other engineers adding unnecessary types to it, confusing the agent.
- [ ] rename one shot agent across code base
- [ ] update workflow() to support object init { id, settings }
- [ ] move generated test files for committed workflows to same folder.
- [ ] allow adding node defaults when generating workflows
- [ ] Add builderHint
		- [ ] for example promptType: 'auto'/'define'
		- [ ] use expressions for agent
		- [ ] simplify output changes?
		- [ ] memory key in chat node
		- [ ] schedule node cron or multiple intervals
- [] Fallback model in agent? how to represent that effectively. builderHint to true.
- [] Make the nodes search more fuzzy
{
  toolCallId: 'toolu_01RGtGMG78Wb6jX9HDpqHpvq',
  args: { queries: [ 'vector store insert', 'vector store load' ] }
}
- [] Support switch case fallback connection (.onFallback)
- [ ] Add more error branch workflows tests [maybe-later]
- [ ] split out merge into separate functions? so its easier to understand [maybe-later]
- [ ] create custom node parameter discriminators by output type (simplify in gmail node) [maybe-later] for now use builder hint
- [ ] Support switch case fallback connection (.onFallback) [maybe-later]

## Future improvement
- [ ] when generating json -> code, add "nodes" to sticky() so that llm understands connection to nodes
- [ ] named branches support (switch /text classifier / if). onCase('case') instead of onCase(0)
- [ ] use random generator for pin data
- [ ] RLC Support
- [ ] generate pin data using a random generator, rather than ai.
- [ ] Support templates as examples
- [ ] Add support for expr() functions that narrow down types for context. Basically llm should generate code rather than strings.
- [ ] support runOnceForAllItems and other code node functions. move to code node type file.
- [ ] AI still generates position unnecessarily. we should remove this and generate these seperately.
	- [ ] Positions should be calculated programmatically. When making edits, we should programmaticaly calculate where all the nodes should go.
- [ ] Add text editing tools support, to improve iteration
- [ ] fine tuning model with sdk code



# Pairwise Violations Analysis

## parsing error

pnpm eval:pairwise:langsmith --agent one-shot --name "pairwise-one-shot-exp-full-latest-sonnet-again-14" --output-dir ./eval-results/sonnet-pairwise-01-26-14 --verbose --dataset notion-pairwise-fresh --repetitions 1 --judges 1 --notion-id 2d35b6e0-c94f-8168-a240-ff6059e4d9d9

  errorMessage: "Failed to parse generated workflow code: Failed to parse workflow code due to syntax error: Identifier 'textSplitter' has already been declared. Common causes include unclosed template literals, missing commas, or unbalanced brackets."



## Overview

Analysis of violations from `eval-results-01-26/pairwise-violations-01-26.md` generated by `one-shot-workflow-code-agent.ts`.

**Summary Stats:**
- Total Examples: 71
- Pass: 28 (39%), Fail: 42 (59%), Error: 1
- Total Violations: 161 (31 critical, 16 major, 6 minor, 108 pairwise-rule)

---

## Most Common Pairwise Rule Violations (Sorted by Frequency)

### 1. Missing AI Agent Node (12 occurrences) - CRITICAL

**Examples:** 016, 019, 023, 041, 044, 049, 050, 062, 064, 066, 071

**Issue:** LLM uses wrong node types instead of `n8n-nodes-langchain.agent`:
- Uses `chainLlm` or `chainRetrievalQa` instead
- Uses direct HTTP requests or code nodes
- Uses provider-specific nodes like `openAi` directly

**Prompt Gap:** No explicit guidance on when to use AI Agent vs other LLM nodes.

---

### 2. Agent Prompt Missing Dynamic Expressions (10 occurrences) - MAJOR

**Examples:** 017, 026, 028, 034, 045, 048, 056, 058, 071

**Issue:** Agent nodes have static prompts without `chatInput` or `$json` expressions.

**Prompt Gap:** No examples showing dynamic prompt construction with expressions.

---

### 3. OpenAI Model Version Wrong (8 occurrences) - MAJOR

**Examples:** 012, 022, 024, 025, 028, 049, 063

**Issue:** Uses `gpt-4o-mini` or `gpt-4o` instead of required `gpt-5-mini`.

**Prompt Gap:** The prompt likely doesn't specify which model version to use by default.

---

### 4. Missing Structured Output Parser (8 occurrences) - CRITICAL

**Examples:** 023, 034, 049, 056, 064, 071

**Issue:** Workflows parse AI output with code nodes instead of `outputParserStructured`.

**Prompt Gap:** No examples of Structured Output Parser in main one-shot prompts.

---

### 5. Code Node Instead of Declarative Nodes (7 occurrences) - MAJOR

**Examples:** 004, 032, 034, 043, 045, 068

**Issue:** Uses code nodes instead of:
- Set nodes for data formatting
- Aggregate nodes for combining data
- Remove Duplicates node
- Compare Datasets / Merge for matching

**Prompt Gap:** TODO in prompt file: "add section for pref of other nodes over code node"

---

### 6. Gmail Simplify Enabled (5 occurrences) - MAJOR

**Examples:** 013, 022, 035, 060, 066

**Issue:** Gmail Trigger has `simple: true` (should be `false` to access full email body).

**Prompt Gap:** NO guidance on Gmail Simplify option at all in prompts.

---

### 7. Wrong Trigger Type (5 occurrences) - MAJOR

**Examples:** 019, 040, 046, 060

**Issue:** Uses Manual Trigger instead of:
- Webhook Trigger
- Form Trigger
- Gmail Trigger (uses read operation instead)

**Prompt Gap:** Limited examples of different trigger types.

---

### 8. Google Sheets Mode Configuration (4 occurrences) - MAJOR

**Examples:** 003, 017, 033

**Issue:** `documentId` and `sheetName` should use `mode: list`, but uses `mode: url` or plain strings.

**Prompt Gap:** NO guidance on Google Sheets mode configuration.

---

### 9. Memory Connection Issues (3 occurrences) - MAJOR

**Examples:** 025, 042, 063

**Issue:** Memory node connected to AI Agent but NOT to Chat Trigger (needs both).

**Prompt Gap:** Very limited memory connection guidance in prompts.

---

## Most Common Programmatic Violations

### 1. AI Connection Issues (23 instances) - CRITICAL

**Missing required inputs:**
- `ai_languageModel` - LLM nodes missing model connection
- `ai_retriever` - RAG chains missing retriever
- `ai_embedding` - Vector stores missing embedding model
- `ai_document` - Vector stores missing document loader
- `ai_textSplitter` - Document loaders missing text splitter

**Examples:** 007, 017, 023, 036, 041, 044, 045, 047, 056

---

### 2. Merge Node Insufficient Inputs (5 instances) - MAJOR

**Examples:** 005, 031, 047, 054, 062, 068

**Issue:** Merge nodes have 0-1 input connections (require 2+).

---

### 3. Expression Prefix Missing (8 instances) - MINOR

**Examples:** 005, 007, 032, 055, 062

**Issue:** Uses `{{ $json.field }}` instead of `={{ $json.field }}` (missing `=` prefix).

---

## Root Causes & Recommendations

### Priority 1: Add AI Agent vs Other Nodes Guidance

The prompt should clarify:
- Use `n8n-nodes-langchain.agent` for:
  - Tasks requiring tool use
  - Multi-step reasoning
  - Dynamic decision making
- Use `chainLlm` only for simple text generation
- Never use provider-specific nodes (`openAi`, `googleGemini`) directly when agent capabilities needed

### Priority 2: Add AI Subnode Connection Rules

Add explicit rules for AI node connections:
```
AI Agent requires: ai_languageModel (always)
Vector Store requires: ai_embedding (always), ai_document (for insert mode)
RAG Chain requires: ai_languageModel + ai_retriever
Document Loader requires: ai_textSplitter
```

### Priority 3: Add Structured Output Parser Guidance

Add examples showing:
- When to use: Any time AI output needs programmatic parsing
- Connection: outputParserStructured → agent via ai_outputParser
- Set `hasOutputParser: true` on agent

### Priority 4: Add Gmail Simplify Rule

Add rule:
```
Gmail Trigger: Always set simple: false when email body content is needed
```

### Priority 5: Add Set vs Code Node Guidance

Add decision matrix:
- Data reformatting → Set node
- Combining items → Aggregate node
- Removing duplicates → Remove Duplicates node
- Matching datasets → Compare Datasets / Merge
- Code node only for complex logic not achievable with declarative nodes

### Priority 6: Add Expression Prefix Rule

The prompt should emphasize:
```
All n8n expressions must start with '=' like '={{ $json.field }}'
```

---

## Summary Table

| Violation Category | Count | Severity | Has Prompt Guidance? |
|--------------------|-------|----------|---------------------|
| Missing AI Agent node | 12 | Critical | Partial |
| AI connection issues | 23 | Critical | No |
| Agent prompt static | 10 | Major | No |
| Wrong model version | 8 | Major | No |
| Missing output parser | 8 | Critical | Partial |
| Code vs declarative | 7 | Major | No (TODO exists) |
| Gmail Simplify | 5 | Major | No |
| Merge node inputs | 5 | Major | No |
| Wrong trigger type | 5 | Major | Partial |
| Expression prefix | 8 | Minor | Partial |
| Google Sheets mode | 4 | Major | No |
| Memory connections | 3 | Major | Limited |
