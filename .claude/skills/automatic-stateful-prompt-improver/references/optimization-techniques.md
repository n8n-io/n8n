# Optimization Techniques

Research-backed strategies for prompt improvement.

## APE-Style Instruction Generation

**Source**: Zhou et al., 2022 (outperformed human prompts on 19/24 NLP tasks)

```
Given your task and examples:
Task: [description]
Examples: Input → Output pairs

Generate 5-10 instruction candidates, then select best based on:
- Clarity score (0-1): How unambiguous is the instruction?
- Completeness (0-1): Does it cover all requirements?
- Constraint density: Appropriate constraints without over-specification
```

## OPRO Meta-Prompting

**Source**: Yang et al., 2023 (up to 50% improvement on Big-Bench Hard)

Treat prompt optimization AS a prompting task:

```
Previous prompt attempts and their scores:
- "Step by step, solve..." | Score: 0.65
- "Carefully analyze each..." | Score: 0.72

Generate a new instruction that will achieve a higher score.
```

## Chain-of-Thought Enhancement

**Source**: Wei et al., 2022 (best for complex reasoning)

Add reasoning scaffolds:
- "Let's think step by step" (zero-shot CoT)
- Structured reasoning templates
- Self-consistency through multiple paths

## Task Decomposition

Break complex prompts into modular components:
1. **Context setting** - Domain and background
2. **Instruction specification** - What to do
3. **Output format** - How to respond
4. **Constraints** - What to avoid

## Instruction Rewriting

**Pattern**: Generate variants, evaluate, select best

```markdown
Original: "Summarize this text"

Generated Variants:
1. "Extract the key points from this text in bullet form"
2. "Provide a concise 2-3 sentence summary capturing the main argument"
3. "Identify the thesis and supporting evidence, then summarize"

Selection Criteria:
- Specificity: Variant 2 wins (format specified)
- Clarity: Variant 1 wins (clear structure)
- Completeness: Variant 3 wins (methodology included)

Best: Combine insights → "Extract the thesis and key supporting points,
then provide a concise 2-3 sentence summary in bullet form"
```

## Few-Shot Optimization

**Pattern**: Select examples that maximize performance

```
Selection Methods:
1. Semantic similarity: Examples similar to test case
2. Diversity: Cover different scenarios
3. Difficulty progression: Easy → Hard examples
4. Contrastive: Include near-misses for boundary learning
```

## Constraint Engineering

**Pattern**: Add/remove constraints to improve output

```
Under-constrained:
"Write code for a sorting function"

After Constraint Engineering:
"Write a Python function that sorts a list of integers in ascending order.
Requirements:
- Use O(n log n) time complexity
- Handle empty lists gracefully
- Include type hints
- Do not use built-in sort()"
```

## Output Format Specification

**Pattern**: Explicit format reduces ambiguity

```
Before: "Analyze this data"

After: "Analyze this data and respond with:
1. **Summary** (2-3 sentences): Key findings
2. **Metrics** (bullet list): Quantitative observations
3. **Recommendations** (numbered): Actionable next steps"
```
