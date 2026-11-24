#!/usr/bin/env python3
"""
social_calendar_generator.py — Social Media Content Calendar Generator
100% stdlib, no pip installs required.

Usage:
    python3 social_calendar_generator.py                       # demo mode
    python3 social_calendar_generator.py --config config.json
    python3 social_calendar_generator.py --config config.json --json
    python3 social_calendar_generator.py --config config.json --markdown > calendar.md
    python3 social_calendar_generator.py --start 2026-04-01 --weeks 4

config.json format:
    {
      "pillars": [
        {"name": "Educational",    "description": "Tips, tutorials, how-tos", "emoji": "🎓", "weight": 3},
        {"name": "Inspirational",  "description": "Success stories, quotes",  "emoji": "✨", "weight": 2},
        {"name": "Product",        "description": "Features, demos",          "emoji": "🛠", "weight": 2},
        {"name": "Community",      "description": "UGC, shoutouts, polls",    "emoji": "🤝", "weight": 1}
      ],
      "platforms": [
        {"name": "LinkedIn",  "posts_per_week": 3, "best_days": ["Monday","Tuesday","Wednesday","Thursday"]},
        {"name": "Twitter/X", "posts_per_week": 5, "best_days": ["Monday","Tuesday","Wednesday","Thursday","Friday"]}
      ],
      "start_date": "2026-04-07",
      "weeks": 4
    }
"""

import argparse
import json
import sys
from datetime import date, timedelta
from collections import defaultdict


# ---------------------------------------------------------------------------
# Defaults / sample data
# ---------------------------------------------------------------------------

DEMO_CONFIG = {
    "pillars": [
        {"name": "Educational",   "description": "Tips, tutorials, how-tos", "emoji": "🎓", "weight": 3},
        {"name": "Inspirational", "description": "Success stories & quotes",  "emoji": "✨", "weight": 2},
        {"name": "Product",       "description": "Feature demos & updates",   "emoji": "🛠 ", "weight": 2},
        {"name": "Community",     "description": "UGC, polls & shoutouts",    "emoji": "🤝", "weight": 1},
    ],
    "platforms": [
        {
            "name": "LinkedIn",
            "posts_per_week": 3,
            "best_days": ["Monday", "Tuesday", "Wednesday", "Thursday"],
            "content_type_hint": "Long-form insights, carousels, thought leadership",
        },
        {
            "name": "Twitter/X",
            "posts_per_week": 5,
            "best_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "content_type_hint": "Threads, quick tips, hot takes, polls",
        },
    ],
    "start_date": None,   # defaults to next Monday
    "weeks": 4,
}

CONTENT_TYPE_HINTS = {
    "Educational":   ["How-to thread", "Quick tip", "Carousel: 5 steps", "Tutorial link"],
    "Inspirational": ["Quote image", "Success story", "Before/after", "Motivational thread"],
    "Product":       ["Feature demo GIF", "Changelog post", "Use-case spotlight", "Behind the scenes"],
    "Community":     ["Poll", "User shoutout", "Question post", "Community highlight"],
}

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ---------------------------------------------------------------------------
# Pillar scheduler — weighted round-robin
# ---------------------------------------------------------------------------

def build_pillar_sequence(pillars: list, length: int) -> list:
    """
    Build a balanced pillar rotation of `length` posts using weighted distribution.
    Uses a deterministic greedy algorithm (no random, reproducible).
    """
    names   = [p["name"] for p in pillars]
    weights = [p.get("weight", 1) for p in pillars]
    total_w = sum(weights)

    # Target proportion per pillar
    targets = [w / total_w for w in weights]

    sequence = []
    counts   = [0] * len(pillars)

    for _ in range(length):
        # Pick pillar most "behind" its target proportion
        scores = []
        for i, name in enumerate(names):
            current_prop = counts[i] / (len(sequence) + 1) if sequence else 0
            scores.append(targets[i] - current_prop)
        best = scores.index(max(scores))
        sequence.append(names[best])
        counts[best] += 1

    return sequence


# ---------------------------------------------------------------------------
# Calendar builder
# ---------------------------------------------------------------------------

