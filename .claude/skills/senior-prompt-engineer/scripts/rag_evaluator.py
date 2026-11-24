#!/usr/bin/env python3
"""
RAG Evaluator - Evaluation tool for Retrieval-Augmented Generation systems

Features:
- Context relevance scoring (lexical overlap)
- Answer faithfulness checking
- Retrieval metrics (Precision@K, Recall@K, MRR)
- Coverage analysis
- Quality report generation

Usage:
    python rag_evaluator.py --contexts contexts.json --questions questions.json
    python rag_evaluator.py --contexts ctx.json --questions q.json --metrics relevance,faithfulness
    python rag_evaluator.py --contexts ctx.json --questions q.json --output report.json --verbose
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, asdict, field
from collections import Counter
import math


@dataclass
class RetrievalMetrics:
    """Retrieval quality metrics"""
    precision_at_k: float
    recall_at_k: float
    mrr: float  # Mean Reciprocal Rank
    ndcg_at_k: float
    k: int


@dataclass
class ContextEvaluation:
    """Evaluation of a single context"""
    context_id: str
    relevance_score: float
    token_overlap: float
    key_terms_covered: List[str]
    missing_terms: List[str]


@dataclass
class AnswerEvaluation:
    """Evaluation of an answer against context"""
    question_id: str
    faithfulness_score: float
    groundedness_score: float
    claims: List[Dict[str, any]]
    unsupported_claims: List[str]
    context_used: List[str]


@dataclass
class RAGEvaluationReport:
    """Complete RAG evaluation report"""
    total_questions: int
    avg_context_relevance: float
    avg_faithfulness: float
    avg_groundedness: float
    retrieval_metrics: Dict[str, float]
    coverage: float
    issues: List[Dict[str, str]]
    recommendations: List[str]
    question_details: List[Dict[str, any]] = field(default_factory=list)


def tokenize(text: str) -> List[str]:
    """Simple tokenization for text comparison"""
    # Lowercase and split on non-alphanumeric
    text = text.lower()
    tokens = re.findall(r'\b\w+\b', text)
    # Remove common stopwords
    stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
                 'from', 'as', 'into', 'through', 'during', 'before', 'after',
                 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
                 'again', 'further', 'then', 'once', 'here', 'there', 'when',
                 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most',
                 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
                 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
                 'if', 'or', 'because', 'until', 'while', 'it', 'this', 'that',
                 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they'}
    return [t for t in tokens if t not in stopwords and len(t) > 2]


def extract_key_terms(text: str, top_n: int = 10) -> List[str]:
    """Extract key terms from text based on frequency"""
    tokens = tokenize(text)
    freq = Counter(tokens)
    return [term for term, _ in freq.most_common(top_n)]


def calculate_token_overlap(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts"""
    tokens1 = set(tokenize(text1))
    tokens2 = set(tokenize(text2))

    if not tokens1 or not tokens2:
        return 0.0

    intersection = tokens1 & tokens2
    union = tokens1 | tokens2

    return len(intersection) / len(union) if union else 0.0


def calculate_rouge_l(reference: str, candidate: str) -> float:
    """Calculate ROUGE-L score (Longest Common Subsequence)"""
    ref_tokens = tokenize(reference)
    cand_tokens = tokenize(candidate)

    if not ref_tokens or not cand_tokens:
        return 0.0

    # LCS using dynamic programming
    m, n = len(ref_tokens), len(cand_tokens)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if ref_tokens[i-1] == cand_tokens[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    lcs_length = dp[m][n]

    # F1-like score
    precision = lcs_length / n if n > 0 else 0
    recall = lcs_length / m if m > 0 else 0

    if precision + recall == 0:
        return 0.0

    return 2 * precision * recall / (precision + recall)


def evaluate_context_relevance(question: str, context: str, context_id: str = "") -> ContextEvaluation:
    """Evaluate how relevant a context is to a question"""
    question_terms = set(extract_key_terms(question, 15))
    context_terms = set(extract_key_terms(context, 30))

    covered = question_terms & context_terms
    missing = question_terms - context_terms

    # Calculate relevance based on term coverage and overlap
    term_coverage = len(covered) / len(question_terms) if question_terms else 0
    token_overlap = calculate_token_overlap(question, context)

    # Combined relevance score
    relevance = 0.6 * term_coverage + 0.4 * token_overlap

    return ContextEvaluation(
        context_id=context_id,
        relevance_score=round(relevance, 3),
        token_overlap=round(token_overlap, 3),
        key_terms_covered=list(covered),
        missing_terms=list(missing)
    )


def extract_claims(answer: str) -> List[str]:
    """Extract individual claims from an answer"""
    # Split on sentence boundaries
    sentences = re.split(r'[.!?]+', answer)
    claims = []

    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) > 10:  # Filter out very short fragments
            claims.append(sentence)

    return claims


