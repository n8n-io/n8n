#!/usr/bin/env python3
"""Churn impact calculator — models revenue impact of churn reduction improvements."""

import json
import sys


SAMPLE_INPUT = {
    "mrr": 50000,
    "monthly_churn_rate_pct": 4.5,
    "voluntary_churn_pct": 65,
    "current_save_rate_pct": 8,
    "target_save_rate_pct": 20,
    "current_recovery_rate_pct": 15,
    "target_recovery_rate_pct": 35,
    "avg_customer_mrr": 150
}


def calculate(inputs):
    mrr = inputs["mrr"]
    churn_rate = inputs["monthly_churn_rate_pct"] / 100
    voluntary_pct = inputs["voluntary_churn_pct"] / 100
    involuntary_pct = 1 - voluntary_pct
    current_save = inputs["current_save_rate_pct"] / 100
    target_save = inputs["target_save_rate_pct"] / 100
    current_recovery = inputs["current_recovery_rate_pct"] / 100
    target_recovery = inputs["target_recovery_rate_pct"] / 100
    avg_customer_mrr = inputs["avg_customer_mrr"]

    # Total MRR churned per month
    total_churned_mrr = mrr * churn_rate
    voluntary_churned_mrr = total_churned_mrr * voluntary_pct
    involuntary_churned_mrr = total_churned_mrr * involuntary_pct

    # Current saves/recoveries
    current_saves_mrr = voluntary_churned_mrr * current_save
    current_recoveries_mrr = involuntary_churned_mrr * current_recovery
    current_total_saved = current_saves_mrr + current_recoveries_mrr

    # Target saves/recoveries
    target_saves_mrr = voluntary_churned_mrr * target_save
    target_recoveries_mrr = involuntary_churned_mrr * target_recovery
    target_total_saved = target_saves_mrr + target_recoveries_mrr

    # Incremental gains
    incremental_monthly = target_total_saved - current_total_saved
    incremental_annual = incremental_monthly * 12

    # Customer counts
    voluntary_churned_customers = voluntary_churned_mrr / avg_customer_mrr
    involuntary_churned_customers = involuntary_churned_mrr / avg_customer_mrr
    additional_saves = (target_save - current_save) * voluntary_churned_customers
    additional_recoveries = (target_recovery - current_recovery) * involuntary_churned_customers
    total_additional_customers = additional_saves + additional_recoveries

    # LTV impact (assuming 24-month average tenure at current churn rate)
    implied_ltv_months = 1 / churn_rate
    ltv_per_customer = avg_customer_mrr * implied_ltv_months
    ltv_impact = total_additional_customers * ltv_per_customer

    return {
        "baseline": {
            "mrr": mrr,
            "monthly_churn_rate_pct": inputs["monthly_churn_rate_pct"],
            "total_churned_mrr_monthly": round(total_churned_mrr, 0),
            "voluntary_churned_mrr": round(voluntary_churned_mrr, 0),
            "involuntary_churned_mrr": round(involuntary_churned_mrr, 0),
        },
        "current_performance": {
            "save_rate_pct": inputs["current_save_rate_pct"],
            "recovery_rate_pct": inputs["current_recovery_rate_pct"],
            "monthly_saved_mrr": round(current_total_saved, 0),
            "annual_saved_mrr": round(current_total_saved * 12, 0),
        },
        "target_performance": {
            "save_rate_pct": inputs["target_save_rate_pct"],
            "recovery_rate_pct": inputs["target_recovery_rate_pct"],
            "monthly_saved_mrr": round(target_total_saved, 0),
            "annual_saved_mrr": round(target_total_saved * 12, 0),
        },
        "improvement_impact": {
            "incremental_mrr_monthly": round(incremental_monthly, 0),
            "incremental_mrr_annual": round(incremental_annual, 0),
            "additional_customers_saved_monthly": round(total_additional_customers, 1),
            "implied_ltv_per_customer": round(ltv_per_customer, 0),
            "ltv_impact_of_saved_customers": round(ltv_impact, 0),
        },
        "priorities": _prioritize(
            voluntary_churned_mrr, involuntary_churned_mrr,
            current_save, target_save,
            current_recovery, target_recovery
        )
    }


