---
name: "campaign-analytics"
description: Analyzes campaign performance with multi-touch attribution, funnel conversion analysis, and ROI calculation for marketing optimization. Use when analyzing marketing campaigns, ad performance, attribution models, conversion rates, or calculating marketing ROI, ROAS, CPA, and campaign metrics across channels.
license: MIT
metadata:
  version: 1.0.0
  author: Alireza Rezvani
  category: marketing
  domain: campaign-analytics
  updated: 2026-02-06
  python-tools: attribution_analyzer.py, funnel_analyzer.py, campaign_roi_calculator.py
  tech-stack: marketing-analytics, attribution-modeling
---

# Campaign Analytics

Production-grade campaign performance analysis with multi-touch attribution modeling, funnel conversion analysis, and ROI calculation. Three Python CLI tools provide deterministic, repeatable analytics using standard library only -- no external dependencies, no API calls, no ML models.

---

## Input Requirements

All scripts accept a JSON file as positional input argument. See `assets/sample_campaign_data.json` for complete examples.

### Attribution Analyzer

```json
{
  "journeys": [
    {
      "journey_id": "j1",
      "touchpoints": [
        {"channel": "organic_search", "timestamp": "2025-10-01T10:00:00", "interaction": "click"},
        {"channel": "email", "timestamp": "2025-10-05T14:30:00", "interaction": "open"},
        {"channel": "paid_search", "timestamp": "2025-10-08T09:15:00", "interaction": "click"}
      ],
      "converted": true,
      "revenue": 500.00
    }
  ]
}
```

### Funnel Analyzer

```json
{
  "funnel": {
    "stages": ["Awareness", "Interest", "Consideration", "Intent", "Purchase"],
    "counts": [10000, 5200, 2800, 1400, 420]
  }
}
```

### Campaign ROI Calculator

```json
{
  "campaigns": [
    {
      "name": "Spring Email Campaign",
      "channel": "email",
      "spend": 5000.00,
      "revenue": 25000.00,
      "impressions": 50000,
      "clicks": 2500,
      "leads": 300,
      "customers": 45
    }
  ]
}
```

### Input Validation

Before running scripts, verify your JSON is valid and matches the expected schema. Common errors:

- **Missing required keys** (e.g., `journeys`, `funnel.stages`, `campaigns`) → script exits with a descriptive `KeyError`
- **Mismatched array lengths** in funnel data (`stages` and `counts` must be the same length) → raises `ValueError`
- **Non-numeric monetary values** in ROI data → raises `TypeError`

Use `python -m json.tool your_file.json` to validate JSON syntax before passing it to any script.

---

## Output Formats

All scripts support two output formats via the `--format` flag:

- `--format text` (default): Human-readable tables and summaries for review
- `--format json`: Machine-readable JSON for integrations and pipelines

---

## Typical Analysis Workflow

For a complete campaign review, run the three scripts in sequence:

```bash
# Step 1 — Attribution: understand which channels drive conversions
python scripts/attribution_analyzer.py campaign_data.json --model time-decay

# Step 2 — Funnel: identify where prospects drop off on the path to conversion
python scripts/funnel_analyzer.py funnel_data.json

# Step 3 — ROI: calculate profitability and benchmark against industry standards
python scripts/campaign_roi_calculator.py campaign_data.json
```

Use attribution results to identify top-performing channels, then focus funnel analysis on those channels' segments, and finally validate ROI metrics to prioritize budget reallocation.

---

## How to Use

### Attribution Analysis

```bash
# Run all 5 attribution models
python scripts/attribution_analyzer.py campaign_data.json

# Run a specific model
python scripts/attribution_analyzer.py campaign_data.json --model time-decay

# JSON output for pipeline integration
python scripts/attribution_analyzer.py campaign_data.json --format json

# Custom time-decay half-life (default: 7 days)
python scripts/attribution_analyzer.py campaign_data.json --model time-decay --half-life 14
```

### Funnel Analysis