def check_claim_support(claim: str, context: str) -> Tuple[bool, float]:
    """Check if a claim is supported by the context"""
    claim_terms = set(tokenize(claim))
    context_terms = set(tokenize(context))

    if not claim_terms:
        return True, 1.0  # Empty claim is "supported"

    # Check term overlap
    overlap = claim_terms & context_terms
    support_ratio = len(overlap) / len(claim_terms)

    # Also check for ROUGE-L style matching
    rouge_score = calculate_rouge_l(context, claim)

    # Combined support score
    support_score = 0.5 * support_ratio + 0.5 * rouge_score

    return support_score > 0.3, support_score


def evaluate_answer_faithfulness(
    question: str,
    answer: str,
    contexts: List[str],
    question_id: str = ""
) -> AnswerEvaluation:
    """Evaluate if answer is faithful to the provided contexts"""
    claims = extract_claims(answer)
    combined_context = ' '.join(contexts)

    claim_evaluations = []
    supported_claims = 0
    unsupported = []
    context_used = []

    for claim in claims:
        is_supported, score = check_claim_support(claim, combined_context)

        claim_eval = {
            'claim': claim[:100] + '...' if len(claim) > 100 else claim,
            'supported': is_supported,
            'score': round(score, 3)
        }

        # Track which contexts support this claim
        for i, ctx in enumerate(contexts):
            _, ctx_score = check_claim_support(claim, ctx)
            if ctx_score > 0.3:
                claim_eval[f'context_{i}'] = round(ctx_score, 3)
                if f'context_{i}' not in context_used:
                    context_used.append(f'context_{i}')

        claim_evaluations.append(claim_eval)

        if is_supported:
            supported_claims += 1
        else:
            unsupported.append(claim[:100])

    # Faithfulness = % of claims supported
    faithfulness = supported_claims / len(claims) if claims else 1.0

    # Groundedness = average support score
    avg_score = sum(c['score'] for c in claim_evaluations) / len(claim_evaluations) if claim_evaluations else 1.0

    return AnswerEvaluation(
        question_id=question_id,
        faithfulness_score=round(faithfulness, 3),
        groundedness_score=round(avg_score, 3),
        claims=claim_evaluations,
        unsupported_claims=unsupported,
        context_used=context_used
    )


def calculate_retrieval_metrics(
    retrieved: List[str],
    relevant: Set[str],
    k: int = 5
) -> RetrievalMetrics:
    """Calculate standard retrieval metrics"""
    retrieved_k = retrieved[:k]

    # Precision@K
    relevant_in_k = sum(1 for doc in retrieved_k if doc in relevant)
    precision = relevant_in_k / k if k > 0 else 0

    # Recall@K
    recall = relevant_in_k / len(relevant) if relevant else 0

    # MRR (Mean Reciprocal Rank)
    mrr = 0.0
    for i, doc in enumerate(retrieved):
        if doc in relevant:
            mrr = 1.0 / (i + 1)
            break

    # NDCG@K
    dcg = 0.0
    for i, doc in enumerate(retrieved_k):
        rel = 1 if doc in relevant else 0
        dcg += rel / math.log2(i + 2)

    # Ideal DCG (all relevant at top)
    idcg = sum(1 / math.log2(i + 2) for i in range(min(len(relevant), k)))
    ndcg = dcg / idcg if idcg > 0 else 0

    return RetrievalMetrics(
        precision_at_k=round(precision, 3),
        recall_at_k=round(recall, 3),
        mrr=round(mrr, 3),
        ndcg_at_k=round(ndcg, 3),
        k=k
    )


def generate_recommendations(report: RAGEvaluationReport) -> List[str]:
    """Generate actionable recommendations based on evaluation"""
    recommendations = []

    if report.avg_context_relevance < 0.8:
        recommendations.append(
            f"Context relevance ({report.avg_context_relevance:.2f}) is below target (0.80). "
            "Consider: improving chunking strategy, adding metadata filtering, or using hybrid search."
        )

    if report.avg_faithfulness < 0.95:
        recommendations.append(
            f"Faithfulness ({report.avg_faithfulness:.2f}) is below target (0.95). "
            "Consider: adding source citations, implementing fact-checking, or adjusting temperature."
        )

    if report.avg_groundedness < 0.85:
        recommendations.append(
            f"Groundedness ({report.avg_groundedness:.2f}) is below target (0.85). "
            "Consider: using more restrictive prompts, adding 'only use provided context' instructions."
        )

    if report.coverage < 0.9:
        recommendations.append(
            f"Coverage ({report.coverage:.2f}) indicates some questions lack relevant context. "
            "Consider: expanding document corpus, improving embedding model, or adding fallback responses."
        )

    retrieval = report.retrieval_metrics
    if retrieval.get('precision_at_k', 0) < 0.7:
        recommendations.append(
            "Retrieval precision is low. Consider: re-ranking retrieved documents, "
            "using cross-encoder for reranking, or adjusting similarity threshold."
        )

    if not recommendations:
        recommendations.append("All metrics meet targets. Consider A/B testing new improvements.")

    return recommendations


