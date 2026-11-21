# RAG Evaluation

---

## Evaluation Framework Overview

| Framework | Focus | Strengths | Use Case |
|-----------|-------|-----------|----------|
| **RAGAS** | RAG-specific metrics | Faithfulness, relevance | Production RAG evaluation |
| **TruLens** | LLM app observability | Tracing, feedback functions | Debugging and monitoring |
| **LangSmith** | LangChain ecosystem | Traces, datasets, testing | LangChain projects |
| **Custom** | Specific requirements | Full control | Domain-specific needs |

---

## Core Metrics

### Retrieval Metrics

| Metric | Formula | What It Measures |
|--------|---------|------------------|
| **Precision@k** | Relevant in top-k / k | Are retrieved docs relevant? |
| **Recall@k** | Relevant in top-k / Total relevant | Did we get all relevant docs? |
| **MRR** | 1 / Rank of first relevant | How quickly do we find relevant? |
| **NDCG@k** | DCG@k / IDCG@k | Is ranking order correct? |
| **Hit Rate** | Queries with relevant in top-k / Total queries | Binary success rate |

### Generation Metrics

| Metric | What It Measures |
|--------|------------------|
| **Faithfulness** | Is answer grounded in retrieved context? |
| **Answer Relevance** | Does answer address the question? |
| **Context Relevance** | Is retrieved context relevant to question? |
| **Context Utilization** | How much context was actually used? |

---

## Implementing Core Metrics

### Precision, Recall, and Hit Rate

```python
from dataclasses import dataclass
from typing import Set

@dataclass
class RetrievalMetrics:
    precision_at_k: float
    recall_at_k: float
    hit_rate: float
    mrr: float

def calculate_retrieval_metrics(
    retrieved_ids: list[str],
    relevant_ids: set[str],
    k: int
) -> RetrievalMetrics:
    """Calculate core retrieval metrics."""
    top_k = retrieved_ids[:k]
    top_k_set = set(top_k)

    # Precision@k: relevant in top-k / k
    relevant_in_top_k = len(top_k_set & relevant_ids)
    precision = relevant_in_top_k / k if k > 0 else 0

    # Recall@k: relevant in top-k / total relevant
    recall = relevant_in_top_k / len(relevant_ids) if relevant_ids else 0

    # Hit Rate: 1 if any relevant in top-k, else 0
    hit_rate = 1.0 if relevant_in_top_k > 0 else 0.0

    # MRR: 1 / rank of first relevant result
    mrr = 0.0
    for i, doc_id in enumerate(top_k, 1):
        if doc_id in relevant_ids:
            mrr = 1.0 / i
            break

    return RetrievalMetrics(
        precision_at_k=precision,
        recall_at_k=recall,
        hit_rate=hit_rate,
        mrr=mrr
    )

# Usage
retrieved = ["doc1", "doc2", "doc3", "doc4", "doc5"]
relevant = {"doc2", "doc5", "doc7"}  # Ground truth

metrics = calculate_retrieval_metrics(retrieved, relevant, k=5)
print(f"Precision@5: {metrics.precision_at_k:.2f}")  # 2/5 = 0.40
print(f"Recall@5: {metrics.recall_at_k:.2f}")        # 2/3 = 0.67
print(f"MRR: {metrics.mrr:.2f}")                     # 1/2 = 0.50
```

### NDCG (Normalized Discounted Cumulative Gain)

```python
import numpy as np

def dcg_at_k(relevance_scores: list[float], k: int) -> float:
    """Calculate Discounted Cumulative Gain."""
    relevance_scores = np.array(relevance_scores[:k])
    if len(relevance_scores) == 0:
        return 0.0

    # DCG = sum(rel_i / log2(i + 1)) for i in 1..k
    discounts = np.log2(np.arange(2, len(relevance_scores) + 2))
    return np.sum(relevance_scores / discounts)

def ndcg_at_k(
    retrieved_ids: list[str],
    relevance_scores: dict[str, float],
    k: int
) -> float:
    """
    Calculate NDCG@k.
    relevance_scores: dict mapping doc_id to relevance (e.g., 0, 1, 2, 3)
    """
    # Get relevance scores for retrieved docs
    retrieved_relevance = [
        relevance_scores.get(doc_id, 0)
        for doc_id in retrieved_ids[:k]
    ]

    # Calculate DCG for retrieved order
    dcg = dcg_at_k(retrieved_relevance, k)

    # Calculate ideal DCG (perfect ranking)
    ideal_relevance = sorted(relevance_scores.values(), reverse=True)[:k]
    idcg = dcg_at_k(ideal_relevance, k)

    return dcg / idcg if idcg > 0 else 0.0

# Usage with graded relevance
retrieved = ["doc1", "doc2", "doc3", "doc4", "doc5"]
relevance = {
    "doc1": 0,   # Not relevant
    "doc2": 3,   # Highly relevant
    "doc3": 1,   # Somewhat relevant
    "doc5": 2,   # Relevant
    "doc7": 3,   # Highly relevant (not retrieved)
}

ndcg = ndcg_at_k(retrieved, relevance, k=5)
print(f"NDCG@5: {ndcg:.3f}")
```

