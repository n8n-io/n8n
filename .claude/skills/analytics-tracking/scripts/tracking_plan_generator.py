#!/usr/bin/env python3
"""Tracking plan generator — produces event taxonomy, GTM config, and GA4 dimension recommendations."""

import json
import sys
from collections import defaultdict

SAMPLE_INPUT = {
    "business_type": "saas",
    "key_pages": [
        {"name": "Homepage", "path": "/"},
        {"name": "Pricing", "path": "/pricing"},
        {"name": "Signup", "path": "/signup"},
        {"name": "Dashboard", "path": "/app/dashboard"},
        {"name": "Onboarding", "path": "/app/onboarding"}
    ],
    "conversion_actions": [
        {"name": "Signup", "type": "registration", "value": 0},
        {"name": "Trial Start", "type": "trial", "value": 0},
        {"name": "Subscription Purchase", "type": "purchase", "value": 99},
        {"name": "Demo Request", "type": "lead", "value": 0}
    ],
    "paid_channels": ["google_ads", "meta"],
    "consent_required": True
}


EVENT_TEMPLATES = {
    "saas": {
        "acquisition": [
            {
                "event": "pricing_viewed",
                "trigger": "User navigates to /pricing",
                "parameters": ["page_location", "utm_source", "referrer_page"],
                "priority": "high"
            },
            {
                "event": "demo_requested",
                "trigger": "User submits demo request form",
                "parameters": ["source", "page_location", "form_name"],
                "priority": "high",
                "is_conversion": True
            },
            {
                "event": "content_downloaded",
                "trigger": "User downloads gated content",
                "parameters": ["content_name", "content_type", "gated"],
                "priority": "medium"
            }
        ],
        "registration": [
            {
                "event": "signup_started",
                "trigger": "User clicks primary signup CTA",
                "parameters": ["page_location", "cta_text", "plan_name"],
                "priority": "high"
            },
            {
                "event": "signup_completed",
                "trigger": "User account successfully created",
                "parameters": ["method", "user_id", "plan_name"],
                "priority": "critical",
                "is_conversion": True
            },
            {
                "event": "trial_started",
                "trigger": "Free trial begins",
                "parameters": ["plan_name", "trial_length_days", "user_id"],
                "priority": "critical",
                "is_conversion": True
            }
        ],
        "onboarding": [
            {
                "event": "onboarding_started",
                "trigger": "User enters onboarding flow",
                "parameters": ["user_id", "onboarding_variant"],
                "priority": "high"
            },
            {
                "event": "onboarding_step_completed",
                "trigger": "User completes each onboarding step",
                "parameters": ["step_name", "step_number", "user_id", "time_spent_seconds"],
                "priority": "high"
            },
            {
                "event": "onboarding_completed",
                "trigger": "User completes full onboarding",
                "parameters": ["steps_total", "user_id", "time_to_complete_seconds"],
                "priority": "high"
            },
            {
                "event": "feature_activated",
                "trigger": "User activates a key feature for first time",
                "parameters": ["feature_name", "user_id", "activation_method"],
                "priority": "medium"
            }
        ],
        "conversion": [
            {
                "event": "plan_selected",
                "trigger": "User clicks on a pricing plan",
                "parameters": ["plan_name", "billing_period", "value"],
                "priority": "critical"
            },
            {
                "event": "checkout_started",
                "trigger": "User enters checkout flow",
                "parameters": ["plan_name", "value", "currency", "billing_period"],
                "priority": "critical"
            },
            {
                "event": "checkout_completed",
                "trigger": "Payment successfully processed",
                "parameters": ["plan_name", "value", "currency", "transaction_id", "billing_period"],
                "priority": "critical",
                "is_conversion": True
            }
        ],
        "retention": [
            {
                "event": "subscription_cancelled",
                "trigger": "User confirms cancellation",
                "parameters": ["cancel_reason", "plan_name", "save_offer_shown", "save_offer_accepted"],
                "priority": "high"
            },
            {
                "event": "subscription_reactivated",
                "trigger": "Cancelled user reactivates",
                "parameters": ["plan_name", "days_since_cancel"],
                "priority": "high"
            }
        ]
    },
    "ecommerce": {
        "acquisition": [
            {
                "event": "product_viewed",
                "trigger": "User views a product page",
                "parameters": ["item_id", "item_name", "item_category", "value"],
                "priority": "high"
            },
            {
                "event": "search_performed",
                "trigger": "User submits a search query",
                "parameters": ["search_term", "results_count"],
                "priority": "medium"
            }
        ],
        "conversion": [
            {
                "event": "add_to_cart",
                "trigger": "User adds item to cart",
                "parameters": ["item_id", "item_name", "value", "currency", "quantity"],
                "priority": "critical"
            },
            {
                "event": "checkout_started",
                "trigger": "User begins checkout",
                "parameters": ["value", "currency", "num_items"],
                "priority": "critical"
            },
            {
                "event": "checkout_completed",
                "trigger": "Order placed successfully",
                "parameters": ["transaction_id", "value", "currency", "tax", "shipping"],
                "priority": "critical",
                "is_conversion": True
            }
        ]
    }
}

