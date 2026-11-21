#!/usr/bin/env python3
"""
referral_roi_calculator.py — Calculates referral program ROI.

Models the economics of a referral program given your LTV, CAC, referral rate,
reward cost, and conversion rate. Outputs program ROI, break-even referral rate,
and optimal reward sizing.

Usage:
    python3 referral_roi_calculator.py                    # runs embedded sample
    python3 referral_roi_calculator.py params.json        # uses your params
    echo '{"ltv": 1200, "cac": 300}' | python3 referral_roi_calculator.py

JSON input format:
    {
        "ltv": 1200,               # Customer Lifetime Value ($)
        "cac": 300,                # Current avg CAC via paid channels ($)
        "active_users": 500,       # Active users who could refer
        "referral_rate": 0.05,     # % of active users who refer each month (0.05 = 5%)
        "referrals_per_referrer": 2.5,  # Avg referrals sent per active referrer
        "referral_conversion_rate": 0.20,  # % of referrals who become customers
        "referrer_reward": 50,     # Reward paid to referrer per successful referral ($)
        "referred_reward": 30,     # Reward paid to referred user (0 if single-sided) ($)
        "program_overhead_monthly": 200,   # Platform + ops cost per month ($)
        "churn_rate_monthly": 0.03,        # Monthly churn rate (used for LTV validation)
        "months_to_model": 12              # How many months to project
    }
"""

import json
import sys
from collections import OrderedDict


# ---------------------------------------------------------------------------
# Core calculation functions
# ---------------------------------------------------------------------------

def calculate_referrals_per_month(params):
    """How many successful referrals per month?"""
    active_users = params["active_users"]
    referral_rate = params["referral_rate"]
    referrals_per_referrer = params["referrals_per_referrer"]
    conversion_rate = params["referral_conversion_rate"]

    active_referrers = active_users * referral_rate
    referrals_sent = active_referrers * referrals_per_referrer
    conversions = referrals_sent * conversion_rate

    return {
        "active_referrers": round(active_referrers, 1),
        "referrals_sent": round(referrals_sent, 1),
        "new_customers_per_month": round(conversions, 1),
    }


def calculate_monthly_program_cost(params, new_customers_per_month):
    """Total cost of running the program for one month."""
    reward_per_conversion = params["referrer_reward"] + params["referred_reward"]
    reward_cost = reward_per_conversion * new_customers_per_month
    overhead = params["program_overhead_monthly"]
    return {
        "reward_cost": round(reward_cost, 2),
        "overhead_cost": round(overhead, 2),
        "total_cost": round(reward_cost + overhead, 2),
        "reward_per_conversion": round(reward_per_conversion, 2),
    }


def calculate_monthly_revenue(params, new_customers_per_month):
    """Revenue generated from referred customers in the first month."""
    # First-month value is LTV / (1 / monthly_churn) = LTV * monthly_churn
    # Simplified: use LTV * monthly_churn as first-month expected revenue contribution
    # More conservative: just count as one acquisition with full LTV expected
    ltv = params["ltv"]
    revenue = new_customers_per_month * ltv
    return round(revenue, 2)


def calculate_cac_via_referral(cost_data, new_customers_per_month):
    if new_customers_per_month == 0:
        return float('inf')
    return round(cost_data["total_cost"] / new_customers_per_month, 2)


def calculate_break_even_referral_rate(params):
    """
    What referral rate do we need so that CAC via referral equals
    reward_per_conversion + overhead_per_customer_amortized?
    
    We want: total_cost / new_customers = cac_target
    Solving for referral_rate where cac_target = 50% of paid CAC (our target)
    """
    target_cac = params["cac"] * 0.5  # goal: 50% of current CAC
    ltv = params["ltv"]
    active_users = params["active_users"]
    referrals_per_referrer = params["referrals_per_referrer"]
    conversion_rate = params["referral_conversion_rate"]
    reward_per_conversion = params["referrer_reward"] + params["referred_reward"]
    overhead = params["program_overhead_monthly"]

    # CAC_referral = (reward × conversions + overhead) / conversions
    #              = reward + overhead/conversions
    # Solve: target_cac = reward + overhead / (active_users × rate × referrals_per_referrer × conversion_rate)
    # conversions_needed = overhead / (target_cac - reward)

    if target_cac <= reward_per_conversion:
        return None  # impossible — reward alone exceeds target CAC

    conversions_needed = overhead / (target_cac - reward_per_conversion)
    referral_rate_needed = conversions_needed / (active_users * referrals_per_referrer * conversion_rate)

    return round(referral_rate_needed, 4)


