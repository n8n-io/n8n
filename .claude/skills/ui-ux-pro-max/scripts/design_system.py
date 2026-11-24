#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Design System Generator - Aggregates search results and applies reasoning
to generate comprehensive design system recommendations.

Usage:
    from design_system import generate_design_system
    result = generate_design_system("SaaS dashboard", "My Project")
    print(result["text"])

    # With persistence (Master + Overrides pattern)
    result = generate_design_system("SaaS dashboard", "My Project", persist=True, output_dir="/path/to/project")
    result["persistence"]  # {"status": "success"|"skipped_exists", "created_files": [...], ...}
    result = generate_design_system("SaaS dashboard", "My Project", persist=True, page="dashboard", output_dir="/path/to/project")
"""

import csv
import json
import os
import re
import sys
import io
import tempfile
from datetime import datetime
from pathlib import Path
from core import search, DATA_DIR
from reasoning_contract import apply_decision_rules, parse_decision_rules

# Force UTF-8 for stdout/stderr to handle emojis/box-drawing chars on Windows (cp1252 default)
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


# ============ CONFIGURATION ============
REASONING_FILE = "ui-reasoning.csv"

SEARCH_CONFIG = {
    "product": {"max_results": 1},
    "style": {"max_results": 3},
    "color": {"max_results": 5},
    "landing": {"max_results": 2},
    "typography": {"max_results": 2}
}

SEMANTIC_COLOR_ENTRIES = (
    ("Primary", "primary", "--color-primary"),
    ("On Primary", "on_primary", "--color-on-primary"),
    ("Secondary", "secondary", "--color-secondary"),
    ("On Secondary", "on_secondary", "--color-on-secondary"),
    ("Accent/CTA", "accent", "--color-accent"),
    ("On Accent/CTA", "on_accent", "--color-on-accent"),
    ("Background", "background", "--color-background"),
    ("Foreground", "foreground", "--color-foreground"),
    ("Card", "card", "--color-card"),
    ("Card Foreground", "card_foreground", "--color-card-foreground"),
    ("Muted", "muted", "--color-muted"),
    ("Muted Foreground", "muted_foreground", "--color-muted-foreground"),
    ("Border", "border", "--color-border"),
    ("Destructive", "destructive", "--color-destructive"),
    ("On Destructive", "on_destructive", "--color-on-destructive"),
    ("Ring", "ring", "--color-ring"),
)

# ============ DESIGN DIALS (1-10) ============
# Inspired by taste-skill's DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY
# knobs: three optional 1-10 sliders that bias the existing query-based search
# instead of replacing it. Each dial buckets into a low/mid/high tier.
DIAL_TIERS = {
    "variance": [
        (1, 3, {"label": "Centered / Minimal", "style_keywords": ["Minimalism", "Exaggerated Minimalism", "centered", "symmetric", "grid-based"]}),
        (4, 7, {"label": "Balanced / Modern", "style_keywords": ["modern", "structured", "balanced"]}),
        (8, 10, {"label": "Bold / Asymmetric", "style_keywords": ["Brutalism", "Bento Grids", "asymmetric", "experimental"]}),
    ],
    "motion": [
        (1, 3, {"label": "Subtle", "tier": "Subtle"}),
        (4, 7, {"label": "Standard", "tier": "Standard"}),
        (8, 10, {"label": "Complex", "tier": "Complex"}),
    ],
    "density": [
        (1, 3, {"label": "Spacious", "spacing": {"xs": "4px", "sm": "8px", "md": "24px", "lg": "32px", "xl": "48px", "2xl": "64px", "3xl": "96px"}}),
        (4, 7, {"label": "Standard", "spacing": {"xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px", "2xl": "48px", "3xl": "64px"}}),
        (8, 10, {"label": "Dense / Dashboard", "spacing": {"xs": "2px", "sm": "4px", "md": "8px", "lg": "12px", "xl": "16px", "2xl": "24px", "3xl": "32px"}}),
    ],
}


def _resolve_dial(dial_name: str, value) -> dict:
    """Bucket a 1-10 dial value into its tier config. Returns None if value is None."""
    if value is None:
        return None
    value = max(1, min(10, int(value)))
    for lo, hi, info in DIAL_TIERS[dial_name]:
        if lo <= value <= hi:
            return {**info, "value": value}
    return None


# ============ COLOR MODE RESOLUTION ============
# Style, palette and anti-patterns are resolved from separate CSVs. Without a
# shared notion of "which mode did we land on", a dark-primary style can be
# paired with a light palette and a "don't use dark mode" anti-pattern.

# Phrases in styles.csv "Light Mode ✓" / "Dark Mode ✓" that mark a style as
# dark-first rather than merely dark-capable ("✓ Full" means both work).
_DARK_PRIMARY_MARKERS = (
    "dark mode primary", "dark primary", "dark-only", "dark only",
    "dark preferred", "dark focused", "dark-first", "dark rich",
    "light mode only as exception",
)

# Query phrases that are an explicit request for a dark theme.
_DARK_QUERY_MARKERS = (
    "dark mode", "dark theme", "dark ui", "dark-mode", "darkmode",
    "night mode", "midnight", "oled",
)

# Anti-pattern clauses that contradict a resolved dark mode.
_DARK_ANTI_PATTERN_MARKERS = ("dark mode", "dark modes", "dark theme")

# Relative luminance below which a Background hex counts as a dark surface.
# #1F2937 (the lightest dark background in colors.csv) sits at ~0.026 and
# #E8ECF1 (the darkest light background) at ~0.79, so the gap is wide.
_DARK_BACKGROUND_MAX_LUMINANCE = 0.18


def _relative_luminance(hex_color: str):
    """WCAG relative luminance of a #RRGGBB string, or None if unparseable."""
    if not hex_color:
        return None
    value = hex_color.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    if len(value) != 6:
        return None
    try:
        channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    except ValueError:
        return None
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
              for c in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def _palette_is_dark(palette: dict) -> bool:
    """True when a colors.csv row's Background is a dark surface."""
    luminance = _relative_luminance((palette or {}).get("Background", ""))
    return luminance is not None and luminance < _DARK_BACKGROUND_MAX_LUMINANCE


def _contrast_ratio(first: str, second: str):
    """WCAG contrast ratio for two hex colors, or None if either is invalid."""
    first_luminance = _relative_luminance(first)
    second_luminance = _relative_luminance(second)
    if first_luminance is None or second_luminance is None:
        return None
    lighter = max(first_luminance, second_luminance)
    darker = min(first_luminance, second_luminance)
    return (lighter + 0.05) / (darker + 0.05)


def _style_is_dark_primary(style: dict) -> bool:
    """True when a styles.csv row describes itself as dark-first."""
    if not style:
        return False
    preferred_mode = style.get("Preferred Mode", "").strip().lower()
    if preferred_mode in {"dark", "light"}:
        return preferred_mode == "dark"
    if (style.get("Light Mode ✓") == "not-recommended"
            and style.get("Dark Mode ✓") == "supported"):
        return True
    declared = "{} {}".format(
        style.get("Light Mode ✓", ""), style.get("Dark Mode ✓", "")
    ).lower()
    return any(marker in declared for marker in _DARK_PRIMARY_MARKERS)


def _query_wants_dark(query: str) -> bool:
    """True when the query explicitly asks for a dark theme."""
    lowered = (query or "").lower()
    return any(marker in lowered for marker in _DARK_QUERY_MARKERS)


def _resolve_color_mode(query: str, style: dict) -> str:
    """Resolve the mode the rest of the output has to agree with."""
    if _query_wants_dark(query) or _style_is_dark_primary(style):
        return "dark"
    return "light"


def _derive_dark_palette(palette: dict) -> dict:
    """Keep product brand tokens while deriving accessible dark surfaces."""
    derived = dict(palette)
    background = "#0F172A"
    ring_candidates = (
        palette.get("Ring"), palette.get("Accent"), palette.get("Primary"),
        "#60A5FA",
    )
    ring = next(
        (candidate for candidate in ring_candidates
         if (_contrast_ratio(candidate, background) or 0) >= 3),
        "#60A5FA",
    )
    derived.update({
        "Background": background,
        "Foreground": "#F8FAFC",
        "Card": "#111827",
        "Card Foreground": "#F8FAFC",
        "Muted": "#1E293B",
        "Muted Foreground": "#CBD5E1",
        "Border": "#334155",
        "Ring": ring,
        "_mode_derivation": "derived-dark",
    })
    return derived