def _prioritize(vol_mrr, inv_mrr, cur_save, tgt_save, cur_rec, tgt_rec):
    save_opportunity = vol_mrr * (tgt_save - cur_save)
    rec_opportunity = inv_mrr * (tgt_rec - cur_rec)

    if save_opportunity > rec_opportunity * 1.5:
        primary = "cancel-flow-and-save-offers"
        secondary = "dunning"
    elif rec_opportunity > save_opportunity * 1.5:
        primary = "dunning-and-payment-recovery"
        secondary = "cancel-flow"
    else:
        primary = "both-roughly-equal"
        secondary = "start-with-dunning-easier-to-implement"

    return {
        "voluntary_save_opportunity_mrr": round(save_opportunity, 0),
        "involuntary_recovery_opportunity_mrr": round(rec_opportunity, 0),
        "recommendation": primary,
        "note": secondary
    }


def print_report(result):
    b = result["baseline"]
    cur = result["current_performance"]
    tgt = result["target_performance"]
    imp = result["improvement_impact"]
    pri = result["priorities"]

    print("\n" + "="*60)
    print("  CHURN IMPACT CALCULATOR")
    print("="*60)

    print(f"\n📊 BASELINE")
    print(f"   MRR:                     ${b['mrr']:,.0f}")
    print(f"   Monthly churn rate:      {b['monthly_churn_rate_pct']}%")
    print(f"   Total MRR churned/mo:    ${b['total_churned_mrr_monthly']:,.0f}")
    print(f"   └─ Voluntary:            ${b['voluntary_churned_mrr']:,.0f}")
    print(f"   └─ Involuntary:          ${b['involuntary_churned_mrr']:,.0f}")

    print(f"\n📉 CURRENT PERFORMANCE")
    print(f"   Save rate:               {cur['save_rate_pct']}%")
    print(f"   Payment recovery rate:   {cur['recovery_rate_pct']}%")
    print(f"   MRR saved monthly:       ${cur['monthly_saved_mrr']:,.0f}")
    print(f"   MRR saved annually:      ${cur['annual_saved_mrr']:,.0f}")

    print(f"\n🎯 TARGET PERFORMANCE")
    print(f"   Save rate:               {tgt['save_rate_pct']}%")
    print(f"   Payment recovery rate:   {tgt['recovery_rate_pct']}%")
    print(f"   MRR saved monthly:       ${tgt['monthly_saved_mrr']:,.0f}")
    print(f"   MRR saved annually:      ${tgt['annual_saved_mrr']:,.0f}")

    print(f"\n💰 INCREMENTAL IMPACT")
    print(f"   Additional MRR/month:    ${imp['incremental_mrr_monthly']:,.0f}")
    print(f"   Additional MRR/year:     ${imp['incremental_mrr_annual']:,.0f}")
    print(f"   Customers saved/month:   {imp['additional_customers_saved_monthly']}")
    print(f"   Implied LTV/customer:    ${imp['implied_ltv_per_customer']:,.0f}")
    print(f"   LTV impact:              ${imp['ltv_impact_of_saved_customers']:,.0f}")

    print(f"\n🔍 PRIORITY RECOMMENDATION")
    print(f"   Voluntary opportunity:   ${pri['voluntary_save_opportunity_mrr']:,.0f}/mo")
    print(f"   Involuntary opportunity: ${pri['involuntary_recovery_opportunity_mrr']:,.0f}/mo")
    print(f"   Focus on:               {pri['recommendation'].replace('-', ' ').title()}")
    if pri['note']:
        print(f"   Note:                   {pri['note'].replace('-', ' ')}")

    print("\n" + "="*60 + "\n")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Churn impact calculator — models revenue impact of churn reduction improvements."
    )
    parser.add_argument(
        "input_file", nargs="?", default=None,
        help="JSON file with churn metrics (default: run with sample data)"
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
        print("No input file provided. Running with sample data...\n")
        print("Sample input:")
        print(json.dumps(SAMPLE_INPUT, indent=2))
        inputs = SAMPLE_INPUT

    result = calculate(inputs)
    print_report(result)

    if args.json:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