def calculate_optimal_reward(params):
    """
    What's the maximum reward you can afford while keeping CAC via referral
    under 60% of paid CAC?
    
    max_total_reward = 0.60 × paid_CAC (using conversion-amortized overhead)
    """
    target_cac = params["cac"] * 0.60
    overhead_amortized = params["program_overhead_monthly"] / max(
        calculate_referrals_per_month(params)["new_customers_per_month"], 1
    )
    max_reward = target_cac - overhead_amortized

    # Split recommendation: 60% referrer, 40% referred (double-sided)
    referrer_portion = round(max_reward * 0.60, 2)
    referred_portion = round(max_reward * 0.40, 2)

    return {
        "max_total_reward": round(max(max_reward, 0), 2),
        "recommended_referrer_reward": max(referrer_portion, 0),
        "recommended_referred_reward": max(referred_portion, 0),
        "reward_as_pct_ltv": round((max_reward / params["ltv"]) * 100, 1) if params["ltv"] > 0 else 0,
    }


def calculate_roi(params):
    """
    Program ROI over the modeling period.
    ROI = (Revenue from referred customers - Program costs) / Program costs
    """
    months = params["months_to_model"]
    monthly = calculate_referrals_per_month(params)
    new_customers = monthly["new_customers_per_month"]
    costs = calculate_monthly_program_cost(params, new_customers)

    total_cost = costs["total_cost"] * months
    total_ltv_generated = new_customers * params["ltv"] * months
    net_benefit = total_ltv_generated - total_cost
    roi = (net_benefit / total_cost * 100) if total_cost > 0 else 0

    return {
        "total_cost": round(total_cost, 2),
        "total_ltv_generated": round(total_ltv_generated, 2),
        "net_benefit": round(net_benefit, 2),
        "roi_pct": round(roi, 1),
    }


def build_monthly_projection(params):
    """Build a month-by-month projection table."""
    months = params["months_to_model"]
    monthly = calculate_referrals_per_month(params)
    new_per_month = monthly["new_customers_per_month"]
    costs = calculate_monthly_program_cost(params, new_per_month)
    ltv = params["ltv"]

    rows = []
    cumulative_customers = 0
    cumulative_cost = 0
    cumulative_revenue = 0

    for m in range(1, months + 1):
        cumulative_customers += new_per_month
        month_cost = costs["total_cost"]
        month_revenue = new_per_month * ltv
        cumulative_cost += month_cost
        cumulative_revenue += month_revenue
        cumulative_net = cumulative_revenue - cumulative_cost

        rows.append({
            "month": m,
            "new_customers": round(new_per_month, 1),
            "cumulative_customers": round(cumulative_customers, 1),
            "monthly_cost": round(month_cost, 2),
            "cumulative_cost": round(cumulative_cost, 2),
            "monthly_ltv": round(month_revenue, 2),
            "cumulative_net": round(cumulative_net, 2),
        })

    return rows


def find_break_even_month(projection):
    for row in projection:
        if row["cumulative_net"] >= 0:
            return row["month"]
    return None


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

def format_currency(value):
    return f"${value:,.2f}"


def format_pct(value):
    return f"{value:.1f}%"


