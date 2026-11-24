#!/usr/bin/env python3
"""
roas_calculator.py — ROAS and paid-ads metrics calculator
Usage:
  python3 roas_calculator.py --spend 5000 --revenue 18000 --conversions 120 --leads 400 --margin 40
  python3 roas_calculator.py --file campaign.json
  python3 roas_calculator.py --json          # demo + JSON output
  python3 roas_calculator.py                 # demo mode
"""

import argparse
import json
import sys


# ---------------------------------------------------------------------------
# Calculation core
# ---------------------------------------------------------------------------

def calculate(spend: float, revenue: float = 0.0, conversions: int = 0,
              leads: int = 0, margin_pct: float = 0.0,
              impressions: int = 0, clicks: int = 0) -> dict:

    results = {
        "inputs": {
            "ad_spend": spend,
            "revenue": revenue,
            "conversions": conversions,
            "leads": leads,
            "margin_pct": margin_pct,
            "impressions": impressions,
            "clicks": clicks,
        }
    }

    metrics = {}

    # --- ROAS ---
    if revenue > 0 and spend > 0:
        roas = revenue / spend
        metrics["roas"] = {
            "value": round(roas, 2),
            "formula": "revenue / ad_spend",
            "interpretation": _roas_label(roas),
        }

    # --- Break-even ROAS ---
    if margin_pct > 0:
        be_roas = 100 / margin_pct
        metrics["break_even_roas"] = {
            "value": round(be_roas, 2),
            "formula": "100 / margin_%",
            "note": f"Need {be_roas:.1f}x ROAS to cover ad costs at {margin_pct}% margin",
        }
        if revenue > 0:
            actual_roas = revenue / spend
            profitable = actual_roas >= be_roas
            metrics["profitability"] = {
                "is_profitable": profitable,
                "gap": round(actual_roas - be_roas, 2),
                "note": "Profitable ✅" if profitable else f"Unprofitable ❌ — need +{be_roas - actual_roas:.2f}x ROAS",
            }

    # --- CPA ---
    if conversions > 0 and spend > 0:
        cpa = spend / conversions
        metrics["cpa"] = {
            "value": round(cpa, 2),
            "formula": "ad_spend / conversions",
            "unit": "cost per acquisition",
        }
        if revenue > 0:
            rev_per_conversion = revenue / conversions
            metrics["revenue_per_conversion"] = {
                "value": round(rev_per_conversion, 2),
                "roi_per_conversion": round((rev_per_conversion - cpa) / cpa * 100, 1),
            }

    # --- CPL ---
    if leads > 0 and spend > 0:
        cpl = spend / leads
        metrics["cpl"] = {
            "value": round(cpl, 2),
            "formula": "ad_spend / leads",
            "unit": "cost per lead",
        }
        if conversions > 0:
            lead_to_conv_rate = conversions / leads * 100
            metrics["lead_to_conversion_rate"] = {
                "value": round(lead_to_conv_rate, 1),
                "unit": "%",
            }

    # --- Conversion rate ---
    if clicks > 0 and conversions > 0:
        cvr = conversions / clicks * 100
        metrics["conversion_rate"] = {
            "value": round(cvr, 2),
            "unit": "%",
            "benchmark": "2-5% typical for paid search",
        }
    if clicks > 0 and leads > 0:
        lcr = leads / clicks * 100
        metrics["lead_capture_rate"] = {
            "value": round(lcr, 2),
            "unit": "%",
        }

    # --- CTR ---
    if impressions > 0 and clicks > 0:
        ctr = clicks / impressions * 100
        metrics["ctr"] = {
            "value": round(ctr, 2),
            "unit": "%",
            "benchmark": "2-5% for search, 0.1-0.5% for display",
        }
        cpm = spend / impressions * 1000
        metrics["cpm"] = {
            "value": round(cpm, 2),
            "unit": "cost per 1000 impressions",
        }
        cpc = spend / clicks
        metrics["cpc"] = {
            "value": round(cpc, 2),
            "unit": "cost per click",
        }

    results["metrics"] = metrics
    results["recommendations"] = _recommendations(metrics, spend, margin_pct)
    return results


def _roas_label(roas: float) -> str:
    if roas >= 8:
        return "Excellent (8x+)"
    if roas >= 5:
        return "Strong (5-8x)"
    if roas >= 3:
        return "Good (3-5x)"
    if roas >= 2:
        return "Acceptable (2-3x) — check margins"
    if roas >= 1:
        return "Below target (<2x) — likely unprofitable"
    return "Losing money (<1x)"


