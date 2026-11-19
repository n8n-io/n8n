# DSPy Optimization Patterns for Prompt Learning

This document covers DSPy-style programmatic prompt optimization patterns.

## Core Philosophy

DSPy treats prompts as **trainable parameters** rather than brittle strings. Instead of manually crafting prompts, you define:
1. What the module should do (signature)
2. How to measure success (metric)
3. Let the optimizer find the best prompt

## Key Concepts

### Signatures

Signatures declare input/output behavior:

```python
# Simple signature
class QA(dspy.Signature):
    """Answer questions with brief responses."""
    question = dspy.InputField()
    answer = dspy.OutputField()

# Complex signature with constraints
class CodeReview(dspy.Signature):
    """Review code for bugs, style issues, and improvements."""
    code = dspy.InputField(desc="The code to review")
    language = dspy.InputField(desc="Programming language")
    severity_filter = dspy.InputField(desc="min, major, critical", default="min")

    bugs = dspy.OutputField(desc="List of potential bugs found")
    style_issues = dspy.OutputField(desc="Style violations")
    improvements = dspy.OutputField(desc="Suggested improvements")
```

### Modules

Modules define HOW to accomplish the signature:

```python
# Basic prediction
predictor = dspy.Predict(QA)

# Chain-of-thought reasoning
cot = dspy.ChainOfThought(QA)

# ReAct with tool use
react = dspy.ReAct(QA, tools=[search_tool, calculator])

# Multi-step pipeline
class RAGPipeline(dspy.Module):
    def __init__(self, num_passages=3):
        self.retrieve = dspy.Retrieve(k=num_passages)
        self.generate = dspy.ChainOfThought("context, question -> answer")

    def forward(self, question):
        context = self.retrieve(question).passages
        return self.generate(context=context, question=question)
```

## Optimization Algorithms

### BootstrapRS (Random Search)

**Best for**: Quick optimization, small datasets

```python
# Generates few-shot examples from successful executions
optimizer = dspy.BootstrapRS(
    metric=my_metric,
    max_bootstrapped_demos=4,  # Examples to include
    max_labeled_demos=4,
    num_candidate_programs=16
)

optimized = optimizer.compile(
    student=my_module,
    trainset=train_examples
)
```

**How it works**:
1. Run the module on training examples
2. Identify successful executions
3. Use those as few-shot demonstrations
4. Select best combination randomly

### MIPROv2 (Bayesian Optimization)

**Best for**: Production optimization, larger datasets

```python
optimizer = dspy.MIPROv2(
    metric=my_metric,
    auto="medium",  # light, medium, heavy
    num_threads=4
)

optimized = optimizer.compile(
    student=my_module,
    trainset=train_examples,
    valset=val_examples,  # Important for evaluation
    max_bootstrapped_demos=4,
    max_labeled_demos=4
)
```

**How it works**:
1. **Bootstrap**: Collect successful execution traces
2. **Propose**: LLM generates instruction candidates
3. **Search**: Bayesian optimization over instruction space
4. **Refine**: Iteratively improve best candidates

**Cost/Performance (from research)**:
| Mode | Examples | Time | Cost | Improvement |
|------|----------|------|------|-------------|
| Light | 500 | 20min | ~$2 | 10-20% |
| Medium | 1000 | 1-2hr | ~$10 | 20-35% |
| Heavy | 2000+ | 4-8hr | ~$50 | 35-50% |

### COPRO (Coordinate Optimization)

**Best for**: Instruction-only optimization

```python
optimizer = dspy.COPRO(
    metric=my_metric,
    depth=3,  # Optimization iterations
    breadth=10,  # Candidates per iteration
    init_temperature=1.0
)

# Only optimizes instructions, not examples
optimized = optimizer.compile(
    student=my_module,
    trainset=train_examples
)
```

## Practical Patterns for Prompt Improvement

### Pattern 1: Bootstrap → Optimize → Ensemble

