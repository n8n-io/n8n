#!/usr/bin/env python3
"""
conversion_audit.py — CRO audit for HTML pages
Usage:
  python3 conversion_audit.py --file page.html
  python3 conversion_audit.py --url https://example.com
  python3 conversion_audit.py --json
  python3 conversion_audit.py          # demo mode
"""

import argparse
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser


# ---------------------------------------------------------------------------
# HTML Parser
# ---------------------------------------------------------------------------

class CROParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._depth = 0
        self._above_fold_depth = 3  # approximate first screenful
        self._above_fold_elements = 0
        self._total_elements = 0

        self.buttons = []          # {"text": str, "position": int}
        self.links_as_cta = []     # a tags with CTA-like classes/text
        self.form_fields = 0
        self.forms = 0

        # Social proof
        self.testimonial_markers = 0
        self.logo_images = 0
        self.social_numbers = []   # "X customers", "X reviews", etc.

        # Trust signals
        self.ssl_mentions = 0
        self.guarantee_mentions = 0
        self.privacy_mentions = 0

        # Viewport meta
        self.viewport_meta = False

        # Tracking state
        self._in_body = False
        self._above_fold_done = False
        self._body_element_count = 0
        self._in_script = False
        self._in_style = False
        self._current_tag = None
        self._current_text = []
        self._element_position = 0  # rough position counter

        # Full text (for regex scans)
        self.full_text = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        tag_lower = tag.lower()

        if tag_lower == "script":
            self._in_script = True
            return
        if tag_lower == "style":
            self._in_style = True
            return

        if tag_lower == "body":
            self._in_body = True
            return

        if tag_lower == "meta":
            if attrs_dict.get("name", "").lower() == "viewport":
                self.viewport_meta = True

        if not self._in_body:
            return

        self._element_position += 1

        # Buttons
        if tag_lower == "button":
            self._current_tag = "button"
            self._current_text = []
        elif tag_lower == "input":
            input_type = attrs_dict.get("type", "text").lower()
            if input_type == "submit":
                val = attrs_dict.get("value", "Submit")
                self.buttons.append({"text": val, "position": self._element_position})
            elif input_type not in ("hidden", "submit"):
                self.form_fields += 1
        elif tag_lower == "textarea" or tag_lower == "select":
            self.form_fields += 1
        elif tag_lower == "form":
            self.forms += 1
        elif tag_lower == "a":
            cls = attrs_dict.get("class", "").lower()
            href = attrs_dict.get("href", "")
            cta_classes = {"btn", "button", "cta", "call-to-action", "signup", "register"}
            if any(c in cls for c in cta_classes):
                self._current_tag = "a_cta"
                self._current_text = []
        elif tag_lower == "img":
            src = attrs_dict.get("src", "").lower()
            alt = attrs_dict.get("alt", "").lower()
            cls = attrs_dict.get("class", "").lower()
            if any(kw in src or kw in alt or kw in cls
                   for kw in ("logo", "partner", "client", "badge", "seal", "award", "cert")):
                self.logo_images += 1

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower == "script":
            self._in_script = False
        elif tag_lower == "style":
            self._in_style = False
        elif tag_lower == "button" and self._current_tag == "button":
            text = " ".join(self._current_text).strip()
            self.buttons.append({"text": text, "position": self._element_position})
            self._current_tag = None
            self._current_text = []
        elif tag_lower == "a" and self._current_tag == "a_cta":
            text = " ".join(self._current_text).strip()
            self.links_as_cta.append({"text": text, "position": self._element_position})
            self._current_tag = None
            self._current_text = []

    def handle_data(self, data):
        if self._in_script or self._in_style:
            return
        text = data.strip()
        if not text:
            return
        if self._current_tag in ("button", "a_cta"):
            self._current_text.append(text)
        if self._in_body:
            self.full_text.append(text)


# ---------------------------------------------------------------------------
# Text-based signal detection
# ---------------------------------------------------------------------------

TESTIMONIAL_PATTERNS = [
    r'\b(testimonial|review|quote|said|says|told us|customer story)\b',
    r'[""][^""]{20,}[""]',  # quoted text
    r'\b\d[\d,]+ (reviews?|customers?|users?|clients?|companies)\b',
    r'\bstar[s]?\b.{0,10}\b(rating|review)\b',
    r'\b(trustpilot|g2|capterra|clutch)\b',
]

