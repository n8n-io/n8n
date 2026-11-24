#!/usr/bin/env python3
"""Detect project stack/tooling signals for CI/CD pipeline generation.

Input sources:
- repository scan via --repo
- JSON via --input file
- JSON via stdin

Output:
- text summary or JSON payload
"""

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional


class CLIError(Exception):
    """Raised for expected CLI failures."""


@dataclass
class StackReport:
    repo: str
    languages: List[str]
    package_managers: List[str]
    ci_targets: List[str]
    test_commands: List[str]
    build_commands: List[str]
    lint_commands: List[str]
    signals: Dict[str, bool]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect stack/tooling from a repository.")
    parser.add_argument("--input", help="JSON input file (precomputed signal payload).")
    parser.add_argument("--repo", default=".", help="Repository path to scan.")
    parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format.")
    return parser.parse_args()


def load_payload(input_path: Optional[str]) -> Optional[dict]:
    if input_path:
        try:
            return json.loads(Path(input_path).read_text(encoding="utf-8"))
        except Exception as exc:
            raise CLIError(f"Failed reading --input file: {exc}") from exc

    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            try:
                return json.loads(raw)
            except json.JSONDecodeError as exc:
                raise CLIError(f"Invalid JSON from stdin: {exc}") from exc

    return None


def read_package_scripts(repo: Path) -> Dict[str, str]:
    pkg = repo / "package.json"
    if not pkg.exists():
        return {}
    try:
        data = json.loads(pkg.read_text(encoding="utf-8"))
    except Exception:
        return {}
    scripts = data.get("scripts", {})
    return scripts if isinstance(scripts, dict) else {}


def detect(repo: Path) -> StackReport:
    signals = {
        "package_json": (repo / "package.json").exists(),
        "pnpm_lock": (repo / "pnpm-lock.yaml").exists(),
        "yarn_lock": (repo / "yarn.lock").exists(),
        "npm_lock": (repo / "package-lock.json").exists(),
        "pyproject": (repo / "pyproject.toml").exists(),
        "requirements": (repo / "requirements.txt").exists(),
        "go_mod": (repo / "go.mod").exists(),
        "dockerfile": (repo / "Dockerfile").exists(),
        "terraform": any(repo.glob("*.tf")) or (repo / "terraform").is_dir(),
        "vercel": (repo / "vercel.json").exists(),
        "helm": (repo / "helm").exists() or (repo / "charts").exists(),
        "k8s": (repo / "k8s").exists() or (repo / "kubernetes").exists(),
    }

    languages: List[str] = []
    package_managers: List[str] = []
    ci_targets: List[str] = ["github", "gitlab"]

    if signals["package_json"]:
        languages.append("node")
        if signals["pnpm_lock"]:
            package_managers.append("pnpm")
        elif signals["yarn_lock"]:
            package_managers.append("yarn")
        else:
            package_managers.append("npm")

    if signals["pyproject"] or signals["requirements"]:
        languages.append("python")
        package_managers.append("pip")

    if signals["go_mod"]:
        languages.append("go")

    if signals["terraform"]:
        languages.append("terraform")

    if signals["dockerfile"]:
        languages.append("docker")

    scripts = read_package_scripts(repo)
    lint_commands: List[str] = []
    test_commands: List[str] = []
    build_commands: List[str] = []

    if "lint" in scripts:
        lint_commands.append("npm run lint")
    if "test" in scripts:
        test_commands.append("npm test")
    if "build" in scripts:
        build_commands.append("npm run build")

    if "python" in languages:
        lint_commands.append("python3 -m ruff check .")
        test_commands.append("python3 -m pytest")

    if "go" in languages:
        lint_commands.append("go vet ./...")
        test_commands.append("go test ./...")
        build_commands.append("go build ./...")

    if "terraform" in languages:
        tf_dir = "terraform" if (repo / "terraform").is_dir() and not any(repo.glob("*.tf")) else "."
        lint_commands.append(f"terraform -chdir={tf_dir} fmt -check -recursive")
        test_commands.append(f"terraform -chdir={tf_dir} validate")
        build_commands.append(f"terraform -chdir={tf_dir} plan -input=false")

    if "docker" in languages:
        lint_commands.append("hadolint Dockerfile")
        build_commands.append("docker build -t app:ci .")

    return StackReport(
        repo=str(repo.resolve()),
        languages=sorted(set(languages)),
        package_managers=sorted(set(package_managers)),
        ci_targets=ci_targets,
        test_commands=sorted(set(test_commands)),
        build_commands=sorted(set(build_commands)),
        lint_commands=sorted(set(lint_commands)),
        signals=signals,
    )


def format_text(report: StackReport) -> str:
    lines = [
        "Detected stack",
        f"- repo: {report.repo}",
        f"- languages: {', '.join(report.languages) if report.languages else 'none'}",
        f"- package managers: {', '.join(report.package_managers) if report.package_managers else 'none'}",
        f"- lint commands: {', '.join(report.lint_commands) if report.lint_commands else 'none'}",
        f"- test commands: {', '.join(report.test_commands) if report.test_commands else 'none'}",
        f"- build commands: {', '.join(report.build_commands) if report.build_commands else 'none'}",
    ]
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    payload = load_payload(args.input)

    if payload:
        try:
            report = StackReport(**payload)
        except TypeError as exc:
            raise CLIError(f"Invalid input payload for StackReport: {exc}") from exc
    else:
        repo = Path(args.repo).resolve()
        if not repo.exists() or not repo.is_dir():
            raise CLIError(f"Invalid repo path: {repo}")
        report = detect(repo)

    if args.format == "json":
        print(json.dumps(asdict(report), indent=2))
    else:
        print(format_text(report))

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CLIError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