CUSTOM_DIMENSIONS = {
    "user_scoped": [
        {"name": "User ID", "parameter": "user_id", "description": "Internal user identifier"},
        {"name": "Plan Name", "parameter": "plan_name", "description": "Current subscription plan"},
        {"name": "Billing Period", "parameter": "billing_period", "description": "Monthly or annual"},
        {"name": "Signup Method", "parameter": "signup_method", "description": "Email, Google, SSO"},
        {"name": "Onboarding Status", "parameter": "onboarding_completed", "description": "Boolean: completed onboarding?"}
    ],
    "event_scoped": [
        {"name": "Cancel Reason", "parameter": "cancel_reason", "description": "Exit survey selection"},
        {"name": "Feature Name", "parameter": "feature_name", "description": "Feature being used/activated"},
        {"name": "Form Name", "parameter": "form_name", "description": "Which form was submitted"},
        {"name": "Content Name", "parameter": "content_name", "description": "Downloaded/viewed content"},
        {"name": "Error Type", "parameter": "error_type", "description": "Type of error encountered"}
    ]
}


def generate_tracking_plan(inputs):
    biz_type = inputs.get("business_type", "saas")
    templates = EVENT_TEMPLATES.get(biz_type, EVENT_TEMPLATES["saas"])
    paid = inputs.get("paid_channels", [])
    consent = inputs.get("consent_required", False)
    conversions = inputs.get("conversion_actions", [])

    # Build event taxonomy
    all_events = []
    for category, events in templates.items():
        for ev in events:
            all_events.append({**ev, "category": category})

    # Add conversion-specific events from input
    conversion_events = []
    for ca in conversions:
        if ca["type"] == "purchase":
            for ev in all_events:
                if ev["event"] == "checkout_completed":
                    ev["value_hint"] = ca["value"]
            conversion_events.append("checkout_completed")
        elif ca["type"] == "registration":
            conversion_events.append("signup_completed")
        elif ca["type"] == "lead":
            conversion_events.append("demo_requested")
        elif ca["type"] == "trial":
            conversion_events.append("trial_started")

    # GTM tag configuration
    gtm_tags = []
    for ev in all_events:
        gtm_tags.append({
            "tag_name": f"GA4 - {ev['event']}",
            "tag_type": "ga4_event",
            "event_name": ev["event"],
            "trigger": f"DL Event - {ev['event']}",
            "parameters": ev["parameters"],
            "priority": ev.get("priority", "medium")
        })

    # Add platform-specific tags
    if "google_ads" in paid:
        for ev in all_events:
            if ev.get("is_conversion"):
                gtm_tags.append({
                    "tag_name": f"Google Ads - {ev['event']}",
                    "tag_type": "google_ads_conversion",
                    "event_name": ev["event"],
                    "trigger": f"DL Event - {ev['event']}",
                    "note": "Import from GA4 conversions (preferred) or configure conversion ID"
                })

    if "meta" in paid:
        gtm_tags.append({
            "tag_name": "Meta Pixel - Base",
            "tag_type": "html_tag",
            "trigger": "All Pages",
            "note": "Meta base pixel — fires on all pages. Add Standard Events separately."
        })

    # Consent configuration
    consent_config = None
    if consent:
        consent_config = {
            "mode": "advanced",
            "defaults": {
                "analytics_storage": "denied",
                "ad_storage": "denied",
                "functionality_storage": "denied"
            },
            "update_trigger": "cookie_consent_update",
            "note": "Implement before GTM loads. Requires CMP integration (Cookiebot, OneTrust, etc.)."
        }

    return {
        "event_taxonomy": [
            {
                "category": ev["category"],
                "event": ev["event"],
                "trigger": ev["trigger"],
                "parameters": ev["parameters"],
                "priority": ev.get("priority", "medium"),
                "is_conversion": ev.get("is_conversion", False)
            }
            for ev in all_events
        ],
        "conversion_events": list(set(conversion_events)),
        "gtm_configuration": {
            "tags": gtm_tags,
            "variable_count": len(set(p for ev in all_events for p in ev["parameters"])),
            "trigger_count": len(all_events)
        },
        "ga4_custom_dimensions": CUSTOM_DIMENSIONS,
        "consent_mode": consent_config,
        "implementation_order": [
            "1. Register custom dimensions in GA4 (Admin > Custom Definitions)",
            "2. Set up GTM container structure (variables first, then triggers, then tags)",
            "3. Implement dataLayer pushes in application code",
            "4. Test each event in GTM Preview + GA4 DebugView",
            "5. Mark conversion events in GA4 (Admin > Conversions)",
            "6. Link GA4 to Google Ads if running paid search",
            "7. Enable internal traffic filter",
            "8. Implement consent mode if required"
        ]
    }