TRUST_PATTERNS = {
    "ssl": [r'\b(ssl|https|secure|encrypted|tls|256.bit)\b'],
    "guarantee": [r'\b(guarantee|guaranteed|money.back|refund|risk.free|no.risk)\b'],
    "privacy": [r'\b(privacy|gdpr|data protection|we never share|no spam|unsubscribe)\b'],
}

CTA_TEXT_PATTERNS = [
    r'\b(get started|sign up|try free|start free|buy now|order now|get access|'
    r'download|schedule|book|claim|join|subscribe|register|contact us|learn more|'
    r'get quote|request demo|start trial|get demo)\b',
]


def scan_text_signals(full_text: str) -> dict:
    text_lower = full_text.lower()
    testimonials = sum(
        len(re.findall(p, text_lower, re.IGNORECASE))
        for p in TESTIMONIAL_PATTERNS
    )
    trust = {}
    for key, patterns in TRUST_PATTERNS.items():
        trust[key] = sum(len(re.findall(p, text_lower, re.IGNORECASE)) for p in patterns)

    cta_text_count = sum(
        len(re.findall(p, text_lower, re.IGNORECASE))
        for p in CTA_TEXT_PATTERNS
    )

    return {
        "testimonial_signals": min(testimonials, 20),
        "trust": trust,
        "cta_text_count": cta_text_count,
    }


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def score_category(value, thresholds: list) -> int:
    """thresholds: [(min_value, score), ...] sorted asc. Returns score for first match."""
    for min_val, score in sorted(thresholds, reverse=True):
        if value >= min_val:
            return score
    return 0


def audit(html: str) -> dict:
    parser = CROParser()
    parser.feed(html)

    full_text = " ".join(parser.full_text)
    text_signals = scan_text_signals(full_text)

    all_ctas = parser.buttons + parser.links_as_cta
    total_cta_count = len(all_ctas) + text_signals["cta_text_count"]

    # --- CTA ---
    cta_score = score_category(total_cta_count, [(0, 0), (1, 50), (2, 75), (3, 90), (5, 100)])
    cta_above_fold = len([c for c in all_ctas if c["position"] <= 5])
    if cta_above_fold >= 1:
        cta_score = min(100, cta_score + 10)

    # --- Forms ---
    if parser.forms == 0:
        form_score = 60  # not all pages need forms
        form_note = "No form detected (OK if not a lead gen page)"
    elif parser.form_fields <= 3:
        form_score = 100
        form_note = f"{parser.form_fields} field(s) — minimal friction"
    elif parser.form_fields <= 5:
        form_score = 70
        form_note = f"{parser.form_fields} field(s) — consider trimming"
    else:
        form_score = max(10, 100 - (parser.form_fields - 3) * 10)
        form_note = f"{parser.form_fields} field(s) — too many, high friction"

    # --- Social proof ---
    social_signals = text_signals["testimonial_signals"] + parser.logo_images
    social_score = score_category(social_signals, [(0, 0), (1, 40), (2, 65), (4, 85), (6, 100)])

    # --- Trust signals ---
    trust = text_signals["trust"]
    trust_total = sum(min(1, v) for v in trust.values())  # 0-3
    trust_score = score_category(trust_total, [(0, 20), (1, 60), (2, 80), (3, 100)])

    # --- Viewport meta ---
    viewport_score = 100 if parser.viewport_meta else 0

    # --- Overall ---
    weights = {
        "cta": 0.30,
        "social_proof": 0.25,
        "trust_signals": 0.20,
        "forms": 0.15,
        "viewport_mobile": 0.10,
    }
    scores = {
        "cta": cta_score,
        "social_proof": social_score,
        "trust_signals": trust_score,
        "forms": form_score,
        "viewport_mobile": viewport_score,
    }
    overall = round(sum(scores[k] * weights[k] for k in weights))

    return {
        "overall_score": overall,
        "categories": {
            "cta_buttons": {
                "score": cta_score,
                "button_count": len(parser.buttons),
                "cta_link_count": len(parser.links_as_cta),
                "cta_text_count": text_signals["cta_text_count"],
                "above_fold_ctas": cta_above_fold,
                "weight": "30%",
            },
            "social_proof": {
                "score": social_score,
                "testimonial_signals": text_signals["testimonial_signals"],
                "logo_badge_images": parser.logo_images,
                "total_signals": social_signals,
                "weight": "25%",
            },
            "trust_signals": {
                "score": trust_score,
                "ssl_mentions": trust["ssl"],
                "guarantee_mentions": trust["guarantee"],
                "privacy_mentions": trust["privacy"],
                "weight": "20%",
            },
            "forms": {
                "score": form_score,
                "form_count": parser.forms,
                "field_count": parser.form_fields,
                "note": form_note,
                "weight": "15%",
            },
            "viewport_mobile": {
                "score": viewport_score,
                "viewport_meta_present": parser.viewport_meta,
                "weight": "10%",
            },
        },
    }


