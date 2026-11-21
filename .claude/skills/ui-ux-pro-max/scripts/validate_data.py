#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Data integrity guardrail for ui-ux-pro-max. Stdlib-only, no pytest dependency,
so it can run as a standalone pre-publish/CI check:

    python validate_data.py

Checks, per configured domain/stack CSV:
  - file exists
  - header row contains every column referenced in search_cols/output_cols
  - no duplicate primary-key values (first column) within a file
  - any "Decision_Rules"-style JSON column parses as JSON

Exits 0 with no output on success; exits 1 and prints every problem found
on failure (fail-fast is the wrong call here -- a data change can break
several files at once, so we want the full list in one run).
"""

import csv
import hashlib
import json
import math
import re
import statistics
import sys
from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, urlsplit

from core import (CSV_CONFIG, STACK_CONFIG, STACK_CURRENT_APPLICABILITY,
                  _STACK_COLS, DATA_DIR)
from reasoning_contract import parse_decision_rules

# REASONING_FILE lives in design_system.py, not core.py -- redeclared here to
# avoid a circular import (design_system.py imports core.py).
REASONING_FILE = "ui-reasoning.csv"
STYLE_STATUSES = {"active", "supplemental", "deprecated"}
STACK_STATUSES = STYLE_STATUSES | {"unverified"}
HEX_COLOR = re.compile(r"#[0-9A-Fa-f]{6}")
STYLE_ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
WCAG_CONFORMANCE = re.compile(
    r"\bWCAG\s+A{2,3}\+?\b|\bWCAG\b.{0,40}\b(?:compliant|compliance)\b",
    re.I,
)
WCAG_GRADE = re.compile(r"\bWCAG\s+A{1,3}\b", re.I)
CHART_TEXT_FALLBACK = re.compile(r"table|list|summary|text")
CHART_NON_COLOR_GUIDANCE = re.compile(
    r"color alone|hue alone|alone is insufficient|only distinction|only carriers?|"
    r"supplementary|pattern|symbol|outline|direct (?:series |group )?label|"
    r"marker shape|label every"
)
CSS_IMPORT = re.compile(
    r"\s*@import\s+url\((['\"])(https://fonts\.googleapis\.com/css2\?[^'\"]+)\1\);\s*",
    re.I,
)
FONT_WEIGHT = re.compile(r"(?<!\d)(?:[1-9]00)(?!\d)")
ICON_IMPORT = re.compile(
    r"import\s*\{\s*[A-Z][A-Za-z0-9]*(?:\s*,\s*[A-Z][A-Za-z0-9]*)*\s*\}"
    r"\s*from\s*['\"](?:@phosphor-icons/react|phosphor-react-native|"
    r"@heroicons/react/24/(?:outline|solid))['\"]"
)
ICON_USAGE_REQUIREMENTS = (
    r"aria-hidden", r"text alternative", r"accessible name",
    r"aria-(?:pressed|expanded)",
)
LANDING_QUANTIFIED_CLAIM = re.compile(
    r"\b\d+(?:\.\d+)?x\b|"
    r"\b(?:increases?|reduces?)\s+(?:engagement|conversion|returns?)\b",
    re.I,
)
CHART_RISKS = {"risk:low", "risk:conditional", "risk:high"}
ICON_ROLES = {"decorative", "meaningful", "interactive", "guideline"}
ICON_CONTEXTS = {"decorative", "meaningful", "interactive"}
COLOR_CONTRAST_PAIRS = {
    "On Primary": ("Primary", "normal-text", 4.5),
    "On Secondary": ("Secondary", "normal-text", 4.5),
    "On Accent": ("Accent", "normal-text", 4.5),
    "Foreground": ("Background", "normal-text", 4.5),
    "Card Foreground": ("Card", "normal-text", 4.5),
    "Muted Foreground": ("Muted", "normal-text", 4.5),
    "On Destructive": ("Destructive", "normal-text", 4.5),
    "Ring": ("Background", "non-text-focus-indicator", 3.0),
}
PROVENANCE_KINDS = {"reasoning", "style", "dataset-contract", "catalog-snapshot"}
PROVENANCE_STATUSES = {"active", "supplemental", "deprecated"}
PROVENANCE_SLAS = {"manual-verified", "needs-review"}
PROVENANCE_SOURCE_TYPES = {"official", "derived"}
PROVENANCE_APPLIES_TO = {
    "search", "design-guidance", "design-system", "gallery", "style-search",
}
CORE_PROVENANCE_FILES = {
    "colors.csv", "charts.csv", "ux-guidelines.csv", "landing.csv",
    "typography.csv", "icons.csv", "motion.csv", "app-interface.csv",
    "react-performance.csv", "stacks/html-tailwind.csv",
}
CATALOG_PROVENANCE_FILES = {"google-fonts.csv", "phosphor-icons-upstream.json"}
CATALOG_PROVENANCE_IDS = {
    "google-fonts-catalog-2026-08-13", "phosphor-icons-catalog-2.1.1",
}
FONT_LICENSES = {"OFL", "APACHE2", "UFL"}
GOOGLE_FONTS_REVISION = re.compile(r"[0-9a-f]{40}")
PHOSPHOR_WEIGHTS = {"thin", "light", "regular", "bold", "fill", "duotone"}
OFFICIAL_SOURCE_HOSTS = {
    "carbondesignsystem.com", "developer.android.com", "developer.apple.com",
    "developers.google.com", "fluent2.microsoft.design", "github.com",
    "greensock.com", "gsap.com", "m3.material.io", "opensource.adobe.com",
    "react.dev", "s2.spectrum.adobe.com", "shopify.dev",
    "design-system.service.gov.uk", "tailwindcss.com", "www.w3.org",
}
STACK_OFFICIAL_HOSTS = {
    "react": {"react.dev"},
    "nextjs": {"nextjs.org"},
    "vue": {"vuejs.org", "pinia.vuejs.org"},
    "svelte": {"svelte.dev", "kit.svelte.dev"},
    "astro": {"docs.astro.build"},
    "angular": {"angular.dev"},
    "html-tailwind": {"tailwindcss.com"},
    "shadcn": {"ui.shadcn.com"},
    "nuxtjs": {"nuxt.com"},
    "nuxt-ui": {"ui.nuxt.com"},
    "react-native": {"reactnative.dev", "react.dev"},
    "flutter": {"api.flutter.dev", "docs.flutter.dev"},
    "swiftui": {"developer.apple.com"},
    "jetpack-compose": {"developer.android.com"},
    "avalonia": {"docs.avaloniaui.net"},
    "uwp": {"learn.microsoft.com"},
    "winui": {"learn.microsoft.com"},
    "wpf": {"learn.microsoft.com"},
    "uno": {"platform.uno"},
    "javafx": {"openjfx.io", "mkpaz.github.io", "www.w3.org"},
    "threejs": {"threejs.org", "github.com", "www.npmjs.com", "www.w3.org"},
    "laravel": {"laravel.com"},
}
REQUIRED_UX_GUIDANCE = {
    "Focus Not Obscured (Minimum)": "Web",
    "Focus Not Obscured (Enhanced)": "Web",
    "Focus Appearance": "Web",
    "Dragging Movements": "All",
    "Target Size (Minimum)": "Web",
    "Consistent Help": "All",
    "Redundant Entry": "All",
    "Accessible Authentication (Minimum)": "All",
    "Auto-Rotating Content Controls": "All",
}


def _relative_luminance(value):
    if not HEX_COLOR.fullmatch(value or ""):
        raise ValueError(f"invalid hex color '{value}'")
    channels = [int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [channel / 12.92 if channel <= 0.04045
              else ((channel + 0.055) / 1.055) ** 2.4 for channel in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast_ratio(foreground, background):
    """Return WCAG contrast for two opaque six-digit sRGB colors."""
    first, second = _relative_luminance(foreground), _relative_luminance(background)
    return (max(first, second) + 0.05) / (min(first, second) + 0.05)


def _read_rows(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames or [], list(reader)


def _check_file(label, filepath, search_cols, output_cols, problems):
    if not filepath.exists():
        problems.append(f"[{label}] missing file: {filepath}")
        return

    try:
        headers, rows = _read_rows(filepath)
    except (csv.Error, UnicodeDecodeError, OSError) as e:
        problems.append(f"[{label}] failed to parse {filepath.name}: {e}")
        return

    header_set = set(headers)
    for col in set(search_cols) | set(output_cols):
        if col not in header_set:
            problems.append(f"[{label}] {filepath.name}: expected column '{col}' not found in header")

    # Only check for duplicates against an actual identifier column ("No" is
    # the sequential-index convention used across this dataset). The first
    # CSV column is not reliably a unique key -- e.g. stack files use
    # "Category", which legitimately repeats across many guideline rows.
    if "No" in header_set:
        seen = {}
        for i, row in enumerate(rows, start=2):  # +1 header, +1 to be 1-indexed
            key = row.get("No", "")
            if key in seen:
                problems.append(
                    f"[{label}] {filepath.name}: duplicate 'No' value '{key}' on rows {seen[key]} and {i}"
                )
            else:
                seen[key] = i
    elif label.startswith("stack:"):
        problems.append(
            f"[{label}] {filepath.name}: missing 'No' index column present in other stack files "
            "(schema drift -- harmless for search, but inconsistent with the rest of data/stacks/)"
        )

    return headers, rows


def _split(value, delimiter):
    return [part.strip() for part in value.split(delimiter) if part.strip()]


def _valid_date(value):
    try:
        return date.fromisoformat(value) <= date.today()
    except (TypeError, ValueError):
        return False


def _valid_confidence(value):
    return (
        value is None
        or (
            not isinstance(value, bool)
            and isinstance(value, (int, float))
            and math.isfinite(value)
            and 0 <= value <= 1
        )
    )


def _check_style_contract(styles, products, reasoning, problems,
                          replacement_targets=None):
    replacement_targets = replacement_targets or {}
    ids, lookup, parents, by_id = set(), {}, {}, {}
    for row in styles:
        style_id = row.get("Style ID", "")
        if not STYLE_ID.fullmatch(style_id):
            problems.append(f"[style] invalid Style ID '{style_id}'")
        if style_id in ids:
            problems.append(f"[style] duplicate Style ID '{style_id}'")
        ids.add(style_id)
        by_id[style_id] = row
        status, parent = row.get("Status", ""), row.get("Parent Style ID", "")
        if status not in STYLE_STATUSES:
            problems.append(f"[style:{style_id}] invalid Status '{status}'")
        replacement_domain = row.get("Replacement Domain", "")
        replacement_id = row.get("Replacement ID", "")
        if status == "supplemental" and not parent:
            problems.append(f"[style:{style_id}] supplemental rows require Parent Style ID")
        if status == "deprecated":
            has_parent = bool(parent)
            has_redirect = bool(replacement_domain and replacement_id)
            if has_parent == has_redirect:
                problems.append(
                    f"[style:{style_id}] deprecated rows require exactly one parent or redirect"
                )
            if has_redirect and replacement_id not in replacement_targets.get(
                    replacement_domain, set()):
                problems.append(
                    f"[style:{style_id}] invalid {replacement_domain} redirect '{replacement_id}'"
                )
        elif replacement_domain or replacement_id:
            problems.append(f"[style:{style_id}] only deprecated rows may redirect")
        parents[style_id] = parent
        for key in [style_id, row.get("Style Category", ""), *_split(row.get("Aliases", ""), "|")]:
            folded = key.casefold()
            if folded in lookup and lookup[folded] != style_id:
                problems.append(f"[style] ambiguous identity '{key}' -> {lookup[folded]}, {style_id}")
            lookup[folded] = style_id
    for style_id, parent in parents.items():
        if parent and (parent not in ids or parent == style_id):
            problems.append(f"[style:{style_id}] invalid parent '{parent}'")
        seen, current = {style_id}, parent
        while current:
            if current in seen:
                problems.append(f"[style:{style_id}] parent cycle through '{current}'")
                break
            seen.add(current)
            current = parents.get(current, "")
        if parent and by_id.get(parent, {}).get("Status") != "active":
            problems.append(f"[style:{style_id}] parent must target an active style")
    references = []
    for row in products:
        references += _split(row.get("Primary Style Recommendation", ""), "+")
        references += _split(row.get("Secondary Styles", ""), ",")
    for row in reasoning:
        references += _split(row.get("Style_Priority", ""), "+")
    for reference in sorted(set(references)):
        resolved_id = lookup.get(reference.casefold())
        if not resolved_id:
            problems.append(f"[style] unresolved reference '{reference}'")
        elif next(row for row in styles if row.get("Style ID") == resolved_id).get(
                "Status") == "deprecated":
            problems.append(f"[style] reference targets deprecated style '{reference}'")

    performance_levels = {"cost:low", "cost:moderate", "cost:high"}
    accessibility_levels = {"risk:low", "risk:conditional", "risk:high"}
    mode_levels = {"supported", "conditional", "not-recommended"}
    prompt_lengths = {}
    for row in styles:
        style_id = row.get("Style ID", "")
        if row.get("Performance", "").split("|", 1)[0] not in performance_levels:
            problems.append(f"[style:{style_id}] invalid Performance vocabulary")
        if row.get("Accessibility", "").split("|", 1)[0] not in accessibility_levels:
            problems.append(f"[style:{style_id}] invalid Accessibility vocabulary")
        claim_text = " ".join(str(value) for value in row.values())
        if WCAG_CONFORMANCE.search(claim_text):
            problems.append(f"[style:{style_id}] accessibility conformance guarantee")
        if re.search(r"\d+/10", row.get("Framework Compatibility", "")):
            problems.append(f"[style:{style_id}] framework score is unsupported")
        if any(term in row.get("Framework Compatibility", "").casefold()
               for term in ("all frameworks", "excellent", "performant", "lightweight")):
            problems.append(f"[style:{style_id}] unsupported framework guarantee")
        for field in ("Light Mode ✓", "Dark Mode ✓"):
            if row.get(field) not in mode_levels:
                problems.append(f"[style:{style_id}] invalid {field} vocabulary")
        if row.get("Preferred Mode") not in {"auto", "light", "dark"}:
            problems.append(f"[style:{style_id}] invalid Preferred Mode")
        length = len(row.get("AI Prompt Keywords", "").split())
        prompt_lengths.setdefault(row.get("Type", ""), []).append(length)
        if length > 40:
            problems.append(f"[style:{style_id}] AI prompt exceeds 40 words")
    if prompt_lengths.get("General") and prompt_lengths.get("Mobile"):
        general = statistics.median(prompt_lengths["General"])
        mobile = statistics.median(prompt_lengths["Mobile"])
        if mobile > general * 1.25:
            problems.append("[style] mobile prompt median exceeds 1.25x general median")
    return ids


def _check_reasoning_contract(products, colors, reasoning, style_ids, patterns, problems):
    semantic_sets = (
        ("products", products, "Product Type"),
        ("colors", colors, "Product Type"),
        ("reasoning", reasoning, "UI_Category"),
    )
    for label, rows, key in semantic_sets:
        counts = {}
        for row in rows:
            value = row.get(key, "")
            counts[value] = counts.get(value, 0) + 1
        duplicates = sorted(value for value, count in counts.items() if count > 1)
        if len(rows) != 192:
            problems.append(f"[reasoning] {label} must contain exactly 192 rows; got {len(rows)}")
        if duplicates:
            problems.append(
                f"[reasoning] duplicate {label} labels: {', '.join(duplicates)}"
            )
    product_names = {row.get("Product Type", "") for row in products}
    color_names = {row.get("Product Type", "") for row in colors}
    reasoning_names = {row.get("UI_Category", "") for row in reasoning}
    if product_names != color_names:
        problems.append("[reasoning] products/colors product labels differ")
    missing, extra = sorted(product_names - reasoning_names), sorted(reasoning_names - product_names)
    if missing:
        problems.append(f"[reasoning] missing exact product rows: {', '.join(missing)}")
    if extra:
        problems.append(f"[reasoning] unknown product rows: {', '.join(extra)}")
    for row in reasoning:
        category = row.get("UI_Category", "")
        try:
            rules = parse_decision_rules(row.get("Decision_Rules", ""))
        except ValueError as error:
            problems.append(f"[reasoning:{category}] {error}")
            continue
        for actions in rules.values():
            for action in actions:
                prefix, value = action.split(":", 1)
                if prefix == "style" and value not in style_ids:
                    problems.append(f"[reasoning:{category}] unknown style action '{value}'")
                if prefix == "pattern" and value not in patterns:
                    problems.append(f"[reasoning:{category}] unknown pattern action '{value}'")
        pattern = row.get("Recommended_Pattern", "")
        if pattern not in patterns:
            problems.append(
                f"[reasoning:{category}] unknown Recommended_Pattern '{pattern}'"
            )
        confidence = row.get("Confidence", "")
        if confidence:
            try:
                if not 0 <= float(confidence) <= 1:
                    raise ValueError
            except ValueError:
                problems.append(f"[reasoning:{category}] invalid Confidence '{confidence}'")


def _check_color_contract(rows, problems):
    for row in rows:
        product = row.get("Product Type", "")
        ratios = {}
        for foreground, (background, role, minimum) in COLOR_CONTRAST_PAIRS.items():
            try:
                ratio = contrast_ratio(row.get(foreground, ""), row.get(background, ""))
            except ValueError as error:
                problems.append(f"[color:{product}] {error}")
                continue
            if ratio + 1e-9 < minimum:
                problems.append(
                    f"[color:{product}] {role} {foreground}/{background} contrast "
                    f"{ratio:.2f}:1 is below {minimum:.1f}:1"
                )
            ratios[foreground] = ratio
        if ("Muted Foreground" in ratios and "Foreground" in ratios
                and ratios["Muted Foreground"] > ratios["Foreground"] + 1e-9):
            problems.append(
                f"[color:{product}] muted text contrast exceeds primary text contrast"
            )
        try:
            value = row.get("Destructive", "").lstrip("#")
            red, green, blue = (int(value[index:index + 2], 16) for index in (0, 2, 4))
            if green > red * 1.1 and green > blue * 1.1:
                problems.append(f"[color:{product}] Destructive token is success green")
        except ValueError:
            pass


def _check_chart_contract(rows, problems):
    for row in rows:
        data_type = row.get("Data Type", "")
        if row.get("Accessibility Grade") != "deprecated: use Accessibility Risk":
            problems.append(f"[chart:{data_type}] invalid deprecated Accessibility Grade")
        if row.get("Accessibility Risk") not in CHART_RISKS:
            problems.append(f"[chart:{data_type}] invalid Accessibility Risk")
        fallback = " ".join((row.get("Accessibility Notes", ""),
                             row.get("A11y Fallback", ""))).casefold()
        if not CHART_TEXT_FALLBACK.search(fallback):
            problems.append(f"[chart:{data_type}] missing text/table/list fallback")
        if not CHART_NON_COLOR_GUIDANCE.search(fallback):
            problems.append(f"[chart:{data_type}] missing non-color distinction guidance")
        if row.get("Interactive Level", "").strip() and "keyboard" not in fallback:
            problems.append(f"[chart:{data_type}] missing keyboard interaction equivalent")
        if WCAG_GRADE.search(fallback):
            problems.append(f"[chart:{data_type}] fallback claims WCAG conformance")


def _font_families(url):
    return parse_qs(urlsplit(url).query).get("family", [])


def _font_names(family_declarations):
    return {declaration.split(":", 1)[0].replace("+", " ")
            for declaration in family_declarations}


def _configured_font_names(config):
    return set(re.findall(r"'([^']+)'", config))


def _imported_weights(family_declarations):
    weights = set()
    for declaration in family_declarations:
        if ":" not in declaration or "@" not in declaration:
            continue
        _, axis_values = declaration.split(":", 1)
        axes, values = axis_values.split("@", 1)
        if "wght" in axes:
            weights.update(FONT_WEIGHT.findall(values))
    return weights


def _declared_weights(notes):
    weights = set()
    for match in re.finditer(r"(?:weights?|strictly)[^.;]{0,100}", notes, re.I):
        weights.update(FONT_WEIGHT.findall(match.group()))
    return weights


def _check_typography_contract(rows, problems):
    for row in rows:
        pairing = row.get("Font Pairing Name", "")
        font_url = row.get("Google Fonts URL", "")
        url_families = _font_families(font_url)
        families = _font_names(url_families)
        configured = _configured_font_names(row.get("Tailwind Config", ""))
        named = {row.get("Heading Font", ""), row.get("Body Font", "")}
        if not named <= families or not named <= configured:
            problems.append(f"[typography:{pairing}] named/imported/configured fonts differ")
        import_match = CSS_IMPORT.fullmatch(row.get("CSS Import", ""))
        if not import_match:
            problems.append(f"[typography:{pairing}] invalid CSS Import")
            continue
        import_families = _font_families(import_match.group(2))
        if sorted(url_families) != sorted(import_families):
            problems.append(f"[typography:{pairing}] Google URL and CSS Import differ")
        imported_weights = _imported_weights(url_families)
        declared_weights = _declared_weights(row.get("Notes", ""))
        if declared_weights and not declared_weights <= imported_weights:
            missing = ", ".join(sorted(declared_weights - imported_weights))
            problems.append(f"[typography:{pairing}] recommended weights not imported: {missing}")


def _load_catalog_json(name, problems):
    try:
        payload = json.loads((DATA_DIR / name).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        problems.append(f"[catalog:{name}] invalid JSON: {error}")
        return {}
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
        problems.append(f"[catalog:{name}] schemaVersion 1 object is required")
        return {}
    return payload


def _catalog_date(value):
    try:
        parsed = date.fromisoformat(value)
        return parsed.year > 1970 and parsed <= date.today()
    except (TypeError, ValueError):
        return False


def _valid_google_fonts_exclusion_source(value):
    if not isinstance(value, str):
        return False
    try:
        parsed = urlsplit(value)
        has_credentials_or_port = bool(parsed.username or parsed.password or parsed.port)
    except ValueError:
        return False
    if parsed.scheme != "https" or has_credentials_or_port:
        return False
    if parsed.hostname == "fonts.google.com":
        return bool(parsed.path)
    return parsed.hostname == "github.com" and (
        parsed.path == "/google/fonts" or parsed.path.startswith("/google/fonts/")
    )


def _check_font_catalog(rows, licenses, typography, problems):
    families = [row.get("Family", "") for row in rows]
    family_set = set(families)
    if not families or len(family_set) != len(families) or "" in family_set:
        problems.append("[catalog:google-fonts] Family values must be non-empty and unique")
    available = {}
    for row in rows:
        family = row.get("Family", "")
        if not _catalog_date(row.get("Date Added")) or not _catalog_date(row.get("Last Modified")):
            problems.append(f"[catalog:google-fonts:{family}] invalid or suspicious date")
        expected_url = f"https://fonts.google.com/specimen/{quote_plus(family)}"
        if row.get("Google Fonts URL") != expected_url:
            problems.append(f"[catalog:google-fonts:{family}] invalid specimen URL")
        styles = set(_split(row.get("Styles", ""), "|"))
        if not styles:
            problems.append(f"[catalog:google-fonts:{family}] Styles cannot be empty")
        available[family] = {style.removesuffix("i") for style in styles}

    source = licenses.get("source")
    if (not isinstance(source, dict)
            or source.get("repository") != "https://github.com/google/fonts"
            or source.get("metadataFile") != "METADATA.pb"
            or not GOOGLE_FONTS_REVISION.fullmatch(source.get("revision", ""))):
        problems.append("[catalog:google-font-licenses] invalid source revision")
    entries = licenses.get("families")
    excluded = licenses.get("excludedFamilies")
    if (licenses.get("familyCount") != len(rows) or not isinstance(entries, list)
            or not isinstance(excluded, list)):
        problems.append("[catalog:google-font-licenses] invalid counts or arrays")
        return
    licensed_names = set()
    for item in entries:
        if not isinstance(item, dict):
            problems.append("[catalog:google-font-licenses] family entry must be an object")
            continue
        name = item.get("name")
        if (not isinstance(name, str) or not name or name in licensed_names
                or item.get("license") not in FONT_LICENSES
                or item.get("status") != "active"
                or not _catalog_date(item.get("date_added"))
                or not _catalog_date(item.get("verifiedAt"))):
            problems.append(f"[catalog:google-font-licenses:{name}] invalid active family")
        licensed_names.add(name)
    if licensed_names != family_set:
        problems.append("[catalog:google-font-licenses] active families must match google-fonts.csv")
    excluded_names = set()
    for item in excluded:
        name = item.get("name") if isinstance(item, dict) else None
        source = item.get("source") if isinstance(item, dict) else None
        if (not isinstance(name, str) or not name or name in excluded_names
                or name in family_set or item.get("status") != "needs-review"
                or not isinstance(item.get("reason"), str) or not item.get("reason")
                or not _valid_google_fonts_exclusion_source(source)
                or not _catalog_date(item.get("verifiedAt"))):
            problems.append(f"[catalog:google-font-licenses:{name}] invalid exclusion")
        excluded_names.add(name)

    for row in typography:
        pairing = row.get("Font Pairing Name", "")
        declarations = _font_families(row.get("Google Fonts URL", ""))
        for declaration in declarations:
            family = declaration.split(":", 1)[0].replace("+", " ")
            if family not in available:
                problems.append(f"[typography:{pairing}] font absent from approved catalog: {family}")
                continue
            weights = _imported_weights([declaration]) or {"400"}
            if not weights <= available[family]:
                missing = ", ".join(sorted(weights - available[family]))
                problems.append(f"[typography:{pairing}] catalog lacks {family} weights: {missing}")


def _check_phosphor_catalog(curated, manifest, problems):
    source = manifest.get("source") if isinstance(manifest.get("source"), dict) else {}
    imports = manifest.get("reactImports") if isinstance(manifest.get("reactImports"), dict) else {}
    icons = manifest.get("icons")
    if (source.get("package"), source.get("version")) != ("@phosphor-icons/core", "2.1.1"):
        problems.append("[catalog:phosphor] unpinned core package")
    if (source.get("reactPackage"), source.get("reactVersion")) != ("@phosphor-icons/react", "2.1.10"):
        problems.append("[catalog:phosphor] unpinned React package")
    if (manifest.get("status") != "active" or not _catalog_date(manifest.get("verifiedAt"))
            or set(manifest.get("weights", [])) != PHOSPHOR_WEIGHTS
            or imports != {"clientModule": "@phosphor-icons/react", "ssrModule": "@phosphor-icons/react/ssr"}
            or not isinstance(icons, list) or manifest.get("iconCount") != len(icons)):
        problems.append("[catalog:phosphor] invalid snapshot metadata")
        return
    names, components = {}, set()
    for item in icons:
        name = item.get("name") if isinstance(item, dict) else None
        component = item.get("component") if isinstance(item, dict) else None
        if (not name or name in names or not component or component in components
                or item.get("clientImport") != f'import {{ {component} }} from "@phosphor-icons/react"'
                or item.get("ssrImport") != f'import {{ {component} }} from "@phosphor-icons/react/ssr"'):
            problems.append(f"[catalog:phosphor:{name}] invalid identity or imports")
        names[name] = component
        components.add(component)
    phosphor_rows = [row for row in curated if row.get("Library") == "Phosphor"]
    if manifest.get("curatedValidatedCount") != len(phosphor_rows):
        problems.append("[catalog:phosphor] curated validation count is stale")
    for row in phosphor_rows:
        name = row.get("Icon Name", "")
        component_match = re.search(r"import\s*\{\s*([A-Za-z0-9]+)", row.get("Import Code", ""))
        component = component_match.group(1) if component_match else ""
        if names.get(name) != component:
            problems.append(f"[catalog:phosphor:{name}] curated icon is absent or mismatched")


def _check_catalog_summary(summary, licenses, phosphor, problems):
    if not _catalog_date(summary.get("verifiedAt")):
        problems.append("[catalog:summary] invalid verifiedAt")
    counts = summary.get("counts") if isinstance(summary.get("counts"), dict) else {}
    styles = _read_rows(DATA_DIR / "styles.csv")[1]
    expected = {
        "styles": {
            "total": len(styles),
            "searchable": sum(row.get("Status") != "deprecated" for row in styles),
            "active": sum(row.get("Status") == "active" for row in styles),
            "supplemental": sum(row.get("Status") == "supplemental" for row in styles),
            "deprecated": sum(row.get("Status") == "deprecated" for row in styles),
        },
        "products": len(_read_rows(DATA_DIR / "products.csv")[1]),
        "palettes": len(_read_rows(DATA_DIR / "colors.csv")[1]),
        "reasoningProfiles": len(_read_rows(DATA_DIR / REASONING_FILE)[1]),
        "fontPairings": len(_read_rows(DATA_DIR / "typography.csv")[1]),
        "googleFonts": len(_read_rows(DATA_DIR / "google-fonts.csv")[1]),
        "curatedIcons": len(_read_rows(DATA_DIR / "icons.csv")[1]),
        "upstreamPhosphorIcons": phosphor.get("iconCount"),
        "uxGuidelines": len(_read_rows(DATA_DIR / "ux-guidelines.csv")[1]),
        "motionPresets": len(_read_rows(DATA_DIR / "motion.csv")[1]),
        "chartTypes": len(_read_rows(DATA_DIR / "charts.csv")[1]),
        "stacks": len(STACK_CONFIG),
        "stackGuidelines": sum(len(_read_rows(DATA_DIR / config["file"])[1]) for config in STACK_CONFIG.values()),
    }
    for key, value in expected.items():
        if counts.get(key) != value:
            problems.append(f"[catalog:summary] stale count for {key}")
    snapshots = summary.get("snapshots") if isinstance(summary.get("snapshots"), dict) else {}
    for name in ("google-fonts.csv", "google-font-licenses.json", "icons.csv", "phosphor-icons-upstream.json"):
        # Line endings are normalized so the check matches
        # generate-catalog-summary.py on CRLF checkouts too.
        digest = hashlib.sha256(
            (DATA_DIR / name).read_bytes().replace(b"\r\n", b"\n")
        ).hexdigest()
        if snapshots.get(name) != {"sha256": digest}:
            problems.append(f"[catalog:summary] stale snapshot for {name}")
    policy = summary.get("promotionPolicy")
    if policy != {"changedFamilySetRequiresExplicitApproval": True,
                   "relevanceGateRequired": True,
                   "unlicensedFamiliesExcluded": True}:
        problems.append("[catalog:summary] invalid promotion policy")
    pending = sorted(
        ({"family": item.get("name"), "reason": item.get("reason")}
         for item in licenses.get("excludedFamilies", []) if isinstance(item, dict)),
        key=lambda item: (item.get("family") or "").casefold(),
    )
    if summary.get("pendingCandidates") != pending:
        problems.append("[catalog:summary] pending candidates do not match exclusions")


def _check_catalog_contract(domain_rows, problems):
    if (DATA_DIR / ".google-font-refresh.incomplete.json").exists():
        problems.append("[catalog:google-fonts] incomplete refresh marker requires review")
    licenses = _load_catalog_json("google-font-licenses.json", problems)
    phosphor = _load_catalog_json("phosphor-icons-upstream.json", problems)
    summary = _load_catalog_json("catalog-summary.json", problems)
    if licenses:
        _check_font_catalog(domain_rows.get("google-fonts", []), licenses,
                            domain_rows.get("typography", []), problems)
    if phosphor:
        _check_phosphor_catalog(domain_rows.get("icons", []), phosphor, problems)
    if summary:
        _check_catalog_summary(summary, licenses, phosphor, problems)


def _check_icon_contract(rows, problems):
    for row in rows:
        icon = row.get("Icon Name", "")
        role = row.get("Semantic Role", "")
        contexts = set(_split(row.get("Allowed Contexts", ""), "|"))
        usage = row.get("Usage", "")
        if role not in ICON_ROLES:
            problems.append(f"[icons:{icon}] invalid Semantic Role '{role}'")
        if contexts != ICON_CONTEXTS:
            problems.append(f"[icons:{icon}] incomplete contextual semantics")
        if re.search(r"[\u3400-\u9fff]", usage):
            problems.append(f"[icons:{icon}] Usage must use canonical English")
        imports = row.get("Import Code", "")
        if "IconName" in imports or not ICON_IMPORT.search(imports):
            problems.append(f"[icons:{icon}] invalid or placeholder icon import")
        if any(not re.search(pattern, usage, re.I)
               for pattern in ICON_USAGE_REQUIREMENTS):
            problems.append(f"[icons:{icon}] incomplete contextual accessibility guidance")


def _check_ux_contract(rows, problems):
    ux_by_issue = {row.get("Issue", ""): row for row in rows}
    for issue in sorted(set(REQUIRED_UX_GUIDANCE) - set(ux_by_issue)):
        problems.append(f"[ux] missing WCAG 2.2 guidance '{issue}'")
    for issue, platform in REQUIRED_UX_GUIDANCE.items():
        row = ux_by_issue.get(issue, {})
        if row and (row.get("Platform") != platform
                    or row.get("Severity") not in {"Medium", "High", "Critical"}):
            problems.append(f"[ux:{issue}] shifted or invalid semantic fields")


def _check_motion_contract(rows, problems):
    for row in rows:
        text = " ".join(row.values()).casefold()
        if "reduced-motion" not in text and "user-controlled" not in text:
            problems.append(f"[motion:{row.get('No')}] missing explicit motion opt-out")


def _check_app_interface_contract(rows, problems):
    native_target = next((row for row in rows
                          if row.get("Issue") == "Touch Target Size"), {})
    if not {"44pt", "48dp"} <= set(re.findall(r"44pt|48dp", " ".join(native_target.values()))):
        problems.append("[web:Touch Target Size] must distinguish iOS 44pt and Android 48dp")


def _check_react_contract(rows, problems):
    react_text = "\n".join(" ".join(row.values()) for row in rows)
    if "useLatest" in react_text:
        problems.append("[react] unqualified community useLatest guidance is not allowed")
    effect_event = next((row for row in rows
                         if row.get("Issue") == "Effect Events"), {})
    effect_text = " ".join(effect_event.values()).casefold()
    if not all(phrase in effect_text for phrase in ("inside effects", "dependencies")):
        problems.append("[react:Effect Events] current scope/dependency guidance is required")


def _check_landing_claims(rows, problems):
    for row in rows:
        optimization = row.get("Conversion Optimization", "")
        if ("%" in optimization
                or LANDING_QUANTIFIED_CLAIM.search(optimization)
                or "best conversion" in optimization.casefold()):
            problems.append(
                f"[landing:{row.get('Pattern Name')}] unsupported quantitative claim"
            )


def _check_core_data_contract(domain_rows, problems):
    _check_color_contract(domain_rows.get("color", []), problems)
    _check_chart_contract(domain_rows.get("chart", []), problems)
    _check_typography_contract(domain_rows.get("typography", []), problems)
    _check_icon_contract(domain_rows.get("icons", []), problems)
    _check_ux_contract(domain_rows.get("ux", []), problems)
    _check_motion_contract(domain_rows.get("gsap", []), problems)
    _check_app_interface_contract(domain_rows.get("web", []), problems)
    _check_react_contract(domain_rows.get("react", []), problems)
    _check_landing_claims(domain_rows.get("landing", []), problems)


def _valid_provenance_source(source, source_index, identity, problems):
    if not isinstance(source, dict):
        problems.append(
            f"[provenance] source {source_index} for {identity} must be an object"
        )
        return False

    source_type, ref = source.get("type"), source.get("ref")
    if source_type not in PROVENANCE_SOURCE_TYPES or not isinstance(ref, str):
        problems.append(f"[provenance] invalid source for {identity}")
        return False
    if source_type == "official":
        parsed = urlsplit(ref)
        if parsed.scheme != "https" or parsed.hostname not in OFFICIAL_SOURCE_HOSTS:
            problems.append(f"[provenance] unapproved official source for {identity}")
            return False
    elif not ref or urlsplit(ref).scheme:
        problems.append(
            f"[provenance] derived source must use a local dataset reference for {identity}"
        )
        return False
    return True


def _check_stack_freshness_contract(stack, rows, problems):
    """Validate curated-stack applicability and official high-impact sources."""
    if stack not in STACK_OFFICIAL_HOSTS:
        return

    active_count = 0
    for row in rows:
        identity = f"[stack:{stack}:{row.get('No', '?')}]"
        status = row.get("Status", "")
        applies_to = row.get("Applies To", "").strip().casefold()
        expected = STACK_CURRENT_APPLICABILITY[stack]
        if not applies_to or not applies_to.startswith(stack):
            problems.append(f"{identity} Applies To must start with '{stack}'")
        elif status == "active" and not applies_to.startswith(expected):
            problems.append(f"{identity} Applies To must target '{expected}'")
        if status == "active":
            active_count += 1
            if "legacy" in applies_to:
                problems.append(f"{identity} active row cannot target legacy versions")
        elif status == "deprecated" and "legacy" not in applies_to:
            problems.append(f"{identity} deprecated row must be visibly legacy")
        elif status == "unverified":
            problems.append(f"{identity} curated stack row cannot remain unverified")

        if row.get("Severity") not in {"Critical", "High"}:
            continue
        docs_url = row.get("Docs URL", "")
        parsed = urlsplit(docs_url)
        if parsed.scheme != "https" or parsed.hostname not in STACK_OFFICIAL_HOSTS[stack]:
            problems.append(f"{identity} Critical/High row requires an official Docs URL")
        if not _valid_date(row.get("Verified At", "")):
            problems.append(f"{identity} Critical/High row requires ISO Verified At")

    if not active_count and stack != "uwp":
        problems.append(f"[stack:{stack}] requires at least one active current row")


def _valid_dataset_source_key(source_file, source_key, identity, problems):
    if source_file not in CORE_PROVENANCE_FILES:
        problems.append(f"[provenance] unknown dataset-contract sourceFile for {identity}")
        return False
    path = DATA_DIR / source_file
    try:
        headers, rows = _read_rows(path)
    except (csv.Error, UnicodeDecodeError, OSError):
        problems.append(f"[provenance] unreadable sourceFile for {identity}")
        return False
    scope = source_key.get("Scope") if isinstance(source_key, dict) else None
    if not isinstance(scope, str) or not scope.startswith("No "):
        problems.append(f"[provenance] dataset scope must bind rows for {identity}")
        return False
    row_part = scope.split(";", 1)[0]
    referenced = {int(value) for value in re.findall(r"\b\d+\b", row_part)}
    for start, end in re.findall(r"(\d+)\s*-\s*(\d+)", row_part):
        referenced.update(range(int(start), int(end) + 1))
    row_ids = {int(row["No"]) for row in rows if row.get("No", "").isdigit()}
    if not referenced or not referenced <= row_ids:
        problems.append(f"[provenance] dataset scope references unknown rows for {identity}")
        return False
    semantic_headers = [header for header in headers if header != "No"]
    if not any(
            re.search(rf"\b{re.escape(header)}\b", scope, re.I)
            for header in semantic_headers):
        problems.append(f"[provenance] dataset scope must bind source fields for {identity}")
        return False
    return True


def _valid_catalog_source_key(source_file, source_key, identity, problems):
    if source_file not in CATALOG_PROVENANCE_FILES:
        problems.append(f"[provenance] unknown catalog sourceFile for {identity}")
        return False
    if not (DATA_DIR / source_file).is_file():
        problems.append(f"[provenance] missing catalog sourceFile for {identity}")
        return False
    snapshot = source_key.get("Snapshot") if isinstance(source_key, dict) else None
    count = source_key.get("Count") if isinstance(source_key, dict) else None
    if snapshot != "catalog-summary.json" or isinstance(count, bool) or not isinstance(count, int) or count <= 0:
        problems.append(f"[provenance] catalog sourceKey must bind snapshot and count for {identity}")
        return False
    try:
        if source_file.endswith(".csv"):
            expected_count = len(_read_rows(DATA_DIR / source_file)[1])
        else:
            payload = json.loads((DATA_DIR / source_file).read_text(encoding="utf-8"))
            expected_count = payload.get("iconCount")
    except (csv.Error, json.JSONDecodeError, OSError, UnicodeDecodeError):
        problems.append(f"[provenance] unreadable catalog sourceFile for {identity}")
        return False
    if count != expected_count:
        problems.append(f"[provenance] catalog count is stale for {identity}")
        return False
    return True


def _check_provenance(reasoning, styles, problems):
    path = DATA_DIR / "data-provenance.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        problems.append(f"[provenance] invalid data-provenance.json: {error}")
        return
    if (not isinstance(payload, dict) or payload.get("schemaVersion") != 1
            or not isinstance(payload.get("records"), list)):
        problems.append("[provenance] schemaVersion 1 and records array are required")
        return
    covered, covered_styles, identities = set(), set(), set()
    valid_records = []
    for index, record in enumerate(payload["records"]):
        if not isinstance(record, dict):
            problems.append(f"[provenance] record {index} must be an object")
            continue
        identity = (record.get("entityKind"), record.get("entityId"))
        if identity[0] not in PROVENANCE_KINDS or not isinstance(identity[1], str) or not identity[1]:
            problems.append(f"[provenance] invalid identity at record {index}")
            continue
        if identity in identities:
            problems.append(f"[provenance] duplicate identity {identity}")
        identities.add(identity)
        if record.get("status") not in PROVENANCE_STATUSES:
            problems.append(f"[provenance] invalid status for {identity}")
        if record.get("sla") not in PROVENANCE_SLAS:
            problems.append(f"[provenance] invalid sla for {identity}")
        if not _valid_date(record.get("verifiedAt")):
            problems.append(f"[provenance] invalid verifiedAt for {identity}")
        if not isinstance(record.get("sourceFile"), str) or not record.get("sourceFile"):
            problems.append(f"[provenance] sourceFile required for {identity}")
        if not isinstance(record.get("sourceKey"), dict) or not record.get("sourceKey"):
            problems.append(f"[provenance] sourceKey object required for {identity}")
        applies_to = record.get("appliesTo")
        if (not isinstance(applies_to, list) or not applies_to
                or any(value not in PROVENANCE_APPLIES_TO for value in applies_to)):
            problems.append(f"[provenance] invalid appliesTo for {identity}")
        confidence = record.get("confidence")
        if not _valid_confidence(confidence):
            problems.append(f"[provenance] invalid confidence for {identity}")
        sources = record.get("sources")
        if not isinstance(sources, list) or not sources:
            problems.append(f"[provenance] sources required for {identity}")
            sources = []
        valid_sources = [
            source for source_index, source in enumerate(sources)
            if _valid_provenance_source(source, source_index, identity, problems)
        ]
        source_types = {source["type"] for source in valid_sources}
        if record.get("sla") == "manual-verified" and source_types <= {"derived"}:
            problems.append(
                f"[provenance] {identity} cannot be manual-verified from derived sources only"
            )
        source_key = record.get("sourceKey")
        source_key = source_key if isinstance(source_key, dict) else {}
        if identity[0] == "reasoning" and source_key.get("UI_Category"):
            covered.add(source_key["UI_Category"])
        if identity[0] == "style" and source_key.get("Style ID"):
            covered_styles.add(source_key["Style ID"])
        source_key_valid = True
        if identity[0] == "dataset-contract":
            source_key_valid = _valid_dataset_source_key(
                record.get("sourceFile"), source_key, identity, problems
            )
        elif identity[0] == "catalog-snapshot":
            source_key_valid = _valid_catalog_source_key(
                record.get("sourceFile"), source_key, identity, problems
            )
        if valid_sources and source_key_valid:
            valid_records.append(record)
    new_rows = {row["UI_Category"] for row in reasoning if int(row.get("No", 0)) >= 162}
    if new_rows - covered:
        problems.append(f"[provenance] missing new reasoning rows: {', '.join(sorted(new_rows - covered))}")
    new_styles = {row["Style ID"] for row in styles if int(row.get("No", 0)) > 85}
    if new_styles - covered_styles:
        problems.append(
            f"[provenance] missing new style rows: {', '.join(sorted(new_styles - covered_styles))}"
        )
    core_files = {
        record.get("sourceFile") for record in valid_records
        if record.get("entityKind") == "dataset-contract"
        and any(isinstance(source, dict) and source.get("type") == "official"
                for source in record.get("sources", []))
    }
    if CORE_PROVENANCE_FILES - core_files:
        problems.append(
            "[provenance] missing official core dataset records: "
            + ", ".join(sorted(CORE_PROVENANCE_FILES - core_files))
        )
    catalog_ids = {
        record.get("entityId") for record in valid_records
        if record.get("entityKind") == "catalog-snapshot"
        and any(isinstance(source, dict) and source.get("type") == "official"
                for source in record.get("sources", []))
    }
    if CATALOG_PROVENANCE_IDS - catalog_ids:
        problems.append(
            "[provenance] missing official catalog snapshots: "
            + ", ".join(sorted(CATALOG_PROVENANCE_IDS - catalog_ids))
        )


def validate():
    """Return every semantic data problem without terminating the process."""
    problems, domain_rows = [], {}

    for domain, config in CSV_CONFIG.items():
        _, rows = _check_file(
            f"domain:{domain}", DATA_DIR / config["file"],
            config["search_cols"], config["output_cols"], problems,
        ) or ([], [])
        domain_rows[domain] = rows

    for stack, config in STACK_CONFIG.items():
        headers, rows = _check_file(
            f"stack:{stack}", DATA_DIR / config["file"],
            _STACK_COLS["search_cols"], _STACK_COLS["output_cols"], problems,
        ) or ([], [])
        required = {"Applies To", "Status", "Verified At"}
        if headers and not required <= set(headers):
            problems.append(f"[stack:{stack}] missing contract fields {sorted(required - set(headers))}")
        for row in rows:
            status, verified = row.get("Status", ""), row.get("Verified At", "")
            if status not in STACK_STATUSES:
                problems.append(f"[stack:{stack}] invalid Status '{status}'")
            if status != "unverified" and not _valid_date(verified):
                problems.append(f"[stack:{stack}] active rows require ISO Verified At")
        _check_stack_freshness_contract(stack, rows, problems)

    reasoning_path = DATA_DIR / REASONING_FILE
    if reasoning_path.exists():
        _, reasoning = _check_file(
            "reasoning", reasoning_path, ["UI_Category"],
            ["UI_Category", "Decision_Rules", "Reasoning", "Confidence"], problems,
        ) or ([], [])
    else:
        problems.append(f"[reasoning] missing file: {reasoning_path}")
        reasoning = []

    styles = domain_rows.get("style", [])
    products = domain_rows.get("product", [])
    colors = domain_rows.get("color", [])
    landing = domain_rows.get("landing", [])
    patterns = {row.get("Pattern Name", "") for row in landing}
    for row in landing:
        patterns.update(_split(row.get("Aliases", ""), "|"))
    pattern_ids = {row.get("Pattern ID", "") for row in landing}
    if len(pattern_ids) != len(landing) or "" in pattern_ids:
        problems.append("[landing] Pattern ID values must be non-empty and unique")
    landing_identities = {}
    for row in landing:
        identities = [row.get("Pattern ID", ""), row.get("Pattern Name", "")]
        identities.extend(_split(row.get("Aliases", ""), "|"))
        for identity in identities:
            folded = identity.strip().casefold()
            owner = landing_identities.get(folded)
            if not folded:
                problems.append("[landing] Pattern Name values must be non-empty")
            elif owner and owner != row.get("Pattern ID"):
                problems.append(
                    f"[landing] ambiguous identity '{identity}' -> {owner}, "
                    f"{row.get('Pattern ID')}"
                )
            else:
                landing_identities[folded] = row.get("Pattern ID")
    style_ids = _check_style_contract(
        styles, products, reasoning, problems,
        {"landing": pattern_ids, "style": {row.get("Style ID", "") for row in styles}})
    _check_reasoning_contract(products, colors, reasoning, style_ids, patterns, problems)
    _check_core_data_contract(domain_rows, problems)
    _check_catalog_contract(domain_rows, problems)
    for row in landing:
        sections = row.get("Section Order", "").split(" > ")
        if len(sections) < 2 or any(re.match(r"^\d+\.\s", part) for part in sections):
            problems.append(f"[landing:{row.get('Pattern Name')}] invalid Section Order delimiter")
    _check_provenance(reasoning, styles, problems)

    return problems


def main():
    problems = validate()

    if problems:
        print(f"FAILED: {len(problems)} data integrity issue(s) found:\n")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)

    print(f"OK: validated {len(CSV_CONFIG)} domain files, {len(STACK_CONFIG)} stack files, and ui-reasoning.csv")
    sys.exit(0)


if __name__ == "__main__":
    main()
