# Iteration Strategy

Decision framework for optimization depth.

## Decision Matrix

| Factor | Low (3-5 iter) | Medium (5-10 iter) | High (10-20 iter) |
|--------|----------------|-------------------|-------------------|
| **Complexity** | Simple classification | Multi-step reasoning | Agent/pipeline |
| **Ambiguity** | Clear requirements | Some interpretation | Underspecified |
| **Domain** | Well-researched | Moderate coverage | Novel domain |
| **Search Space** | Single instruction | Few-shot selection | Full program |
| **Stakes** | Low impact | Moderate impact | Critical path |

## Complexity Assessment

```
Complexity Score (0-1):
- Task decomposition depth (0.3): How many sub-tasks?
- Reasoning steps required (0.3): Chain length
- Domain specificity (0.2): Specialized knowledge?
- Output structure (0.2): Format complexity

Score &lt; 0.3 → 3-5 iterations
Score 0.3-0.6 → 5-10 iterations
Score &gt; 0.6 → 10-20 iterations
```

## Ambiguity Assessment

```
Ambiguity Score (0-1):
- Requirement clarity (0.4): Are success criteria explicit?
- Interpretation variance (0.3): Multiple valid readings?
- Example availability (0.3): Concrete examples provided?

High ambiguity → +5 iterations (for exploration)
```

## Decision Tree: When to Iterate More

```
START
│
├─ Is task critical? ──YES──→ +5 iterations
│
├─ Is domain novel? ──YES──→ +5 iterations
│
├─ Are requirements ambiguous? ──YES──→ +5 iterations
│
├─ Do I have similar prompts? ──YES──→ -3 iterations (start better)
│
└─ Base: 5 iterations

TOTAL = Base + adjustments (min 3, max 20)
```

## Convergence Criteria

Stop iterating when:
1. **Performance plateau**: No improvement &gt; 1% over last 3 iterations
2. **Diminishing returns**: Cost per improvement unit exceeds threshold
3. **Statistical significance**: Confidence interval &lt; 2%
4. **Budget exhausted**: Max iterations or token limit reached

```python
def check_convergence(scores, window=3, threshold=0.01):
    """Stop if improvement &lt; threshold over window iterations"""
    if len(scores) &lt; window:
        return False
    recent_improvement = max(scores[-window:]) - scores[-window]
    return recent_improvement &lt; threshold
```

## Stop Conditions

```
STOP if ANY:
- Improvement &lt; 1% for 3 consecutive iterations
- User signals satisfaction
- Token budget exhausted
- 20 iterations reached
- Validation score &gt; 0.95
```

## Performance Expectations

| Scenario | Expected Improvement | Iterations |
|----------|---------------------|------------|
| Simple task | 10-20% | 3-5 |
| Complex reasoning | 20-40% | 10-15 |
| Agent/pipeline | 30-50% | 15-20 |
| With history | +10-15% additional | Varies |