def _select_palette_for_mode(palettes: list, mode: str,
                             category: str = None) -> dict:
    """Pick the highest-ranked palette matching the resolved mode.

    Only the dark case filters. Light is left on the existing "top hit wins"
    behaviour so queries that never mention a mode keep their current palette.
    Falls back to the top hit when the data has no matching ramp.
    """
    if not palettes:
        return {}
    category_palette = next(
        (palette for palette in palettes
         if palette.get("Product Type") == category),
        None,
    )
    if category_palette:
        if mode == "dark" and not _palette_is_dark(category_palette):
            return _derive_dark_palette(category_palette)
        return category_palette
    if mode == "dark":
        for palette in palettes:
            if _palette_is_dark(palette):
                return palette
    return palettes[0]


def _filter_anti_patterns_for_mode(anti_patterns: str, mode: str) -> str:
    """Drop "avoid dark mode" advice once dark mode is the resolved answer."""
    if mode != "dark" or not anti_patterns:
        return anti_patterns
    kept = [
        clause for clause in anti_patterns.split("+")
        if not any(marker in clause.lower() for marker in _DARK_ANTI_PATTERN_MARKERS)
    ]
    return " + ".join(clause.strip() for clause in kept if clause.strip())


def _mode_support_labels(style: dict, anti_patterns: str):
    """Light/dark support labels that agree with the product's anti-patterns.

    A light result keeps its "avoid dark mode" clause, so a dark-capable style
    must not read as a plain "Dark supported" next to it.
    """
    light = style.get("light_mode", "")
    dark = style.get("dark_mode", "")
    avoids_dark = any(
        marker in (anti_patterns or "").lower() for marker in _DARK_ANTI_PATTERN_MARKERS
    )
    if dark and dark != "not-recommended" and avoids_dark:
        dark = f"{dark}, but avoid for this product"
    return light, dark


def _button_outline_text_color(colors: dict) -> str:
    """Primary for outline-button text when it is readable, else the foreground."""
    primary = colors.get("primary", "#2563EB")
    background = colors.get("background", "#FFFFFF")
    if (_contrast_ratio(primary, background) or 0) >= 4.5:
        return primary
    return colors.get("foreground") or primary


