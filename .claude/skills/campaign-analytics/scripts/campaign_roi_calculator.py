#!/usr/bin/env python3
"""
Campaign ROI Calculator - Comprehensive campaign ROI and performance metrics.

Calculates:
  - ROI (Return on Investment)
  - ROAS (Return on Ad Spend)
  - CPA (Cost per Acquisition/Customer)
  - CPL (Cost per Lead)
  - CAC (Customer Acquisition Cost)
  - CTR (Click-Through Rate)
  - CVR (Conversion Rate - Leads to Customers)

Includes industry benchmarking and underperformance flagging.

Usage:
    python campaign_roi_calculator.py campaign_data.json
    python campaign_roi_calculator.py campaign_data.json --format json
"""

import argparse
import json
import sys
from typing import Any, Dict, List, Optional


# Industry benchmark ranges by channel
# Format: {metric: {channel: (low, target, high)}}
BENCHMARKS: Dict[str, Dict[str, tuple]] = {
    "ctr": {
        "email": (1.0, 2.5, 5.0),
        "paid_search": (1.5, 3.5, 7.0),
        "paid_social": (0.5, 1.2, 3.0),
        "display": (0.05, 0.1, 0.5),
        "organic_search": (1.5, 3.0, 8.0),
        "organic_social": (0.5, 1.5, 4.0),
        "referral": (1.0, 3.0, 6.0),
        "direct": (2.0, 4.0, 8.0),
        "default": (0.5, 2.0, 5.0),
    },
    "roas": {
        "email": (30.0, 42.0, 60.0),
        "paid_search": (2.0, 4.0, 8.0),
        "paid_social": (1.5, 3.0, 6.0),
        "display": (0.5, 1.5, 3.0),
        "organic_search": (5.0, 10.0, 20.0),
        "organic_social": (3.0, 6.0, 12.0),
        "referral": (3.0, 5.0, 10.0),
        "direct": (4.0, 8.0, 15.0),
        "default": (2.0, 4.0, 8.0),
    },
    "cpa": {
        "email": (5.0, 15.0, 40.0),
        "paid_search": (20.0, 50.0, 150.0),
        "paid_social": (15.0, 40.0, 100.0),
        "display": (30.0, 75.0, 200.0),
        "organic_search": (5.0, 20.0, 60.0),
        "organic_social": (10.0, 30.0, 80.0),
        "referral": (10.0, 25.0, 70.0),
        "direct": (5.0, 15.0, 50.0),
        "default": (15.0, 45.0, 120.0),
    },
}


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default if denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator


def get_benchmark(metric: str, channel: str) -> tuple:
    """Get benchmark range for a metric and channel.

    Returns:
        Tuple of (low, target, high) for the given metric and channel.
    """
    metric_benchmarks = BENCHMARKS.get(metric, {})
    return metric_benchmarks.get(channel, metric_benchmarks.get("default", (0, 0, 0)))


def assess_performance(value: float, benchmark: tuple, higher_is_better: bool = True) -> str:
    """Assess a metric value against its benchmark range.

    Args:
        value: The metric value to assess.
        benchmark: Tuple of (low, target, high).
        higher_is_better: Whether higher values are better (True for CTR, ROAS; False for CPA).

    Returns:
        Performance assessment string.
    """
    low, target, high = benchmark

    if higher_is_better:
        if value >= high:
            return "excellent"
        elif value >= target:
            return "good"
        elif value >= low:
            return "below_target"
        else:
            return "underperforming"
    else:
        # For cost metrics, lower is better
        if value <= low:
            return "excellent"
        elif value <= target:
            return "good"
        elif value <= high:
            return "below_target"
        else:
            return "underperforming"