def print_report(params, results):
    monthly = results["monthly_referrals"]
    costs = results["monthly_costs"]
    cac = results["cac_via_referral"]
    roi = results["roi"]
    break_even_rate = results["break_even_referral_rate"]
    optimal_reward = results["optimal_reward"]
    projection = results["monthly_projection"]
    break_even_month = results["break_even_month"]

    paid_cac = params["cac"]
    ltv = params["ltv"]

    print("\n" + "=" * 60)
    print("REFERRAL PROGRAM ROI CALCULATOR")
    print("=" * 60)

    print("\n📊 INPUT PARAMETERS")
    print(f"  LTV per customer:           {format_currency(ltv)}")
    print(f"  Current paid CAC:           {format_currency(paid_cac)}")
    print(f"  Active users:               {params['active_users']:,}")
    print(f"  Referral rate (monthly):    {format_pct(params['referral_rate'] * 100)}")
    print(f"  Referrals per referrer:     {params['referrals_per_referrer']}")
    print(f"  Referral conversion rate:   {format_pct(params['referral_conversion_rate'] * 100)}")
    print(f"  Referrer reward:            {format_currency(params['referrer_reward'])}")
    print(f"  Referred user reward:       {format_currency(params['referred_reward'])}")
    print(f"  Program overhead/month:     {format_currency(params['program_overhead_monthly'])}")

    print("\n📈 MONTHLY PERFORMANCE (STEADY STATE)")
    print(f"  Active referrers/month:     {monthly['active_referrers']}")
    print(f"  Referrals sent/month:       {monthly['referrals_sent']}")
    print(f"  New customers/month:        {monthly['new_customers_per_month']}")
    print(f"  Monthly program cost:       {format_currency(costs['total_cost'])}")
    print(f"    ↳ Reward cost:            {format_currency(costs['reward_cost'])}")
    print(f"    ↳ Overhead:               {format_currency(costs['overhead_cost'])}")
    print(f"  CAC via referral:           {format_currency(cac)}")
    print(f"  Paid CAC:                   {format_currency(paid_cac)}")
    savings_pct = ((paid_cac - cac) / paid_cac * 100) if paid_cac > 0 else 0
    savings_label = f"{savings_pct:.0f}% cheaper than paid" if cac < paid_cac else "⚠️  More expensive than paid"
    print(f"  CAC comparison:             {savings_label}")

    print(f"\n💰 ROI OVER {params['months_to_model']} MONTHS")
    print(f"  Total program cost:         {format_currency(roi['total_cost'])}")
    print(f"  Total LTV generated:        {format_currency(roi['total_ltv_generated'])}")
    print(f"  Net benefit:                {format_currency(roi['net_benefit'])}")
    print(f"  Program ROI:                {format_pct(roi['roi_pct'])}")

    if break_even_month:
        print(f"  Break-even:                 Month {break_even_month}")
    else:
        print(f"  Break-even:                 Not reached in {params['months_to_model']} months")

    print("\n🎯 OPTIMIZATION INSIGHTS")
    if break_even_rate:
        current_rate = params["referral_rate"]
        rate_gap = break_even_rate - current_rate
        if rate_gap > 0:
            print(f"  Break-even referral rate:   {format_pct(break_even_rate * 100)} "
                  f"(you're at {format_pct(current_rate * 100)} — need +{format_pct(rate_gap * 100)})")
        else:
            print(f"  Break-even referral rate:   {format_pct(break_even_rate * 100)} ✅ Already above break-even")
    else:
        print(f"  Break-even referral rate:   ⚠️  Reward alone exceeds target CAC — reduce reward or increase LTV")

    print(f"\n  Optimal reward sizing (to keep CAC at ≤60% of paid CAC):")
    print(f"    Max total reward/referral:  {format_currency(optimal_reward['max_total_reward'])}")
    print(f"    Recommended referrer:       {format_currency(optimal_reward['recommended_referrer_reward'])}")
    print(f"    Recommended referred user:  {format_currency(optimal_reward['recommended_referred_reward'])}")
    print(f"    Reward as % of LTV:         {format_pct(optimal_reward['reward_as_pct_ltv'])}")

    current_total_reward = params["referrer_reward"] + params["referred_reward"]
    if current_total_reward > optimal_reward["max_total_reward"] and optimal_reward["max_total_reward"] > 0:
        print(f"  ⚠️  Your current reward ({format_currency(current_total_reward)}) "
              f"exceeds optimal ({format_currency(optimal_reward['max_total_reward'])})")
    elif optimal_reward["max_total_reward"] > 0:
        print(f"  ✅ Your current reward ({format_currency(current_total_reward)}) is within optimal range")

    print(f"\n📅 MONTHLY PROJECTION (first {min(6, len(projection))} months)")
    print(f"  {'Month':>5}  {'New Cust':>9}  {'Cumul Cust':>11}  {'Monthly Cost':>13}  {'Cumul Net':>11}")
    print(f"  {'-'*5}  {'-'*9}  {'-'*11}  {'-'*13}  {'-'*11}")
    for row in projection[:6]:
        net_str = format_currency(row["cumulative_net"])
        if row["cumulative_net"] < 0:
            net_str = f"({format_currency(abs(row['cumulative_net']))})"
        print(f"  {row['month']:>5}  {row['new_customers']:>9.1f}  {row['cumulative_customers']:>11.1f}  "
              f"{format_currency(row['monthly_cost']):>13}  {net_str:>11}")

    print("\n" + "=" * 60)