def evaluate_rag_system(
    questions: List[Dict],
    contexts: List[Dict],
    k: int = 5,
    verbose: bool = False
) -> RAGEvaluationReport:
    """Comprehensive RAG system evaluation"""

    all_context_scores = []
    all_faithfulness_scores = []
    all_groundedness_scores = []
    issues = []
    question_details = []

    questions_with_context = 0

    for q_data in questions:
        question = q_data.get('question', q_data.get('query', ''))
        question_id = q_data.get('id', str(questions.index(q_data)))
        answer = q_data.get('answer', q_data.get('response', ''))
        expected = q_data.get('expected', q_data.get('ground_truth', ''))

        # Find contexts for this question
        q_contexts = []
        for ctx in contexts:
            if ctx.get('question_id') == question_id or ctx.get('query_id') == question_id:
                q_contexts.append(ctx.get('content', ctx.get('text', '')))

        # If no specific contexts, use all contexts (for simple datasets)
        if not q_contexts:
            q_contexts = [ctx.get('content', ctx.get('text', ''))
                        for ctx in contexts[:k]]

        if q_contexts:
            questions_with_context += 1

        # Evaluate context relevance
        context_evals = []
        for i, ctx in enumerate(q_contexts[:k]):
            eval_result = evaluate_context_relevance(question, ctx, f"ctx_{i}")
            context_evals.append(eval_result)
            all_context_scores.append(eval_result.relevance_score)

        # Evaluate answer faithfulness
        if answer and q_contexts:
            answer_eval = evaluate_answer_faithfulness(question, answer, q_contexts, question_id)
            all_faithfulness_scores.append(answer_eval.faithfulness_score)
            all_groundedness_scores.append(answer_eval.groundedness_score)

            # Track issues
            if answer_eval.unsupported_claims:
                issues.append({
                    'type': 'unsupported_claim',
                    'question_id': question_id,
                    'claims': answer_eval.unsupported_claims[:3]
                })

        # Check for low relevance contexts
        low_relevance = [e for e in context_evals if e.relevance_score < 0.5]
        if low_relevance:
            issues.append({
                'type': 'low_relevance',
                'question_id': question_id,
                'contexts': [e.context_id for e in low_relevance]
            })

        if verbose:
            question_details.append({
                'question_id': question_id,
                'question': question[:100],
                'context_scores': [asdict(e) for e in context_evals],
                'answer_faithfulness': all_faithfulness_scores[-1] if all_faithfulness_scores else None
            })

    # Calculate aggregates
    avg_context_relevance = sum(all_context_scores) / len(all_context_scores) if all_context_scores else 0
    avg_faithfulness = sum(all_faithfulness_scores) / len(all_faithfulness_scores) if all_faithfulness_scores else 0
    avg_groundedness = sum(all_groundedness_scores) / len(all_groundedness_scores) if all_groundedness_scores else 0
    coverage = questions_with_context / len(questions) if questions else 0

    # Simulated retrieval metrics (based on relevance scores)
    high_relevance = sum(1 for s in all_context_scores if s > 0.5)
    retrieval_metrics = {
        'precision_at_k': round(high_relevance / len(all_context_scores) if all_context_scores else 0, 3),
        'estimated_recall': round(coverage, 3),
        'k': k
    }

    report = RAGEvaluationReport(
        total_questions=len(questions),
        avg_context_relevance=round(avg_context_relevance, 3),
        avg_faithfulness=round(avg_faithfulness, 3),
        avg_groundedness=round(avg_groundedness, 3),
        retrieval_metrics=retrieval_metrics,
        coverage=round(coverage, 3),
        issues=issues[:20],  # Limit to 20 issues
        recommendations=[],
        question_details=question_details if verbose else []
    )

    report.recommendations = generate_recommendations(report)

    return report