```python
def full_optimization_pipeline(module, trainset, valset):
    """
    Three-stage optimization for best results.
    """
    # Stage 1: Bootstrap few-shot examples
    bootstrap = dspy.BootstrapRS(
        metric=accuracy_metric,
        max_bootstrapped_demos=4
    )
    bootstrapped = bootstrap.compile(module, trainset=trainset)

    # Stage 2: Optimize instructions
    mipro = dspy.MIPROv2(metric=accuracy_metric, auto="medium")
    optimized = mipro.compile(
        bootstrapped,
        trainset=trainset,
        valset=valset
    )

    # Stage 3: Create ensemble (optional)
    # Run optimization 3 times, ensemble the results
    programs = []
    for _ in range(3):
        opt = dspy.MIPROv2(metric=accuracy_metric, auto="light")
        programs.append(opt.compile(module, trainset=trainset, valset=valset))

    ensemble = dspy.Ensemble(programs, strategy="majority")

    return optimized, ensemble
```

### Pattern 2: Metric-Driven Optimization

```python
def create_composite_metric():
    """
    Multi-objective metric combining accuracy, cost, and quality.
    """
    def metric(example, prediction, trace=None):
        # Accuracy (0-1)
        accuracy = 1.0 if prediction.answer == example.expected else 0.0

        # Token efficiency (penalize verbose responses)
        tokens_used = len(prediction.answer.split())
        efficiency = 1.0 / (1.0 + tokens_used / 100)

        # Quality heuristics
        has_reasoning = "because" in prediction.answer.lower()
        quality = 1.0 if has_reasoning else 0.5

        # Weighted combination
        return 0.6 * accuracy + 0.2 * efficiency + 0.2 * quality

    return metric
```

### Pattern 3: Assertion-Based Validation

```python
class ValidatedQA(dspy.Module):
    """
    Module with built-in validation via assertions.
    """
    def __init__(self):
        self.generate = dspy.ChainOfThought("question -> answer")

    def forward(self, question):
        response = self.generate(question=question)

        # Validate response
        dspy.Assert(
            len(response.answer) > 10,
            "Answer too short - provide more detail"
        )

        dspy.Assert(
            response.answer[-1] in ".!?",
            "Answer should end with punctuation"
        )

        dspy.Suggest(
            "step" in response.rationale.lower() or "because" in response.rationale.lower(),
            "Consider explaining your reasoning step by step"
        )

        return response
```

### Pattern 4: Multi-Stage Pipelines

```python
class OptimizedPipeline(dspy.Module):
    """
    Multi-stage pipeline where each stage can be optimized independently.
    """
    def __init__(self):
        # Stage 1: Extract key information
        self.extract = dspy.ChainOfThought(
            "document -> key_points, entities, summary"
        )

        # Stage 2: Reason about the information
        self.reason = dspy.ChainOfThought(
            "key_points, entities, question -> reasoning"
        )

        # Stage 3: Generate final answer
        self.answer = dspy.Predict(
            "summary, reasoning, question -> answer"
        )

    def forward(self, document, question):
        # Stage 1
        extracted = self.extract(document=document)

        # Stage 2
        reasoned = self.reason(
            key_points=extracted.key_points,
            entities=extracted.entities,
            question=question
        )

        # Stage 3
        result = self.answer(
            summary=extracted.summary,
            reasoning=reasoned.reasoning,
            question=question
        )

        return result
```

## Adapting DSPy Patterns for Claude Code

Since we can't use DSPy's Python framework directly in Claude Code, we adapt the patterns:

### Mental Bootstrapping

