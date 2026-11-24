#!/usr/bin/env python3
"""humanizer_scorer.py — scores content 0-100 on 'humanity' by detecting AI writing patterns."""

import sys
import re
import json
import math
from collections import Counter

# Windows consoles often default to a legacy codepage (e.g. cp1252) that cannot
# encode the Unicode glyphs this script prints (issue #969). Re-encode
# stdout/stderr as UTF-8 with replacement so output never crashes at print time.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


# ── Sample content for zero-config demo ──────────────────────────────────────
SAMPLE_HUMAN = """
We tried to fix our churn problem the wrong way for about a year. 

We threw money at marketing, assumed acquisition would outpace loss, and avoided looking at the actual numbers. It didn't work. Churn stayed flat at 8% monthly, which sounds manageable until you realize that's 65% annual churn. We were filling a leaky bucket with a garden hose.

The breakthrough — if you can call it that — was embarrassingly simple: we actually talked to the customers who left.

Not the ones who complained. The ones who quietly disappeared. We called 30 churned accounts over two weeks. You know what most of them said? They didn't hate the product. They just... forgot about it. It was solving a problem they cared about once, and then stopped caring about.

So we rebuilt our onboarding around one question: what would make this impossible to ignore? Not "valuable" — people know it's valuable. Impossible to ignore.

Three months later, 30-day activation was up 40%. Churn dropped to 4.5%.

The lesson wasn't about product or pricing. It was about habit formation. And we were terrible at it.
"""

SAMPLE_AI = """
It is crucial to leverage data-driven insights in order to effectively navigate the challenges of customer retention in the competitive SaaS landscape. Furthermore, by implementing robust onboarding strategies, organizations can ensure that users achieve maximum value from the product, thereby significantly reducing churn rates.

To facilitate this process, it's important to note that companies should delve into their customer behavior data to identify patterns and trends. Moreover, by fostering meaningful connections with customers and ensuring comprehensive support throughout their journey, businesses can cultivate lasting relationships that drive long-term success.

In conclusion, the implementation of these holistic strategies will empower organizations to streamline their customer success operations and achieve sustainable growth in an increasingly competitive marketplace.
"""


# ── AI vocabulary signals ─────────────────────────────────────────────────────
AI_VOCABULARY = [
    # The notorious list
    "delve", "delve into", "delves", "delving",
    "landscape",
    "crucial", "vital", "pivotal",
    "leverage", "leveraging", "leveraged",
    "robust",
    "comprehensive",
    "holistic",
    "foster", "fosters", "fostering",
    "facilitate", "facilitates", "facilitating",
    "navigate", "navigating",
    "ensure", "ensures", "ensuring",
    "utilize", "utilizing", "utilizes",
    "furthermore", "moreover",
    "innovative", "cutting-edge",
    "seamless", "seamlessly",
    "empower", "empowers", "empowering",
    "streamline", "streamlines", "streamlining",
    "cultivate", "cultivating",
    "paradigm",
    "ecosystem",
    "synergy",
    "in conclusion",
    "in summary",
    "to summarize",
]

HEDGING_PHRASES = [
    "it is important to note",
    "it's important to note",
    "it should be noted",
    "it is worth mentioning",
    "it's worth mentioning",
    "it goes without saying",
    "needless to say",
    "in many cases",
    "in most cases",
    "in certain cases",
    "in most instances",
    "in many instances",
    "generally speaking",
    "for the most part",
    "this may vary",
    "results may differ",
    "one might argue",
    "it can be argued",
    "there are various",
    "there are many",
    "it is crucial to",
    "it's crucial to",
]

PASSIVE_PATTERNS = [
    r'\b(is|are|was|were|be|been|being)\s+(being\s+)?\w+ed\b',
    r'\b(can|could|should|would|may|might|must)\s+be\s+\w+ed\b',
]

VAGUE_AUTHORITY = [
    "studies show",
    "research suggests",
    "research shows",
    "experts agree",
    "experts say",
    "many companies",
    "leading brands",
    "it has been shown",
    "according to research",
    "data suggests",
    "evidence suggests",
]


# ── Scoring functions ─────────────────────────────────────────────────────────