```bash
# Basic funnel analysis
python scripts/funnel_analyzer.py funnel_data.json

# JSON output
python scripts/funnel_analyzer.py funnel_data.json --format json
```

### Campaign ROI Calculation

```bash
# Calculate ROI metrics for all campaigns
python scripts/campaign_roi_calculator.py campaign_data.json

# JSON output
python scripts/campaign_roi_calculator.py campaign_data.json --format json
```

---

## Scripts

### 1. attribution_analyzer.py

Implements five industry-standard attribution models to allocate conversion credit across marketing channels:

| Model | Description | Best For |
|-------|-------------|----------|
| First-Touch | 100% credit to first interaction | Brand awareness campaigns |
| Last-Touch | 100% credit to last interaction | Direct response campaigns |
| Linear | Equal credit to all touchpoints | Balanced multi-channel evaluation |
| Time-Decay | More credit to recent touchpoints | Short sales cycles |
| Position-Based | 40/20/40 split (first/middle/last) | Full-funnel marketing |

### 2. funnel_analyzer.py

Analyzes conversion funnels to identify bottlenecks and optimization opportunities:

- Stage-to-stage conversion rates and drop-off percentages
- Automatic bottleneck identification (largest absolute and relative drops)
- Overall funnel conversion rate
- Segment comparison when multiple segments are provided

### 3. campaign_roi_calculator.py

Calculates comprehensive ROI metrics with industry benchmarking:

- **ROI**: Return on investment percentage
- **ROAS**: Return on ad spend ratio
- **CPA**: Cost per acquisition
- **CPL**: Cost per lead
- **CAC**: Customer acquisition cost
- **CTR**: Click-through rate
- **CVR**: Conversion rate (leads to customers)
- Flags underperforming campaigns against industry benchmarks

---

## Reference Guides

| Guide | Location | Purpose |
|-------|----------|---------|
| Attribution Models Guide | `references/attribution-models-guide.md` | Deep dive into 5 models with formulas, pros/cons, selection criteria |
| Campaign Metrics Benchmarks | `references/campaign-metrics-benchmarks.md` | Industry benchmarks by channel and vertical for CTR, CPC, CPM, CPA, ROAS |
| Funnel Optimization Framework | `references/funnel-optimization-framework.md` | Stage-by-stage optimization strategies, common bottlenecks, best practices |

---

## Best Practices

1. **Use multiple attribution models** -- Compare at least 3 models to triangulate channel value; no single model tells the full story.
2. **Set appropriate lookback windows** -- Match your time-decay half-life to your average sales cycle length.
3. **Segment your funnels** -- Compare segments (channel, cohort, geography) to identify performance drivers.
4. **Benchmark against your own history first** -- Industry benchmarks provide context, but historical data is the most relevant comparison.
5. **Run ROI analysis at regular intervals** -- Weekly for active campaigns, monthly for strategic review.
6. **Include all costs** -- Factor in creative, tooling, and labor costs alongside media spend for accurate ROI.
7. **Document A/B tests rigorously** -- Use the provided template to ensure statistical validity and clear decision criteria.

---

## Limitations

- **No statistical significance testing** -- Scripts provide descriptive metrics only; p-value calculations require external tools.
- **Standard library only** -- No advanced statistical libraries. Suitable for most campaign sizes but not optimized for datasets exceeding 100K journeys.
- **Offline analysis** -- Scripts analyze static JSON snapshots; no real-time data connections or API integrations.
- **Single-currency** -- All monetary values assumed to be in the same currency; no currency conversion support.
- **Simplified time-decay** -- Exponential decay based on configurable half-life; does not account for weekday/weekend or seasonal patterns.
- **No cross-device tracking** -- Attribution operates on provided journey data as-is; cross-device identity resolution must be handled upstream.

## Related Skills

- **analytics-tracking**: For setting up tracking. NOT for analyzing data (that's this skill).
- **ab-test-setup**: For designing experiments to test what analytics reveals.
- **marketing-ops**: For routing insights to the right execution skill.
- **paid-ads**: For optimizing ad spend based on analytics findings.