```markdown
## Bootstrap Pattern (Manual)

When improving a prompt, I will:

1. **Generate variations**: Create 5-10 instruction candidates
2. **Mental evaluation**: For each, consider:
   - Clarity: Is it unambiguous?
   - Completeness: Does it cover all cases?
   - Constraint density: Right amount of guidance?
3. **Select best**: Choose highest-scoring candidate
4. **Extract patterns**: What made it better?

Example:
Original: "Summarize the text"

Candidates:
- "Extract the main points from this text" (clarity: 7)
- "Provide a 3-sentence summary" (constraint: 8)
- "Identify thesis, evidence, and conclusion" (structure: 9)

Best: Combine structure (9) + constraint (8)
Result: "Identify the thesis, key evidence, and conclusion, then summarize in 2-3 sentences"
```

### Instruction Optimization Loop

```markdown
## COPRO Pattern (Manual)

For instruction optimization:

1. **Baseline**: Evaluate current prompt
2. **Generate candidates**: Create variations
3. **Evaluate each**: Score on clarity/specificity/effectiveness
4. **Select best**: Choose highest scorer
5. **Iterate**: Use best as new baseline
6. **Stop when**: Improvement < threshold or max iterations

Track:
- Iteration 1: Score 0.65
- Iteration 2: Score 0.72 (+0.07)
- Iteration 3: Score 0.75 (+0.03)
- Iteration 4: Score 0.76 (+0.01) ← Converging
- STOP: Improvement < 0.02
```

### Few-Shot Selection

```markdown
## Example Selection Pattern

When adding few-shot examples:

1. **Diversity**: Cover different scenarios
2. **Relevance**: Similar to expected inputs
3. **Difficulty**: Progress from easy to hard
4. **Quality**: Only include high-quality examples

Anti-patterns:
- All examples from same category ← Low coverage
- Examples too different from test case ← Low relevance
- All easy or all hard ← Imbalanced
```

## Convergence Criteria

### When to Stop Optimizing

```python
def should_stop_optimization(
    scores: list[float],
    iterations: int,
    max_iterations: int = 20,
    window: int = 3,
    threshold: float = 0.01
) -> tuple[bool, str]:
    """
    Determine if optimization should stop.

    Returns:
        (should_stop, reason)
    """
    # Max iterations reached
    if iterations >= max_iterations:
        return True, "max_iterations_reached"

    # Not enough data
    if len(scores) < window:
        return False, "insufficient_data"

    # Performance plateau
    recent_improvement = max(scores[-window:]) - scores[-window]
    if recent_improvement < threshold:
        return True, f"plateau_detected (improvement: {recent_improvement:.4f})"

    # High enough score
    if scores[-1] > 0.95:
        return True, f"target_reached (score: {scores[-1]:.4f})"

    return False, "continue"
```

### Iteration Count Heuristics

Based on research and empirical testing:

| Task Type | Recommended Iterations | Reason |
|-----------|----------------------|--------|
| Simple classification | 3-5 | Small search space |
| Text generation | 5-10 | Format variations |
| Complex reasoning | 10-15 | Multiple strategies |
| Multi-step pipeline | 15-20 | Component interactions |
| Agent optimization | 20-30 | High complexity |

## Implementation Notes

### Memory Efficiency

```python
# Keep only top-k candidates to manage memory
class CandidatePool:
    def __init__(self, max_size: int = 10):
        self.candidates = []
        self.max_size = max_size

    def add(self, candidate: str, score: float):
        self.candidates.append((candidate, score))
        self.candidates.sort(key=lambda x: x[1], reverse=True)
        self.candidates = self.candidates[:self.max_size]

    def get_best(self) -> str:
        return self.candidates[0][0] if self.candidates else None
```

### Reproducibility

```python
# Track optimization history for reproducibility
optimization_history = {
    "initial_prompt": "...",
    "iterations": [
        {"candidate": "...", "score": 0.65, "selected": False},
        {"candidate": "...", "score": 0.72, "selected": True},
    ],
    "final_prompt": "...",
    "final_score": 0.76,
    "convergence_reason": "plateau_detected"
}
```

---

These patterns form the foundation for systematic, measurable prompt optimization that can be applied even without access to DSPy's infrastructure.
