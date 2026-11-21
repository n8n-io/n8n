#!/usr/bin/env python3
"""
service_area_generator.py — Service area page content generator for local businesses.

Generates a structured brief for a neighborhood-specific service area page,
including word-count targets, uniqueness checklist, FAQ starters, and
schema boilerplate for the page.

Usage:
    python3 service_area_generator.py [--config config.json] [--neighborhood "Richmond District"]
    python3 service_area_generator.py  (runs sample demo)

Output: Page brief as markdown, ready to hand to content-production skill or write directly.
"""

import json
import argparse
from typing import Dict, List, Optional


# ─── Page brief builder ───────────────────────────────────────────────────────

def build_page_brief(
    business_name: str,
    business_type: str,
    services: List[str],
    primary_service: str,
    neighborhood: str,
    city: str,
    state: str,
    phone: str,
    website: str,
    years_in_business: int,
    brands_serviced: Optional[List[str]] = None,
    nearby_neighborhoods: Optional[List[str]] = None,
    zip_code: str = '',
    landmark: str = '',
) -> str:
    brands = brands_serviced or ['Samsung', 'LG', 'Whirlpool', 'GE', 'Bosch', 'Maytag', 'KitchenAid', 'Frigidaire']
    nearby = nearby_neighborhoods or []
    service_list = ', '.join(services)
    brand_list = ', '.join(brands)

    title = f"{primary_service} in {neighborhood}, {city} | {business_name}"
    meta_desc = (
        f"{business_name} provides professional {primary_service.lower()} in {neighborhood}, {city}, {state}. "
        f"Same-day service available. Call {phone} or book online."
    )

    slug = f"{primary_service.lower().replace(' ', '-')}-{neighborhood.lower().replace(' ', '-')}-{city.lower().replace(' ', '-')}"

    lines = []
    lines.append(f"# Page Brief: {title}")
    lines.append(f"\n**URL slug:** `/{slug}/`")
    lines.append(f"**Target word count:** 1,000-1,500 words")
    lines.append(f"**Primary keyword:** {primary_service} in {neighborhood}")
    lines.append(f"**Secondary keywords:** {primary_service.lower()} {neighborhood.lower()}, {primary_service.lower()} near {neighborhood.lower()}, appliance repair {zip_code}")
    lines.append(f"**Schema required:** LocalBusiness + Service + FAQPage")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"## SEO Metadata")
    lines.append(f"")
    lines.append(f"**Title tag:** {title}")
    lines.append(f"**Meta description:** {meta_desc}")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"## Page Structure")
    lines.append("")

    lines.append(f"### H1: {primary_service} in {neighborhood}")
    lines.append("")
    lines.append(f"**Opening paragraph (~150 words):**")
    lines.append(f"Write a unique intro for {neighborhood}. Must include:")
    lines.append(f"- Neighborhood name in first sentence")
    lines.append(f"- Primary service ({primary_service.lower()}) in first two sentences")
    lines.append(f"- {business_name}'s years of experience ({years_in_business} years)")
    lines.append(f"- Identify {business_name} as a {business_type} business, and reference the core services offered: {service_list}")
    lines.append(f"- One specific local reference (landmark, cross-street, or characteristic of {neighborhood})")
    if landmark:
        lines.append(f"- Suggested landmark to mention: {landmark}")
    lines.append(f"- DO NOT use: 'look no further', 'your one-stop shop', 'we are proud to'")
    lines.append("")

    lines.append(f"### H2: Appliance Brands We Service in {neighborhood}")
    lines.append(f"Write 1-2 sentences about each major brand. Brands: {brand_list}")
    lines.append(f"Angle: our technicians are trained on [brand]-specific diagnostics and use OEM parts.")
    lines.append("")

    lines.append(f"### H2: Our {neighborhood} Service Area")
    lines.append(f"Describe the coverage boundaries: streets, zip codes, adjacent areas.")
    if zip_code:
        lines.append(f"Mention zip code: {zip_code}")
    if nearby:
        lines.append(f"Mention nearby neighborhoods we also serve: {', '.join(nearby)}")
        lines.append(f"(Include internal links to those service area pages if they exist)")
    lines.append("")

    lines.append(f"### H2: Common Appliance Problems in {neighborhood} Homes")
    lines.append(f"Write 3-5 specific repair scenarios relevant to the area. Examples:")
    lines.append(f"- Washer not draining (common in older building plumbing setups)")
    lines.append(f"- Refrigerator not cooling (older homes with limited ventilation)")
    lines.append(f"- Dryer overheating (lint buildup in older vented systems)")
    lines.append(f"Add one 2-3 sentence explanation per scenario. This section drives local relevance.")
    lines.append("")

    lines.append(f"### H2: Why {neighborhood} Residents Choose {business_name}")
    lines.append(f"3-4 differentiators. Be specific — no generic claims.")
    lines.append(f"Examples: same-day availability, {years_in_business} years serving {city}, warranty on parts and labor,")
    lines.append(f"certified technicians, upfront pricing before work begins.")
    lines.append("")

    lines.append(f"### H2: Frequently Asked Questions")
    lines.append(f"Write 5 Q&A pairs. Use FAQPage schema on these.")
    lines.append(f"Suggested questions:")
    lines.append(f"1. How quickly can you reach {neighborhood} for appliance repair?")
    lines.append(f"2. What {primary_service.lower()} services do you offer in {neighborhood}?")
    lines.append(f"3. Do you offer same-day appliance repair in {neighborhood}?")
    lines.append(f"4. Are your technicians licensed and insured in {city}?")
    lines.append(f"5. How much does {primary_service.lower()} typically cost in {neighborhood}?")
    lines.append("")

    lines.append(f"### H2: Book {primary_service} in {neighborhood}")
    lines.append(f"CTA section. Include:")
    lines.append(f"- Phone: {phone}")
    lines.append(f"- Website: {website}")
    lines.append(f"- Hours (if known)")
    lines.append(f"- Restate service area: '{business_name} serves {neighborhood} and surrounding areas in {city}, {state}.'")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Schema to Add")
    lines.append("")
    lines.append("Run `scripts/schema_generator.py` with `--type service-area` to generate the JSON-LD.")
    lines.append("Required schema blocks for this page:")
    lines.append("1. `LocalBusiness` — business entity (name, address, phone, url)")
    lines.append("2. `Service` — the specific service on this page")
    lines.append("3. `FAQPage` — wrap the FAQ H2 section")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Uniqueness Checklist")
    lines.append("")
    lines.append("Before publishing, verify:")
    lines.append(f"- [ ] Opening paragraph is NOT copied from another neighborhood page")
    lines.append(f"- [ ] At least 2 {neighborhood}-specific references (landmarks, streets, zip, characteristics)")
    lines.append(f"- [ ] Internal links TO: main {primary_service.lower()} page + 2 nearby neighborhood pages")
    lines.append(f"- [ ] Internal link FROM: at least the main {primary_service.lower()} page to this page")
    lines.append(f"- [ ] Meta description is unique (not shared with any other page)")
    lines.append(f"- [ ] FAQ questions are specific to this neighborhood (not generic)")
    lines.append("")

    return '\n'.join(lines)