def score_ai_vocabulary(text: str) -> dict:
    """Score 0-25: fewer AI words = higher score."""
    text_lower = text.lower()
    words_total = max(1, len(re.findall(r'\b\w+\b', text)))

    hits = []
    for phrase in AI_VOCABULARY:
        count = text_lower.count(phrase)
        if count > 0:
            hits.append((phrase, count))

    total_hits = sum(c for _, c in hits)
    density = total_hits / (words_total / 100)  # per 100 words

    # Score: 0 hits = 25, scales down
    if total_hits == 0:
        score = 25
    elif total_hits <= 2:
        score = 20
    elif total_hits <= 5:
        score = 14
    elif total_hits <= 10:
        score = 8
    elif total_hits <= 15:
        score = 3
    else:
        score = 0

    return {
        "score": score,
        "max": 25,
        "ai_word_hits": total_hits,
        "density_per_100_words": round(density, 2),
        "flagged_terms": [f for f, _ in hits[:10]],  # top 10 for display
    }


def score_sentence_variance(text: str) -> dict:
    """Score 0-20: high variance = more human (robots use uniform length)."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.split()) >= 3]

    if len(sentences) < 3:
        return {"score": 10, "max": 20, "std_dev": 0, "avg_length": 0, "note": "too few sentences to score"}

    lengths = [len(s.split()) for s in sentences]
    avg = sum(lengths) / len(lengths)
    variance = sum((l - avg) ** 2 for l in lengths) / len(lengths)
    std_dev = math.sqrt(variance)

    # Good human writing has std_dev of 8-15 for mixed content
    if std_dev >= 12:
        score = 20
    elif std_dev >= 8:
        score = 16
    elif std_dev >= 5:
        score = 10
    elif std_dev >= 3:
        score = 5
    else:
        score = 0  # very robotic: all sentences same length

    return {
        "score": score,
        "max": 20,
        "std_dev": round(std_dev, 1),
        "avg_length": round(avg, 1),
        "min_length": min(lengths),
        "max_length": max(lengths),
    }


def score_passive_voice(text: str) -> dict:
    """Score 0-20: less passive = more human."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    n_sentences = max(1, len(sentences))

    passive_count = 0
    for pattern in PASSIVE_PATTERNS:
        passive_count += len(re.findall(pattern, text, re.IGNORECASE))

    passive_ratio = passive_count / n_sentences

    if passive_ratio < 0.1:
        score = 20
    elif passive_ratio < 0.2:
        score = 16
    elif passive_ratio < 0.3:
        score = 10
    elif passive_ratio < 0.4:
        score = 5
    else:
        score = 0

    return {
        "score": score,
        "max": 20,
        "passive_count": passive_count,
        "passive_ratio": round(passive_ratio, 2),
        "passive_pct": f"{round(passive_ratio * 100)}%",
    }


def score_hedging(text: str) -> dict:
    """Score 0-15: fewer hedges = more direct = more human."""
    text_lower = text.lower()
    hits = []
    for phrase in HEDGING_PHRASES:
        count = text_lower.count(phrase)
        if count > 0:
            hits.append((phrase, count))

    total_hedges = sum(c for _, c in hits)

    if total_hedges == 0:
        score = 15
    elif total_hedges == 1:
        score = 12
    elif total_hedges == 2:
        score = 8
    elif total_hedges == 3:
        score = 4
    else:
        score = 0

    vague_hits = sum(text_lower.count(p) for p in VAGUE_AUTHORITY)

    return {
        "score": score,
        "max": 15,
        "hedge_count": total_hedges,
        "vague_authority_count": vague_hits,
        "flagged_phrases": [f for f, _ in hits],
    }


def score_em_dashes(text: str) -> dict:
    """Score 0-10: moderate em-dash use is fine; overuse is a tell."""
    # Count em-dashes (—) and double-hyphen (--) used as em-dash
    em_count = text.count('—') + text.count('--')
    word_count = max(1, len(re.findall(r'\b\w+\b', text)))
    per_100 = em_count / (word_count / 100)

    if per_100 < 0.5:
        score = 10  # none or very rare: fine
    elif per_100 < 1.5:
        score = 8   # occasional: good
    elif per_100 < 3:
        score = 5   # frequent: suspicious
    elif per_100 < 5:
        score = 2   # overuse: likely AI
    else:
        score = 0   # compulsive: AI fingerprint

    return {
        "score": score,
        "max": 10,
        "em_dash_count": em_count,
        "per_100_words": round(per_100, 2),
    }