---

## RAGAS Framework

### Installation and Setup

```python
# pip install ragas

from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    context_utilization,
)
from datasets import Dataset

# Prepare evaluation dataset
eval_data = {
    "question": [
        "What is the capital of France?",
        "How do I install Python?"
    ],
    "answer": [
        "The capital of France is Paris.",
        "You can install Python by downloading it from python.org."
    ],
    "contexts": [
        ["Paris is the capital and largest city of France."],
        ["Python can be installed from the official website python.org.",
         "You can also use package managers like brew or apt."]
    ],
    "ground_truth": [
        "Paris is the capital of France.",
        "Install Python from python.org or use a package manager."
    ]
}

dataset = Dataset.from_dict(eval_data)

# Run evaluation
results = evaluate(
    dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
    ]
)

print(results)
# {'faithfulness': 0.95, 'answer_relevancy': 0.88, ...}
```

### Custom RAGAS Evaluation

```python
from ragas.metrics import Metric
from ragas.llms import LangchainLLM
from langchain_openai import ChatOpenAI

# Use custom LLM
custom_llm = LangchainLLM(llm=ChatOpenAI(model="gpt-4o-mini"))

# Evaluate with custom settings
results = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy],
    llm=custom_llm,
    raise_exceptions=False  # Continue on errors
)

# Per-sample scores
for i, row in enumerate(results.to_pandas().itertuples()):
    print(f"Q{i+1}: Faithfulness={row.faithfulness:.2f}, "
          f"Relevancy={row.answer_relevancy:.2f}")
```

### RAGAS Metrics Explained

```python
"""
RAGAS Core Metrics:

1. Faithfulness (0-1):
   - Measures if answer is grounded in context
   - LLM extracts claims from answer, verifies against context
   - High score = answer doesn't hallucinate

2. Answer Relevancy (0-1):
   - Measures if answer addresses the question
   - Generates questions from answer, compares to original
   - High score = answer is on-topic

3. Context Precision (0-1):
   - Measures if retrieved contexts are relevant
   - Ranks contexts by relevance, calculates precision at each rank
   - High score = top contexts are most relevant

4. Context Recall (0-1):
   - Measures if all ground truth info is in context
   - Checks if ground truth sentences are supported by context
   - High score = context contains needed information
"""

# Debugging low scores
def diagnose_ragas_scores(results_df):
    """Identify problematic samples."""
    issues = []

    for idx, row in results_df.iterrows():
        if row.get('faithfulness', 1) < 0.5:
            issues.append({
                "index": idx,
                "issue": "Low faithfulness - answer may contain hallucinations",
                "question": row['question'],
                "answer": row['answer'][:200]
            })

        if row.get('context_recall', 1) < 0.5:
            issues.append({
                "index": idx,
                "issue": "Low context recall - retrieval missing relevant docs",
                "question": row['question']
            })

    return issues
```

---

## TruLens Evaluation

### Setup and Basic Usage

```python
# pip install trulens-eval

from trulens_eval import Tru, TruChain, Feedback
from trulens_eval.feedback import Groundedness
from trulens_eval.feedback.provider import OpenAI as fOpenAI

# Initialize TruLens
tru = Tru()

# Create feedback provider
provider = fOpenAI()

# Define feedback functions
f_groundedness = Feedback(
    provider.groundedness_measure_with_cot_reasons,
    name="Groundedness"
).on(
    TruChain.select_context().node.text  # Retrieved context
).on_output()

f_relevance = Feedback(
    provider.relevance_with_cot_reasons,
    name="Answer Relevance"
).on_input().on_output()

f_context_relevance = Feedback(
    provider.context_relevance_with_cot_reasons,
    name="Context Relevance"
).on_input().on(
    TruChain.select_context().node.text
)

# Wrap your RAG chain
from langchain.chains import RetrievalQA

rag_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vector_store.as_retriever()
)

tru_recorder = TruChain(
    rag_chain,
    app_id="rag-v1",
    feedbacks=[f_groundedness, f_relevance, f_context_relevance]
)

# Run with recording
with tru_recorder as recording:
    response = rag_chain.invoke({"query": "How do I configure authentication?"})

# View results
tru.run_dashboard()  # Opens web UI
# Or get programmatically
records = tru.get_records_and_feedback(app_ids=["rag-v1"])
```