# ============ DESIGN SYSTEM GENERATOR ============
class DesignSystemGenerator:
    """Generates design system recommendations from aggregated searches."""

    def __init__(self):
        self.reasoning_data = self._load_reasoning()
        self.style_data = self._load_styles()
        self.style_lookup = self._build_style_lookup(self.style_data)
        self.landing_lookup = self._load_landing_patterns()

    def _load_reasoning(self) -> list:
        """Load reasoning rules from CSV."""
        filepath = DATA_DIR / REASONING_FILE
        if not filepath.exists():
            return []
        with open(filepath, 'r', encoding='utf-8') as f:
            return list(csv.DictReader(f))

    def _load_styles(self) -> list:
        filepath = DATA_DIR / "styles.csv"
        if not filepath.exists():
            return []
        with open(filepath, 'r', encoding='utf-8') as f:
            return list(csv.DictReader(f))

    def _load_landing_patterns(self) -> dict:
        filepath = DATA_DIR / "landing.csv"
        if not filepath.exists():
            return {}
        with open(filepath, 'r', encoding='utf-8') as f:
            lookup = {}
            for row in csv.DictReader(f):
                identities = [row.get("Pattern ID", ""), row.get("Pattern Name", "")]
                identities.extend(row.get("Aliases", "").split("|"))
                for identity in identities:
                    if identity.strip():
                        lookup[identity.strip().casefold()] = row
            return lookup

    @staticmethod
    def _build_style_lookup(styles: list) -> dict:
        lookup = {}
        for style in styles:
            keys = [style.get("Style ID", ""), style.get("Style Category", "")]
            keys.extend(style.get("Aliases", "").split("|"))
            for key in keys:
                if key.strip():
                    lookup[key.strip().casefold()] = style
        return lookup

    def _resolve_style(self, reference: str) -> dict:
        style = self.style_lookup.get(str(reference or "").strip().casefold(), {})
        seen = set()
        while style and style.get("Status", "active") == "deprecated":
            style_id = style.get("Style ID", "")
            parent_id = style.get("Parent Style ID", "")
            if not parent_id or style_id in seen:
                return {}
            seen.add(style_id)
            style = self.style_lookup.get(parent_id.casefold(), {})
        return style

    def _multi_domain_search(self, query: str, category: str,
                             reasoning: dict, style_priority: list = None) -> dict:
        """Execute searches across multiple domains."""
        results = {}
        constraints = " ".join(
            item.replace("-", " ")
            for item in reasoning.get("constraints", [])
        )
        resolved_query = " ".join(
            part for part in (query, category, constraints) if part
        )
        for domain, config in SEARCH_CONFIG.items():
            if domain == "style" and style_priority:
                priority_query = " ".join(style_priority[:2])
                results[domain] = search(
                    f"{resolved_query} {priority_query}", domain, config["max_results"])
            elif domain == "color":
                results[domain] = search(
                    f"{reasoning.get('color_mood', '')} {resolved_query}",
                    domain, config["max_results"])
            elif domain == "landing":
                # The reasoning pattern is the landing query contract. Mixing the
                # product prompt into it can push token coverage below the
                # abstention threshold even when the pattern names an exact row.
                pattern = reasoning.get("pattern", "")
                landing_query = pattern if pattern.casefold() in self.landing_lookup else (
                    f"{pattern} {resolved_query}"
                )
                results[domain] = search(
                    landing_query or query, domain, config["max_results"])
            elif domain == "typography":
                results[domain] = search(
                    f"{reasoning.get('typography_mood', '')} {resolved_query}",
                    domain, config["max_results"])
            else:
                results[domain] = search(query, domain, config["max_results"])
        return results

    def _find_reasoning_rule(self, category: str) -> dict:
        """Find matching reasoning rule for a category."""
        category_lower = category.strip().casefold()
        for rule in self.reasoning_data:
            if rule.get("UI_Category", "").strip().casefold() == category_lower:
                return rule
        return {}

    def _apply_reasoning(self, category: str, query: str) -> dict:
        """Apply reasoning rules to search results."""
        rule = self._find_reasoning_rule(category)

        if not rule:
            return {
                "pattern": "Hero + Features + CTA",
                "style_priority": ["Minimalism", "Flat Design"],
                "color_mood": "Professional",
                "typography_mood": "Clean",
                "key_effects": "Subtle hover transitions",
                "anti_patterns": "",
                "decision_rules": {},
                "activated_rules": [],
                "constraints": [],
                "preferred_mode": None,
                "is_default": True,
                "severity": "MEDIUM"
            }

        decision_rules = parse_decision_rules(rule.get("Decision_Rules", "{}"))
        applied = apply_decision_rules(decision_rules, query)
        style_priority = [s.strip() for s in rule.get("Style_Priority", "").split("+")]
        applied_style_names = [
            self._resolve_style(style_id).get("Style Category", style_id)
            for style_id in applied["style_ids"]
        ]

        return {
            "pattern": applied["pattern"] or rule.get("Recommended_Pattern", ""),
            "style_priority": applied_style_names + style_priority,
            "color_mood": rule.get("Color_Mood", ""),
            "typography_mood": rule.get("Typography_Mood", ""),
            "key_effects": rule.get("Key_Effects", ""),
            "anti_patterns": rule.get("Anti_Patterns", ""),
            "decision_rules": decision_rules,
            "activated_rules": applied["activated"],
            "constraints": applied["constraints"],
            "preferred_mode": applied["mode"],
            "is_default": False,
            "severity": rule.get("Severity", "MEDIUM")
        }

    def _select_best_match(self, results: list, priority_keywords: list) -> dict:
        """Select best matching result based on priority keywords."""
        if not results:
            return {}

        if not priority_keywords:
            return results[0]

        # Canonical reasoning has authority over lexical candidates. Returning
        # the resolved row directly prevents a platform variant in BM25 top-3
        # from displacing the explicit family recommendation.
        for priority in priority_keywords:
            resolved = self._resolve_style(priority)
            if resolved and resolved.get("Status", "active") != "deprecated":
                return dict(resolved)

        # Second: score by keyword match in all fields
        scored = []
        for result in results:
            result_str = str(result).lower()
            score = 0
            for kw in priority_keywords:
                kw_tokens = set(re.findall(r"[a-z0-9]+", kw.lower()))
                name_tokens = set(re.findall(
                    r"[a-z0-9]+", result.get("Style Category", "").lower()))
                if kw_tokens and kw_tokens <= name_tokens:
                    score += 10
                elif kw_tokens & set(re.findall(
                        r"[a-z0-9]+", result.get("Keywords", "").lower())):
                    score += 3
                elif any(token in result_str for token in kw_tokens):
                    score += 1
            scored.append((score, result))

        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[0][1] if scored and scored[0][0] > 0 else results[0]

    def _extract_results(self, search_result: dict) -> list:
        """Extract results list from search result dict."""
        return search_result.get("results", [])

    def generate(self, query: str, project_name: str = None,
                 variance: int = None, motion: int = None, density: int = None) -> dict:
        """Generate complete design system recommendation.

        variance/motion/density are optional 1-10 dials (see DIAL_TIERS) that bias
        style selection, pull in a matching motion.csv snippet, and override the
        spacing scale, without changing behavior when left unset.
        """
        variance_info = _resolve_dial("variance", variance)
        motion_info = _resolve_dial("motion", motion)
        density_info = _resolve_dial("density", density)

        # Step 1: First search product to get category
        product_result = search(query, "product", 1)
        product_results = product_result.get("results", [])
        category = "General"
        if product_results:
            category = product_results[0].get("Product Type", "General")

        # Step 2: Get reasoning rules for this category
        reasoning = self._apply_reasoning(category, query)
        style_priority = reasoning.get("style_priority", [])

        # DESIGN_VARIANCE dial: bias style retrieval/selection toward
        # centered-minimal (low) or bold-asymmetric (high) keywords.
        effective_style_priority = style_priority
        if variance_info:
            effective_style_priority = variance_info["style_keywords"] + style_priority

        # Step 3: Multi-domain search with style priority hints
        search_results = self._multi_domain_search(
            query, category, reasoning, effective_style_priority)
        search_results["product"] = product_result  # Reuse product search

        # Step 4: Select best matches from each domain using priority
        style_results = self._extract_results(search_results.get("style", {}))
        color_results = self._extract_results(search_results.get("color", {}))
        typography_results = self._extract_results(search_results.get("typography", {}))
        landing_results = self._extract_results(search_results.get("landing", {}))

        best_style = self._select_best_match(style_results, effective_style_priority)
        # Resolve the mode from the style + query first, then pick a palette that
        # agrees with it. Ranking colors independently is what let a dark-primary
        # style ship with a light background.
        color_mode = reasoning.get("preferred_mode") or _resolve_color_mode(query, best_style)
        best_color = _select_palette_for_mode(color_results, color_mode, category)
        best_typography = typography_results[0] if typography_results else {}
        best_landing = next(
            (row for row in landing_results
             if row.get("Pattern Name") == reasoning.get("pattern")),
            landing_results[0] if landing_results else {},
        )

        # MOTION_INTENSITY dial: pull a matching GSAP skeleton from motion.csv
        # (domain key is "gsap", not "motion" - PR #296 already owns the "motion"
        # domain for Emil Kowalski's motion-design principles, motion-principles.csv).
        motion_snippet = {}
        if motion_info:
            motion_result = search(f"{query} {motion_info['tier']}", "gsap", 5)
            motion_matches = motion_result.get("results", [])
            tiered = [m for m in motion_matches if m.get("Intensity Tier") == motion_info["tier"]]
            if tiered:
                motion_snippet = tiered[0]
            elif motion_matches:
                motion_snippet = motion_matches[0]

        # Step 5: Build final recommendation
        # Combine effects from both reasoning and style search
        style_effects = best_style.get("Effects & Animation", "")
        reasoning_effects = reasoning.get("key_effects", "")
        combined_effects = style_effects if style_effects else reasoning_effects

        return {
            "project_name": project_name or query.upper(),
            "category": category,
            "pattern": {
                "name": best_landing.get("Pattern Name", reasoning.get("pattern", "Hero + Features + CTA")),
                "sections": best_landing.get("Section Order", "Hero > Features > CTA"),
                "cta_placement": best_landing.get("Primary CTA Placement", "Above fold"),
                "color_strategy": best_landing.get("Color Strategy", ""),
                "conversion": best_landing.get("Conversion Optimization", "")
            },
            "style": {
                "id": best_style.get("Style ID", "minimalism-and-swiss-style"),
                "name": best_style.get("Style Category", "Minimalism"),
                "type": best_style.get("Type", "General"),
                "effects": style_effects,
                "keywords": best_style.get("Keywords", ""),
                "best_for": best_style.get("Best For", ""),
                "performance": best_style.get("Performance", ""),
                "accessibility": best_style.get("Accessibility", ""),
                "light_mode": best_style.get("Light Mode ✓", ""),
                "dark_mode": best_style.get("Dark Mode ✓", ""),
            },
            "colors": {
                "primary": best_color.get("Primary", "#2563EB"),
                "on_primary": best_color.get("On Primary", ""),
                "secondary": best_color.get("Secondary", "#3B82F6"),
                "on_secondary": best_color.get("On Secondary", ""),
                "accent": best_color.get("Accent", "#F97316"),
                "on_accent": best_color.get("On Accent", ""),
                "background": best_color.get("Background", "#F8FAFC"),
                "foreground": best_color.get("Foreground", "#1E293B"),
                "card": best_color.get("Card", ""),
                "card_foreground": best_color.get("Card Foreground", ""),
                "muted": best_color.get("Muted", ""),
                "muted_foreground": best_color.get("Muted Foreground", ""),
                "border": best_color.get("Border", ""),
                "destructive": best_color.get("Destructive", ""),
                "on_destructive": best_color.get("On Destructive", ""),
                "ring": best_color.get("Ring", ""),
                "notes": best_color.get("Notes", ""),
                # Keep legacy keys for backward compat in MASTER.md
                "cta": best_color.get("Accent", "#F97316"),
                "text": best_color.get("Foreground", "#1E293B"),
                "on_cta": best_color.get("On Accent", ""),
            },
            "typography": {
                "heading": best_typography.get("Heading Font", "Inter"),
                "body": best_typography.get("Body Font", "Inter"),
                "mood": best_typography.get("Mood/Style Keywords", reasoning.get("typography_mood", "")),
                "best_for": best_typography.get("Best For", ""),
                "google_fonts_url": best_typography.get("Google Fonts URL", ""),
                "css_import": best_typography.get("CSS Import", "")
            },
            "key_effects": combined_effects,
            "anti_patterns": _filter_anti_patterns_for_mode(
                reasoning.get("anti_patterns", ""), color_mode
            ),
            "decision_rules": reasoning.get("decision_rules", {}),
            "activated_rules": reasoning.get("activated_rules", []),
            "constraints": reasoning.get("constraints", []),
            "reasoning_default": reasoning.get("is_default", False),
            "source_identities": {
                "product": category if product_results else None,
                "reasoning": category if not reasoning.get("is_default") else None,
                "style": best_style.get("Style ID") or best_style.get("Style Category"),
                "color": best_color.get("Product Type"),
                "typography": best_typography.get("Font Pairing Name"),
                "landing": best_landing.get("Pattern Name"),
            },
            "source_derivations": {
                "color_mode": best_color.get("_mode_derivation"),
            },
            "severity": reasoning.get("severity", "MEDIUM"),
            "dials": {
                "variance": variance_info["value"] if variance_info else None,
                "variance_label": variance_info["label"] if variance_info else None,
                "motion": motion_info["value"] if motion_info else None,
                "motion_label": motion_info["label"] if motion_info else None,
                "density": density_info["value"] if density_info else None,
                "density_label": density_info["label"] if density_info else None,
            },
            "motion_snippet": motion_snippet,
            "spacing_scale": density_info["spacing"] if density_info else None,
        }


