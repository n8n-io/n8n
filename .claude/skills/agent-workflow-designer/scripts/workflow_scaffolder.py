#!/usr/bin/env python3
"""Generate workflow skeleton configs from common multi-agent patterns."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List


def sequential_template(name: str) -> Dict:
    return {
        "name": name,
        "pattern": "sequential",
        "steps": [
            {"id": "research", "agent": "researcher", "next": "draft"},
            {"id": "draft", "agent": "writer", "next": "review"},
            {"id": "review", "agent": "reviewer", "next": None},
        ],
        "retry": {"max_attempts": 2, "backoff_seconds": 2},
    }


def parallel_template(name: str) -> Dict:
    return {
        "name": name,
        "pattern": "parallel",
        "fan_out": {
            "tasks": ["research_a", "research_b", "research_c"],
            "agent": "analyst",
        },
        "fan_in": {"agent": "synthesizer", "output": "combined_report"},
        "timeouts": {"per_task_seconds": 180, "fan_in_seconds": 120},
    }


def router_template(name: str) -> Dict:
    return {
        "name": name,
        "pattern": "router",
        "router": {"agent": "router", "routes": ["sales", "support", "engineering"]},
        "handlers": {
            "sales": {"agent": "sales_specialist"},
            "support": {"agent": "support_specialist"},
            "engineering": {"agent": "engineering_specialist"},
        },
        "fallback": {"agent": "generalist"},
    }


def orchestrator_template(name: str) -> Dict:
    return {
        "name": name,
        "pattern": "orchestrator",
        "orchestrator": {"agent": "orchestrator", "planning": "dynamic"},
        "specialists": ["researcher", "coder", "analyst", "writer"],
        "execution": {
            "dependency_mode": "dag",
            "max_parallel": 3,
            "completion_policy": "all_required",
        },
    }


def evaluator_template(name: str) -> Dict:
    return {
        "name": name,
        "pattern": "evaluator",
        "generator": {"agent": "generator"},
        "evaluator": {"agent": "evaluator", "criteria": ["accuracy", "format", "safety"]},
        "loop": {
            "max_iterations": 3,
            "pass_threshold": 0.8,
            "on_fail": "revise_and_retry",
        },
    }


PATTERNS = {
    "sequential": sequential_template,
    "parallel": parallel_template,
    "router": router_template,
    "orchestrator": orchestrator_template,
    "evaluator": evaluator_template,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a workflow skeleton config from a pattern.")
    parser.add_argument("pattern", choices=sorted(PATTERNS.keys()), help="Workflow pattern")
    parser.add_argument("--name", default="new-workflow", help="Workflow name")
    parser.add_argument("--output", help="Optional output path for JSON config")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = PATTERNS[args.pattern](args.name)
    payload = json.dumps(config, indent=2)

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(payload + "\n", encoding="utf-8")
        print(f"Wrote workflow config to {out}")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
