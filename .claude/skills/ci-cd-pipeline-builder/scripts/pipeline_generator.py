#!/usr/bin/env python3
"""Generate CI pipeline YAML from detected stack data.

Input sources:
- --input stack report JSON file
- stdin stack report JSON
- --repo path (auto-detect stack)

Output:
- text/json summary
- pipeline YAML written via --output or printed to stdout
"""

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional


class CLIError(Exception):
    """Raised for expected CLI failures."""


@dataclass
class PipelineSummary:
    platform: str
    output: str
    stages: List[str]
    uses_cache: bool
    languages: List[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate CI/CD pipeline YAML from detected stack.")
    parser.add_argument("--input", help="Stack report JSON file. If omitted, can read stdin JSON.")
    parser.add_argument("--repo", help="Repository path for auto-detection fallback.")
    parser.add_argument("--platform", choices=["github", "gitlab"], required=True, help="Target CI platform.")
    parser.add_argument("--output", help="Write YAML to this file; otherwise print to stdout.")
    parser.add_argument("--format", choices=["text", "json"], default="text", help="Summary output format.")
    return parser.parse_args()


def load_json_input(input_path: Optional[str]) -> Optional[Dict[str, Any]]:
    if input_path:
        try:
            return json.loads(Path(input_path).read_text(encoding="utf-8"))
        except Exception as exc:
            raise CLIError(f"Failed reading --input: {exc}") from exc

    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            try:
                return json.loads(raw)
            except json.JSONDecodeError as exc:
                raise CLIError(f"Invalid JSON from stdin: {exc}") from exc

    return None


def detect_stack(repo: Path) -> Dict[str, Any]:
    scripts = {}
    pkg_file = repo / "package.json"
    if pkg_file.exists():
        try:
            pkg = json.loads(pkg_file.read_text(encoding="utf-8"))
            raw_scripts = pkg.get("scripts", {})
            if isinstance(raw_scripts, dict):
                scripts = raw_scripts
        except Exception:
            scripts = {}

    languages: List[str] = []
    if pkg_file.exists():
        languages.append("node")
    if (repo / "pyproject.toml").exists() or (repo / "requirements.txt").exists():
        languages.append("python")
    if (repo / "go.mod").exists():
        languages.append("go")

    return {
        "languages": sorted(set(languages)),
        "signals": {
            "pnpm_lock": (repo / "pnpm-lock.yaml").exists(),
            "yarn_lock": (repo / "yarn.lock").exists(),
            "npm_lock": (repo / "package-lock.json").exists(),
            "dockerfile": (repo / "Dockerfile").exists(),
        },
        "lint_commands": ["npm run lint"] if "lint" in scripts else [],
        "test_commands": ["npm test"] if "test" in scripts else [],
        "build_commands": ["npm run build"] if "build" in scripts else [],
    }


def select_node_install(signals: Dict[str, Any]) -> str:
    if signals.get("pnpm_lock"):
        return "pnpm install --frozen-lockfile"
    if signals.get("yarn_lock"):
        return "yarn install --frozen-lockfile"
    return "npm ci"


def github_yaml(stack: Dict[str, Any]) -> str:
    langs = stack.get("languages", [])
    signals = stack.get("signals", {})
    lint_cmds = stack.get("lint_commands", []) or ["echo 'No lint command configured'"]
    test_cmds = stack.get("test_commands", []) or ["echo 'No test command configured'"]
    build_cmds = stack.get("build_commands", []) or ["echo 'No build command configured'"]

    lines: List[str] = [
        "name: CI",
        "on:",
        "  push:",
        "    branches: [main, develop]",
        "  pull_request:",
        "    branches: [main, develop]",
        "",
        "jobs:",
    ]

    if "node" in langs:
        lines.extend(
            [
                "  node-ci:",
                "    runs-on: ubuntu-latest",
                "    steps:",
                "      - uses: actions/checkout@v4",
                "      - uses: actions/setup-node@v4",
                "        with:",
                "          node-version: '20'",
                "          cache: 'npm'",
                f"      - run: {select_node_install(signals)}",
            ]
        )
        for cmd in lint_cmds + test_cmds + build_cmds:
            lines.append(f"      - run: {cmd}")

    if "python" in langs:
        lines.extend(
            [
                "  python-ci:",
                "    runs-on: ubuntu-latest",
                "    steps:",
                "      - uses: actions/checkout@v4",
                "      - uses: actions/setup-python@v5",
                "        with:",
                "          python-version: '3.12'",
                "      - run: python3 -m pip install -U pip",
                "      - run: python3 -m pip install -r requirements.txt || true",
                "      - run: python3 -m pytest || true",
            ]
        )

    if "go" in langs:
        lines.extend(
            [
                "  go-ci:",
                "    runs-on: ubuntu-latest",
                "    steps:",
                "      - uses: actions/checkout@v4",
                "      - uses: actions/setup-go@v5",
                "        with:",
                "          go-version: '1.22'",
                "      - run: go test ./...",
                "      - run: go build ./...",
            ]
        )

    if not any(lang in langs for lang in ("node", "python", "go")):
        # terraform/docker-only (or unrecognized) stacks: run detected commands directly
        lines.extend(
            [
                "  ci:",
                "    runs-on: ubuntu-latest",
                "    steps:",
                "      - uses: actions/checkout@v4",
            ]
        )
        if "terraform" in langs:
            lines.append("      - uses: hashicorp/setup-terraform@v3")
        for cmd in lint_cmds + test_cmds + build_cmds:
            lines.append(f"      - run: {cmd}")

    return "\n".join(lines) + "\n"


def gitlab_yaml(stack: Dict[str, Any]) -> str:
    langs = stack.get("languages", [])
    signals = stack.get("signals", {})
    lint_cmds = stack.get("lint_commands", []) or ["echo 'No lint command configured'"]
    test_cmds = stack.get("test_commands", []) or ["echo 'No test command configured'"]
    build_cmds = stack.get("build_commands", []) or ["echo 'No build command configured'"]

    lines: List[str] = [
        "stages:",
        "  - lint",
        "  - test",
        "  - build",
        "",
    ]

    if "node" in langs:
        install_cmd = select_node_install(signals)
        lines.extend(
            [
                "node_lint:",
                "  image: node:20",
                "  stage: lint",
                "  script:",
                f"    - {install_cmd}",
            ]
        )
        for cmd in lint_cmds:
            lines.append(f"    - {cmd}")
        lines.extend(
            [
                "",
                "node_test:",
                "  image: node:20",
                "  stage: test",
                "  script:",
                f"    - {install_cmd}",
            ]
        )
        for cmd in test_cmds:
            lines.append(f"    - {cmd}")
        lines.extend(
            [
                "",
                "node_build:",
                "  image: node:20",
                "  stage: build",
                "  script:",
                f"    - {install_cmd}",
            ]
        )
        for cmd in build_cmds:
            lines.append(f"    - {cmd}")

    if "python" in langs:
        lines.extend(
            [
                "",
                "python_test:",
                "  image: python:3.12",
                "  stage: test",
                "  script:",
                "    - python3 -m pip install -U pip",
                "    - python3 -m pip install -r requirements.txt || true",
                "    - python3 -m pytest || true",
            ]
        )

    if "go" in langs:
        lines.extend(
            [
                "",
                "go_test:",
                "  image: golang:1.22",
                "  stage: test",
                "  script:",
                "    - go test ./...",
                "    - go build ./...",
            ]
        )

    if not any(lang in langs for lang in ("node", "python", "go")):
        # terraform/docker-only (or unrecognized) stacks: run detected commands directly
        image = "hashicorp/terraform:1.9" if "terraform" in langs else "alpine:3.20"
        for stage, cmds in (("lint", lint_cmds), ("test", test_cmds), ("build", build_cmds)):
            lines.extend(
                [
                    "",
                    f"generic_{stage}:",
                    f"  image: {image}",
                    f"  stage: {stage}",
                    "  script:",
                ]
            )
            for cmd in cmds:
                lines.append(f"    - {cmd}")

    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    stack = load_json_input(args.input)

    if stack is None:
        if not args.repo:
            raise CLIError("Provide stack input via --input/stdin or set --repo for auto-detection.")
        repo = Path(args.repo).resolve()
        if not repo.exists() or not repo.is_dir():
            raise CLIError(f"Invalid repo path: {repo}")
        stack = detect_stack(repo)

    if args.platform == "github":
        yaml_content = github_yaml(stack)
    else:
        yaml_content = gitlab_yaml(stack)

    output_path = args.output or "stdout"
    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(yaml_content, encoding="utf-8")
    else:
        print(yaml_content, end="")

    summary = PipelineSummary(
        platform=args.platform,
        output=output_path,
        stages=["lint", "test", "build"],
        uses_cache=True,
        languages=stack.get("languages", []),
    )

    if args.format == "json":
        print(json.dumps(asdict(summary), indent=2), file=sys.stderr if not args.output else sys.stdout)
    else:
        text = (
            "Pipeline generated\n"
            f"- platform: {summary.platform}\n"
            f"- output: {summary.output}\n"
            f"- stages: {', '.join(summary.stages)}\n"
            f"- languages: {', '.join(summary.languages) if summary.languages else 'none'}"
        )
        print(text, file=sys.stderr if not args.output else sys.stdout)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CLIError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