# ============ OUTPUT FORMATTERS ============
BOX_WIDTH = 90  # Wider box for more content


def hex_to_ansi(hex_color: str) -> str:
    """Convert hex color to ANSI True Color swatch (██) with fallback."""
    if not hex_color or not hex_color.startswith('#'):
        return ""
    colorterm = os.environ.get('COLORTERM', '')
    if colorterm not in ('truecolor', '24bit'):
        return ""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        return ""
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return f"\033[38;2;{r};{g};{b}m██\033[0m "


def ansi_ljust(s: str, width: int) -> str:
    """Like str.ljust but accounts for zero-width ANSI escape sequences."""
    import re
    visible_len = len(re.sub(r'\033\[[0-9;]*m', '', s))
    pad = width - visible_len
    return s + (" " * max(0, pad))


def section_header(name: str, width: int) -> str:
    """Create a Unicode section separator: ├─── NAME ───...┤"""
    label = f"─── {name} "
    fill = "─" * (width - len(label) - 1)
    return f"├{label}{fill}┤"


def format_ascii_box(design_system: dict) -> str:
    """Format design system as Unicode box with ANSI color swatches."""
    project = design_system.get("project_name", "PROJECT")
    pattern = design_system.get("pattern", {})
    style = design_system.get("style", {})
    colors = design_system.get("colors", {})
    typography = design_system.get("typography", {})
    effects = design_system.get("key_effects", "")
    anti_patterns = design_system.get("anti_patterns", "")
    dials = design_system.get("dials", {})
    motion_snippet = design_system.get("motion_snippet", {})

    def wrap_text(text: str, prefix: str, width: int) -> list:
        """Wrap long text into multiple lines, splitting tokens (URLs) wider than a line."""
        if not text:
            return []
        room = width - 2 - len(prefix)
        words = []
        for word in text.split():
            words.extend(word[i:i + room] for i in range(0, len(word), room))
        lines = []
        current_line = prefix
        for word in words:
            if len(current_line) + len(word) + 1 <= width - 2:
                current_line += (" " if current_line != prefix else "") + word
            else:
                if current_line != prefix:
                    lines.append(current_line)
                current_line = prefix + word
        if current_line != prefix:
            lines.append(current_line)
        return lines

    def add_wrapped(text: str, prefix: str = "│     ") -> None:
        for line in wrap_text(text, prefix, BOX_WIDTH):
            lines.append(line.ljust(BOX_WIDTH) + "│")

    # Build sections from pattern
    sections = pattern.get("sections", "").split(" > ")
    sections = [s.strip() for s in sections if s.strip()]

    # Build output lines
    lines = []
    w = BOX_WIDTH - 1

    # Header with double-line box
    lines.append("╔" + "═" * w + "╗")
    lines.append(ansi_ljust(f"║  TARGET: {project} - RECOMMENDED DESIGN SYSTEM", BOX_WIDTH) + "║")
    lines.append("╚" + "═" * w + "╝")
    lines.append("┌" + "─" * w + "┐")

    # Design Dials section (only if at least one dial was set)
    if any(dials.get(k) is not None for k in ("variance", "motion", "density")):
        lines.append(section_header("DESIGN DIALS", BOX_WIDTH))
        if dials.get("variance") is not None:
            lines.append(f"│  Variance: {dials['variance']}/10 — {dials['variance_label']}".ljust(BOX_WIDTH) + "│")
        if dials.get("motion") is not None:
            lines.append(f"│  Motion:   {dials['motion']}/10 — {dials['motion_label']}".ljust(BOX_WIDTH) + "│")
        if dials.get("density") is not None:
            lines.append(f"│  Density:  {dials['density']}/10 — {dials['density_label']}".ljust(BOX_WIDTH) + "│")

    # Pattern section
    lines.append(section_header("PATTERN", BOX_WIDTH))
    add_wrapped(f"Name: {pattern.get('name', '')}", "│  ")
    if pattern.get('conversion'):
        add_wrapped(f"Conversion: {pattern.get('conversion', '')}")
    if pattern.get('cta_placement'):
        add_wrapped(f"CTA: {pattern.get('cta_placement', '')}")
    lines.append("│     Sections:".ljust(BOX_WIDTH) + "│")
    for i, section in enumerate(sections, 1):
        add_wrapped(f"{i}. {section}", "│       ")

    # Style section
    lines.append(section_header("STYLE", BOX_WIDTH))
    add_wrapped(f"Name: {style.get('name', '')}", "│  ")
    light, dark = _mode_support_labels(style, anti_patterns)
    if light or dark:
        add_wrapped(f"Mode Support: Light {light} | Dark {dark}")
    if style.get("keywords"):
        add_wrapped(f"Keywords: {style.get('keywords', '')}")
    if style.get("best_for"):
        add_wrapped(f"Best For: {style.get('best_for', '')}")
    if style.get("performance") or style.get("accessibility"):
        add_wrapped(f"Performance: {style.get('performance', '')} | Accessibility: {style.get('accessibility', '')}")

    # Colors section (extended palette with ANSI swatches)
    lines.append(section_header("COLORS", BOX_WIDTH))
    for label, key, css_var in SEMANTIC_COLOR_ENTRIES:
        hex_val = colors.get(key, "")
        if not hex_val:
            continue
        swatch = hex_to_ansi(hex_val)
        content = f"│     {swatch}{label + ':':18s} {hex_val:10s} ({css_var})"
        lines.append(ansi_ljust(content, BOX_WIDTH) + "│")
    if colors.get("notes"):
        for line in wrap_text(f"Notes: {colors.get('notes', '')}", "│     ", BOX_WIDTH):
            lines.append(line.ljust(BOX_WIDTH) + "│")

    # Typography section
    lines.append(section_header("TYPOGRAPHY", BOX_WIDTH))
    add_wrapped(f"{typography.get('heading', '')} / {typography.get('body', '')}", "│  ")
    if typography.get("mood"):
        add_wrapped(f"Mood: {typography.get('mood', '')}")
    if typography.get("best_for"):
        add_wrapped(f"Best For: {typography.get('best_for', '')}")
    if typography.get("google_fonts_url"):
        add_wrapped(f"Google Fonts: {typography.get('google_fonts_url', '')}")
    if typography.get("css_import"):
        lines.append(f"│     CSS Import: {typography.get('css_import', '')[:67]}...".ljust(BOX_WIDTH) + "│")

    # Key Effects section
    if effects:
        lines.append(section_header("KEY EFFECTS", BOX_WIDTH))
        for line in wrap_text(effects, "│     ", BOX_WIDTH):
            lines.append(line.ljust(BOX_WIDTH) + "│")

    # Motion section (GSAP skeleton, only if --motion dial was set)
    if motion_snippet:
        lines.append(section_header("MOTION", BOX_WIDTH))
        add_wrapped(f"{motion_snippet.get('Category', '')} ({motion_snippet.get('Intensity Tier', '')})", "│  ")
        add_wrapped(f"Trigger: {motion_snippet.get('Trigger', '')} | Duration: {motion_snippet.get('Duration', '')} | Easing: {motion_snippet.get('Easing', '')}")
        for line in wrap_text(f"GSAP: {motion_snippet.get('GSAP Snippet', '')}", "│     ", BOX_WIDTH):
            lines.append(line.ljust(BOX_WIDTH) + "│")
        if motion_snippet.get("Framework Notes"):
            for line in wrap_text(f"Framework: {motion_snippet.get('Framework Notes', '')}", "│     ", BOX_WIDTH):
                lines.append(line.ljust(BOX_WIDTH) + "│")

    # Anti-patterns section
    if anti_patterns:
        lines.append(section_header("AVOID", BOX_WIDTH))
        for line in wrap_text(anti_patterns, "│     ", BOX_WIDTH):
            lines.append(line.ljust(BOX_WIDTH) + "│")

    # Pre-Delivery Checklist section
    lines.append(section_header("PRE-DELIVERY CHECKLIST", BOX_WIDTH))
    checklist_items = [
        "[ ] No emojis as icons (use SVG: Heroicons/Lucide)",
        "[ ] cursor-pointer on all clickable elements",
        "[ ] Hover states with smooth transitions (150-300ms)",
        "[ ] Light mode: text contrast 4.5:1 minimum",
        "[ ] Focus states visible for keyboard nav",
        "[ ] prefers-reduced-motion respected",
        "[ ] Responsive: 375px, 768px, 1024px, 1440px"
    ]
    for item in checklist_items:
        lines.append(f"│     {item}".ljust(BOX_WIDTH) + "│")

    lines.append("└" + "─" * w + "┘")

    return "\n".join(lines)