def calculate_campaign_metrics(campaign: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate all ROI metrics for a single campaign.

    Args:
        campaign: Dict with keys: name, channel, spend, revenue, impressions, clicks, leads, customers.

    Returns:
        Dict with all calculated metrics, benchmarks, and assessments.
    """
    name = campaign.get("name", "Unnamed Campaign")
    channel = campaign.get("channel", "default")
    spend = campaign.get("spend", 0.0)
    revenue = campaign.get("revenue", 0.0)
    impressions = campaign.get("impressions", 0)
    clicks = campaign.get("clicks", 0)
    leads = campaign.get("leads", 0)
    customers = campaign.get("customers", 0)

    # Core metrics
    roi = safe_divide(revenue - spend, spend) * 100
    roas = safe_divide(revenue, spend)
    cpa = safe_divide(spend, customers) if customers > 0 else None
    cpl = safe_divide(spend, leads) if leads > 0 else None
    cac = safe_divide(spend, customers) if customers > 0 else None
    ctr = safe_divide(clicks, impressions) * 100 if impressions > 0 else None
    cvr = safe_divide(customers, leads) * 100 if leads > 0 else None
    cpc = safe_divide(spend, clicks) if clicks > 0 else None
    cpm = safe_divide(spend, impressions) * 1000 if impressions > 0 else None
    lead_conversion_rate = safe_divide(leads, clicks) * 100 if clicks > 0 else None

    # Profit
    profit = revenue - spend

    # Benchmark assessments
    assessments: Dict[str, Any] = {}
    flags: List[str] = []

    if ctr is not None:
        benchmark = get_benchmark("ctr", channel)
        assessment = assess_performance(ctr, benchmark, higher_is_better=True)
        assessments["ctr"] = {
            "value": round(ctr, 2),
            "benchmark_range": {"low": benchmark[0], "target": benchmark[1], "high": benchmark[2]},
            "assessment": assessment,
        }
        if assessment == "underperforming":
            flags.append(f"CTR ({ctr:.2f}%) is below industry low ({benchmark[0]}%) for {channel}")

    if roas > 0:
        benchmark = get_benchmark("roas", channel)
        assessment = assess_performance(roas, benchmark, higher_is_better=True)
        assessments["roas"] = {
            "value": round(roas, 2),
            "benchmark_range": {"low": benchmark[0], "target": benchmark[1], "high": benchmark[2]},
            "assessment": assessment,
        }
        if assessment == "underperforming":
            flags.append(f"ROAS ({roas:.2f}x) is below industry low ({benchmark[0]}x) for {channel}")

    if cpa is not None:
        benchmark = get_benchmark("cpa", channel)
        assessment = assess_performance(cpa, benchmark, higher_is_better=False)
        assessments["cpa"] = {
            "value": round(cpa, 2),
            "benchmark_range": {"low": benchmark[0], "target": benchmark[1], "high": benchmark[2]},
            "assessment": assessment,
        }
        if assessment == "underperforming":
            flags.append(f"CPA (${cpa:.2f}) exceeds industry high (${benchmark[2]:.2f}) for {channel}")

    if profit < 0:
        flags.append(f"Campaign is unprofitable: ${profit:,.2f} net loss")

    # Recommendations
    recommendations: List[str] = []
    if ctr is not None and assessments.get("ctr", {}).get("assessment") in ("below_target", "underperforming"):
        recommendations.append("Improve ad creative and targeting to increase CTR")
    if assessments.get("roas", {}).get("assessment") in ("below_target", "underperforming"):
        recommendations.append("Review targeting and bid strategy to improve ROAS")
    if assessments.get("cpa", {}).get("assessment") in ("below_target", "underperforming"):
        recommendations.append("Optimize landing pages and conversion flow to reduce CPA")
    if cvr is not None and cvr < 10:
        recommendations.append("Lead-to-customer conversion is low; review sales process and lead quality")
    if lead_conversion_rate is not None and lead_conversion_rate < 2:
        recommendations.append("Click-to-lead rate is low; improve landing page relevance and form experience")
    if profit > 0 and assessments.get("roas", {}).get("assessment") in ("good", "excellent"):
        recommendations.append("Campaign performing well; consider scaling budget")

    return {
        "name": name,
        "channel": channel,
        "metrics": {
            "spend": round(spend, 2),
            "revenue": round(revenue, 2),
            "profit": round(profit, 2),
            "roi_pct": round(roi, 2),
            "roas": round(roas, 2),
            "cpa": round(cpa, 2) if cpa is not None else None,
            "cpl": round(cpl, 2) if cpl is not None else None,
            "cac": round(cac, 2) if cac is not None else None,
            "ctr_pct": round(ctr, 2) if ctr is not None else None,
            "cvr_pct": round(cvr, 2) if cvr is not None else None,
            "cpc": round(cpc, 2) if cpc is not None else None,
            "cpm": round(cpm, 2) if cpm is not None else None,
            "lead_conversion_rate_pct": round(lead_conversion_rate, 2) if lead_conversion_rate is not None else None,
            "impressions": impressions,
            "clicks": clicks,
            "leads": leads,
            "customers": customers,
        },
        "assessments": assessments,
        "flags": flags,
        "recommendations": recommendations,
    }


def calculate_portfolio_summary(campaign_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate aggregate metrics across all campaigns.

    Args:
        campaign_results: List of individual campaign result dicts.

    Returns:
        Portfolio-level summary with totals and weighted averages.
    """
    total_spend = sum(c["metrics"]["spend"] for c in campaign_results)
    total_revenue = sum(c["metrics"]["revenue"] for c in campaign_results)
    total_impressions = sum(c["metrics"]["impressions"] for c in campaign_results)
    total_clicks = sum(c["metrics"]["clicks"] for c in campaign_results)
    total_leads = sum(c["metrics"]["leads"] for c in campaign_results)
    total_customers = sum(c["metrics"]["customers"] for c in campaign_results)
    total_profit = total_revenue - total_spend

    underperforming = [c["name"] for c in campaign_results if c["flags"]]
    top_performers = sorted(
        campaign_results,
        key=lambda c: c["metrics"]["roi_pct"],
        reverse=True,
    )

    # Channel breakdown
    channel_totals: Dict[str, Dict[str, float]] = {}
    for c in campaign_results:
        ch = c["channel"]
        if ch not in channel_totals:
            channel_totals[ch] = {"spend": 0, "revenue": 0, "leads": 0, "customers": 0}
        channel_totals[ch]["spend"] += c["metrics"]["spend"]
        channel_totals[ch]["revenue"] += c["metrics"]["revenue"]
        channel_totals[ch]["leads"] += c["metrics"]["leads"]
        channel_totals[ch]["customers"] += c["metrics"]["customers"]

    channel_summary = {}
    for ch, totals in channel_totals.items():
        channel_summary[ch] = {
            "spend": round(totals["spend"], 2),
            "revenue": round(totals["revenue"], 2),
            "roi_pct": round(safe_divide(totals["revenue"] - totals["spend"], totals["spend"]) * 100, 2),
            "roas": round(safe_divide(totals["revenue"], totals["spend"]), 2),
            "leads": int(totals["leads"]),
            "customers": int(totals["customers"]),
        }

    return {
        "total_campaigns": len(campaign_results),
        "total_spend": round(total_spend, 2),
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "portfolio_roi_pct": round(safe_divide(total_profit, total_spend) * 100, 2),
        "portfolio_roas": round(safe_divide(total_revenue, total_spend), 2),
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_leads": total_leads,
        "total_customers": total_customers,
        "blended_ctr_pct": round(safe_divide(total_clicks, total_impressions) * 100, 2),
        "blended_cpl": round(safe_divide(total_spend, total_leads), 2) if total_leads > 0 else None,
        "blended_cpa": round(safe_divide(total_spend, total_customers), 2) if total_customers > 0 else None,
        "underperforming_campaigns": underperforming,
        "top_performer": top_performers[0]["name"] if top_performers else None,
        "channel_summary": channel_summary,
    }


def format_text(results: Dict[str, Any]) -> str:
    """Format full results as human-readable text."""
    lines: List[str] = []
    lines.append("=" * 70)
    lines.append("CAMPAIGN ROI ANALYSIS")
    lines.append("=" * 70)

    # Portfolio summary
    summary = results["portfolio_summary"]
    lines.append("")
    lines.append("PORTFOLIO SUMMARY")
    lines.append(f"  Total Campaigns:    {summary['total_campaigns']}")
    lines.append(f"  Total Spend:        ${summary['total_spend']:>12,.2f}")
    lines.append(f"  Total Revenue:      ${summary['total_revenue']:>12,.2f}")
    lines.append(f"  Total Profit:       ${summary['total_profit']:>12,.2f}")
    lines.append(f"  Portfolio ROI:      {summary['portfolio_roi_pct']}%")
    lines.append(f"  Portfolio ROAS:     {summary['portfolio_roas']}x")
    lines.append(f"  Blended CTR:        {summary['blended_ctr_pct']}%")
    if summary["blended_cpl"] is not None:
        lines.append(f"  Blended CPL:        ${summary['blended_cpl']:>12,.2f}")
    if summary["blended_cpa"] is not None:
        lines.append(f"  Blended CPA:        ${summary['blended_cpa']:>12,.2f}")

    if summary["top_performer"]:
        lines.append(f"  Top Performer:      {summary['top_performer']}")
    if summary["underperforming_campaigns"]:
        lines.append(f"  Flagged:            {', '.join(summary['underperforming_campaigns'])}")

    # Channel summary
    if summary["channel_summary"]:
        lines.append("")
        lines.append("-" * 70)
        lines.append("CHANNEL SUMMARY")
        lines.append(f"  {'Channel':<20} {'Spend':>12} {'Revenue':>12} {'ROI':>10} {'ROAS':>8}")
        lines.append(f"  {'-'*20} {'-'*12} {'-'*12} {'-'*10} {'-'*8}")
        for ch, cs in sorted(summary["channel_summary"].items()):
            lines.append(
                f"  {ch:<20} ${cs['spend']:>10,.2f} ${cs['revenue']:>10,.2f} "
                f"{cs['roi_pct']:>8.1f}% {cs['roas']:>6.2f}x"
            )

    # Individual campaigns
    for campaign in results["campaigns"]:
        lines.append("")
        lines.append("-" * 70)
        lines.append(f"CAMPAIGN: {campaign['name']}")
        lines.append(f"Channel: {campaign['channel']}")
        lines.append("-" * 70)

        m = campaign["metrics"]
        lines.append(f"  {'Metric':<25} {'Value':>15}")
        lines.append(f"  {'-'*25} {'-'*15}")
        lines.append(f"  {'Spend':<25} ${m['spend']:>13,.2f}")
        lines.append(f"  {'Revenue':<25} ${m['revenue']:>13,.2f}")
        lines.append(f"  {'Profit':<25} ${m['profit']:>13,.2f}")
        lines.append(f"  {'ROI':<25} {m['roi_pct']:>13.2f}%")
        lines.append(f"  {'ROAS':<25} {m['roas']:>13.2f}x")

        if m["cpa"] is not None:
            lines.append(f"  {'CPA':<25} ${m['cpa']:>13,.2f}")
        if m["cpl"] is not None:
            lines.append(f"  {'CPL':<25} ${m['cpl']:>13,.2f}")
        if m["cac"] is not None:
            lines.append(f"  {'CAC':<25} ${m['cac']:>13,.2f}")
        if m["ctr_pct"] is not None:
            lines.append(f"  {'CTR':<25} {m['ctr_pct']:>13.2f}%")
        if m["cpc"] is not None:
            lines.append(f"  {'CPC':<25} ${m['cpc']:>13,.2f}")
        if m["cpm"] is not None:
            lines.append(f"  {'CPM':<25} ${m['cpm']:>13,.2f}")
        if m["cvr_pct"] is not None:
            lines.append(f"  {'Lead-to-Customer CVR':<25} {m['cvr_pct']:>13.2f}%")
        if m["lead_conversion_rate_pct"] is not None:
            lines.append(f"  {'Click-to-Lead Rate':<25} {m['lead_conversion_rate_pct']:>13.2f}%")

        # Benchmark assessments
        if campaign["assessments"]:
            lines.append("")
            lines.append("  BENCHMARK ASSESSMENT")
            for metric_name, a in campaign["assessments"].items():
                br = a["benchmark_range"]
                status = a["assessment"].upper().replace("_", " ")
                lines.append(
                    f"    {metric_name.upper()}: {a['value']} "
                    f"[low={br['low']}, target={br['target']}, high={br['high']}] "
                    f"-> {status}"
                )

        # Flags
        if campaign["flags"]:
            lines.append("")
            lines.append("  WARNING FLAGS")
            for flag in campaign["flags"]:
                lines.append(f"    ! {flag}")

        # Recommendations
        if campaign["recommendations"]:
            lines.append("")
            lines.append("  RECOMMENDATIONS")
            for i, rec in enumerate(campaign["recommendations"], 1):
                lines.append(f"    {i}. {rec}")

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    """Main entry point for the campaign ROI calculator."""
    parser = argparse.ArgumentParser(
        description="Calculate campaign ROI, ROAS, CPA, CPL, CAC with industry benchmarking.",
        epilog="Example: python campaign_roi_calculator.py campaigns.json --format json",
    )
    parser.add_argument(
        "input_file",
        help="Path to JSON file containing campaign data",
    )
    parser.add_argument(
        "--format",
        choices=["json", "text"],
        default="text",
        dest="output_format",
        help="Output format (default: text)",
    )

    args = parser.parse_args()

    # Load input data
    try:
        with open(args.input_file, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {args.input_file}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {args.input_file}: {e}", file=sys.stderr)
        sys.exit(1)

    campaigns = data.get("campaigns", [])
    if not campaigns:
        print("Error: No 'campaigns' array found in input data.", file=sys.stderr)
        sys.exit(1)

    # Calculate metrics for each campaign
    campaign_results = [calculate_campaign_metrics(c) for c in campaigns]

    # Calculate portfolio summary
    portfolio_summary = calculate_portfolio_summary(campaign_results)

    results = {
        "portfolio_summary": portfolio_summary,
        "campaigns": campaign_results,
    }

    if args.output_format == "json":
        print(json.dumps(results, indent=2))
    else:
        print(format_text(results))


if __name__ == "__main__":
    main()