# ---------------------------------------------------------------------------
# Demo HTML
# ---------------------------------------------------------------------------

DEMO_HTML = """<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Get Your Free Marketing Audit</title>
</head>
<body>
  <header>
    <img src="logo.png" alt="Acme Corp logo" class="logo">
    <a href="#form" class="btn cta">Get Free Audit</a>
  </header>
  <section class="hero">
    <h1>Stop Wasting Your Ad Budget</h1>
    <p>Join 12,400 marketers who cut wasted spend by 35% in 30 days.</p>
    <button>Start Free Trial</button>
  </section>
  <section class="social-proof">
    <h2>What Our Customers Say</h2>
    <blockquote>"This tool saved us $50,000 in the first quarter." — Sarah M., CMO</blockquote>
    <blockquote>"Best investment we made in 2023." — James T., Head of Growth</blockquote>
    <p>Rated 4.9/5 on G2 with 2,400+ reviews</p>
    <p>Trusted by 500+ companies worldwide</p>
    <img src="google-partner.png" alt="Google Partner badge" class="badge">
    <img src="trustpilot.png" alt="Trustpilot certified" class="badge">
  </section>
  <section id="form">
    <h2>Get Your Free Audit</h2>
    <form>
      <input type="text" name="name" placeholder="Your name">
      <input type="email" name="email" placeholder="Work email">
      <button type="submit">Get My Free Audit</button>
    </form>
    <p>🔒 SSL secured. We never share your data. Unsubscribe anytime.</p>
    <p>30-day money-back guarantee. No risk.</p>
  </section>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="CRO audit — analyzes an HTML page for conversion signals."
    )
    parser.add_argument("--file", help="Path to HTML file")
    parser.add_argument("--url", help="URL to fetch and analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8", errors="replace") as f:
            html = f.read()
    elif args.url:
        with urllib.request.urlopen(args.url, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    else:
        html = DEMO_HTML
        if not args.json:
            print("No input provided — running in demo mode.\n")

    result = audit(html)

    if args.json:
        print(json.dumps(result, indent=2))
        return

    cats = result["categories"]
    overall = result["overall_score"]

    print("=" * 62)
    print(f"  CRO AUDIT RESULTS   Overall Score: {overall}/100")
    print("=" * 62)

    rows = [
        ("CTA Buttons",     "cta_buttons"),
        ("Social Proof",    "social_proof"),
        ("Trust Signals",   "trust_signals"),
        ("Forms",           "forms"),
        ("Mobile Viewport", "viewport_mobile"),
    ]

    for label, key in rows:
        c = cats[key]
        score = c["score"]
        weight = c["weight"]
        bar_len = round(score / 10)
        bar = "█" * bar_len + "░" * (10 - bar_len)
        icon = "✅" if score >= 70 else ("⚠️ " if score >= 40 else "❌")
        print(f"  {icon} {label:<18} [{bar}] {score:>3}/100  (weight {weight})")

    print()
    # Detail callouts
    cta = cats["cta_buttons"]
    print(f"  CTAs: {cta['button_count']} buttons, {cta['cta_link_count']} CTA links, "
          f"{cta['cta_text_count']} CTA text phrases, {cta['above_fold_ctas']} above fold")

    sp = cats["social_proof"]
    print(f"  Social Proof: {sp['testimonial_signals']} testimonial signals, "
          f"{sp['logo_badge_images']} logos/badges")

    ts = cats["trust_signals"]
    print(f"  Trust: SSL({ts['ssl_mentions']}) Guarantee({ts['guarantee_mentions']}) "
          f"Privacy({ts['privacy_mentions']})")

    fm = cats["forms"]
    print(f"  Forms: {fm['form_count']} form(s), {fm['field_count']} field(s) — {fm['note']}")

    print()
    grade = "A" if overall >= 85 else "B" if overall >= 70 else "C" if overall >= 55 else "D" if overall >= 40 else "F"
    print("=" * 62)
    print(f"  Grade: {grade}   Score: {overall}/100")
    print("=" * 62)


if __name__ == "__main__":
    main()