def format_markdown(design_system: dict) -> str:
    """Format design system as markdown."""
    project = design_system.get("project_name", "PROJECT")
    pattern = design_system.get("pattern", {})
    style = design_system.get("style", {})
    colors = design_system.get("colors", {})
    typography = design_system.get("typography", {})
    effects = design_system.get("key_effects", "")
    anti_patterns = design_system.get("anti_patterns", "")
    dials = design_system.get("dials", {})
    motion_snippet = design_system.get("motion_snippet", {})

    lines = []
    lines.append(f"## Design System: {project}")
    lines.append("")

    # Design Dials section (only if at least one dial was set)
    if any(dials.get(k) is not None for k in ("variance", "motion", "density")):
        lines.append("### Design Dials")
        if dials.get("variance") is not None:
            lines.append(f"- **Variance:** {dials['variance']}/10 — {dials['variance_label']}")
        if dials.get("motion") is not None:
            lines.append(f"- **Motion:** {dials['motion']}/10 — {dials['motion_label']}")
        if dials.get("density") is not None:
            lines.append(f"- **Density:** {dials['density']}/10 — {dials['density_label']}")
        lines.append("")

    # Pattern section
    lines.append("### Pattern")
    lines.append(f"- **Name:** {pattern.get('name', '')}")
    if pattern.get('conversion'):
        lines.append(f"- **Conversion Focus:** {pattern.get('conversion', '')}")
    if pattern.get('cta_placement'):
        lines.append(f"- **CTA Placement:** {pattern.get('cta_placement', '')}")
    if pattern.get('color_strategy'):
        lines.append(f"- **Color Strategy:** {pattern.get('color_strategy', '')}")
    lines.append(f"- **Sections:** {pattern.get('sections', '')}")
    lines.append("")

    # Style section
    lines.append("### Style")
    lines.append(f"- **Name:** {style.get('name', '')}")
    light, dark = _mode_support_labels(style, anti_patterns)
    if light or dark:
        lines.append(f"- **Mode Support:** Light {light} | Dark {dark}")
    if style.get('keywords'):
        lines.append(f"- **Keywords:** {style.get('keywords', '')}")
    if style.get('best_for'):
        lines.append(f"- **Best For:** {style.get('best_for', '')}")
    if style.get('performance') or style.get('accessibility'):
        lines.append(f"- **Performance:** {style.get('performance', '')} | **Accessibility:** {style.get('accessibility', '')}")
    lines.append("")

    # Colors section (extended palette)
    lines.append("### Colors")
    lines.append("| Role | Hex | CSS Variable |")
    lines.append("|------|-----|--------------|")
    for label, key, css_var in SEMANTIC_COLOR_ENTRIES:
        hex_val = colors.get(key, "")
        if hex_val:
            lines.append(f"| {label} | `{hex_val}` | `{css_var}` |")
    if colors.get("notes"):
        lines.append(f"\n*Notes: {colors.get('notes', '')}*")
    lines.append("")

    # Typography section
    lines.append("### Typography")
    lines.append(f"- **Heading:** {typography.get('heading', '')}")
    lines.append(f"- **Body:** {typography.get('body', '')}")
    if typography.get("mood"):
        lines.append(f"- **Mood:** {typography.get('mood', '')}")
    if typography.get("best_for"):
        lines.append(f"- **Best For:** {typography.get('best_for', '')}")
    if typography.get("google_fonts_url"):
        lines.append(f"- **Google Fonts:** {typography.get('google_fonts_url', '')}")
    if typography.get("css_import"):
        lines.append(f"- **CSS Import:**")
        lines.append(f"```css")
        lines.append(f"{typography.get('css_import', '')}")
        lines.append(f"```")
    lines.append("")

    # Key Effects section
    if effects:
        lines.append("### Key Effects")
        lines.append(f"{effects}")
        lines.append("")

    # Motion section (GSAP skeleton, only if --motion dial was set)
    if motion_snippet:
        lines.append("### Motion")
        lines.append(f"**{motion_snippet.get('Category', '')}** ({motion_snippet.get('Intensity Tier', '')}) — Trigger: {motion_snippet.get('Trigger', '')} | Duration: {motion_snippet.get('Duration', '')} | Easing: `{motion_snippet.get('Easing', '')}`")
        lines.append("```js")
        lines.append(motion_snippet.get("GSAP Snippet", ""))
        lines.append("```")
        if motion_snippet.get("Framework Notes"):
            lines.append(f"*Framework notes: {motion_snippet.get('Framework Notes', '')}*")
        motion_do = motion_snippet.get("Do", "")
        motion_dont = motion_snippet.get("Don't", "")
        if motion_do:
            lines.append(f"- ✅ {motion_do}")
        if motion_dont:
            lines.append(f"- ❌ {motion_dont}")
        lines.append("")

    # Anti-patterns section
    if anti_patterns:
        lines.append("### Avoid (Anti-patterns)")
        newline_bullet = '\n- '
        lines.append(f"- {anti_patterns.replace(' + ', newline_bullet)}")
        lines.append("")

    # Pre-Delivery Checklist section
    lines.append("### Pre-Delivery Checklist")
    lines.append("- [ ] No emojis as icons (use SVG: Heroicons/Lucide)")
    lines.append("- [ ] cursor-pointer on all clickable elements")
    lines.append("- [ ] Hover states with smooth transitions (150-300ms)")
    lines.append("- [ ] Light mode: text contrast 4.5:1 minimum")
    lines.append("- [ ] Focus states visible for keyboard nav")
    lines.append("- [ ] prefers-reduced-motion respected")
    lines.append("- [ ] Responsive: 375px, 768px, 1024px, 1440px")
    lines.append("")

    return "\n".join(lines)


# ============ MAIN ENTRY POINT ============
def generate_design_system(query: str, project_name: str = None, output_format: str = "ascii",
                           persist: bool = False, page: str = None, output_dir: str = None,
                           variance: int = None, motion: int = None, density: int = None,
                           force: bool = False) -> dict:
    """
    Main entry point for design system generation.

    Args:
        query: Search query (e.g., "SaaS dashboard", "e-commerce luxury")
        project_name: Optional project name for output header
        output_format: "ascii" (default) or "markdown"
        persist: If True, save design system to design-system/ folder
        page: Optional page name for page-specific override file
        output_dir: Optional output directory (defaults to current working directory)
        variance: Optional 1-10 DESIGN_VARIANCE dial (1=centered/minimal, 10=bold/asymmetric)
        motion: Optional 1-10 MOTION_INTENSITY dial, pulls a matching GSAP snippet from motion.csv
        density: Optional 1-10 VISUAL_DENSITY dial, overrides the spacing scale (1=spacious, 10=dense)
        force: If True, overwrite an existing MASTER.md; otherwise persistence
               is skipped (with a status message) when one already exists

    Returns:
        dict with keys: "text" (formatted design system string), "design_system"
        (raw dict, useful for --json callers), and "persistence" (result of
        persist_design_system(), or None if persist=False)
    """
    generator = DesignSystemGenerator()
    design_system = generator.generate(query, project_name, variance=variance, motion=motion, density=density)

    persistence_result = None
    if persist:
        persistence_result = persist_design_system(design_system, page, output_dir, query, force=force)

    text = format_markdown(design_system) if output_format == "markdown" else format_ascii_box(design_system)

    return {
        "text": text,
        "design_system": design_system,
        "persistence": persistence_result,
    }