def next_monday(from_date: date = None) -> date:
    d = from_date or date.today()
    days_ahead = (0 - d.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return d + timedelta(days=days_ahead)


def parse_date(s: str) -> date:
    return date.fromisoformat(s)


def build_calendar(config: dict) -> dict:
    pillars   = config.get("pillars", DEMO_CONFIG["pillars"])
    platforms = config.get("platforms", DEMO_CONFIG["platforms"])
    weeks     = config.get("weeks", 4)

    start_raw = config.get("start_date")
    if start_raw:
        start = parse_date(start_raw)
    else:
        start = next_monday()

    pillar_map = {p["name"]: p for p in pillars}

    # Pre-compute total posts per platform
    calendar_by_platform = {}

    for platform in platforms:
        pname     = platform["name"]
        ppw       = platform.get("posts_per_week", 3)
        best_days = platform.get("best_days", WEEKDAY_NAMES[:5])

        # Generate post dates across the period
        post_dates = []
        for week in range(weeks):
            week_start = start + timedelta(weeks=week)
            day_count  = 0
            for day_offset in range(7):
                if day_count >= ppw:
                    break
                d      = week_start + timedelta(days=day_offset)
                d_name = WEEKDAY_NAMES[d.weekday()]
                if d_name in best_days:
                    post_dates.append(d)
                    day_count += 1

        total_posts = len(post_dates)
        pillar_seq  = build_pillar_sequence(pillars, total_posts)

        posts = []
        for i, (post_date, pillar_name) in enumerate(zip(post_dates, pillar_seq)):
            pillar  = pillar_map[pillar_name]
            hints   = CONTENT_TYPE_HINTS.get(pillar_name, ["Post"])
            ct_hint = hints[i % len(hints)]
            posts.append({
                "date":         post_date.isoformat(),
                "weekday":      WEEKDAY_NAMES[post_date.weekday()],
                "week_number":  (post_date - start).days // 7 + 1,
                "platform":     pname,
                "pillar":       pillar_name,
                "pillar_emoji": pillar.get("emoji", ""),
                "description":  pillar.get("description", ""),
                "content_type": ct_hint,
                "content_type_hint": platform.get("content_type_hint", ""),
            })

        # Pillar distribution stats
        dist = defaultdict(int)
        for p in posts:
            dist[p["pillar"]] += 1
        dist_pct = {k: round(v / total_posts * 100) for k, v in dist.items()}

        calendar_by_platform[pname] = {
            "platform":            pname,
            "posts_per_week":      ppw,
            "total_weeks":         weeks,
            "total_posts":         total_posts,
            "best_days":           best_days,
            "posts":               posts,
            "pillar_distribution": dict(dist),
            "pillar_pct":          dist_pct,
        }

    # Global summary
    all_posts = []
    for pc in calendar_by_platform.values():
        all_posts.extend(pc["posts"])
    all_posts.sort(key=lambda p: (p["date"], p["platform"]))

    return {
        "meta": {
            "start_date":     start.isoformat(),
            "end_date":       (start + timedelta(weeks=weeks) - timedelta(days=1)).isoformat(),
            "weeks":          weeks,
            "platforms":      [p["name"] for p in platforms],
            "total_posts":    len(all_posts),
            "pillars":        [p["name"] for p in pillars],
        },
        "platforms": calendar_by_platform,
        "timeline":  all_posts,   # merged, date-sorted
    }


# ---------------------------------------------------------------------------
# Markdown output
# ---------------------------------------------------------------------------

def build_markdown(result: dict) -> str:
    m = result["meta"]
    lines = []
    lines.append(f"# Social Media Content Calendar")
    lines.append(f"**Period:** {m['start_date']} → {m['end_date']}  "
                 f"| **{m['weeks']} weeks** | **{m['total_posts']} total posts**\n")

    # Per-platform distribution
    for pname, pc in result["platforms"].items():
        lines.append(f"## {pname}  ({pc['total_posts']} posts)\n")
        lines.append("**Pillar distribution:**")
        for pillar, count in pc["pillar_distribution"].items():
            pct = pc["pillar_pct"][pillar]
            lines.append(f"- {pillar}: {count} posts ({pct}%)")
        lines.append("")

    # Weekly calendar tables
    for week_num in range(1, m["weeks"] + 1):
        lines.append(f"## Week {week_num}\n")
        header = "| Date | Day | " + " | ".join(m["platforms"]) + " |"
        sep    = "|---|---|" + "|".join(["---"] * len(m["platforms"])) + "|"
        lines.append(header)
        lines.append(sep)

        # Group by date
        week_posts = defaultdict(dict)
        for post in result["timeline"]:
            if post["week_number"] == week_num:
                week_posts[post["date"]][post["platform"]] = post

        for day_date in sorted(week_posts.keys()):
            day_posts = week_posts[day_date]
            weekday   = list(day_posts.values())[0]["weekday"] if day_posts else ""
            cells     = []
            for pname in m["platforms"]:
                if pname in day_posts:
                    p    = day_posts[pname]
                    cell = f"{p['pillar_emoji']} **{p['pillar']}**<br/>{p['content_type']}"
                else:
                    cell = "—"
                cells.append(cell)
            lines.append(f"| {day_date} | {weekday} | " + " | ".join(cells) + " |")

        lines.append("")

    # Legend
    lines.append("## Content Pillars\n")
    for pc in result["platforms"].values():
        break
    from_meta = result["meta"]["pillars"]
    lines.append("| Pillar | Description |")
    lines.append("|---|---|")
    for pname, pc in result["platforms"].items():
        # Get pillar descriptions from first platform's posts
        pillar_desc = {}
        for post in pc["posts"]:
            pillar_desc[post["pillar"]] = post["description"]
        for pillar in from_meta:
            desc = pillar_desc.get(pillar, "")
            lines.append(f"| {pillar} | {desc} |")
        break

    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Pretty terminal output
# ---------------------------------------------------------------------------

def pretty_print(result: dict) -> None:
    m = result["meta"]
    print("\n" + "=" * 70)
    print("  📅  SOCIAL MEDIA CONTENT CALENDAR GENERATOR")
    print("=" * 70)
    print(f"\n  Period     : {m['start_date']} → {m['end_date']}  ({m['weeks']} weeks)")
    print(f"  Platforms  : {', '.join(m['platforms'])}")
    print(f"  Total posts: {m['total_posts']}")
    print(f"  Pillars    : {', '.join(m['pillars'])}")

    for pname, pc in result["platforms"].items():
        print(f"\n  {'─'*60}")
        print(f"  📣  {pname.upper()}  — {pc['total_posts']} posts  "
              f"({pc['posts_per_week']}/week)")
        print(f"  Best days: {', '.join(pc['best_days'])}")
        print(f"  Pillar distribution:")
        for pillar, count in pc["pillar_distribution"].items():
            pct = pc["pillar_pct"][pillar]
            bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
            print(f"    {pillar:<16}  {count:>3} posts  {pct:>3}%  {bar}")

    print(f"\n  {'─'*70}")
    print(f"  📆  WEEKLY SCHEDULE\n")

    # Group timeline by week
    from collections import defaultdict
    weeks_data = defaultdict(list)
    for post in result["timeline"]:
        weeks_data[post["week_number"]].append(post)

    for week_num in sorted(weeks_data.keys()):
        print(f"  WEEK {week_num}")
        print(f"  {'Date':<12} {'Day':<11}" +
              "".join(f" {p:<22}" for p in m["platforms"]))
        print("  " + "─" * (12 + 11 + 23 * len(m["platforms"])))

        # Group by date
        day_map = defaultdict(dict)
        for post in weeks_data[week_num]:
            day_map[post["date"]][post["platform"]] = post

        for day_date in sorted(day_map.keys()):
            dp      = day_map[day_date]
            weekday = list(dp.values())[0]["weekday"]
            row     = f"  {day_date:<12} {weekday:<11}"
            for pname in m["platforms"]:
                if pname in dp:
                    p    = dp[pname]
                    cell = f"{p['pillar_emoji']} {p['pillar'][:10]}/{p['content_type'][:8]}"
                else:
                    cell = "—"
                row += f" {cell:<22}"
            print(row)
        print()

    print("  💡  TIP: Re-run with --markdown to export a copyable Markdown table.\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate a social media content calendar with balanced pillar distribution.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--config",   type=str, default=None,
                        help="Path to JSON config file")
    parser.add_argument("--start",    type=str, default=None,
                        help="Start date YYYY-MM-DD (overrides config)")
    parser.add_argument("--weeks",    type=int, default=None,
                        help="Number of weeks to generate (overrides config)")
    parser.add_argument("--json",     action="store_true",
                        help="Output calendar as JSON")
    parser.add_argument("--markdown", action="store_true",
                        help="Output calendar as Markdown")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.config:
        with open(args.config) as f:
            config = json.load(f)
    else:
        print("🔬  DEMO MODE — using sample config (4 pillars, 2 platforms)\n",
              file=sys.stderr)
        config = dict(DEMO_CONFIG)

    # CLI overrides
    if args.start:
        config["start_date"] = args.start
    if args.weeks:
        config["weeks"] = args.weeks

    result = build_calendar(config)

    if args.json:
        print(json.dumps(result, indent=2, default=str))
    elif args.markdown:
        print(build_markdown(result))
    else:
        pretty_print(result)


if __name__ == "__main__":
    main()
