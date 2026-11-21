#!/usr/bin/env python3
"""
nap_checker.py - NAP (Name, Address, Phone) consistency checker for local businesses.

Compares the canonical NAP against known directory listing data and reports
mismatches with fix priority.

Usage:
    python3 nap_checker.py [--canonical canonical.json] [--listings listings.json]

If no files provided, runs with embedded sample data for demonstration.

Output: Human-readable mismatch report + JSON summary.
"""

import json
import re
import argparse
from typing import Dict, List, Optional, Tuple


# --- Normalizers ---

def normalize_phone(phone: str) -> str:
    """Strip all non-digit characters, return 10-digit string."""
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    return digits


def normalize_name(name: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    name = name.lower()
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    # Remove common legal suffixes for comparison
    for suffix in ['llc', 'inc', 'corp', 'ltd', 'co']:
        name = re.sub(rf'\b{suffix}\b', '', name).strip()
    return name


US_STATE_ABBREVIATIONS = {
    'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas',
    'ca': 'california', 'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware',
    'fl': 'florida', 'ga': 'georgia', 'hi': 'hawaii', 'id': 'idaho',
    'il': 'illinois', 'in': 'indiana', 'ia': 'iowa', 'ks': 'kansas',
    'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
    'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi',
    'mo': 'missouri', 'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada',
    'nh': 'new hampshire', 'nj': 'new jersey', 'nm': 'new mexico', 'ny': 'new york',
    'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio', 'ok': 'oklahoma',
    'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
    'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah',
    'vt': 'vermont', 'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia',
    'wi': 'wisconsin', 'wy': 'wyoming', 'dc': 'district of columbia',
}


def normalize_address(address: str) -> str:
    """Lowercase, expand common abbreviations, strip punctuation."""
    address = address.lower()
    replacements = {
        r'\bst\b': 'street',
        r'\bave\b': 'avenue',
        r'\bblvd\b': 'boulevard',
        r'\bdr\b': 'drive',
        r'\brd\b': 'road',
        r'\bln\b': 'lane',
        r'\bct\b': 'court',
        r'\bpl\b': 'place',
        r'\bsuite\b': 'ste',
        r'\bapt\b': 'apt',
    }
    for pattern, replacement in replacements.items():
        address = re.sub(pattern, replacement, address)
    # Expand US state abbreviations so "TX" vs "Texas" is caught for any state,
    # not just California.
    for abbr, full in US_STATE_ABBREVIATIONS.items():
        address = re.sub(rf'\b{abbr}\b', full, address)
    address = re.sub(r'[^\w\s]', ' ', address)
    address = re.sub(r'\s+', ' ', address).strip()
    return address


# --- Tier definitions ---

DIRECTORY_TIERS = {
    'google_business_profile': 1,
    'apple_maps': 1,
    'bing_places': 1,
    'yelp': 2,
    'bbb': 2,
    'angi': 2,
    'homeadvisor': 2,
    'facebook': 3,
    'yellow_pages': 3,
    'nextdoor': 3,
    'thumbtack': 3,
}

TIER_LABELS = {1: 'Critical', 2: 'High', 3: 'Medium'}


# --- Comparison logic ---

def compare_nap(canonical: Dict, listing: Dict) -> List[Dict]:
    """Return list of mismatches between canonical and a listing."""
    mismatches = []

    # Name
    canon_name = normalize_name(canonical.get('name', ''))
    listing_name = normalize_name(listing.get('name', ''))
    if canon_name != listing_name:
        mismatches.append({
            'field': 'name',
            'canonical': canonical.get('name', ''),
            'found': listing.get('name', ''),
        })

    # Phone
    canon_phone = normalize_phone(canonical.get('phone', ''))
    listing_phone = normalize_phone(listing.get('phone', ''))
    if canon_phone and listing_phone and canon_phone != listing_phone:
        mismatches.append({
            'field': 'phone',
            'canonical': canonical.get('phone', ''),
            'found': listing.get('phone', ''),
        })
    elif canon_phone and not listing.get('phone'):
        mismatches.append({
            'field': 'phone',
            'canonical': canonical.get('phone', ''),
            'found': '(missing)',
        })

    # Address - check each sub-field if structured, else compare full string
    if isinstance(canonical.get('address'), dict) and isinstance(listing.get('address'), dict):
        for sub in ['street', 'city', 'state', 'zip']:
            cv = normalize_address(str(canonical['address'].get(sub, '')))
            lv = normalize_address(str(listing['address'].get(sub, '')))
            if cv and lv and cv != lv:
                mismatches.append({
                    'field': f'address.{sub}',
                    'canonical': canonical['address'].get(sub, ''),
                    'found': listing['address'].get(sub, ''),
                })
            elif cv and not lv:
                mismatches.append({
                    'field': f'address.{sub}',
                    'canonical': canonical['address'].get(sub, ''),
                    'found': '(missing)',
                })
    elif canonical.get('address') and listing.get('address'):
        ca = normalize_address(str(canonical['address']))
        la = normalize_address(str(listing['address']))
        if ca != la:
            mismatches.append({
                'field': 'address',
                'canonical': canonical['address'],
                'found': listing['address'],
            })

    return mismatches


# --- Report generation ---

def build_report(canonical: Dict, listings: List[Dict]) -> Tuple[str, Dict]:
    lines = []
    summary = {
        'total_directories': len(listings),
        'consistent': 0,
        'mismatches': 0,
        'missing': 0,
        'critical_issues': 0,
        'issues': [],
    }

    lines.append('=' * 65)
    lines.append('NAP CONSISTENCY REPORT')
    lines.append('=' * 65)
    lines.append(f"\nCANONICAL NAP")
    lines.append(f"  Name   : {canonical.get('name', 'N/A')}")
    if isinstance(canonical.get('address'), dict):
        addr = canonical['address']
        lines.append(f"  Address: {addr.get('street', '')} {addr.get('city', '')} {addr.get('state', '')} {addr.get('zip', '')}")
    else:
        lines.append(f"  Address: {canonical.get('address', 'N/A')}")
    lines.append(f"  Phone  : {canonical.get('phone', 'N/A')}")
    lines.append(f"  Website: {canonical.get('website', 'N/A')}")
    lines.append('')

    all_issues_by_tier = {1: [], 2: [], 3: []}

    for listing in listings:
        directory = listing.get('directory', 'unknown')
        tier = DIRECTORY_TIERS.get(directory, 3)
        url = listing.get('url', '')
        listed = listing.get('listed', True)

        if not listed:
            issue = {
                'directory': directory,
                'tier': tier,
                'type': 'missing',
                'url': url,
                'mismatches': [],
            }
            all_issues_by_tier[tier].append(issue)
            summary['missing'] += 1
            if tier == 1:
                summary['critical_issues'] += 1
            continue

        mismatches = compare_nap(canonical, listing)

        if mismatches:
            issue = {
                'directory': directory,
                'tier': tier,
                'type': 'mismatch',
                'url': url,
                'mismatches': mismatches,
            }
            all_issues_by_tier[tier].append(issue)
            summary['mismatches'] += 1
            summary['issues'].append(issue)
            if tier == 1:
                summary['critical_issues'] += 1
        else:
            summary['consistent'] += 1

    # Print by tier
    for tier in [1, 2, 3]:
        tier_issues = all_issues_by_tier[tier]
        if not tier_issues:
            continue
        lines.append(f"-- TIER {tier} - {TIER_LABELS[tier]} Priority " + "-" * 30)
        for issue in tier_issues:
            dir_label = issue['directory'].replace('_', ' ').title()
            lines.append(f"\n  [{dir_label}]  {issue.get('url', '')}")
            if issue['type'] == 'missing':
                lines.append(f"  [!]  NOT LISTED -- create a listing immediately")
            else:
                for m in issue['mismatches']:
                    lines.append(f"  [X]  {m['field']}")
                    lines.append(f"       Expected : {m['canonical']}")
                    lines.append(f"       Found    : {m['found']}")
        lines.append('')

    lines.append('=' * 65)
    lines.append('SUMMARY')
    lines.append(f"  Directories checked : {summary['total_directories']}")
    lines.append(f"  Consistent          : {summary['consistent']}")
    lines.append(f"  Has mismatches      : {summary['mismatches']}")
    lines.append(f"  Not listed          : {summary['missing']}")
    lines.append(f"  Critical issues     : {summary['critical_issues']} (Tier 1 directories)")
    lines.append('=' * 65)

    if summary['critical_issues'] == 0 and summary['mismatches'] == 0 and summary['missing'] == 0:
        lines.append('\n[OK] NAP is fully consistent across all checked directories.')
    else:
        lines.append(f"\n[!] Fix Tier 1 issues first -- they have the most impact on Map Pack rankings.")

    return '\n'.join(lines), summary


# --- Sample data (for demo run) ---

SAMPLE_CANONICAL = {
    "name": "Smart Solution Appliances",
    "phone": "(415) 555-0100",
    "website": "https://smartsolutionappliances.com",
    "address": {
        "street": "123 Market Street",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94102"
    }
}

SAMPLE_LISTINGS = [
    {
        "directory": "google_business_profile",
        "listed": True,
        "url": "https://g.co/kgs/example",
        "name": "Smart Solution Appliances",
        "phone": "(415) 555-0100",
        "address": {"street": "123 Market Street", "city": "San Francisco", "state": "CA", "zip": "94102"}
    },
    {
        "directory": "yelp",
        "listed": True,
        "url": "https://yelp.com/biz/example",
        "name": "Smart Solution Appliances LLC",
        "phone": "415-555-0100",
        "address": {"street": "123 Market St", "city": "San Francisco", "state": "CA", "zip": "94102"}
    },
    {
        "directory": "bbb",
        "listed": True,
        "url": "https://bbb.org/example",
        "name": "Smart Solution Appliances",
        "phone": "(415) 555-0100",
        "address": {"street": "123 Market Street", "city": "San Francisco", "state": "California", "zip": "94102"}
    },
    {
        "directory": "apple_maps",
        "listed": False,
        "url": "",
        "name": "",
        "phone": "",
        "address": {}
    },
    {
        "directory": "angi",
        "listed": True,
        "url": "https://angi.com/companylist/example",
        "name": "Smart Solutions Appliance Repair",
        "phone": "(415) 555-0199",
        "address": {"street": "123 Market Street", "city": "San Francisco", "state": "CA", "zip": "94102"}
    },
    {
        "directory": "facebook",
        "listed": True,
        "url": "https://facebook.com/example",
        "name": "Smart Solution Appliances",
        "phone": "(415) 555-0100",
        "address": {"street": "123 Market Street", "city": "San Francisco", "state": "CA", "zip": "94102"}
    },
]


# --- Main ---

def main():
    parser = argparse.ArgumentParser(
        description='NAP consistency checker for local SEO',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('--canonical', help='Path to canonical NAP JSON file')
    parser.add_argument('--listings', help='Path to directory listings JSON file')
    parser.add_argument('--json', action='store_true', help='Output summary as JSON')
    args = parser.parse_args()

    if args.canonical:
        with open(args.canonical) as f:
            canonical = json.load(f)
    else:
        canonical = SAMPLE_CANONICAL
        print('[INFO] No --canonical file provided. Using sample data.\n')

    if args.listings:
        with open(args.listings) as f:
            listings = json.load(f)
    else:
        listings = SAMPLE_LISTINGS

    report, summary = build_report(canonical, listings)

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print(report)
        print(f'\n[JSON summary]\n{json.dumps(summary, indent=2)}')


if __name__ == '__main__':
    main()