# ─── Sample data ──────────────────────────────────────────────────────────────

SAMPLE_CONFIG = {
    "business_name": "Smart Solution Appliances",
    "business_type": "appliance repair",
    "primary_service": "Appliance Repair",
    "services": ["washer repair", "dryer repair", "refrigerator repair", "dishwasher repair", "oven repair", "microwave repair"],
    "city": "San Francisco",
    "state": "CA",
    "phone": "(415) 555-0100",
    "website": "https://smartsolutionappliances.com",
    "years_in_business": 10,
    "brands_serviced": ["Samsung", "LG", "Whirlpool", "GE", "Bosch", "Maytag", "KitchenAid", "Frigidaire", "Electrolux"]
}

SAMPLE_NEIGHBORHOODS = [
    {"neighborhood": "Richmond District", "zip": "94118", "landmark": "Golden Gate Park", "nearby": ["Sunset District", "Presidio Heights", "Inner Richmond"]},
    {"neighborhood": "Mission District", "zip": "94110", "landmark": "Dolores Park", "nearby": ["Bernal Heights", "Noe Valley", "Castro"]},
    {"neighborhood": "Pacific Heights", "zip": "94115", "landmark": "Lafayette Park", "nearby": ["Cow Hollow", "Marina District", "Lower Pacific Heights"]},
]


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Service area page brief generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('--config', help='Path to business config JSON')
    parser.add_argument('--neighborhood', help='Neighborhood name to generate for')
    parser.add_argument('--zip', help='Zip code for the neighborhood')
    parser.add_argument('--landmark', help='Local landmark to reference', default='')
    parser.add_argument('--nearby', help='Comma-separated nearby neighborhoods', default='')
    parser.add_argument('--all-sample', action='store_true', help='Generate briefs for all sample neighborhoods')
    args = parser.parse_args()

    if args.config:
        with open(args.config) as f:
            config = json.load(f)
    else:
        config = SAMPLE_CONFIG
        if not args.neighborhood:
            print('[INFO] No --config or --neighborhood provided. Running sample demo.\n')

    if args.all_sample:
        for nb in SAMPLE_NEIGHBORHOODS:
            brief = build_page_brief(
                business_name=config['business_name'],
                business_type=config['business_type'],
                services=config['services'],
                primary_service=config['primary_service'],
                neighborhood=nb['neighborhood'],
                city=config['city'],
                state=config['state'],
                phone=config['phone'],
                website=config['website'],
                years_in_business=config['years_in_business'],
                brands_serviced=config.get('brands_serviced'),
                nearby_neighborhoods=nb.get('nearby', []),
                zip_code=nb.get('zip', ''),
                landmark=nb.get('landmark', ''),
            )
            print(brief)
            print('\n' + '=' * 65 + '\n')
        return

    neighborhood = args.neighborhood or SAMPLE_NEIGHBORHOODS[0]['neighborhood']
    zip_code = args.zip or ''
    landmark = args.landmark or ''
    nearby = [n.strip() for n in args.nearby.split(',')] if args.nearby else []

    brief = build_page_brief(
        business_name=config['business_name'],
        business_type=config['business_type'],
        services=config['services'],
        primary_service=config['primary_service'],
        neighborhood=neighborhood,
        city=config['city'],
        state=config['state'],
        phone=config['phone'],
        website=config['website'],
        years_in_business=config['years_in_business'],
        brands_serviced=config.get('brands_serviced'),
        nearby_neighborhoods=nearby,
        zip_code=zip_code,
        landmark=landmark,
    )
    print(brief)


if __name__ == '__main__':
    main()
