---
name: automatic-stateful-prompt-improver
description: Automatically intercepts and optimizes prompts using the prompt-learning MCP server. Learns from performance over time via embedding-indexed history. Uses APE, OPRO, DSPy patterns. Activate
  on "optimize prompt", "improve this prompt", "prompt engineering", or ANY complex task request. Requires prompt-learning MCP server. NOT for simple questions (just answer them), NOT for direct commands
  (just execute them), NOT for conversational responses (no optimization needed).
allowed-tools: mcp__prompt-learning__optimize_prompt,mcp__prompt-learning__retrieve_prompts,mcp__prompt-learning__record_feedback,mcp__prompt-learning__suggest_improvements,mcp__prompt-learning__get_analytics,mcp__SequentialThinking__sequentialthinking
metadata:
  category: AI & Machine Learning
  pairs-with:
  - skill: skill-coach
    reason: Optimize skill prompts systematically
  - skill: skill-logger
    reason: Track prompt performance over time
  tags:
  - prompts
  - optimization
  - learning
  - embeddings
  - dspy
---

# Automatic Stateful Prompt Improver

## MANDATORY AUTOMATIC BEHAVIOR

**When this skill is active, I MUST follow these rules:**

### Auto-Optimization Triggers

I AUTOMATICALLY call `mcp__prompt-learning__optimize_prompt` BEFORE responding when:

1. **Complex task** (multi-step, requires reasoning)
2. **Technical output** (code, analysis, structured data)
3. **Reusable content** (system prompts, templates, instructions)
4. **Explicit request** ("improve", "better", "optimize")
5. **Ambiguous requirements** (underspecified, multiple interpretations)
6. **Precision-critical** (code, legal, medical, financial)

### Auto-Optimization Process

```
1. INTERCEPT the user's request
2. CALL: mcp__prompt-learning__optimize_prompt
   - prompt: [user's original request]
   - domain: [inferred domain]
   - max_iterations: [3-20 based on complexity]
3. RECEIVE: optimized prompt + improvement details
4. INFORM user briefly: "I've refined your request for [reason]"
5. PROCEED with the OPTIMIZED version
```

### Do NOT Optimize

- Simple questions ("what is X?")
- Direct commands ("run npm install")
- Conversational responses ("hello", "thanks")
- File operations without reasoning
- Already-optimized prompts

## Learning Loop (Post-Response)

After completing ANY significant task:

```
1. ASSESS: Did the response achieve the goal?
2. CALL: mcp__prompt-learning__record_feedback
   - prompt_id: [from optimization response]
   - success: [true/false]
   - quality_score: [0.0-1.0]
3. This enables future retrievals to learn from outcomes
```

## Quick Reference

### Iteration Decision

| Factor | Low (3-5) | Medium (5-10) | High (10-20) |
|--------|-----------|---------------|--------------|
| Complexity | Simple | Multi-step | Agent/pipeline |
| Ambiguity | Clear | Some | Underspecified |
| Domain | Known | Moderate | Novel |
| Stakes | Low | Moderate | Critical |

### Convergence (When to Stop)

- Improvement &lt; 1% for 3 iterations
- User satisfied
- Token budget exhausted
- 20 iterations reached
- Validation score &gt; 0.95

### Performance Expectations

| Scenario | Improvement | Iterations |
|----------|-------------|------------|
| Simple task | 10-20% | 3-5 |
| Complex reasoning | 20-40% | 10-15 |
| Agent/pipeline | 30-50% | 15-20 |
| With history | +10-15% bonus | Varies |

## Anti-Patterns

### Over-Optimization

| What it looks like | Why it's wrong |
|--------------------|----------------|
| Prompt becomes overly complex with many constraints | Causes brittleness, model confusion, token waste |
| **Instead**: Apply Occam's Razor - simplest sufficient prompt wins |

### Template Obsession

| What it looks like | Why it's wrong |
|--------------------|----------------|
| Focusing on templates rather than task understanding | Templates don't generalize; understanding does |
| **Instead**: Focus on WHAT the task requires, not HOW to format it |

### Iteration Without Measurement

| What it looks like | Why it's wrong |
|--------------------|----------------|
| Multiple rewrites without tracking improvements | Can't know if changes help without metrics |
| **Instead**: Always define success criteria before optimizing |

### Ignoring Model Capabilities

| What it looks like | Why it's wrong |
|--------------------|----------------|
| Assumes model can't do things it can | Over-scaffolding wastes tokens |
| **Instead**: Test capabilities before heavy prompting |

## Reference Files

Load for detailed implementations:

| File | Contents |
|------|----------|
| `references/optimization-techniques.md` | APE, OPRO, CoT, instruction rewriting, constraint engineering |
| `references/learning-architecture.md` | Warm start, embedding retrieval, MCP setup, drift detection |
| `references/iteration-strategy.md` | Decision matrices, complexity scoring, convergence algorithms |

---

**Goal**: Simplest prompt that achieves the outcome reliably. Optimize for clarity, specificity, and measurable improvement.
