#!/usr/bin/env python3
"""Pricing modeler — projects revenue at different price points and recommends tier structure."""

import json
import sys
import math

SAMPLE_INPUT = {
    "current_mrr": 45000,
    "current_customers": 300,
    "monthly_new_customers": 25,
    "monthly_churn_rate_pct": 3.5,
    "trial_to_paid_rate_pct": 18,
    "current_plans": [
        {"name": "Starter", "price": 29, "customer_count": 180},
        {"name": "Pro", "price": 79, "customer_count": 100},
        {"name": "Enterprise", "price": 199, "customer_count": 20}
    ],
    "competitor_prices": [49, 89, 249],
    "cogs_per_customer_monthly": 8,
    "target_gross_margin_pct": 75
}


def calculate_arpu(plans):
    total_rev = sum(p["price"] * p["customer_count"] for p in plans)
    total_cust = sum(p["customer_count"] for p in plans)
    return total_rev / total_cust if total_cust > 0 else 0


def project_revenue_at_price(base_customers, base_arpu, new_arpu,
                              new_customers_monthly, churn_rate, months=12):
    """Project MRR over N months at a new ARPU, assuming some churn from price change."""
    price_increase_pct = (new_arpu - base_arpu) / base_arpu if base_arpu > 0 else 0

    # Estimate churn uplift from price increase
    # Empirical: each 10% price increase causes ~2-4% additional one-time churn
    if price_increase_pct > 0:
        price_churn_hit = price_increase_pct * 0.25  # 25% of increase leaks as churn
    else:
        price_churn_hit = 0

    monthly_churn = churn_rate / 100

    mrr_series = []
    customers = base_customers * (1 - price_churn_hit)  # initial price churn hit
    mrr = customers * new_arpu

    for month in range(1, months + 1):
        mrr_series.append(round(mrr, 0))
        customers = customers * (1 - monthly_churn) + new_customers_monthly
        mrr = customers * new_arpu

    return {
        "month_1_mrr": mrr_series[0],
        "month_6_mrr": mrr_series[5],
        "month_12_mrr": mrr_series[11],
        "total_12mo_revenue": sum(mrr_series),
        "customers_after_price_churn": round(base_customers * (1 - price_churn_hit), 0)
    }


def recommend_tier_structure(plans, competitor_prices, cogs, target_margin_pct):
    """Recommend Good-Better-Best tier structure based on current state and competitors."""
    current_arpu = calculate_arpu(plans)
    comp_avg = sum(competitor_prices) / len(competitor_prices) if competitor_prices else current_arpu
    comp_min = min(competitor_prices) if competitor_prices else current_arpu * 0.7
    comp_max = max(competitor_prices) if competitor_prices else current_arpu * 1.5

    # Minimum price based on cost structure
    min_viable_price = cogs / (1 - target_margin_pct / 100)

    # Recommended tier anchors
    entry_price = max(min_viable_price, comp_min * 0.9)
    mid_price = entry_price * 2.5
    premium_price = mid_price * 2.5

    # Round to psychologically clean prices
    def clean_price(p):
        if p < 30:
            return round(p / 5) * 5 - 1  # e.g., 19, 29
        elif p < 100:
            return round(p / 10) * 10 - 1  # e.g., 49, 79, 99
        elif p < 500:
            return round(p / 25) * 25 - 1  # e.g., 149, 199, 299
        else:
            return round(p / 100) * 100 - 1  # e.g., 499, 999

    return {
        "entry": {
            "name": "Starter",
            "recommended_price": clean_price(entry_price),
            "positioning": "For individuals and small teams getting started"
        },
        "mid": {
            "name": "Professional",
            "recommended_price": clean_price(mid_price),
            "positioning": "For growing teams that need the full feature set — recommended for most"
        },
        "premium": {
            "name": "Enterprise",
            "recommended_price": clean_price(premium_price),
            "positioning": "For larger organizations needing security, compliance, and dedicated support"
        },
        "rationale": {
            "current_arpu": round(current_arpu, 2),
            "competitor_range": f"${comp_min}-${comp_max}",
            "min_viable_price": round(min_viable_price, 2),
            "pricing_vs_market": "at-market" if abs(current_arpu - comp_avg) / comp_avg < 0.15 else
                                 "below-market" if current_arpu < comp_avg else "above-market"
        }
    }


def elasticity_estimate(trial_to_paid_pct, current_arpu):
    """Rough price elasticity signal based on conversion rate."""
    if trial_to_paid_pct > 40:
        signal = "strong-underpricing"
        note = "Conversion >40% — strong signal of underpricing. Test 20-30% increase."
        headroom = 0.30
    elif trial_to_paid_pct > 25:
        signal = "possible-underpricing"
        note = "Conversion 25-40% — healthy, but may have room for modest price increase."
        headroom = 0.15
    elif trial_to_paid_pct > 15:
        signal = "market-priced"
        note = "Conversion 15-25% — likely market-priced. Focus on tier structure and packaging."
        headroom = 0.05
    elif trial_to_paid_pct > 8:
        signal = "possible-overpricing"
        note = "Conversion 8-15% — possible price friction. Audit trial experience before reducing price."
        headroom = -0.05
    else:
        signal = "high-friction"
        note = "Conversion <8% — significant friction. May be pricing, trial experience, or ICP fit."
        headroom = -0.15

    return {
        "signal": signal,
        "note": note,
        "estimated_price_headroom_pct": round(headroom * 100, 0),
        "suggested_test_price": round(current_arpu * (1 + headroom), 2)
    }