### Custom Feedback Functions

```python
from trulens_eval import Feedback, Select

def custom_citation_check(response: str, context: str) -> float:
    """Check if response cites sources from context."""
    # Extract citations from response (e.g., [1], [Source: X])
    import re
    citations = re.findall(r'\[[\d\w\s:]+\]', response)

    if not citations:
        return 0.0  # No citations

    # Verify citations reference actual context
    valid_citations = sum(1 for c in citations if c.lower() in context.lower())
    return valid_citations / len(citations)

f_citation = Feedback(
    custom_citation_check,
    name="Citation Accuracy"
).on_output().on(Select.RecordCalls.retriever.get_relevant_documents.rets.page_content)
```

---

## Building Custom Evaluation Pipelines

### LLM-as-Judge Evaluation

```python
from openai import OpenAI
from dataclasses import dataclass
from typing import Literal

client = OpenAI()

@dataclass
class EvalResult:
    score: float
    reasoning: str
    criteria: str

def evaluate_with_llm(
    question: str,
    answer: str,
    context: str,
    criteria: Literal["faithfulness", "relevance", "completeness"]
) -> EvalResult:
    """Use LLM as judge for evaluation."""

    criteria_prompts = {
        "faithfulness": """
            Evaluate if the answer is fully supported by the provided context.
            Score 1.0 if every claim in the answer is verifiable from context.
            Score 0.5 if most claims are supported but some are not.
            Score 0.0 if the answer contains significant unsupported claims.
        """,
        "relevance": """
            Evaluate if the answer directly addresses the question.
            Score 1.0 if the answer fully addresses the question.
            Score 0.5 if the answer partially addresses the question.
            Score 0.0 if the answer is off-topic or doesn't address the question.
        """,
        "completeness": """
            Evaluate if the answer covers all aspects of the question.
            Score 1.0 if the answer is comprehensive and complete.
            Score 0.5 if the answer covers main points but misses details.
            Score 0.0 if the answer is significantly incomplete.
        """
    }

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"""You are an expert evaluator for RAG systems.
                {criteria_prompts[criteria]}

                Respond in JSON format:
                {{"score": <0.0-1.0>, "reasoning": "<explanation>"}}"""
            },
            {
                "role": "user",
                "content": f"""Question: {question}

Context:
{context}

Answer: {answer}

Evaluate the answer for {criteria}:"""
            }
        ],
        response_format={"type": "json_object"}
    )

    import json
    result = json.loads(response.choices[0].message.content)

    return EvalResult(
        score=result["score"],
        reasoning=result["reasoning"],
        criteria=criteria
    )

# Usage
eval_result = evaluate_with_llm(
    question="How do I configure OAuth2?",
    answer="Configure OAuth2 by setting client_id and client_secret in config.yaml.",
    context="OAuth2 configuration requires client_id, client_secret, and redirect_uri in config.yaml.",
    criteria="faithfulness"
)
print(f"Faithfulness: {eval_result.score:.2f}")
print(f"Reasoning: {eval_result.reasoning}")
```

### Batch Evaluation Pipeline

```python
import asyncio
from tqdm.asyncio import tqdm_asyncio

async def evaluate_batch(
    test_cases: list[dict],
    retriever,
    generator,
    metrics: list[str] = ["precision", "faithfulness", "relevance"]
) -> dict:
    """Run batch evaluation on test cases."""

    results = {
        "per_sample": [],
        "aggregated": {}
    }

    async def evaluate_single(case: dict) -> dict:
        # Retrieve
        retrieved = await retriever.aretrieve(case["question"])
        retrieved_ids = [r.id for r in retrieved]

        # Generate
        answer = await generator.agenerate(
            question=case["question"],
            context=[r.text for r in retrieved]
        )

        # Calculate metrics
        sample_result = {
            "question": case["question"],
            "answer": answer,
            "retrieved_ids": retrieved_ids
        }

        if "relevant_ids" in case and "precision" in metrics:
            retrieval_metrics = calculate_retrieval_metrics(
                retrieved_ids,
                set(case["relevant_ids"]),
                k=5
            )
            sample_result["precision@5"] = retrieval_metrics.precision_at_k
            sample_result["recall@5"] = retrieval_metrics.recall_at_k

        if "faithfulness" in metrics:
            faith_eval = evaluate_with_llm(
                case["question"],
                answer,
                "\n".join([r.text for r in retrieved]),
                "faithfulness"
            )
            sample_result["faithfulness"] = faith_eval.score

        return sample_result

    # Run evaluations concurrently
    tasks = [evaluate_single(case) for case in test_cases]
    results["per_sample"] = await tqdm_asyncio.gather(*tasks)

    # Aggregate results
    for metric in ["precision@5", "recall@5", "faithfulness"]:
        scores = [r.get(metric) for r in results["per_sample"] if r.get(metric) is not None]
        if scores:
            results["aggregated"][metric] = {
                "mean": sum(scores) / len(scores),
                "min": min(scores),
                "max": max(scores)
            }

    return results
```