# ============ PERSISTENCE FUNCTIONS ============
def safe_slug(name, fallback: str = "default") -> str:
    """Slugify a name into a single safe path segment.

    Only [a-z0-9_-] survives; every other character (including '/', '\\' and
    '.') collapses into '-'. This makes path traversal via project/page names
    (e.g. "../../etc") impossible — the slug can never leave its parent dir.
    """
    slug = re.sub(r'[^a-z0-9_-]+', '-', str(name).lower()).strip('-')
    return slug or fallback


def _write_persisted_file(path: Path, content: str, force: bool) -> None:
    """Write fully to a temp file, then publish atomically."""
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(
                mode='w', encoding='utf-8', dir=path.parent,
                prefix=f".{path.name}.", suffix=".tmp", delete=False) as handle:
            temp_name = handle.name
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        if force:
            os.replace(temp_name, path)
            temp_name = None
        else:
            # A same-filesystem hard link atomically publishes only if the
            # destination is absent. Losing writers get FileExistsError.
            os.link(temp_name, path)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def persist_design_system(design_system: dict, page: str = None, output_dir: str = None,
                           page_query: str = None, force: bool = False) -> dict:
    """
    Persist design system to design-system/<project>/ folder using Master + Overrides pattern.

    Args:
        design_system: The generated design system dictionary
        page: Optional page name for page-specific override file
        output_dir: Optional output directory (defaults to current working directory)
        page_query: Optional query string for intelligent page override generation
        force: If True, overwrite an existing MASTER.md. If False (default) and
               MASTER.md already exists, persistence is skipped so prior design
               decisions aren't silently discarded.

    Returns:
        dict with created file paths and status. status is "skipped_exists" if
        MASTER.md already existed and force was not set.
    """
    base_dir = Path(output_dir) if output_dir else Path.cwd()

    # Use project name for project-specific folder. Coalesce falsy values
    # (missing key, explicit None, or "") so the .lower() below can't crash.
    project_name = design_system.get("project_name") or "default"
    project_slug = safe_slug(project_name)

    design_system_dir = base_dir / "design-system" / project_slug
    pages_dir = design_system_dir / "pages"

    master_file = design_system_dir / "MASTER.md"

    created_files = []

    # Create directories
    design_system_dir.mkdir(parents=True, exist_ok=True)
    pages_dir.mkdir(parents=True, exist_ok=True)

    # Exclusive creation makes the default no-overwrite contract safe when
    # multiple agents persist the same project concurrently.
    master_content = format_master_md(design_system)
    try:
        _write_persisted_file(master_file, master_content, force)
        created_files.append(str(master_file))
    except FileExistsError:
        if not page:
            return {
                "status": "skipped_exists",
                "design_system_dir": str(design_system_dir),
                "master_file": str(master_file),
                "created_files": [],
                "message": (
                    f"{master_file} already exists and was not modified. "
                    "Read it first to check for prior design decisions, then "
                    "re-run with force=True / --force to overwrite."
                ),
            }

    # If page is specified, create page override file with intelligent content
    if page:
        page_file = pages_dir / f"{safe_slug(page, 'page')}.md"
        page_content = format_page_override_md(design_system, page, page_query)
        try:
            _write_persisted_file(page_file, page_content, force)
            created_files.append(str(page_file))
        except FileExistsError:
            if not created_files:
                return {
                    "status": "skipped_exists",
                    "design_system_dir": str(design_system_dir),
                    "master_file": str(master_file),
                    "created_files": [],
                    "message": f"{page_file} already exists and was not modified.",
                }

    return {
        "status": "success",
        "design_system_dir": str(design_system_dir),
        "master_file": str(master_file),
        "created_files": created_files
    }


