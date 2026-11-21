# LLM Evaluation Frameworks

Concrete metrics, scoring methods, comparison tables, and A/B testing frameworks.

## Frameworks Index

1. [Evaluation Metrics Overview](#1-evaluation-metrics-overview)
2. [Text Generation Metrics](#2-text-generation-metrics)
3. [RAG-Specific Metrics](#3-rag-specific-metrics)
4. [Human Evaluation Frameworks](#4-human-evaluation-frameworks)
5. [A/B Testing for Prompts](#5-ab-testing-for-prompts)
6. [Benchmark Datasets](#6-benchmark-datasets)
7. [Evaluation Pipeline Design](#7-evaluation-pipeline-design)

---

## 1. Evaluation Metrics Overview

### Metric Categories

| Category | Metrics | When to Use |
|----------|---------|-------------|
| **Lexical** | BLEU, ROUGE, Exact Match | Reference-based comparison |
| **Semantic** | BERTScore, Embedding similarity | Meaning preservation |
| **Task-specific** | F1, Accuracy, Precision/Recall | Classification, extraction |
| **Quality** | Coherence, Fluency, Relevance | Open-ended generation |
| **Safety** | Toxicity, Bias scores | Content moderation |

### Choosing the Right Metric

```
Is there a single correct answer?
├── Yes → Exact Match or F1
└── No
    └── Is there a reference output?
        ├── Yes → BLEU, ROUGE, or BERTScore
        └── No
            └── Can you define quality criteria?
                ├── Yes → Human evaluation + LLM-as-judge
                └── No → A/B testing with user metrics
```

---

## 2. Text Generation Metrics

### BLEU (Bilingual Evaluation Understudy)

**What it measures:** N-gram overlap between generated and reference text.

**Score range:** 0 to 1 (higher is better)

**Calculation:**
```
BLEU = BP × exp(Σ wn × log(pn))

Where:
- BP = brevity penalty (penalizes short outputs)
- pn = precision of n-grams
- wn = weight (typically 0.25 for BLEU-4)
```

**Interpretation:**
| BLEU Score | Quality |
|------------|---------|
| > 0.6 | Excellent |
| 0.4 - 0.6 | Good |
| 0.2 - 0.4 | Acceptable |
| < 0.2 | Poor |

**Example:**
```
Reference: "The quick brown fox jumps over the lazy dog"
Generated: "A fast brown fox leaps over the lazy dog"

1-gram precision: 7/9 = 0.78 (matched: brown, fox, over, the, lazy, dog)
2-gram precision: 4/8 = 0.50 (matched: brown fox, the lazy, lazy dog)
BLEU-4: ~0.35
```

**Limitations:**
- Doesn't capture meaning (synonyms penalized)
- Position-independent
- Requires reference text

---

### ROUGE (Recall-Oriented Understudy for Gisting Evaluation)

**What it measures:** Overlap focused on recall (coverage of reference).

**Variants:**
| Variant | Measures |
|---------|----------|
| ROUGE-1 | Unigram overlap |
| ROUGE-2 | Bigram overlap |
| ROUGE-L | Longest common subsequence |
| ROUGE-Lsum | LCS with sentence-level computation |

**Calculation:**
```
ROUGE-N Recall = (matching n-grams) / (n-grams in reference)
ROUGE-N Precision = (matching n-grams) / (n-grams in generated)
ROUGE-N F1 = 2 × (Precision × Recall) / (Precision + Recall)
```

**Example:**
```
Reference: "The cat sat on the mat"
Generated: "The cat was sitting on the mat"

ROUGE-1:
  Recall: 5/6 = 0.83 (matched: the, cat, on, the, mat)
  Precision: 5/7 = 0.71
  F1: 0.77

ROUGE-2:
  Recall: 2/5 = 0.40 (matched: "the cat", "the mat")
  Precision: 2/6 = 0.33
  F1: 0.36
```

**Best for:** Summarization, text compression

---

### BERTScore

**What it measures:** Semantic similarity using contextual embeddings.

**How it works:**
1. Generate BERT embeddings for each token
2. Compute cosine similarity between token pairs
3. Apply greedy matching to find best alignment
4. Aggregate into Precision, Recall, F1

**Advantages over lexical metrics:**
- Captures synonyms and paraphrases
- Context-aware matching
- Better correlation with human judgment

**Example:**
```
Reference: "The movie was excellent"
Generated: "The film was outstanding"

Lexical (BLEU): Low score (only "The" and "was" match)
BERTScore: High score (semantic meaning preserved)
```

**Interpretation:**
| BERTScore F1 | Quality |
|--------------|---------|
| > 0.9 | Excellent |
| 0.8 - 0.9 | Good |
| 0.7 - 0.8 | Acceptable |
| < 0.7 | Review needed |

---

## 3. RAG-Specific Metrics

### Context Relevance

**What it measures:** How relevant retrieved documents are to the query.

**Calculation methods:**

**Method 1: Embedding similarity**
```python
relevance = cosine_similarity(
    embed(query),
    embed(context)
)
```

**Method 2: LLM-as-judge**
```
Prompt: "Rate the relevance of this context to the question.
Question: {question}
Context: {context}
Rate from 1-5 where 5 is highly relevant."
```

**Target:** > 0.8 for top-k contexts

---

### Answer Faithfulness

**What it measures:** Whether the answer is supported by the context (no hallucination).

**Evaluation prompt:**
```
Given the context and answer, determine if every claim in the
answer is supported by the context.

Context: {context}
Answer: {answer}

For each claim in the answer:
1. Identify the claim
2. Find supporting evidence in context (or mark as unsupported)
3. Rate: Supported / Partially Supported / Not Supported

Overall faithfulness score: [0-1]
```

**Scoring:**
```
Faithfulness = (supported claims) / (total claims)
```

**Target:** > 0.95 for production systems

---

### Retrieval Metrics

| Metric | Formula | What it measures |
|--------|---------|------------------|
| **Precision@k** | (relevant in top-k) / k | Quality of top results |
| **Recall@k** | (relevant in top-k) / (total relevant) | Coverage |
| **MRR** | 1 / (rank of first relevant) | Position of first hit |
| **NDCG@k** | DCG@k / IDCG@k | Ranking quality |

**Example:**
```
Query: "What is photosynthesis?"
Retrieved docs (k=5): [R, N, R, N, R]  (R=relevant, N=not relevant)
Total relevant in corpus: 10

Precision@5 = 3/5 = 0.6
Recall@5 = 3/10 = 0.3
MRR = 1/1 = 1.0 (first doc is relevant)
```

---

## 4. Human Evaluation Frameworks

### Likert Scale Evaluation

**Setup:**
```
Rate the following response on a scale of 1-5:

Response: {generated_response}

Criteria:
- Relevance (1-5): Does it address the question?
- Accuracy (1-5): Is the information correct?
- Fluency (1-5): Is it well-written?
- Helpfulness (1-5): Would this be useful to the user?
```

**Sample size guidance:**
| Confidence Level | Margin of Error | Required Samples |
|-----------------|-----------------|------------------|
| 95% | ±5% | 385 |
| 95% | ±10% | 97 |
| 90% | ±10% | 68 |

---

### Comparative Evaluation (Side-by-Side)

**Setup:**
```
Compare these two responses to the question:

Question: {question}

Response A: {response_a}
Response B: {response_b}

Which response is better?
[ ] A is much better
[ ] A is slightly better
[ ] About the same
[ ] B is slightly better
[ ] B is much better

Why? _______________
```

**Advantages:**
- Easier for humans than absolute scoring
- Reduces calibration issues
- Clear winner for A/B decisions

**Analysis:**
```
Win rate = (A wins + 0.5 × ties) / total
Bradley-Terry model for ranking multiple variants
```

---

### LLM-as-Judge

**Setup:**
```
You are an expert evaluator. Rate the quality of this response.

Question: {question}
Response: {response}
Reference (if available): {reference}

Evaluate on:
1. Correctness (0-10): Is the information accurate?
2. Completeness (0-10): Does it fully address the question?
3. Clarity (0-10): Is it easy to understand?
4. Conciseness (0-10): Is it appropriately brief?

Provide scores and brief justification for each.
Overall score (0-10):
```

**Calibration techniques:**
- Include reference responses with known scores
- Use chain-of-thought for reasoning
- Compare against human baseline periodically

**Known biases:**
| Bias | Mitigation |
|------|------------|
| Position bias | Randomize order |
| Length bias | Normalize or specify length |
| Self-preference | Use different model as judge |
| Verbosity preference | Penalize unnecessary length |

---

## 5. A/B Testing for Prompts

### Experiment Design

**Hypothesis template:**
```
H0: Prompt A and Prompt B have equal performance on [metric]
H1: Prompt B improves [metric] by at least [minimum detectable effect]
```

**Sample size calculation:**
```
n = 2 × ((z_α + z_β)² × σ²) / δ²

Where:
- z_α = 1.96 for 95% confidence
- z_β = 0.84 for 80% power
- σ = standard deviation of metric
- δ = minimum detectable effect
```

**Quick reference:**
| MDE | Baseline Rate | Required n/variant |
|-----|---------------|-------------------|
| 5% relative | 50% | 3,200 |
| 10% relative | 50% | 800 |
| 20% relative | 50% | 200 |

---

### Metrics to Track

**Primary metrics:**
| Metric | Measurement |
|--------|-------------|
| Task success rate | % of queries with correct/helpful response |
| User satisfaction | Thumbs up/down or 1-5 rating |
| Engagement | Follow-up questions, session length |

**Guardrail metrics:**
| Metric | Threshold |
|--------|-----------|
| Error rate | < 1% |
| Latency P95 | < 2s |
| Toxicity rate | < 0.1% |
| Cost per query | Within budget |

---

### Analysis Framework

**Statistical test selection:**
```
Is the metric binary (success/failure)?
├── Yes → Chi-squared test or Z-test for proportions
└── No
    └── Is the data normally distributed?
        ├── Yes → Two-sample t-test
        └── No → Mann-Whitney U test
```

**Interpreting results:**
```
p-value < 0.05: Statistically significant
Effect size (Cohen's d):
  - Small: 0.2
  - Medium: 0.5
  - Large: 0.8

Decision: Ship if p < 0.05 AND effect size meets threshold AND guardrails pass
```

---

## 6. Benchmark Datasets

### General NLP Benchmarks

| Benchmark | Task | Size | Metric |
|-----------|------|------|--------|
| **MMLU** | Knowledge QA | 14K | Accuracy |
| **HellaSwag** | Commonsense | 10K | Accuracy |
| **TruthfulQA** | Factuality | 817 | % Truthful |
| **HumanEval** | Code generation | 164 | pass@k |
| **GSM8K** | Math reasoning | 8.5K | Accuracy |

### RAG Benchmarks

| Benchmark | Focus | Metrics |
|-----------|-------|---------|
| **Natural Questions** | Wikipedia QA | EM, F1 |
| **HotpotQA** | Multi-hop reasoning | EM, F1 |
| **MS MARCO** | Web search | MRR, Recall |
| **BEIR** | Zero-shot retrieval | NDCG@10 |

### Creating Custom Benchmarks

**Template:**
```json
{
  "id": "custom-001",
  "input": "What are the symptoms of diabetes?",
  "expected_output": "Common symptoms include...",
  "metadata": {
    "category": "medical",
    "difficulty": "easy",
    "source": "internal docs"
  },
  "evaluation": {
    "type": "semantic_similarity",
    "threshold": 0.85
  }
}
```

**Best practices:**
- Minimum 100 examples per category
- Include edge cases (10-20%)
- Balance difficulty levels
- Version control your benchmark
- Update quarterly

---

## 7. Evaluation Pipeline Design

### Automated Evaluation Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Prompt    │────▶│   LLM API   │────▶│   Output    │
│   Version   │     │             │     │   Storage   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Metrics   │◀────│  Evaluator  │◀────│  Benchmark  │
│   Dashboard │     │   Service   │     │   Dataset   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Implementation Checklist

```
□ Define success metrics
  □ Primary metric (what you're optimizing)
  □ Guardrail metrics (what must not regress)
  □ Monitoring metrics (operational health)

□ Create benchmark dataset
  □ Representative samples from production
  □ Edge cases and failure modes
  □ Golden answers or human labels

□ Set up evaluation infrastructure
  □ Automated scoring pipeline
  □ Version control for prompts
  □ Results tracking and comparison

□ Establish baseline
  □ Run current prompt against benchmark
  □ Document scores for all metrics
  □ Set improvement targets

□ Run experiments
  □ Test one change at a time
  □ Use statistical significance testing
  □ Check all guardrail metrics

□ Deploy and monitor
  □ Gradual rollout (canary)
  □ Real-time metric monitoring
  □ Rollback plan if regression
```

---

## Quick Reference: Metric Selection

| Use Case | Primary Metric | Secondary Metrics |
|----------|---------------|-------------------|
| Summarization | ROUGE-L | BERTScore, Compression ratio |
| Translation | BLEU | chrF, Human pref |
| QA (extractive) | Exact Match, F1 | |
| QA (generative) | BERTScore | Faithfulness, Relevance |
| Code generation | pass@k | Syntax errors |
| Classification | Accuracy, F1 | Precision, Recall |
| RAG | Faithfulness | Context relevance, MRR |
| Open-ended chat | Human eval | Helpfulness, Safety |