---

## Debugging Poor Retrieval

### Retrieval Diagnostics

```python
def diagnose_retrieval(
    query: str,
    retrieved_docs: list,
    expected_docs: list,
    embedding_model
) -> dict:
    """Diagnose why retrieval might be failing."""

    query_embedding = embedding_model.encode(query)
    retrieved_embeddings = [embedding_model.encode(d) for d in retrieved_docs]
    expected_embeddings = [embedding_model.encode(d) for d in expected_docs]

    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    diagnosis = {
        "query": query,
        "issues": []
    }

    # Check query-document similarity
    for i, (doc, emb) in enumerate(zip(retrieved_docs, retrieved_embeddings)):
        sim = cosine_similarity([query_embedding], [emb])[0][0]
        if sim < 0.5:
            diagnosis["issues"].append({
                "type": "low_similarity",
                "doc_index": i,
                "similarity": float(sim),
                "doc_preview": doc[:100]
            })

    # Check if expected docs would score higher
    for i, (doc, emb) in enumerate(zip(expected_docs, expected_embeddings)):
        sim = cosine_similarity([query_embedding], [emb])[0][0]
        retrieved_max_sim = max(
            cosine_similarity([query_embedding], [e])[0][0]
            for e in retrieved_embeddings
        )

        if sim > retrieved_max_sim:
            diagnosis["issues"].append({
                "type": "missed_better_doc",
                "expected_doc_index": i,
                "expected_sim": float(sim),
                "best_retrieved_sim": float(retrieved_max_sim),
                "doc_preview": doc[:100]
            })

    # Check for vocabulary mismatch
    query_terms = set(query.lower().split())
    for i, doc in enumerate(retrieved_docs):
        doc_terms = set(doc.lower().split())
        overlap = query_terms & doc_terms
        if len(overlap) < len(query_terms) * 0.3:
            diagnosis["issues"].append({
                "type": "vocabulary_mismatch",
                "doc_index": i,
                "query_terms": list(query_terms),
                "overlapping_terms": list(overlap)
            })

    return diagnosis

# Usage
diagnosis = diagnose_retrieval(
    query="How to configure OAuth authentication",
    retrieved_docs=retrieved_texts,
    expected_docs=expected_texts,
    embedding_model=sentence_transformer
)

for issue in diagnosis["issues"]:
    print(f"Issue: {issue['type']}")
    print(f"Details: {issue}")
```

### Query Analysis

```python
def analyze_query_performance(
    query_logs: list[dict],
    threshold_precision: float = 0.6
) -> dict:
    """Analyze query patterns to find systematic issues."""

    analysis = {
        "total_queries": len(query_logs),
        "low_performing": [],
        "patterns": {}
    }

    for log in query_logs:
        if log.get("precision@5", 1.0) < threshold_precision:
            analysis["low_performing"].append(log)

    # Analyze low-performing queries
    if analysis["low_performing"]:
        # Check for common patterns
        low_perf_queries = [l["query"] for l in analysis["low_performing"]]

        # Query length analysis
        avg_length = sum(len(q.split()) for q in low_perf_queries) / len(low_perf_queries)
        analysis["patterns"]["avg_low_perf_query_length"] = avg_length

        # Common terms in failing queries
        from collections import Counter
        all_terms = []
        for q in low_perf_queries:
            all_terms.extend(q.lower().split())
        analysis["patterns"]["common_failing_terms"] = Counter(all_terms).most_common(10)

        # Question type analysis
        question_words = ["how", "what", "why", "when", "where", "who"]
        question_types = Counter()
        for q in low_perf_queries:
            for qw in question_words:
                if q.lower().startswith(qw):
                    question_types[qw] += 1
                    break
            else:
                question_types["other"] += 1
        analysis["patterns"]["failing_question_types"] = dict(question_types)

    return analysis
```

---

## Continuous Monitoring

### Production Metrics Dashboard