def format_master_md(design_system: dict) -> str:
    """Format design system as MASTER.md with hierarchical override logic."""
    project = design_system.get("project_name", "PROJECT")
    pattern = design_system.get("pattern", {})
    style = design_system.get("style", {})
    colors = design_system.get("colors", {})
    typography = design_system.get("typography", {})
    effects = design_system.get("key_effects", "")
    anti_patterns = design_system.get("anti_patterns", "")
    dials = design_system.get("dials", {})
    motion_snippet = design_system.get("motion_snippet", {})
    spacing_scale = design_system.get("spacing_scale")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = []

    # Logic header
    lines.append("# Design System Master File")
    lines.append("")
    lines.append("> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.")
    lines.append("> If that file exists, its rules **override** this Master file.")
    lines.append("> If not, strictly follow the rules below.")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(f"**Project:** {project}")
    lines.append(f"**Generated:** {timestamp}")
    lines.append(f"**Category:** {design_system.get('category', 'General')}")
    if any(dials.get(k) is not None for k in ("variance", "motion", "density")):
        dial_parts = []
        if dials.get("variance") is not None:
            dial_parts.append(f"Variance {dials['variance']}/10 ({dials['variance_label']})")
        if dials.get("motion") is not None:
            dial_parts.append(f"Motion {dials['motion']}/10 ({dials['motion_label']})")
        if dials.get("density") is not None:
            dial_parts.append(f"Density {dials['density']}/10 ({dials['density_label']})")
        lines.append(f"**Design Dials:** {' | '.join(dial_parts)}")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Global Rules section
    lines.append("## Global Rules")
    lines.append("")
    
    # Color Palette
    lines.append("### Color Palette")
    lines.append("")
    lines.append("| Role | Hex | CSS Variable |")
    lines.append("|------|-----|--------------|")
    for label, key, css_var in SEMANTIC_COLOR_ENTRIES:
        hex_val = colors.get(key, "")
        if hex_val:
            lines.append(f"| {label} | `{hex_val}` | `{css_var}` |")
    lines.append("")
    if colors.get("notes"):
        lines.append(f"**Color Notes:** {colors.get('notes', '')}")
        lines.append("")
    
    # Typography
    lines.append("### Typography")
    lines.append("")
    lines.append(f"- **Heading Font:** {typography.get('heading', 'Inter')}")
    lines.append(f"- **Body Font:** {typography.get('body', 'Inter')}")
    if typography.get("mood"):
        lines.append(f"- **Mood:** {typography.get('mood', '')}")
    if typography.get("google_fonts_url"):
        lines.append(f"- **Google Fonts:** [{typography.get('heading', '')} + {typography.get('body', '')}]({typography.get('google_fonts_url', '')})")
    lines.append("")
    if typography.get("css_import"):
        lines.append("**CSS Import:**")
        lines.append("```css")
        lines.append(typography.get("css_import", ""))
        lines.append("```")
        lines.append("")
    
    # Spacing Variables (overridden by the VISUAL_DENSITY dial when set)
    default_spacing = DIAL_TIERS["density"][1][2]["spacing"]  # mid-tier = the historical defaults
    scale = spacing_scale or default_spacing
    spacing_usage = {
        "xs": "Tight gaps", "sm": "Icon gaps, inline spacing", "md": "Standard padding",
        "lg": "Section padding", "xl": "Large gaps", "2xl": "Section margins", "3xl": "Hero padding",
    }
    lines.append("### Spacing Variables")
    lines.append("")
    if spacing_scale:
        lines.append(f"*Density: {dials.get('density')}/10 — {dials.get('density_label')}*")
        lines.append("")
    lines.append("| Token | Value | Usage |")
    lines.append("|-------|-------|-------|")
    for token in ("xs", "sm", "md", "lg", "xl", "2xl", "3xl"):
        px_value = scale[token]
        rem_value = f"{int(px_value.rstrip('px')) / 16:g}rem"
        lines.append(f"| `--space-{token}` | `{px_value}` / `{rem_value}` | {spacing_usage[token]} |")
    lines.append("")
    
    # Shadow Depths
    lines.append("### Shadow Depths")
    lines.append("")
    lines.append("| Level | Value | Usage |")
    lines.append("|-------|-------|-------|")
    lines.append("| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |")
    lines.append("| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |")
    lines.append("| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |")
    lines.append("| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |")
    lines.append("")
    
    # Component Specs section
    lines.append("---")
    lines.append("")
    lines.append("## Component Specs")
    lines.append("")
    
    # Buttons
    lines.append("### Buttons")
    lines.append("")
    lines.append("```css")
    lines.append("/* Primary Button */")
    lines.append(".btn-primary {")
    lines.append(f"  background: {colors.get('cta', '#F97316')};")
    lines.append(f"  color: {colors.get('on_cta') or 'white'};")
    lines.append("  padding: 12px 24px;")
    lines.append("  border-radius: 8px;")
    lines.append("  font-weight: 600;")
    lines.append("  transition: all 200ms ease;")
    lines.append("  cursor: pointer;")
    lines.append("}")
    lines.append("")
    lines.append(".btn-primary:hover {")
    lines.append("  opacity: 0.9;")
    lines.append("  transform: translateY(-1px);")
    lines.append("}")
    lines.append("")
    lines.append("/* Secondary Button */")
    lines.append(".btn-secondary {")
    lines.append(f"  background: transparent;")
    lines.append(f"  color: {_button_outline_text_color(colors)};")
    lines.append(f"  border: 2px solid {colors.get('primary', '#2563EB')};")
    lines.append("  padding: 12px 24px;")
    lines.append("  border-radius: 8px;")
    lines.append("  font-weight: 600;")
    lines.append("  transition: all 200ms ease;")
    lines.append("  cursor: pointer;")
    lines.append("}")
    lines.append("```")
    lines.append("")
    
    # Cards
    lines.append("### Cards")
    lines.append("")
    lines.append("```css")
    lines.append(".card {")
    lines.append(f"  background: {colors.get('background', '#FFFFFF')};")
    lines.append("  border-radius: 12px;")
    lines.append("  padding: 24px;")
    lines.append("  box-shadow: var(--shadow-md);")
    lines.append("  transition: all 200ms ease;")
    lines.append("  cursor: pointer;")
    lines.append("}")
    lines.append("")
    lines.append(".card:hover {")
    lines.append("  box-shadow: var(--shadow-lg);")
    lines.append("  transform: translateY(-2px);")
    lines.append("}")
    lines.append("```")
    lines.append("")
    
    # Inputs
    lines.append("### Inputs")
    lines.append("")
    lines.append("```css")
    lines.append(".input {")
    lines.append("  padding: 12px 16px;")
    lines.append("  border: 1px solid #E2E8F0;")
    lines.append("  border-radius: 8px;")
    lines.append("  font-size: 16px;")
    lines.append("  transition: border-color 200ms ease;")
    lines.append("}")
    lines.append("")
    lines.append(".input:focus {")
    lines.append(f"  border-color: {colors.get('primary', '#2563EB')};")
    lines.append("  outline: none;")
    lines.append(f"  box-shadow: 0 0 0 3px {colors.get('primary', '#2563EB')}20;")
    lines.append("}")
    lines.append("```")
    lines.append("")
    
    # Modals
    lines.append("### Modals")
    lines.append("")
    lines.append("```css")
    lines.append(".modal-overlay {")
    lines.append("  background: rgba(0, 0, 0, 0.5);")
    lines.append("  backdrop-filter: blur(4px);")
    lines.append("}")
    lines.append("")
    lines.append(".modal {")
    lines.append("  background: white;")
    lines.append("  border-radius: 16px;")
    lines.append("  padding: 32px;")
    lines.append("  box-shadow: var(--shadow-xl);")
    lines.append("  max-width: 500px;")
    lines.append("  width: 90%;")
    lines.append("}")
    lines.append("```")
    lines.append("")
    
    # Style section
    lines.append("---")
    lines.append("")
    lines.append("## Style Guidelines")
    lines.append("")
    lines.append(f"**Style:** {style.get('name', 'Minimalism')}")
    lines.append("")
    if style.get("keywords"):
        lines.append(f"**Keywords:** {style.get('keywords', '')}")
        lines.append("")
    if style.get("best_for"):
        lines.append(f"**Best For:** {style.get('best_for', '')}")
        lines.append("")
    if effects:
        lines.append(f"**Key Effects:** {effects}")
        lines.append("")
    
    # Layout Pattern
    lines.append("### Page Pattern")
    lines.append("")
    lines.append(f"**Pattern Name:** {pattern.get('name', '')}")
    lines.append("")
    if pattern.get('conversion'):
        lines.append(f"- **Conversion Strategy:** {pattern.get('conversion', '')}")
    if pattern.get('cta_placement'):
        lines.append(f"- **CTA Placement:** {pattern.get('cta_placement', '')}")
    lines.append(f"- **Section Order:** {pattern.get('sections', '')}")
    lines.append("")

    # Motion section (GSAP skeleton, only if --motion dial was set)
    if motion_snippet:
        lines.append("---")
        lines.append("")
        lines.append("## Motion")
        lines.append("")
        lines.append(f"**{motion_snippet.get('Category', '')}** ({motion_snippet.get('Intensity Tier', '')}) — Trigger: {motion_snippet.get('Trigger', '')} | Duration: {motion_snippet.get('Duration', '')} | Easing: `{motion_snippet.get('Easing', '')}`")
        lines.append("")
        lines.append("```js")
        lines.append(motion_snippet.get("GSAP Snippet", ""))
        lines.append("```")
        lines.append("")
        if motion_snippet.get("Framework Notes"):
            lines.append(f"**Framework notes:** {motion_snippet.get('Framework Notes', '')}")
            lines.append("")
        motion_do = motion_snippet.get("Do", "")
        motion_dont = motion_snippet.get("Don't", "")
        if motion_do:
            lines.append(f"- ✅ {motion_do}")
        if motion_dont:
            lines.append(f"- ❌ {motion_dont}")
        if motion_snippet.get("Performance Notes"):
            lines.append(f"- ⚡ {motion_snippet.get('Performance Notes', '')}")
        lines.append("")

    # Anti-Patterns section
    lines.append("---")
    lines.append("")
    lines.append("## Anti-Patterns (Do NOT Use)")
    lines.append("")
    if anti_patterns:
        anti_list = [a.strip() for a in anti_patterns.split("+")]
        for anti in anti_list:
            if anti:
                lines.append(f"- ❌ {anti}")
    lines.append("")
    lines.append("### Additional Forbidden Patterns")
    lines.append("")
    lines.append("- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)")
    lines.append("- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer")
    lines.append("- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout")
    lines.append("- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio")
    lines.append("- ❌ **Instant state changes** — Always use transitions (150-300ms)")
    lines.append("- ❌ **Invisible focus states** — Focus states must be visible for a11y")
    lines.append("")
    
    # Pre-Delivery Checklist
    lines.append("---")
    lines.append("")
    lines.append("## Pre-Delivery Checklist")
    lines.append("")
    lines.append("Before delivering any UI code, verify:")
    lines.append("")
    lines.append("- [ ] No emojis used as icons (use SVG instead)")
    lines.append("- [ ] All icons from consistent icon set (Heroicons/Lucide)")
    lines.append("- [ ] `cursor-pointer` on all clickable elements")
    lines.append("- [ ] Hover states with smooth transitions (150-300ms)")
    lines.append("- [ ] Light mode: text contrast 4.5:1 minimum")
    lines.append("- [ ] Focus states visible for keyboard navigation")
    lines.append("- [ ] `prefers-reduced-motion` respected")
    lines.append("- [ ] Responsive: 375px, 768px, 1024px, 1440px")
    lines.append("- [ ] No content hidden behind fixed navbars")
    lines.append("- [ ] No horizontal scroll on mobile")
    lines.append("")
    
    return "\n".join(lines)