def print_report(result, inputs):
    cur = result["current_state"]
    elast = result["elasticity"]
    tiers = result["tier_recommendation"]
    scenarios = result["price_scenarios"]

    print("\n" + "="*65)
    print("  PRICING MODELER")
    print("="*65)

    print(f"\n📊 CURRENT STATE")
    print(f"   MRR:                     ${cur['current_mrr']:,.0f}")
    print(f"   Customers:               {cur['customers']}")
    print(f"   ARPU:                    ${cur['arpu']:.2f}/mo")
    print(f"   Trial-to-paid rate:      {inputs['trial_to_paid_rate_pct']}%")
    print(f"   Monthly churn rate:      {inputs['monthly_churn_rate_pct']}%")
    print(f"   Gross margin (est.):     {cur['gross_margin_pct']:.1f}%")

    print(f"\n💡 PRICE ELASTICITY SIGNAL")
    print(f"   Signal:    {elast['signal'].replace('-', ' ').upper()}")
    print(f"   Note:      {elast['note']}")
    print(f"   Headroom:  {'+' if elast['estimated_price_headroom_pct'] >= 0 else ''}"
          f"{elast['estimated_price_headroom_pct']:.0f}%")
    print(f"   Test at:   ${elast['suggested_test_price']:.2f}/mo ARPU")

    print(f"\n📐 RECOMMENDED TIER STRUCTURE")
    tier_rat = tiers['rationale']
    print(f"   Market position:  {tier_rat['pricing_vs_market'].replace('-', ' ').title()}")
    print(f"   Competitor range: {tier_rat['competitor_range']}")
    print(f"   Min viable price: ${tier_rat['min_viable_price']:.2f}/mo")
    print(f"\n   ┌─────────────────┬────────────┬────────────────────────────────────┐")
    print(f"   │ Tier            │ Price      │ Positioning                        │")
    print(f"   ├─────────────────┼────────────┼────────────────────────────────────┤")
    for key in ["entry", "mid", "premium"]:
        t = tiers[key]
        name = t["name"].ljust(15)
        price = f"${t['recommended_price']}/mo".ljust(10)
        pos = t["positioning"][:34].ljust(34)
        print(f"   │ {name} │ {price} │ {pos} │")
    print(f"   └─────────────────┴────────────┴────────────────────────────────────┘")

    print(f"\n📈 REVENUE SCENARIOS (12-month projection)")
    print(f"   {'Scenario':<25} {'Mo 1 MRR':>10} {'Mo 6 MRR':>10} {'Mo 12 MRR':>10} {'12mo Total':>12}")
    print(f"   {'-'*67}")
    for s in scenarios:
        print(f"   {s['scenario']:<25} "
              f"${s['month_1_mrr']:>9,.0f} "
              f"${s['month_6_mrr']:>9,.0f} "
              f"${s['month_12_mrr']:>9,.0f} "
              f"${s['total_12mo_revenue']:>11,.0f}")

    print(f"\n🎯 RECOMMENDATION")
    best = max(scenarios, key=lambda s: s['total_12mo_revenue'])
    current = next((s for s in scenarios if s['scenario'] == 'Current pricing'), scenarios[0])
    uplift = best['total_12mo_revenue'] - current['total_12mo_revenue']
    print(f"   Best scenario:    {best['scenario']}")
    print(f"   12-month uplift:  ${uplift:,.0f} vs. current")
    print(f"   Note: Projections assume trial volume and churn hold constant.")
    print(f"         Test price increases on new customers first.")

    print("\n" + "="*65 + "\n")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Pricing modeler — projects revenue at different price points and recommends tier structure."
    )
    parser.add_argument(
        "input_file", nargs="?", default=None,
        help="JSON file with pricing data (default: run with sample data)"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output results as JSON"
    )
    args = parser.parse_args()

    if args.input_file:
        with open(args.input_file) as f:
            inputs = json.load(f)
    else:
        if not args.json:
            print("No input file provided. Running with sample data...\n")
        inputs = SAMPLE_INPUT

    current_arpu = calculate_arpu(inputs["current_plans"])
    total_customers = inputs["current_customers"]
    cogs = inputs["cogs_per_customer_monthly"]
    target_margin = inputs["target_gross_margin_pct"]

    gross_margin = ((current_arpu - cogs) / current_arpu * 100) if current_arpu > 0 else 0

    tier_rec = recommend_tier_structure(
        inputs["current_plans"],
        inputs.get("competitor_prices", []),
        cogs,
        target_margin
    )

    elast = elasticity_estimate(inputs["trial_to_paid_rate_pct"], current_arpu)

    # Model multiple scenarios
    churn = inputs["monthly_churn_rate_pct"]
    new_mo = inputs["monthly_new_customers"]

    scenarios = []
    for label, arpu in [
        ("Current pricing", current_arpu),
        ("5% price increase", current_arpu * 1.05),
        ("15% price increase", current_arpu * 1.15),
        ("25% price increase", current_arpu * 1.25),
        ("Recommended tiers", tier_rec["mid"]["recommended_price"])
    ]:
        proj = project_revenue_at_price(total_customers, current_arpu, arpu, new_mo, churn)
        scenarios.append({"scenario": label, "arpu": round(arpu, 2), **proj})

    result = {
        "current_state": {
            "current_mrr": inputs["current_mrr"],
            "customers": total_customers,
            "arpu": round(current_arpu, 2),
            "gross_margin_pct": round(gross_margin, 1)
        },
        "elasticity": elast,
        "tier_recommendation": tier_rec,
        "price_scenarios": scenarios
    }

    print_report(result, inputs)

    if args.json:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