# ---------------------------------------------------------------------------
# Default parameters + sample
# ---------------------------------------------------------------------------

DEFAULT_PARAMS = {
    "ltv": 1200,
    "cac": 350,
    "active_users": 800,
    "referral_rate": 0.06,
    "referrals_per_referrer": 2.0,
    "referral_conversion_rate": 0.20,
    "referrer_reward": 50,
    "referred_reward": 30,
    "program_overhead_monthly": 200,
    "churn_rate_monthly": 0.04,
    "months_to_model": 12,
}


def run(params):
    monthly = calculate_referrals_per_month(params)
    new_customers = monthly["new_customers_per_month"]
    costs = calculate_monthly_program_cost(params, new_customers)
    cac = calculate_cac_via_referral(costs, new_customers)
    break_even_rate = calculate_break_even_referral_rate(params)
    optimal_reward = calculate_optimal_reward(params)
    roi = calculate_roi(params)
    projection = build_monthly_projection(params)
    break_even_month = find_break_even_month(projection)

    results = {
        "monthly_referrals": monthly,
        "monthly_costs": costs,
        "cac_via_referral": cac,
        "break_even_referral_rate": break_even_rate,
        "optimal_reward": optimal_reward,
        "roi": roi,
        "monthly_projection": projection,
        "break_even_month": break_even_month,
    }

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Calculates referral program ROI. "
                    "Models economics given LTV, CAC, referral rate, reward cost, "
                    "and conversion rate."
    )
    parser.add_argument(
        "file", nargs="?", default=None,
        help="Path to a JSON file with referral program parameters. "
             "If omitted, reads from stdin or runs embedded sample."
    )
    args = parser.parse_args()

    params = None

    if args.file:
        try:
            with open(args.file) as f:
                params = json.load(f)
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    elif not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            try:
                params = json.loads(raw)
            except Exception as e:
                print(f"Error reading stdin: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print("No input provided — running with sample parameters.\n")
            params = DEFAULT_PARAMS
    else:
        print("No input provided — running with sample parameters.\n")
        params = DEFAULT_PARAMS

    # Fill in defaults for any missing keys
    for k, v in DEFAULT_PARAMS.items():
        params.setdefault(k, v)

    results = run(params)
    print_report(params, results)

    # JSON output
    json_output = {
        "inputs": params,
        "results": {
            "monthly_new_customers": results["monthly_referrals"]["new_customers_per_month"],
            "cac_via_referral": results["cac_via_referral"],
            "program_roi_pct": results["roi"]["roi_pct"],
            "break_even_month": results["break_even_month"],
            "break_even_referral_rate": results["break_even_referral_rate"],
            "optimal_total_reward": results["optimal_reward"]["max_total_reward"],
            "net_benefit_12mo": results["roi"]["net_benefit"],
        }
    }

    print("\n--- JSON Output ---")
    print(json.dumps(json_output, indent=2))


if __name__ == "__main__":
    main()
