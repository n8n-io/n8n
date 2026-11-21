#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Core - BM25 search engine for UI/UX style guides
"""

import csv
import difflib
import re
from pathlib import Path
from math import log
from collections import defaultdict

# ============ CONFIGURATION ============
DATA_DIR = Path(__file__).parent.parent / "data"
MAX_RESULTS = 3

# RTL compatibility levels carried by styles.csv and products.csv.
#   full    - direction-agnostic: survives mirroring unchanged
#   partial - mirrorable, but layout/motion needs per-component adjustments
#   caveats - the style or product encodes reading direction (kinetic
#             typography, LTR timelines, code/terminal surfaces, seat maps...)
RTL_LEVELS = ("full", "partial", "caveats")
RTL_LEVEL_CHOICES = ("all",) + RTL_LEVELS
RTL_DOMAINS = frozenset({"style", "product"})

CSV_CONFIG = {
    "style": {
        "file": "styles.csv",
        "search_cols": ["Style ID", "Style Category", "Aliases", "Keywords", "Best For", "Type", "AI Prompt Keywords"],
        "output_cols": ["Style ID", "Style Category", "Aliases", "Status", "Parent Style ID", "Preferred Mode", "Type", "Keywords", "Primary Colors", "Effects & Animation", "Best For", "Light Mode ✓", "Dark Mode ✓", "Performance", "Accessibility", "Framework Compatibility", "Complexity", "AI Prompt Keywords", "CSS/Technical Keywords", "Implementation Checklist", "Design System Variables", "rtl_level"]
    },
    "color": {
        "file": "colors.csv",
        "search_cols": ["Product Type", "Notes"],
        "output_cols": ["Product Type", "Primary", "On Primary", "Secondary", "On Secondary", "Accent", "On Accent", "Background", "Foreground", "Card", "Card Foreground", "Muted", "Muted Foreground", "Border", "Destructive", "On Destructive", "Ring", "Notes"]
    },
    "chart": {
        "file": "charts.csv",
        "search_cols": ["Data Type", "Keywords", "Best Chart Type", "When to Use", "When NOT to Use", "Accessibility Notes"],
        "output_cols": ["Data Type", "Keywords", "Best Chart Type", "Secondary Options", "When to Use", "When NOT to Use", "Data Volume Threshold", "Color Guidance", "Accessibility Grade", "Accessibility Risk", "Accessibility Notes", "A11y Fallback", "Library Recommendation", "Interactive Level"]
    },
    "landing": {
        "file": "landing.csv",
        "search_cols": ["Pattern ID", "Pattern Name", "Aliases", "Keywords", "Conversion Optimization", "Section Order"],
        "output_cols": ["Pattern ID", "Pattern Name", "Aliases", "Keywords", "Section Order", "Primary CTA Placement", "Color Strategy", "Conversion Optimization"]
    },
    "product": {
        "file": "products.csv",
        "search_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Key Considerations"],
        "output_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Secondary Styles", "Landing Page Pattern", "Dashboard Style (if applicable)", "Color Palette Focus", "rtl_level"]
    },
    "ux": {
        "file": "ux-guidelines.csv",
        "search_cols": ["Category", "Issue", "Description", "Platform"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "typography": {
        "file": "typography.csv",
        "search_cols": ["Font Pairing Name", "Category", "Mood/Style Keywords", "Best For", "Heading Font", "Body Font"],
        "output_cols": ["Font Pairing Name", "Category", "Heading Font", "Body Font", "Mood/Style Keywords", "Best For", "Google Fonts URL", "CSS Import", "Tailwind Config", "Notes"]
    },
    "icons": {
        "file": "icons.csv",
        "search_cols": ["Category", "Icon Name", "Keywords", "Best For", "Library"],
        "output_cols": ["Category", "Icon Name", "Keywords", "Library", "Import Code", "Usage", "Best For", "Style", "Semantic Role", "Allowed Contexts"]
    },
    "gsap": {
        "file": "motion.csv",
        "search_cols": ["Category", "Intensity Tier", "Keywords", "Trigger"],
        "output_cols": ["Category", "Intensity Tier", "Trigger", "Duration", "Easing", "GSAP Snippet", "Framework Notes", "Do", "Don't", "Performance Notes"]
    },
    "react": {
        "file": "react-performance.csv",
        "search_cols": ["Category", "Issue", "Keywords", "Description"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "web": {
        "file": "app-interface.csv",
        "search_cols": ["Category", "Issue", "Keywords", "Description"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "google-fonts": {
        "file": "google-fonts.csv",
        "search_cols": ["Family", "Category", "Stroke", "Classifications", "Keywords", "Subsets", "Designers"],
        "output_cols": ["Family", "Category", "Stroke", "Classifications", "Styles", "Variable Axes", "Subsets", "Designers", "Popularity Rank", "Google Fonts URL"]
    }
}

# Output columns whose content (code samples, checklists) must never be
# hard-truncated for display -- truncating mid-snippet destroys the value.
UNTRUNCATED_COLS = {
    "Code Example Good", "Code Example Bad", "Code Good", "Code Bad",
    "Implementation Checklist", "Design System Variables", "CSS Import",
    "Tailwind Config", "GSAP Snippet",
}

STACK_CONFIG = {
    "react":            {"file": "stacks/react.csv"},
    "nextjs":           {"file": "stacks/nextjs.csv"},
    "vue":              {"file": "stacks/vue.csv"},
    "svelte":           {"file": "stacks/svelte.csv"},
    "astro":            {"file": "stacks/astro.csv"},
    "swiftui":          {"file": "stacks/swiftui.csv"},
    "react-native":     {"file": "stacks/react-native.csv"},
    "flutter":          {"file": "stacks/flutter.csv"},
    "nuxtjs":           {"file": "stacks/nuxtjs.csv"},
    "nuxt-ui":          {"file": "stacks/nuxt-ui.csv"},
    "html-tailwind":    {"file": "stacks/html-tailwind.csv"},
    "shadcn":           {"file": "stacks/shadcn.csv"},
    "jetpack-compose":  {"file": "stacks/jetpack-compose.csv"},
    "threejs":          {"file": "stacks/threejs.csv"},
    "angular":          {"file": "stacks/angular.csv"},
    "laravel":          {"file": "stacks/laravel.csv"},
    "javafx":           {"file": "stacks/javafx.csv"},
    "wpf":              {"file": "stacks/wpf.csv"},
    "winui":            {"file": "stacks/winui.csv"},
    "avalonia":         {"file": "stacks/avalonia.csv"},
    "uno":              {"file": "stacks/uno.csv"},
    "uwp":              {"file": "stacks/uwp.csv"},
}

# Common columns for all stacks
_STACK_COLS = {
    "search_cols": ["Category", "Guideline", "Description", "Do", "Don't",
                    "Code Good", "Code Bad"],
    "output_cols": ["Category", "Guideline", "Description", "Do", "Don't",
                    "Code Good", "Code Bad", "Severity", "Docs URL",
                    "Applies To", "Status", "Verified At"]
}

WEB_STACK_CURRENT_MAJORS = {
    "react": 19,
    "nextjs": 16,
    "vue": 3,
    "svelte": 5,
    "astro": 7,
    "angular": 22,
    "html-tailwind": 4,
    "nuxtjs": 4,
    "nuxt-ui": 4,
}
WEB_STACKS = frozenset(WEB_STACK_CURRENT_MAJORS) | {"shadcn"}

STACK_CURRENT_VERSIONS = {
    **{stack: (major,) for stack, major in WEB_STACK_CURRENT_MAJORS.items()},
    "react-native": (0, 86),
    "flutter": (3, 44),
    "swiftui": (16,),
    "jetpack-compose": (1, 11),
    "avalonia": (12,),
    "winui": (3,),
    "javafx": (26,),
    "threejs": (0, 185),
    "laravel": (13,),
}
LEGACY_ONLY_STACKS = frozenset({"uwp"})
STACK_CURRENT_APPLICABILITY = {
    "react": "react 19.2.x",
    "nextjs": "nextjs 16.2",
    "vue": "vue 3.5.x",
    "svelte": "svelte 5",
    "astro": "astro 7.1.6",
    "angular": "angular 22.x",
    "html-tailwind": "html-tailwind 4.3",
    "shadcn": "shadcn cli 4",
    "nuxtjs": "nuxtjs 4.5",
    "nuxt-ui": "nuxt-ui 4.12.0",
    "react-native": "react-native 0.86.x",
    "flutter": "flutter 3.44.x",
    "swiftui": "swiftui current",
    "jetpack-compose": "jetpack-compose 1.11.4",
    "avalonia": "avalonia 12",
    "uwp": "uwp legacy",
    "winui": "winui current",
    "wpf": "wpf current",
    "uno": "uno current",
    "javafx": "javafx 26",
    "threejs": "threejs 0.185.1",
    "laravel": "laravel 13.x",
}

_STACK_QUERY_NAMES = {
    "react": r"react",
    "nextjs": r"next(?:\.js|js)?",
    "vue": r"vue",
    "svelte": r"svelte",
    "astro": r"astro",
    "angular": r"angular",
    "html-tailwind": r"tailwind(?:\s*css)?",
    "nuxtjs": r"nuxt(?:\.js|js)?",
    "nuxt-ui": r"nuxt\s*ui",
    "react-native": r"react[\s-]*native",
    "flutter": r"flutter",
    "swiftui": r"(?:ios|swiftui\s+ios)",
    "jetpack-compose": r"(?:jetpack\s*)?compose",
    "avalonia": r"avalonia",
    "winui": r"winui",
    "javafx": r"javafx",
    "threejs": r"three(?:\.js|js)?",
    "laravel": r"laravel",
}

AVAILABLE_STACKS = list(STACK_CONFIG.keys())

_INDEX_VERSION = 2
_SEARCH_CALIBRATION_VERSION = "2026-08-12-v1"

# Search calibration uses evidence coverage first; raw BM25 floors are kept
# domain-specific because corpora vary greatly in size and document length.
# Values are intentionally conservative and are measured by the calibration suite.
_DOMAIN_SCORE_FLOORS = {
    "style": 4.3, "landing": 4.0, "product": 6.0, "icons": 5.8,
    "react": 3.3,
}
_SEARCH_THRESHOLDS = {
    domain: {"min_score": _DOMAIN_SCORE_FLOORS.get(domain, 0.0),
             "min_margin": 0.0, "min_coverage": 0.5 if domain == "landing" else 0.0}
    for domain in CSV_CONFIG
}
_STACK_THRESHOLD = {"min_score": 3.6, "min_margin": 0.0, "min_coverage": 1 / 3}
_NO_THRESHOLD = {"min_score": 0.0, "min_margin": 0.0, "min_coverage": 0.0}
_STYLE_IDENTITY_FIELDS = ("Style ID", "Style Category", "Aliases")
_LANDING_IDENTITY_FIELDS = ("Pattern ID", "Pattern Name", "Aliases")
_DOMAIN_QUERY_REWRITES = {
    "color": {term: None for term in (
        "color", "palette", "hex", "rgb", "token", "semantic",
        "destructive", "muted", "foreground")},
    "landing": {"testimonial": "testimonials"},
    "style": {"css": None, "implementation": None, "variable": None,
              "checklist": None, "tailwind": None},
    "ux": {"ux": "accessibility", "usability": "accessibility",
           "wcag": "accessibility"},
    "google-fonts": {"typography": "font"},
    "icons": {"lucide": None, "symbol": None, "glyph": None, "pictogram": None},
    "gsap": {"gsap": "animation", "quickto": None, "scrolltrigger": "scroll",
             "flip plugin": None, "splittext": None},
    "react": {"nextjs": "react", "usecallback": "memoization",
              "useeffect": "effects"},
    "web": {"aria": "accessibility", "outline": "focus",
            "semantic": None, "autocomplete": "input", "preconnect": None},
}


# ============ TOKENIZATION ============
# Common two-letter/three-letter words that add noise without adding search
# signal. Deliberately short -- domain-relevant short tokens (ui, ux, ai,
# css, 3d, js, os, md, gsap) must stay searchable, which is why we don't
# filter purely by length.
_STOPWORDS = {
    "to", "in", "on", "at", "is", "of", "by", "or", "an", "if", "no", "so",
    "do", "be", "we", "it", "as", "the", "and", "for", "are", "was",
}

# Query/corpus normalization so common spelling variants match each other.
# Keep this a plain dict (stdlib only, no fuzzy-matching dependency).
_SYNONYMS = {
    "q&a": "question answer",
    "e-commerce": "ecommerce",
    "dark-mode": "dark",
    "darkmode": "dark",
    "light-mode": "light",
    "lightmode": "light",
    "a11y": "accessibility",
    "nav": "navigation",
    "sign-up": "signup",
    "log-in": "login",
    "colour": "color",
    "colours": "colors",
    "customisation": "customization",
    "organisation": "organization",
    "behaviour": "behavior",
    "ux/ui": "ux ui",
}

_SYNONYM_PATTERNS = [
    (re.compile(r"(?<!\w)" + re.escape(variant) + r"(?!\w)", re.IGNORECASE), canonical)
    for variant, canonical in sorted(_SYNONYMS.items(), key=lambda item: len(item[0]), reverse=True)
]


def _normalize(text):
    """Apply longest-first synonym substitution at token boundaries."""
    normalized = str(text)
    for pattern, canonical in _SYNONYM_PATTERNS:
        normalized = pattern.sub(canonical, normalized)
    return normalized


# ============ BM25 IMPLEMENTATION ============
class BM25:
    """BM25 ranking algorithm for text search"""

    def __init__(self, k1=1.5, b=0.75):
        self.k1 = k1
        self.b = b
        self.corpus = []
        self.doc_lengths = []
        self.avgdl = 0
        self.idf = {}
        self.doc_freqs = defaultdict(int)
        self.N = 0
        self._term_freqs = []  # precomputed per-doc term frequencies

    def tokenize(self, text):
        """Lowercase, normalize synonyms, split, remove punctuation, filter stopwords"""
        text = _normalize(str(text).lower())
        text = re.sub(r'[^\w\s]', ' ', text)
        return [w for w in text.split() if len(w) >= 2 and w not in _STOPWORDS]

    def fit(self, documents):
        """Build BM25 index from documents"""
        self.corpus = [self.tokenize(doc) for doc in documents]
        self.N = len(self.corpus)
        if self.N == 0:
            return
        self.doc_lengths = [len(doc) for doc in self.corpus]
        self.avgdl = sum(self.doc_lengths) / self.N or 1.0

        self._term_freqs = []
        for doc in self.corpus:
            tf = defaultdict(int)
            for word in doc:
                tf[word] += 1
            self._term_freqs.append(tf)
            for word in tf:
                self.doc_freqs[word] += 1

        for word, freq in self.doc_freqs.items():
            self.idf[word] = log((self.N - freq + 0.5) / (freq + 0.5) + 1)

    def score(self, query):
        """Score all documents against query"""
        query_tokens = self.tokenize(query)
        scores = []

        for idx in range(self.N):
            score = 0
            doc_len = self.doc_lengths[idx]
            term_freqs = self._term_freqs[idx]

            for token in query_tokens:
                if token in self.idf:
                    tf = term_freqs.get(token, 0)
                    idf = self.idf[token]
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)
                    score += idf * numerator / denominator

            scores.append((idx, score))

        return sorted(scores, key=lambda x: x[1], reverse=True)

    def vocabulary(self):
        """All indexed terms, for suggestion/typo-recovery purposes."""
        return list(self.idf.keys())


# ============ CSV / INDEX CACHE ============
# Data files are small and reused across multiple domain searches within a
# single --design-system run; avoid re-reading + re-indexing the same file
# repeatedly in one process.
_csv_cache = {}   # filepath -> (signature, rows)
_bm25_cache = {}  # (path, fields, scorer version) -> (file signature, index)


def _file_signature(filepath):
    stat = filepath.stat()
    return stat.st_mtime_ns, stat.st_size


def _load_csv_snapshot(filepath, attempts=3):
    """Return rows and the verified signature of the bytes they came from."""
    signature = _file_signature(filepath)
    cached = _csv_cache.get(filepath)
    if cached and cached[0] == signature:
        return cached[1], signature

    for _ in range(attempts):
        before = _file_signature(filepath)
        with open(filepath, 'r', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        after = _file_signature(filepath)
        if before == after:
            _csv_cache[filepath] = (after, rows)
            return rows, after
    raise OSError(f"File changed while reading: {filepath}")


def _load_csv(filepath):
    """Load CSV rows from a stable, signature-verified snapshot."""
    return _load_csv_snapshot(filepath)[0]


def _get_bm25(filepath, search_cols, data, signature=None, cache_variant=""):
    """Fitted index with cache identity covering fields and scorer version."""
    key = (filepath, tuple(search_cols), _INDEX_VERSION, cache_variant)
    if signature is None:
        cached_rows = _csv_cache.get(filepath)
        signature = (cached_rows[0] if cached_rows and cached_rows[1] is data
                     else _file_signature(filepath))
    cached = _bm25_cache.get(key)
    if cached and cached[0] == signature:
        return cached[1]

    documents = [" ".join(str(row.get(column, "")) for column in search_cols)
                 for row in data]
    index = BM25()
    index.fit(documents)
    _bm25_cache[key] = (signature, index)
    return index


# ============ SEARCH FUNCTIONS ============
def _query_coverage(index, query):
    tokens = set(index.tokenize(query))
    if not tokens:
        return 0.0
    vocabulary = set(index.vocabulary())
    return sum(token in vocabulary for token in tokens) / len(tokens)


def _search_csv_detailed(filepath, search_cols, output_cols, query, max_results,
                         threshold=None, routing_domain=None, row_filter=None,
                         ranked_filter=None, cache_variant=""):
    """Calibrated search returning results, index, and internal diagnostics.

    row_filter drops rows before the index is fitted (corpus-level exclusion,
    e.g. inactive styles). ranked_filter drops rows after scoring but before
    max_results truncation, so a metadata filter cannot mask matching rows or
    shift the fitted corpus."""
    if not filepath.exists():
        return [], None, {"reason": "missing-file"}

    try:
        data, signature = _load_csv_snapshot(filepath)
    except (csv.Error, OSError, UnicodeDecodeError):
        return [], None, {
            "reason": "read-error",
            "error": f"Unable to read search data: {filepath.name}",
        }

    if not data:
        return [], None, {"reason": "empty-data"}

    if row_filter is not None:
        data = [row for row in data if row_filter(row)]
        if not data:
            return [], None, {"reason": "empty-data"}

    bm25 = _get_bm25(filepath, search_cols, data, signature, cache_variant)
    search_query, rewrites = _rewrite_query_for_domain(query, routing_domain, bm25)
    ranked = bm25.score(search_query)
    if ranked_filter is not None:
        ranked = [(idx, score) for idx, score in ranked
                  if ranked_filter(data[idx])]
    threshold = threshold or _NO_THRESHOLD
    top_score = ranked[0][1] if ranked else 0.0
    runner_up_score = ranked[1][1] if len(ranked) > 1 else 0.0
    coverage = _query_coverage(bm25, search_query)
    abstain = (top_score <= threshold["min_score"]
               or coverage < threshold["min_coverage"]
               or (threshold["min_margin"] > 0
                   and top_score - runner_up_score < threshold["min_margin"]))

    results = []
    if not abstain:
        for idx, score in ranked[:max_results]:
            if score <= 0:
                continue
            row = data[idx]
            results.append({col: row.get(col, "") for col in output_cols if col in row})

    diagnostic = {"normalized_query": _normalize(query), "search_query": search_query,
                  "query_rewrites": rewrites, "top_score": top_score,
                  "runner_up_score": runner_up_score, "margin": top_score - runner_up_score,
                  "token_coverage": coverage, "abstained": abstain,
                  "calibration_version": _SEARCH_CALIBRATION_VERSION,
                  "reason": "low-confidence" if abstain else "matched"}
    return results, bm25, diagnostic


def _search_csv(filepath, search_cols, output_cols, query, max_results):
    """Backward-compatible internal search tuple used by existing callers/tests."""
    results, index, _ = _search_csv_detailed(
        filepath, search_cols, output_cols, query, max_results)
    return results, index


def _passes_threshold(index, query, threshold):
    ranked = index.score(query)
    top_score = ranked[0][1] if ranked else 0.0
    runner_up_score = ranked[1][1] if len(ranked) > 1 else 0.0
    return (top_score > threshold["min_score"]
            and _query_coverage(index, query) >= threshold["min_coverage"]
            and (threshold["min_margin"] <= 0
                 or top_score - runner_up_score >= threshold["min_margin"]))


def _suggest_terms(bm25, query, limit=6, threshold=None):
    """Nearest known vocabulary terms for a query that returned 0 hits,
    so the caller can retry instead of silently reporting nothing."""
    if bm25 is None:
        return []
    query_tokens = set(bm25.tokenize(query))
    if not query_tokens:
        return []

    candidates = []
    for term in bm25.vocabulary():
        if term in query_tokens:
            continue
        similarity = max(difflib.SequenceMatcher(None, token, term).ratio()
                         for token in query_tokens)
        if (similarity >= 0.72
                and (threshold is None or _passes_threshold(bm25, term, threshold))):
            candidates.append((-similarity, -bm25.doc_freqs.get(term, 0), term))
    return [term for _, _, term in sorted(candidates)[:limit]]


def _suggest_identities(rows, query, fields, limit=6):
    """Suggest complete public identities so a retry can bypass score thresholds."""
    tokenizer = BM25()
    query_tokens = set(tokenizer.tokenize(query))
    if not query_tokens:
        return []
    candidates = []
    for row in rows:
        for identity in _row_identities(row, fields):
            identity_tokens = set(tokenizer.tokenize(identity))
            if not identity_tokens:
                continue
            similarity = max(
                difflib.SequenceMatcher(None, source, target).ratio()
                for source in query_tokens for target in identity_tokens
            )
            if similarity >= 0.72 and identity.casefold() != str(query).strip().casefold():
                candidates.append((-similarity, len(identity_tokens), identity))
    return [identity for _, _, identity in sorted(set(candidates))[:limit]]


def _row_identities(row, fields):
    """Return non-empty public identities from ordinary and alias fields."""
    identities = []
    for field in fields:
        values = row.get(field, "").split("|") if field == "Aliases" else [row.get(field, "")]
        identities.extend(value.strip() for value in values if value.strip())
    return identities


# Load the product-domain keyword list from products.csv at import time so
# it stays in sync with the data instead of needing manual updates to a
# hardcoded list. Falls back to a small built-in seed if the file is
# missing (e.g. package built without data/).
def _load_product_keywords():
    """Return high-signal product labels/aliases, never every corpus keyword."""
    seed = ["saas", "ecommerce", "fintech", "healthcare", "gaming", "portfolio",
            "crypto", "fitness", "marketplace", "banking", "cybersecurity",
            "education", "travel", "restaurant", "real estate", "social media",
            "beauty", "spa", "salon", "wellness", "booking"]
    filepath = DATA_DIR / CSV_CONFIG["product"]["file"]
    if not filepath.exists():
        return seed
    try:
        rows = _load_csv(filepath)
    except (csv.Error, OSError, UnicodeDecodeError):
        return seed

    keywords = set(seed)
    for row in rows:
        label = re.sub(r"\([^)]*\)", "", row.get("Product Type", "")).strip().lower()
        if len(label) >= 4:
            keywords.add(label)
    return sorted(keywords, key=len, reverse=True)


_DOMAIN_KEYWORDS = None
_DOMAIN_KEYWORDS_SIGNATURE = None


def _domain_keywords():
    global _DOMAIN_KEYWORDS, _DOMAIN_KEYWORDS_SIGNATURE
    product_path = DATA_DIR / CSV_CONFIG["product"]["file"]
    signature = _file_signature(product_path) if product_path.exists() else None
    if _DOMAIN_KEYWORDS is not None and _DOMAIN_KEYWORDS_SIGNATURE == signature:
        return _DOMAIN_KEYWORDS

    _DOMAIN_KEYWORDS = {
        "color": ["color", "palette", "hex", "rgb", "token", "semantic", "accent", "destructive", "muted", "foreground"],
        "chart": ["time series", "chart", "graph", "visualization", "trend", "bar chart", "pie", "scatter", "heatmap", "funnel", "forecast"],
        "landing": ["landing", "page", "cta", "conversion", "hero", "testimonial", "pricing", "section"],
        "product": _load_product_keywords(),
        "style": ["style", "design", "ui", "minimalism", "glassmorphism", "neumorphism", "brutalism", "dark mode", "flat", "aurora", "css", "implementation", "variable", "checklist", "tailwind"],
        "ux": ["ux", "usability", "accessibility", "wcag", "touch", "scroll", "animation", "keyboard", "navigation", "mobile"],
        "typography": ["font pairing", "typography pairing", "heading font", "body font"],
        "google-fonts": ["google font", "font family", "font weight", "font style", "variable font", "noto", "font for", "find font", "font subset", "font language", "monospace font", "serif font", "sans serif font", "display font", "handwriting font", "font", "typography", "serif", "sans"],
        "icons": ["icon", "icons", "lucide", "phosphor", "heroicons", "symbol", "glyph", "pictogram", "svg icon"],
        "gsap": ["gsap", "quickto", "scrolltrigger", "stagger", "magnetic cursor", "parallax", "page transition", "scroll reveal", "scroll-triggered", "scrollytelling", "flip plugin", "splittext", "shimmer", "skeleton loader"],
        "react": ["react", "next.js", "nextjs", "suspense", "memo", "usecallback", "useeffect", "rerender", "bundle", "waterfall", "barrel", "dynamic import", "rsc", "server component"],
        "web": ["aria", "focus", "outline", "semantic", "virtualize", "autocomplete", "form", "input type", "preconnect", "drag reorder", "single pointer", "touch target", "native accessibility"]
    }
    _DOMAIN_KEYWORDS_SIGNATURE = signature
    return _DOMAIN_KEYWORDS


def _contains_phrase(text, phrase):
    if re.search(r"\w", phrase):
        return bool(re.search(r'(?<!\w)' + re.escape(phrase) + r'(?!\w)', text))
    return phrase in text


def _rewrite_query_for_domain(query, domain, index):
    """Apply only explicit, semantic rewrites for routing-only vocabulary."""
    if not domain or domain not in _domain_keywords():
        return query, []
    normalized = _normalize(query.lower())
    vocabulary = set(index.vocabulary())
    rewrites = []
    replacement_terms = []
    for keyword in _domain_keywords()[domain]:
        if not _contains_phrase(normalized, keyword):
            continue
        if set(index.tokenize(keyword)) & vocabulary:
            continue
        replacement = _DOMAIN_QUERY_REWRITES.get(domain, {}).get(keyword)
        if replacement:
            rewrites.append(f"{keyword}->{replacement}")
            replacement_terms.append(replacement)
    if not replacement_terms:
        return query, []
    return f"{query} {' '.join(sorted(set(replacement_terms)))}", sorted(set(rewrites))


# Domains checked in this fixed order when scores tie, so results are
# deterministic instead of depending on dict/hash ordering.
_DOMAIN_TIEBREAK_ORDER = [
    "ux", "product", "style", "color", "typography", "google-fonts",
    "chart", "landing", "icons", "gsap", "react", "web",
]
_DOMAIN_TIEBREAK_RANK = {
    domain: rank for rank, domain in enumerate(_DOMAIN_TIEBREAK_ORDER)
}


def detect_domain(query, return_scores=False):
    """Auto-detect the most relevant domain from query.

    Matches are weighted by keyword length (multi-word/longer phrases are
    more specific and score higher than short generic words). Ties are
    broken by a fixed domain priority order, not dict/insertion order.
    """
    query_lower = _normalize(query.lower())
    domain_keywords = _domain_keywords()

    scores = {}
    for domain, keywords in domain_keywords.items():
        total = 0.0
        for kw in keywords:
            if _contains_phrase(query_lower, kw):
                # weight = 1 point per word in the keyword phrase
                specificity = max(1, len(kw.split()))
                total += 2.0 * specificity if domain != "product" else specificity
        scores[domain] = total
    if re.search(r"(?<!\w)#[0-9a-f]{3,8}(?!\w)", query_lower, re.IGNORECASE):
        scores["color"] += 2.0

    ranked = sorted(
        scores.items(),
        key=lambda item: (item[1], -_DOMAIN_TIEBREAK_RANK.get(item[0], 999)),
        reverse=True,
    )
    best_domain, best_score = ranked[0]
    result = best_domain if best_score > 0 else "style"

    if return_scores:
        runner_up = ranked[1][0] if len(ranked) > 1 and ranked[1][1] > 0 else None
        return result, runner_up
    return result


def _style_identity(rows, query, allow_contained=True):
    """Resolve an explicit style identity without opening generic variant ranking."""
    folded = str(query or "").strip().casefold()
    query_tokens = set(re.findall(r"\w+", _normalize(folded), re.UNICODE))
    generic_tokens = {"app", "design", "interface", "style", "system", "ui"}
    candidates = []
    for row in rows:
        identities = _row_identities(row, _STYLE_IDENTITY_FIELDS)
        if folded in {identity.casefold() for identity in identities}:
            return row
        if not allow_contained:
            continue
        for identity in identities:
            identity_tokens = set(re.findall(
                r"\w+", _normalize(identity.casefold()), re.UNICODE))
            if (identity_tokens and identity_tokens <= query_tokens
                    and any(len(token) >= 4 for token in identity_tokens)):
                distinctive = identity_tokens - generic_tokens
                candidates.append(
                    (len(distinctive), len(identity_tokens), len(identity), row))
    if not candidates:
        return None
    candidates.sort(key=lambda item: (item[0], item[1]), reverse=True)
    best_score = candidates[0][:3]
    best_rows = {
        candidate[3].get("Style ID", ""): candidate[3]
        for candidate in candidates if candidate[:3] == best_score
    }
    return next(iter(best_rows.values())) if len(best_rows) == 1 else None


def _exact_row_identity(rows, query, fields):
    """Return one row whose stable public identity exactly matches the query."""
    folded = str(query or "").strip().casefold()
    matches = []
    for row in rows:
        if folded in {identity.casefold() for identity in _row_identities(row, fields)}:
            matches.append(row)
    return matches[0] if len(matches) == 1 else None


def _load_rows_or_empty(filepath):
    """Load rows for optional identity routing, leaving search to report I/O errors."""
    try:
        return _load_csv(filepath)
    except (csv.Error, OSError, UnicodeDecodeError):
        return []


def _project_row(row, columns):
    return {column: row.get(column, "") for column in columns if column in row}


def _valid_max_results(value):
    return not isinstance(value, bool) and isinstance(value, int) and 1 <= value <= 20


def _exact_match_diagnostic(query, reason):
    return {
        "normalized_query": _normalize(query),
        "search_query": query,
        "query_rewrites": [],
        "top_score": 0.0,
        "runner_up_score": 0.0,
        "margin": 0.0,
        "token_coverage": 1.0,
        "abstained": False,
        "calibration_version": _SEARCH_CALIBRATION_VERSION,
        "reason": reason,
    }


def _style_search_destination(rows, matched):
    """Resolve a deprecated in-domain alias, or expose a cross-domain redirect."""
    if not matched or matched.get("Status", "active") != "deprecated":
        return matched, None
    parent_id = matched.get("Parent Style ID", "").strip()
    if parent_id:
        parent = next((row for row in rows if row.get("Style ID") == parent_id), None)
        return parent, None
    domain = matched.get("Replacement Domain", "").strip()
    replacement_id = matched.get("Replacement ID", "").strip()
    if domain == "style" and replacement_id:
        replacement = next(
            (row for row in rows if row.get("Style ID") == replacement_id), None)
        return replacement, None
    if domain and replacement_id:
        return None, {"domain": domain, "id": replacement_id}
    return None, None


def _normalize_rtl_level(rtl, domain):
    """Validate an rtl request. Returns None when RTL filtering is off."""
    if rtl is None:
        return None
    level = str(rtl).strip().casefold()
    if level not in RTL_LEVEL_CHOICES:
        raise ValueError(
            f"unsupported rtl level {rtl!r}; expected one of "
            f"{', '.join(RTL_LEVEL_CHOICES)}"
        )
    if domain not in RTL_DOMAINS:
        raise ValueError(
            "--rtl is only supported with --domain style or --domain product; "
            f"got {domain or 'no explicit domain'}"
        )
    return level


def _rtl_row_filter(level):
    """Row predicate for a validated rtl level ('all' accepts every level)."""
    if level == "all":
        return lambda row: row.get("rtl_level") in RTL_LEVELS
    return lambda row: row.get("rtl_level") == level


def search(query, domain=None, max_results=MAX_RESULTS, diagnostics=False, rtl=None):
    """Main search function with auto-domain detection.

    rtl: None (off) or one of "all", "full", "partial", "caveats". When set,
    only styles/products whose rtl_level matches are ranked and returned; the
    filter runs before max_results truncation, so a narrow level cannot mask
    matching rows. Requires an explicit style/product domain.
    """
    if not _valid_max_results(max_results):
        return {"error": "max_results must be an integer from 1 to 20", "domain": domain}
    rtl_level = _normalize_rtl_level(rtl, domain)
    auto_detected = domain is None
    runner_up = None
    style_rows = None
    exact_style = None
    redirect = None
    if domain is None:
        style_path = DATA_DIR / CSV_CONFIG["style"]["file"]
        style_rows = _load_rows_or_empty(style_path)
        matched_style = _style_identity(style_rows, query, allow_contained=False)
        if matched_style is not None:
            domain = "style"
            exact_style, redirect = _style_search_destination(
                style_rows, matched_style)
        else:
            domain, runner_up = detect_domain(query, return_scores=True)

    search_domain = domain if domain in CSV_CONFIG else "style"
    config = CSV_CONFIG[search_domain]
    filepath = DATA_DIR / config["file"]

    if not filepath.exists():
        return {"error": f"File not found: {filepath}", "domain": domain}

    if search_domain == "style" and exact_style is None and redirect is None:
        if style_rows is None:
            style_rows = _load_rows_or_empty(filepath)
        exact_style, redirect = _style_search_destination(
            style_rows, _style_identity(style_rows, query))
    elif search_domain == "landing":
        landing_rows = _load_rows_or_empty(filepath)
        exact_style = _exact_row_identity(
            landing_rows, query, _LANDING_IDENTITY_FIELDS)

    if rtl_level is not None and exact_style is not None:
        # An explicit identity lookup still has to respect the RTL filter;
        # otherwise --rtl=full could return a caveats row.
        if not _rtl_row_filter(rtl_level)(exact_style):
            exact_style = None

    if exact_style is not None:
        results = [_project_row(exact_style, config["output_cols"])]
        bm25 = None
        diagnostic = _exact_match_diagnostic(query, "exact-identity")
    elif redirect is not None:
        results, bm25 = [], None
        diagnostic = {
            "normalized_query": _normalize(query),
            "search_query": query,
            "query_rewrites": [],
            "abstained": True,
            "calibration_version": _SEARCH_CALIBRATION_VERSION,
            "reason": "cross-domain-redirect",
        }
    else:
        results, bm25, diagnostic = _search_csv_detailed(
            filepath, config["search_cols"], config["output_cols"], query,
            max_results, _SEARCH_THRESHOLDS[search_domain], search_domain,
            row_filter=(
                (lambda row: row.get("Status", "active") == "active")
                if search_domain == "style" else None
            ),
            # RTL is metadata, not a ranking signal: score the full corpus,
            # then drop non-matching rows before max_results truncation.
            ranked_filter=(
                _rtl_row_filter(rtl_level) if rtl_level is not None else None
            ),
            cache_variant="active-only" if search_domain == "style" else "",
        )

    if search_domain == "icons" and _contains_phrase(_normalize(query.lower()), "lucide"):
        results = []
        diagnostic.update({"abstained": True, "reason": "unsupported-library"})

    out = {
        "domain": domain,
        "query": query,
        "file": config["file"],
        "count": len(results),
        "results": results,
    }
    if auto_detected:
        out["auto_detected"] = True
        if runner_up:
            out["runner_up_domain"] = runner_up
    if redirect is not None:
        out["redirect"] = redirect
    if diagnostic.get("error"):
        out["error"] = diagnostic["error"]
    if not results:
        if search_domain == "landing":
            out["suggestions"] = _suggest_identities(
                landing_rows, query, _LANDING_IDENTITY_FIELDS)
        else:
            out["suggestions"] = _suggest_terms(
                bm25, query, threshold=_SEARCH_THRESHOLDS[search_domain])
    if diagnostics:
        out["diagnostics"] = diagnostic
    return out


def _stack_query_requests_legacy(query, stack):
    """Whether a stack query explicitly targets an older framework generation."""
    normalized = _normalize(str(query or "").casefold())
    if stack in LEGACY_ONLY_STACKS:
        return True

    current_version = STACK_CURRENT_VERSIONS.get(stack)
    stack_name = _STACK_QUERY_NAMES.get(stack)
    if current_version is not None and stack_name is not None:
        matches = re.finditer(
            rf"\b(?:{stack_name})\s*(?:sdk|ui)?\s*(?:[@(]\s*)?(?:v(?:ersion)?\s*)?"
            rf"(\d+)(?:\.(\d+))?(?!\w)\s*\)?",
            normalized,
        )
        requested_versions = [
            tuple(int(value) for value in match.groups() if value is not None)
            for match in matches
        ]
        if stack == "threejs":
            requested_versions.extend(
                (0, int(release)) for release in re.findall(r"\br(\d+)\b", normalized)
            )
        migration_intent = bool(re.search(
            r"\b(?:migrat\w*|upgrad\w*|replac\w*|instead|modern|current)\b",
            normalized,
        ))
        if requested_versions:
            if migration_intent and any(
                    requested >= current_version[:len(requested)]
                    for requested in requested_versions):
                return False
            return all(
                requested < current_version[:len(requested)]
                for requested in requested_versions
            )
    if re.search(r"\b(?:migrat\w*|upgrad\w*|replac\w*|instead|modern|current)\b", normalized):
        return False
    return bool(re.search(r"\b(?:legacy|deprecated)\b", normalized))


def _stack_row_filter(rows, query, stack):
    """Choose one coherent applicability generation for stack retrieval."""
    statuses = {row.get("Status", "unverified") for row in rows}
    has_legacy = "deprecated" in statuses
    requests_legacy = _stack_query_requests_legacy(query, stack)
    if has_legacy and requests_legacy:
        status_filter = lambda row: row.get("Status") == "deprecated"
        variant = "legacy-only"
    elif requests_legacy and stack in STACK_CURRENT_VERSIONS:
        return lambda row: False, "legacy-unavailable"
    elif "active" in statuses:
        status_filter = lambda row: row.get("Status") == "active"
        variant = "current-only"
    else:
        status_filter = lambda row: row.get("Status", "unverified") != "deprecated"
        variant = "non-legacy"

    if stack != "shadcn":
        return status_filter, variant
    normalized = _normalize(str(query or "").casefold())
    if "base ui" in normalized:
        requested_base = "base"
    elif "react aria" in normalized:
        requested_base = "aria"
    elif "radix" in normalized or "aschild" in normalized:
        requested_base = "radix"
    else:
        return status_filter, variant

    def matches_base(row):
        match = re.search(r"\bbase=([^;]+)", row.get("Applies To", "").casefold())
        bases = match.group(1).split("|") if match else []
        return status_filter(row) and requested_base in bases

    return matches_base, f"{variant};base={requested_base}"


def _exact_stack_identifier(rows, query, row_filter):
    """Resolve a standalone API identifier even when its BM25 IDF is low."""
    identifier = str(query or "").strip()
    if len(identifier) < 6 or re.search(r"\s", identifier):
        return None
    pattern = re.compile(rf"(?<![A-Za-z0-9_]){re.escape(identifier)}(?![A-Za-z0-9_])", re.I)
    fields = ("Guideline", "Description", "Do", "Don't", "Code Good", "Code Bad")
    matches = [row for row in rows if row_filter(row) and any(
        pattern.search(row.get(field, "")) for field in fields
    )]
    return matches[0] if len(matches) == 1 else None


def _legacy_successor_guidance(rows, query, stack, row_filter):
    """Prefer the explicit successor row for a brand-new app on legacy-only stacks."""
    normalized = _normalize(str(query or "").casefold())
    if stack not in LEGACY_ONLY_STACKS or not re.search(
            r"\b(?:brand new|new)\s+(?:app|application|project)\b", normalized):
        return None
    matches = [row for row in rows if row_filter(row) and re.search(
        r"\b(?:prefer|choose|use)\b.*\bnew (?:apps?|projects?)\b",
        " ".join((row.get("Guideline", ""), row.get("Description", ""), row.get("Do", ""))).casefold(),
    )]
    return matches[0] if len(matches) == 1 else None


def search_stack(query, stack, max_results=MAX_RESULTS, diagnostics=False):
    """Search stack-specific guidelines"""
    if not _valid_max_results(max_results):
        return {"error": "max_results must be an integer from 1 to 20", "stack": stack}
    if stack not in STACK_CONFIG:
        return {"error": f"Unknown stack: {stack}. Available: {', '.join(AVAILABLE_STACKS)}"}

    filepath = DATA_DIR / STACK_CONFIG[stack]["file"]

    if not filepath.exists():
        return {"error": f"Stack file not found: {filepath}", "stack": stack}

    rows = _load_rows_or_empty(filepath)
    row_filter, cache_variant = _stack_row_filter(rows, query, stack)
    threshold = _NO_THRESHOLD if cache_variant == "legacy-only" else _STACK_THRESHOLD
    exact = (_legacy_successor_guidance(rows, query, stack, row_filter)
             or _exact_stack_identifier(rows, query, row_filter))
    if exact is not None:
        results = [_project_row(exact, _STACK_COLS["output_cols"])]
        bm25 = None
        diagnostic = _exact_match_diagnostic(query, "exact-identifier")
    else:
        results, bm25, diagnostic = _search_csv_detailed(
            filepath, _STACK_COLS["search_cols"], _STACK_COLS["output_cols"], query,
            max_results, threshold, row_filter=row_filter,
            cache_variant=cache_variant)

    out = {
        "domain": "stack",
        "stack": stack,
        "query": query,
        "file": STACK_CONFIG[stack]["file"],
        "count": len(results),
        "results": results,
    }
    if diagnostic.get("error"):
        out["error"] = diagnostic["error"]
    if not results:
        out["suggestions"] = _suggest_terms(
            bm25, query, threshold=threshold)
    if diagnostics:
        out["diagnostics"] = diagnostic
    return out