def _recommendations(metrics: dict, spend: float, margin_pct: float) -> list:
    recs = []

    roas = metrics.get("roas", {}).get("value")
    be_roas = metrics.get("break_even_roas", {}).get("value")

    if roas and be_roas:
        if roas < be_roas:
            shortfall = round((be_roas - roas) * spend, 2)
            recs.append(f"⚠️  Losing ${shortfall:,.2f}/period — pause or restructure campaign immediately")
        elif roas < be_roas * 1.5:
            recs.append("⚠️  Marginally profitable — optimize creatives and targeting before scaling")
        else:
            recs.append("✅  Profitable — consider increasing budget or duplicating campaign")

    cpa = metrics.get("cpa", {}).get("value")
    cpl = metrics.get("cpl", {}).get("value")
    cvr = metrics.get("conversion_rate", {}).get("value")

    if cvr and cvr < 2:
        recs.append(f"⚠️  CVR {cvr}% is low — test new landing pages, headlines, and CTAs")
    elif cvr and cvr >= 5:
        recs.append(f"✅  Strong CVR {cvr}% — maximize traffic to this funnel")

    if cpa and cpl:
        l2c = metrics.get("lead_to_conversion_rate", {}).get("value", 0)
        if l2c < 10:
            recs.append(f"⚠️  Lead-to-close rate {l2c}% is low — review sales qualification or nurture sequence")

    ctr = metrics.get("ctr", {}).get("value")
    if ctr:
        if ctr < 1:
            recs.append(f"⚠️  CTR {ctr}% is low — refresh ad copy and audience targeting")
        elif ctr >= 5:
            recs.append(f"✅  High CTR {ctr}% — strong creative, ensure LP matches ad message")

    if not recs:
        recs.append("Add more data (margin %, impressions, leads) for actionable recommendations")

    return recs


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_DATA = {
    "spend": 8500,
    "revenue": 34200,
    "conversions": 142,
    "leads": 680,
    "margin_pct": 35,
    "impressions": 185000,
    "clicks": 3700,
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="ROAS calculator — paid ads performance metrics and recommendations."
    )
    parser.add_argument("--spend",       type=float, help="Total ad spend ($)")
    parser.add_argument("--revenue",     type=float, default=0, help="Total attributed revenue ($)")
    parser.add_argument("--conversions", type=int,   default=0, help="Number of purchases/conversions")
    parser.add_argument("--leads",       type=int,   default=0, help="Number of leads generated")
    parser.add_argument("--margin",      type=float, default=0, help="Gross margin %% (e.g. 40)")
    parser.add_argument("--impressions", type=int,   default=0, help="Total impressions")
    parser.add_argument("--clicks",      type=int,   default=0, help="Total clicks")
    parser.add_argument("--file",        help="JSON file with campaign data")
    parser.add_argument("--json",        action="store_true", help="Output as JSON")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r") as f:
            data = json.load(f)
    elif args.spend:
        data = {
            "spend": args.spend,
            "revenue": args.revenue,
            "conversions": args.conversions,
            "leads": args.leads,
            "margin_pct": args.margin,
            "impressions": args.impressions,
            "clicks": args.clicks,
        }
    else:
        data = DEMO_DATA
        if not args.json:
            print("No input provided — running in demo mode.\n")

    result = calculate(
        spend=data.get("spend", 0),
        revenue=data.get("revenue", 0),
        conversions=data.get("conversions", 0),
        leads=data.get("leads", 0),
        margin_pct=data.get("margin_pct", 0),
        impressions=data.get("impressions", 0),
        clicks=data.get("clicks", 0),
    )

    if args.json:
        print(json.dumps(result, indent=2))
        return

    inp = result["inputs"]
    metrics = result["metrics"]
    recs = result["recommendations"]

    print("=" * 62)
    print("  PAID ADS PERFORMANCE REPORT")
    print("=" * 62)
    print(f"  Spend:      ${inp['ad_spend']:>10,.2f}")
    if inp["revenue"]:    print(f"  Revenue:    ${inp['revenue']:>10,.2f}")
    if inp["conversions"]:print(f"  Conversions:{inp['conversions']:>10}")
    if inp["leads"]:      print(f"  Leads:      {inp['leads']:>10}")
    if inp["impressions"]:print(f"  Impressions:{inp['impressions']:>10,}")
    if inp["clicks"]:     print(f"  Clicks:     {inp['clicks']:>10,}")

    print()
    print("  METRICS")
    print("  " + "─" * 58)

    metric_labels = [
        ("roas",                   "ROAS",                    lambda m: f"{m['value']}x  — {m['interpretation']}"),
        ("break_even_roas",        "Break-even ROAS",         lambda m: f"{m['value']}x  — {m['note']}"),
        ("profitability",          "Profitability",           lambda m: m['note']),
        ("cpa",                    "CPA",                     lambda m: f"${m['value']:,.2f} / {m['unit']}"),
        ("revenue_per_conversion", "Rev/Conversion",          lambda m: f"${m['value']:,.2f}  (ROI {m['roi_per_conversion']}%)"),
        ("cpl",                    "CPL",                     lambda m: f"${m['value']:,.2f} / {m['unit']}"),
        ("lead_to_conversion_rate","Lead→Conv Rate",          lambda m: f"{m['value']}%"),
        ("conversion_rate",        "Conversion Rate",         lambda m: f"{m['value']}%  ({m['benchmark']})"),
        ("ctr",                    "CTR",                     lambda m: f"{m['value']}%"),
        ("cpc",                    "CPC",                     lambda m: f"${m['value']:,.2f}"),
        ("cpm",                    "CPM",                     lambda m: f"${m['value']:,.2f}"),
    ]

    for key, label, fmt in metric_labels:
        if key in metrics:
            try:
                detail = fmt(metrics[key])
                print(f"  {label:<24} {detail}")
            except Exception:
                pass

    print()
    print("  RECOMMENDATIONS")
    print("  " + "─" * 58)
    for rec in recs:
        print(f"  {rec}")
    print("=" * 62)


if __name__ == "__main__":
    main()