```python
import time
from dataclasses import dataclass, field
from collections import deque
from threading import Lock

@dataclass
class RAGMetricsCollector:
    """Collect and track RAG metrics in production."""

    window_size: int = 1000
    _latencies: deque = field(default_factory=lambda: deque(maxlen=1000))
    _retrieval_scores: deque = field(default_factory=lambda: deque(maxlen=1000))
    _generation_scores: deque = field(default_factory=lambda: deque(maxlen=1000))
    _lock: Lock = field(default_factory=Lock)

    def record_query(
        self,
        latency_ms: float,
        retrieval_score: float | None = None,
        generation_score: float | None = None
    ):
        """Record metrics for a single query."""
        with self._lock:
            self._latencies.append(latency_ms)
            if retrieval_score is not None:
                self._retrieval_scores.append(retrieval_score)
            if generation_score is not None:
                self._generation_scores.append(generation_score)

    def get_summary(self) -> dict:
        """Get current metrics summary."""
        with self._lock:
            import numpy as np

            summary = {
                "queries_in_window": len(self._latencies),
                "latency": {
                    "p50": np.percentile(self._latencies, 50) if self._latencies else 0,
                    "p95": np.percentile(self._latencies, 95) if self._latencies else 0,
                    "p99": np.percentile(self._latencies, 99) if self._latencies else 0,
                },
                "retrieval_score": {
                    "mean": np.mean(self._retrieval_scores) if self._retrieval_scores else 0,
                    "std": np.std(self._retrieval_scores) if self._retrieval_scores else 0,
                },
                "generation_score": {
                    "mean": np.mean(self._generation_scores) if self._generation_scores else 0,
                    "std": np.std(self._generation_scores) if self._generation_scores else 0,
                }
            }

            return summary

# Usage
metrics = RAGMetricsCollector()

# In your RAG endpoint
start = time.time()
response = rag_pipeline.query(question)
latency = (time.time() - start) * 1000

metrics.record_query(
    latency_ms=latency,
    retrieval_score=response.get("retrieval_score"),
    generation_score=response.get("generation_score")
)

# Periodically check
print(metrics.get_summary())
```

### Alerting on Quality Degradation

```python
class RAGQualityMonitor:
    """Monitor RAG quality and alert on degradation."""

    def __init__(
        self,
        baseline_precision: float = 0.8,
        alert_threshold: float = 0.1,  # Alert if drops by 10%
        window_size: int = 100
    ):
        self.baseline = baseline_precision
        self.threshold = alert_threshold
        self.window_size = window_size
        self.recent_scores = deque(maxlen=window_size)

    def record_score(self, precision: float) -> dict | None:
        """Record score and return alert if quality degraded."""
        self.recent_scores.append(precision)

        if len(self.recent_scores) < self.window_size // 2:
            return None  # Not enough data

        current_mean = sum(self.recent_scores) / len(self.recent_scores)
        degradation = self.baseline - current_mean

        if degradation > self.threshold:
            return {
                "alert": "QUALITY_DEGRADATION",
                "baseline": self.baseline,
                "current": current_mean,
                "degradation": degradation,
                "window_size": len(self.recent_scores)
            }

        return None

# Usage
monitor = RAGQualityMonitor(baseline_precision=0.85)

for query_result in production_queries:
    alert = monitor.record_score(query_result["precision@5"])
    if alert:
        send_alert(alert)  # Slack, PagerDuty, etc.
```

---

## Evaluation Best Practices

| Practice | Description |
|----------|-------------|
| **Golden test set** | Maintain 50-200 curated Q&A pairs with ground truth |
| **Stratified sampling** | Include diverse query types in test set |
| **Human baselines** | Compare LLM judges against human annotators |
| **Version control** | Track evaluation results alongside model versions |
| **Regular re-evaluation** | Re-run golden tests on every retrieval change |
| **A/B testing** | Compare new retrieval strategies on live traffic |

---

## Quick Reference

| Goal | Metric | Target |
|------|--------|--------|
| Are docs relevant? | Precision@5 | > 0.7 |
| Did we get all docs? | Recall@5 | > 0.8 |
| Is ranking good? | NDCG@5 | > 0.7 |
| Is answer grounded? | Faithfulness | > 0.9 |
| Does answer fit question? | Answer Relevance | > 0.8 |
| Is context useful? | Context Relevance | > 0.7 |

| Framework | Best For |
|-----------|----------|
| RAGAS | Quick RAG-specific evaluation |
| TruLens | Production monitoring and tracing |
| Custom LLM-judge | Domain-specific criteria |
| Manual annotation | Ground truth creation |

## Related Skills

- **RAG Architect** - System design
- **ML Pipeline** - Evaluation automation
- **Data Scientist** - Statistical analysis
- **Monitoring Expert** - Production observability