def print_report(result, inputs):
    print("\n" + "="*65)
    print("  TRACKING PLAN GENERATOR")
    print("="*65)

    print(f"\n📋 BUSINESS TYPE: {inputs.get('business_type', 'saas').upper()}")

    events = result["event_taxonomy"]
    by_priority = defaultdict(list)
    for ev in events:
        by_priority[ev["priority"]].append(ev)

    print(f"\n📊 EVENT TAXONOMY ({len(events)} events)")
    for priority in ["critical", "high", "medium", "low"]:
        evs = by_priority.get(priority, [])
        if evs:
            marker = "🔴" if priority == "critical" else "🟡" if priority == "high" else "⚪"
            print(f"\n  {marker} {priority.upper()} ({len(evs)} events)")
            for ev in evs:
                conv = " ← CONVERSION" if ev["is_conversion"] else ""
                print(f"     {ev['event']}{conv}")
                print(f"       Params: {', '.join(ev['parameters'][:4])}" +
                      (f"... +{len(ev['parameters'])-4} more" if len(ev['parameters']) > 4 else ""))

    conversions = result["conversion_events"]
    print(f"\n🎯 CONVERSION EVENTS ({len(conversions)})")
    for ev in conversions:
        print(f"   • {ev}")

    dims = result["ga4_custom_dimensions"]
    print(f"\n📐 CUSTOM DIMENSIONS")
    print(f"   User-scoped ({len(dims['user_scoped'])}): " +
          ", ".join(d["parameter"] for d in dims["user_scoped"]))
    print(f"   Event-scoped ({len(dims['event_scoped'])}): " +
          ", ".join(d["parameter"] for d in dims["event_scoped"]))

    gtm = result["gtm_configuration"]
    print(f"\n🏷️  GTM CONFIGURATION")
    print(f"   Tags to create:     {len(gtm['tags'])}")
    print(f"   Triggers to create: {gtm['trigger_count']}")
    print(f"   Variables to create:{gtm['variable_count']}")

    if result["consent_mode"]:
        print(f"\n🔒 CONSENT MODE: Advanced (required)")
        print(f"   Default state: analytics_storage=denied, ad_storage=denied")

    print(f"\n📋 IMPLEMENTATION ORDER")
    for step in result["implementation_order"]:
        print(f"   {step}")

    print("\n" + "="*65)
    print("  Run with --json flag to output full config as JSON")
    print("="*65 + "\n")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Tracking plan generator — produces event taxonomy, GTM config, and GA4 dimension recommendations."
    )
    parser.add_argument(
        "input_file", nargs="?", default=None,
        help="JSON file with business config (default: run with sample SaaS data)"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output full config as JSON"
    )
    args = parser.parse_args()

    if args.input_file:
        with open(args.input_file) as f:
            inputs = json.load(f)
    else:
        if not args.json:
            print("No input file provided. Running with sample data...\n")
        inputs = SAMPLE_INPUT

    result = generate_tracking_plan(inputs)
    print_report(result, inputs)

    if args.json:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