def format_page_override_md(design_system: dict, page_name: str, page_query: str = None) -> str:
    """Format a page-specific override file with intelligent AI-generated content."""
    project = design_system.get("project_name", "PROJECT")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    page_title = page_name.replace("-", " ").replace("_", " ").title()
    
    # Detect page type and generate intelligent overrides
    page_overrides = _generate_intelligent_overrides(page_name, page_query, design_system)
    
    lines = []
    
    lines.append(f"# {page_title} Page Overrides")
    lines.append("")
    lines.append(f"> **PROJECT:** {project}")
    lines.append(f"> **Generated:** {timestamp}")
    lines.append(f"> **Page Type:** {page_overrides.get('page_type', 'General')}")
    lines.append("")
    lines.append("> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).")
    lines.append("> Only deviations from the Master are documented here. For all other rules, refer to the Master.")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    # Page-specific rules with actual content
    lines.append("## Page-Specific Rules")
    lines.append("")
    
    # Layout Overrides
    lines.append("### Layout Overrides")
    lines.append("")
    layout = page_overrides.get("layout", {})
    if layout:
        for key, value in layout.items():
            lines.append(f"- **{key}:** {value}")
    else:
        lines.append("- No overrides — use Master layout")
    lines.append("")
    
    # Spacing Overrides
    lines.append("### Spacing Overrides")
    lines.append("")
    spacing = page_overrides.get("spacing", {})
    if spacing:
        for key, value in spacing.items():
            lines.append(f"- **{key}:** {value}")
    else:
        lines.append("- No overrides — use Master spacing")
    lines.append("")
    
    # Typography Overrides
    lines.append("### Typography Overrides")
    lines.append("")
    typography = page_overrides.get("typography", {})
    if typography:
        for key, value in typography.items():
            lines.append(f"- **{key}:** {value}")
    else:
        lines.append("- No overrides — use Master typography")
    lines.append("")
    
    # Color Overrides
    lines.append("### Color Overrides")
    lines.append("")
    colors = page_overrides.get("colors", {})
    if colors:
        for key, value in colors.items():
            lines.append(f"- **{key}:** {value}")
    else:
        lines.append("- No overrides — use Master colors")
    lines.append("")
    
    # Component Overrides
    lines.append("### Component Overrides")
    lines.append("")
    components = page_overrides.get("components", [])
    if components:
        for comp in components:
            lines.append(f"- {comp}")
    else:
        lines.append("- No overrides — use Master component specs")
    lines.append("")
    
    # Page-Specific Components
    lines.append("---")
    lines.append("")
    lines.append("## Page-Specific Components")
    lines.append("")
    unique_components = page_overrides.get("unique_components", [])
    if unique_components:
        for comp in unique_components:
            lines.append(f"- {comp}")
    else:
        lines.append("- No unique components for this page")
    lines.append("")
    
    # Recommendations
    lines.append("---")
    lines.append("")
    lines.append("## Recommendations")
    lines.append("")
    recommendations = page_overrides.get("recommendations", [])
    if recommendations:
        for rec in recommendations:
            lines.append(f"- {rec}")
    lines.append("")
    
    return "\n".join(lines)


def _generate_intelligent_overrides(page_name: str, page_query: str, design_system: dict) -> dict:
    """
    Generate intelligent overrides based on page type using layered search.
    
    Uses the existing search infrastructure to find relevant style, UX, and layout
    data instead of hardcoded page types.
    """
    from core import search
    
    page_lower = page_name.lower()
    query_lower = (page_query or "").lower()
    combined_context = f"{page_lower} {query_lower}"
    
    # Search across multiple domains for page-specific guidance
    style_search = search(combined_context, "style", max_results=1)
    ux_search = search(combined_context, "ux", max_results=3)
    landing_search = search(combined_context, "landing", max_results=1)
    
    # Extract results from search response
    style_results = style_search.get("results", [])
    ux_results = ux_search.get("results", [])
    landing_results = landing_search.get("results", [])
    
    # Detect page type from search results or context
    page_type = _detect_page_type(combined_context, style_results)
    
    # Build overrides from search results
    layout = {}
    spacing = {}
    typography = {}
    colors = {}
    components = []
    unique_components = []
    recommendations = []
    
    # Extract style-based overrides
    if style_results:
        style = style_results[0]
        style_name = style.get("Style Category", "")
        keywords = style.get("Keywords", "")
        best_for = style.get("Best For", "")
        effects = style.get("Effects & Animation", "")
        
        # Infer layout from style keywords
        if any(kw in keywords.lower() for kw in ["data", "dense", "dashboard", "grid"]):
            layout["Max Width"] = "1400px or full-width"
            layout["Grid"] = "12-column grid for data flexibility"
            spacing["Content Density"] = "High — optimize for information display"
        elif any(kw in keywords.lower() for kw in ["minimal", "simple", "clean", "single"]):
            layout["Max Width"] = "800px (narrow, focused)"
            layout["Layout"] = "Single column, centered"
            spacing["Content Density"] = "Low — focus on clarity"
        else:
            layout["Max Width"] = "1200px (standard)"
            layout["Layout"] = "Full-width sections, centered content"
        
        if effects:
            recommendations.append(f"Effects: {effects}")
    
    # Extract UX guidelines as recommendations
    for ux in ux_results:
        category = ux.get("Category", "")
        do_text = ux.get("Do", "")
        dont_text = ux.get("Don't", "")
        if do_text:
            recommendations.append(f"{category}: {do_text}")
        if dont_text:
            components.append(f"Avoid: {dont_text}")
    
    # Extract landing pattern info for section structure
    if landing_results:
        landing = landing_results[0]
        sections = landing.get("Section Order", "")
        cta_placement = landing.get("Primary CTA Placement", "")
        color_strategy = landing.get("Color Strategy", "")
        
        if sections:
            layout["Sections"] = sections
        if cta_placement:
            recommendations.append(f"CTA Placement: {cta_placement}")
        if color_strategy:
            colors["Strategy"] = color_strategy
    
    # Add page-type specific defaults if no search results
    if not layout:
        layout["Max Width"] = "1200px"
        layout["Layout"] = "Responsive grid"
    
    if not recommendations:
        recommendations = [
            "Refer to MASTER.md for all design rules",
            "Add specific overrides as needed for this page"
        ]
    
    return {
        "page_type": page_type,
        "layout": layout,
        "spacing": spacing,
        "typography": typography,
        "colors": colors,
        "components": components,
        "unique_components": unique_components,
        "recommendations": recommendations
    }


def _detect_page_type(context: str, style_results: list) -> str:
    """Detect page type from context and search results."""
    context_lower = context.lower()
    
    # Check for common page type patterns
    page_patterns = [
        (["dashboard", "admin", "analytics", "data", "metrics", "stats", "monitor", "overview"], "Dashboard / Data View"),
        (["checkout", "payment", "cart", "purchase", "order", "billing"], "Checkout / Payment"),
        (["settings", "profile", "account", "preferences", "config"], "Settings / Profile"),
        (["landing", "marketing", "homepage", "hero", "home", "promo"], "Landing / Marketing"),
        (["login", "signin", "signup", "register", "auth", "password"], "Authentication"),
        (["pricing", "plans", "subscription", "tiers", "packages"], "Pricing / Plans"),
        (["blog", "article", "post", "news", "content", "story"], "Blog / Article"),
        (["product", "item", "detail", "pdp", "shop", "store"], "Product Detail"),
        (["search", "results", "browse", "filter", "catalog", "list"], "Search Results"),
        (["empty", "404", "error", "not found", "zero"], "Empty State"),
    ]
    
    for keywords, page_type in page_patterns:
        if any(kw in context_lower for kw in keywords):
            return page_type
    
    # Fallback: try to infer from style results
    if style_results:
        style_name = style_results[0].get("Style Category", "").lower()
        best_for = style_results[0].get("Best For", "").lower()
        
        if "dashboard" in best_for or "data" in best_for:
            return "Dashboard / Data View"
        elif "landing" in best_for or "marketing" in best_for:
            return "Landing / Marketing"
    
    return "General"


# ============ CLI SUPPORT ============
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate Design System")
    parser.add_argument("query", help="Search query (e.g., 'SaaS dashboard')")
    parser.add_argument("--project-name", "-p", type=str, default=None, help="Project name")
    parser.add_argument("--format", "-f", choices=["ascii", "markdown"], default="ascii", help="Output format")

    args = parser.parse_args()

    result = generate_design_system(args.query, args.project_name, args.format)
    print(result["text"])