def format_report(report: RAGEvaluationReport) -> str:
    """Format report as human-readable text"""
    lines = []
    lines.append("=" * 60)
    lines.append("RAG EVALUATION REPORT")
    lines.append("=" * 60)
    lines.append("")

    lines.append(f"📊 SUMMARY")
    lines.append(f"  Questions evaluated: {report.total_questions}")
    lines.append(f"  Coverage: {report.coverage:.1%}")
    lines.append("")

    lines.append("📈 RETRIEVAL METRICS")
    lines.append(f"  Context Relevance:    {report.avg_context_relevance:.2f} {'✅' if report.avg_context_relevance >= 0.8 else '⚠️'} (target: >0.80)")
    lines.append(f"  Precision@{report.retrieval_metrics.get('k', 5)}:         {report.retrieval_metrics.get('precision_at_k', 0):.2f}")
    lines.append("")

    lines.append("📝 GENERATION METRICS")
    lines.append(f"  Answer Faithfulness:  {report.avg_faithfulness:.2f} {'✅' if report.avg_faithfulness >= 0.95 else '⚠️'} (target: >0.95)")
    lines.append(f"  Groundedness:         {report.avg_groundedness:.2f} {'✅' if report.avg_groundedness >= 0.85 else '⚠️'} (target: >0.85)")
    lines.append("")

    if report.issues:
        lines.append(f"⚠️ ISSUES FOUND ({len(report.issues)})")
        for issue in report.issues[:10]:
            if issue['type'] == 'unsupported_claim':
                lines.append(f"  Q{issue['question_id']}: {len(issue.get('claims', []))} unsupported claim(s)")
            elif issue['type'] == 'low_relevance':
                lines.append(f"  Q{issue['question_id']}: Low relevance contexts: {issue.get('contexts', [])}")
        if len(report.issues) > 10:
            lines.append(f"  ... and {len(report.issues) - 10} more issues")
        lines.append("")

    lines.append("💡 RECOMMENDATIONS")
    for i, rec in enumerate(report.recommendations, 1):
        lines.append(f"  {i}. {rec}")
    lines.append("")

    lines.append("=" * 60)

    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="RAG Evaluator - Evaluate Retrieval-Augmented Generation systems",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --contexts contexts.json --questions questions.json
  %(prog)s --contexts ctx.json --questions q.json --k 10
  %(prog)s --contexts ctx.json --questions q.json --output report.json --verbose

Input file formats:

questions.json:
[
  {"id": "q1", "question": "What is X?", "answer": "X is..."},
  {"id": "q2", "question": "How does Y work?", "answer": "Y works by..."}
]

contexts.json:
[
  {"question_id": "q1", "content": "Retrieved context text..."},
  {"question_id": "q2", "content": "Another context..."}
]
        """
    )

    parser.add_argument('--contexts', '-c', required=True, help='JSON file with retrieved contexts')
    parser.add_argument('--questions', '-q', required=True, help='JSON file with questions and answers')
    parser.add_argument('--k', type=int, default=5, help='Number of top contexts to evaluate (default: 5)')
    parser.add_argument('--output', '-o', help='Output file for detailed report (JSON)')
    parser.add_argument('--json', '-j', action='store_true', help='Output as JSON instead of text')
    parser.add_argument('--verbose', '-v', action='store_true', help='Include per-question details')
    parser.add_argument('--compare', help='Compare with baseline report JSON')

    args = parser.parse_args()

    # Load input files
    contexts_path = Path(args.contexts)
    questions_path = Path(args.questions)

    if not contexts_path.exists():
        print(f"Error: Contexts file not found: {args.contexts}", file=sys.stderr)
        sys.exit(1)

    if not questions_path.exists():
        print(f"Error: Questions file not found: {args.questions}", file=sys.stderr)
        sys.exit(1)

    try:
        contexts = json.loads(contexts_path.read_text(encoding='utf-8'))
        questions = json.loads(questions_path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format: {e}", file=sys.stderr)
        sys.exit(1)

    # Run evaluation
    report = evaluate_rag_system(questions, contexts, k=args.k, verbose=args.verbose)

    # Compare with baseline
    if args.compare:
        baseline_path = Path(args.compare)
        if baseline_path.exists():
            baseline = json.loads(baseline_path.read_text())
            print("\n📊 COMPARISON WITH BASELINE")
            print(f"  Relevance:    {baseline.get('avg_context_relevance', 0):.2f} -> {report.avg_context_relevance:.2f}")
            print(f"  Faithfulness: {baseline.get('avg_faithfulness', 0):.2f} -> {report.avg_faithfulness:.2f}")
            print(f"  Groundedness: {baseline.get('avg_groundedness', 0):.2f} -> {report.avg_groundedness:.2f}")
            print()

    # Output
    if args.json:
        print(json.dumps(asdict(report), indent=2))
    else:
        print(format_report(report))

    # Save to file
    if args.output:
        Path(args.output).write_text(json.dumps(asdict(report), indent=2))
        print(f"\nDetailed report saved to {args.output}")


if __name__ == '__main__':
    main()
