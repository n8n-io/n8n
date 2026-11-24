#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Search - BM25 search engine for UI/UX style guides
Usage: python search.py "<query>" [--domain <domain>] [--stack <stack>] [--max-results 3]
       python search.py "<query>" --design-system [-p "Project Name"]
       python search.py "<query>" --design-system --persist [-p "Project Name"] --output-dir "<project-root>" [--page "dashboard"]
       python search.py "<query>" --design-system --variance 8 --motion 9 --density 7

Domains: style, color, chart, landing, product, ux, typography, google-fonts, icons, gsap, react, web
Stacks: react, nextjs, vue, svelte, astro, swiftui, react-native, flutter, nuxtjs, nuxt-ui,
        html-tailwind, shadcn, jetpack-compose, threejs, angular, laravel

Design dials (1-10, only with --design-system):
  --variance   DESIGN_VARIANCE: 1=centered/minimal, 10=bold/asymmetric
  --motion     MOTION_INTENSITY: 1=subtle, 10=complex; attaches a GSAP snippet from motion.csv
  --density    VISUAL_DENSITY: 1=spacious, 10=dense/dashboard; overrides the spacing scale

Persistence (Master + Overrides pattern):
  --persist      Save design system to design-system/<project-slug>/MASTER.md
  --output-dir   Directory the design-system/ folder is created under (defaults to cwd --
                 always pass this explicitly, pointed at the project root)
  --page         Also create a page-specific override file in design-system/<project-slug>/pages/
  --force        Overwrite an existing MASTER.md (without this, persistence is skipped
                 if MASTER.md already exists, so prior design decisions aren't lost)
"""

import argparse
import json as json_module
import os
import sys
import io

# Embedded Python builds (for example AutoClaw's bundled runtime, which ships a
# ._pth file) do not add this script's directory to sys.path. Resolve sibling
# modules explicitly so `python <path>/search.py` works in those environments.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import CSV_CONFIG, AVAILABLE_STACKS, MAX_RESULTS, RTL_LEVEL_CHOICES, UNTRUNCATED_COLS, search, search_stack
from design_system import generate_design_system

# Force UTF-8 for stdout/stderr to handle emojis on Windows (cp1252 default)
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

TRUNCATE_AT = 300


def format_output(result, full=False):
    """Format results for Claude consumption (token-optimized)"""
    if "error" in result:
        return f"Error: {result['error']}"

    output = []
    if result.get("stack"):
        output.append("## UI Pro Max Stack Guidelines")
        output.append(f"**Stack:** {result['stack']} | **Query:** {result['query']}")
    else:
        output.append("## UI Pro Max Search Results")
        domain_note = result['domain']
        if result.get("auto_detected"):
            domain_note += " (auto-detected"
            if result.get("runner_up_domain"):
                domain_note += f", runner-up: {result['runner_up_domain']}"
            domain_note += ")"
        output.append(f"**Domain:** {domain_note} | **Query:** {result['query']}")
    output.append(f"**Source:** {result['file']} | **Found:** {result['count']} results\n")

    if result['count'] == 0:
        redirect = result.get("redirect")
        if redirect:
            output.append(
                "This legacy style label is now modeled in the "
                f"`{redirect['domain']}` domain as `{redirect['id']}`. "
                "Search that domain instead of treating a page composition as a visual style."
            )
            return "\n".join(output)
        output.append(
            "No matches. This is not a match with an empty value -- the query "
            "did not hit the database. Retry with broader/different keywords "
            "before falling back to general defaults, and say explicitly that "
            "no database match was found if you do fall back."
        )
        suggestions = result.get("suggestions") or []
        if suggestions:
            output.append(f"**Closest known terms:** {', '.join(suggestions)}")
        return "\n".join(output)

    for i, row in enumerate(result['results'], 1):
        output.append(f"### Result {i}")
        for key, value in row.items():
            value_str = str(value)
            if not full and key not in UNTRUNCATED_COLS and len(value_str) > TRUNCATE_AT:
                value_str = value_str[:TRUNCATE_AT] + "..."
            output.append(f"- **{key}:** {value_str}")
        output.append("")

    return "\n".join(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="UI Pro Max Search")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--domain", "-d", choices=list(CSV_CONFIG.keys()), help="Search domain")
    parser.add_argument("--rtl", nargs="?", const="all", choices=list(RTL_LEVEL_CHOICES), metavar="LEVEL",
                        help="Filter style/product results by RTL compatibility: full (mirrors without work), "
                             "partial (mirrors with per-component work), caveats (layout depends on reading "
                             "direction); omit the value for all levels. Requires --domain style or product")
    parser.add_argument("--stack", "-s", choices=AVAILABLE_STACKS, help=f"Stack-specific search. Available: {', '.join(AVAILABLE_STACKS)}")
    parser.add_argument("--max-results", "-n", type=int, choices=range(1, 21), default=MAX_RESULTS,
                        metavar="1-20", help="Max results (default: 3)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--full", action="store_true", help="Do not truncate long field values in text output")
    # Design system generation
    parser.add_argument("--design-system", "-ds", action="store_true", help="Generate complete design system recommendation")
    parser.add_argument("--project-name", "-p", type=str, default=None, help="Project name for design system output")
    parser.add_argument("--format", "-f", choices=["ascii", "markdown"], default="ascii", help="Output format for design system (ignored if --json)")
    # Persistence (Master + Overrides pattern)
    parser.add_argument("--persist", action="store_true", help="Save design system to design-system/<project-slug>/MASTER.md (creates hierarchical structure)")
    parser.add_argument("--page", type=str, default=None, help="Create page-specific override file in design-system/<project-slug>/pages/")
    parser.add_argument("--output-dir", "-o", type=str, default=None, help="Output directory for persisted files (default: current directory -- pass this explicitly, pointed at the project root)")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing MASTER.md when persisting (default: skip if it already exists)")
    # Design dials (1-10), only applied with --design-system
    parser.add_argument("--variance", type=int, choices=range(1, 11), metavar="1-10", help="DESIGN_VARIANCE dial: 1=centered/minimal, 10=bold/asymmetric (only with --design-system)")
    parser.add_argument("--motion", type=int, choices=range(1, 11), metavar="1-10", help="MOTION_INTENSITY dial: 1=subtle, 10=complex; pulls a matching GSAP snippet from motion.csv (only with --design-system)")
    parser.add_argument("--density", type=int, choices=range(1, 11), metavar="1-10", help="VISUAL_DENSITY dial: 1=spacious, 10=dense/dashboard; overrides the spacing scale (only with --design-system)")

    args = parser.parse_args()

    # Design system takes priority
    if args.design_system:
        if args.rtl is not None:
            parser.error(
                "--rtl is not supported with --design-system; "
                "run a separate --domain style or --domain product query"
            )
        if args.stack:
            print(
                f"note: --stack {args.stack} is ignored in --design-system mode; "
                "run a separate --stack query for stack-specific guidelines",
                file=sys.stderr,
            )
        result = generate_design_system(
            args.query,
            args.project_name,
            args.format,
            persist=args.persist,
            page=args.page,
            output_dir=args.output_dir,
            variance=args.variance,
            motion=args.motion,
            density=args.density,
            force=args.force,
        )

        if args.json:
            print(json_module.dumps(
                {"design_system": result["design_system"], "persistence": result["persistence"]},
                indent=2, ensure_ascii=False,
            ))
        else:
            print(result["text"])

            if args.persist:
                persistence = result["persistence"] or {}
                print("\n" + "=" * 60)
                if persistence.get("status") == "skipped_exists":
                    print(f"⚠️  {persistence.get('message', 'MASTER.md already exists; not overwritten.')}")
                else:
                    ds_dir = persistence.get("design_system_dir", "design-system/<project>")
                    print(f"✅ Design system persisted to {ds_dir}/")
                    for f in persistence.get("created_files", []):
                        print(f"   📄 {f}")
                    print("")
                    print(f"📖 Usage: When building a page, check {ds_dir}/pages/[page].md first.")
                    print("   If it exists, its rules override MASTER.md. Otherwise, use MASTER.md.")
                print("=" * 60)
    # Stack search
    elif args.stack:
        if args.rtl is not None:
            parser.error(
                "--rtl cannot be combined with --stack; "
                "use --domain style or --domain product"
            )
        result = search_stack(args.query, args.stack, args.max_results)
        if args.json:
            print(json_module.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(format_output(result, full=args.full))
    # Domain search
    else:
        try:
            result = search(args.query, args.domain, args.max_results, rtl=args.rtl)
        except ValueError as exc:
            parser.error(str(exc))
        if args.json:
            print(json_module.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(format_output(result, full=args.full))