def score_paragraph_variety(text: str) -> dict:
    """Score 0-10: varied paragraph lengths = more human."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip() and not p.startswith('#')]
    if len(paragraphs) < 3:
        return {"score": 5, "max": 10, "note": "too few paragraphs to score"}

    lengths = [len(p.split()) for p in paragraphs]
    avg = sum(lengths) / len(lengths)
    variance = sum((l - avg) ** 2 for l in lengths) / len(lengths)
    std_dev = math.sqrt(variance)

    # Has any single-sentence paragraphs? (hallmark of human writing)
    has_short = any(l <= 15 for l in lengths)
    has_long = any(l >= 80 for l in lengths)

    score = 0
    if std_dev >= 30:
        score += 5
    elif std_dev >= 15:
        score += 3
    elif std_dev >= 5:
        score += 1

    if has_short:
        score += 3
    if has_long and std_dev >= 15:
        score += 2

    score = min(10, score)
    return {
        "score": score,
        "max": 10,
        "paragraph_count": len(paragraphs),
        "paragraph_std_dev": round(std_dev, 1),
        "has_short_paragraphs": has_short,
        "avg_paragraph_words": round(avg, 1),
    }


# ── Main scoring ──────────────────────────────────────────────────────────────

def score_humanity(text: str) -> dict:
    vocab = score_ai_vocabulary(text)
    variance = score_sentence_variance(text)
    passive = score_passive_voice(text)
    hedging = score_hedging(text)
    em = score_em_dashes(text)
    paragraphs = score_paragraph_variety(text)

    total = vocab["score"] + variance["score"] + passive["score"] + hedging["score"] + em["score"] + paragraphs["score"]

    if total >= 85:
        label = "Sounds human ✅"
    elif total >= 70:
        label = "Mostly human — light edits needed"
    elif total >= 50:
        label = "Mixed — AI patterns detectable"
    elif total >= 30:
        label = "Robotic — significant rewrite needed"
    else:
        label = "AI fingerprint — full rewrite required 🔴"

    return {
        "humanity_score": total,
        "label": label,
        "sections": {
            "ai_vocabulary": vocab,
            "sentence_variance": variance,
            "passive_voice": passive,
            "hedging": hedging,
            "em_dashes": em,
            "paragraph_variety": paragraphs,
        }
    }


def print_report(result: dict, label: str = "") -> None:
    total = result["humanity_score"]
    verdict = result["label"]
    s = result["sections"]

    bar_filled = int(total / 5)
    bar = "█" * bar_filled + "░" * (20 - bar_filled)

    print()
    print("╔══════════════════════════════════════════╗")
    print("║       HUMANIZER SCORER — REPORT          ║")
    print("╚══════════════════════════════════════════╝")
    if label:
        print(f"  Input: {label}")
    print()
    print(f"  HUMANITY SCORE:  {total}/100")
    print(f"  [{bar}]")
    print(f"  Verdict: {verdict}")
    print()
    print("  ── Section Breakdown ──────────────────────")

    sections = [
        ("AI Vocabulary",      s["ai_vocabulary"],       25),
        ("Sentence Variance",  s["sentence_variance"],   20),
        ("Passive Voice",      s["passive_voice"],        20),
        ("Hedging Phrases",    s["hedging"],              15),
        ("Em-Dash Use",        s["em_dashes"],            10),
        ("Paragraph Variety",  s["paragraph_variety"],   10),
    ]
    for name, sec, mx in sections:
        sc = sec["score"]
        bar2 = "█" * int(sc / mx * 10) + "░" * (10 - int(sc / mx * 10))
        print(f"  {name:<20} {sc:>2}/{mx}  [{bar2}]")

    print()
    print("  ── Detected Issues ────────────────────────")

    v = s["ai_vocabulary"]
    if v["ai_word_hits"] > 0:
        terms = ", ".join(v["flagged_terms"][:5])
        print(f"  🔴 AI vocabulary: {v['ai_word_hits']} hits — [{terms}]")
    else:
        print("  ✅ No AI vocabulary detected")

    sv = s["sentence_variance"]
    if sv["std_dev"] < 5:
        print(f"  🔴 Sentence rhythm robotic — std dev only {sv['std_dev']} (target: 8+)")
    elif sv["std_dev"] < 8:
        print(f"  🟡 Sentence variance low — {sv['std_dev']} (target: 8+)")
    else:
        print(f"  ✅ Sentence variance good — {sv['std_dev']}")

    pv = s["passive_voice"]
    if pv["passive_ratio"] > 0.3:
        print(f"  🔴 Passive voice overuse — {pv['passive_pct']} of sentences")
    elif pv["passive_ratio"] > 0.2:
        print(f"  🟡 Passive voice elevated — {pv['passive_pct']}")
    else:
        print(f"  ✅ Passive voice in range — {pv['passive_pct']}")

    hg = s["hedging"]
    if hg["hedge_count"] > 2:
        terms = ", ".join(hg["flagged_phrases"][:3])
        print(f"  🔴 Hedging overload — {hg['hedge_count']} phrases: [{terms}]")
    elif hg["hedge_count"] > 0:
        print(f"  🟡 Hedging present — {hg['hedge_count']} phrase(s): {hg['flagged_phrases']}")
    else:
        print("  ✅ No hedging detected")

    if hg["vague_authority_count"] > 0:
        print(f"  🟡 Vague authority claims: {hg['vague_authority_count']} (e.g. 'studies show') — add citations")

    em = s["em_dashes"]
    if em["per_100_words"] > 3:
        print(f"  🟡 Em-dash overuse — {em['em_dash_count']} in piece ({em['per_100_words']}/100 words)")

    pg = s["paragraph_variety"]
    if not pg.get("has_short_paragraphs"):
        print("  🟡 No short paragraphs found — add some 1-2 sentence paragraphs for rhythm")

    print()
    print("  ── Priority Fixes ─────────────────────────")

    if v["ai_word_hits"] > 5:
        print("  1. Replace AI vocabulary (biggest impact)")
    if sv["std_dev"] < 8:
        print("  2. Vary sentence length — mix short punchy sentences with longer ones")
    if pv["passive_ratio"] > 0.25:
        print("  3. Flip passive sentences to active voice")
    if hg["hedge_count"] > 2:
        print("  4. Cut hedging phrases — state claims directly")
    if not pg.get("has_short_paragraphs"):
        print("  5. Add short paragraphs — even 1-sentence paragraphs help rhythm")

    if total >= 85:
        print("  ✅ No priority fixes — content reads as human")
    print()


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Scores content 0-100 on 'humanity' by detecting AI writing patterns. "
                    "Checks AI vocabulary, sentence variance, passive voice, hedging, "
                    "em-dash overuse, and paragraph variety."
    )
    parser.add_argument(
        "file", nargs="?", default=None,
        help="Path to a text file to analyze. If omitted, runs demo comparing "
             "human vs AI sample content."
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Also output results as JSON."
    )
    args = parser.parse_args()

    if args.file is None:
        # Demo mode: compare human vs AI sample
        print("[Demo mode — comparing human vs AI sample content]")
        print()
        print("═" * 50)
        print("SAMPLE 1: Human-written content")
        print("═" * 50)
        r1 = score_humanity(SAMPLE_HUMAN)
        print_report(r1, "Human sample")

        print("═" * 50)
        print("SAMPLE 2: AI-generated content")
        print("═" * 50)
        r2 = score_humanity(SAMPLE_AI)
        print_report(r2, "AI sample")

        print(f"  Delta: Human scored {r1['humanity_score']}, AI scored {r2['humanity_score']}")
        print(f"  Difference: {r1['humanity_score'] - r2['humanity_score']} points")
        print()
    else:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                text = f.read()
        except FileNotFoundError:
            print(f"Error: file not found: {args.file}", file=sys.stderr)
            sys.exit(1)

        result = score_humanity(text)
        print_report(result, args.file)

        if args.json:
            print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
