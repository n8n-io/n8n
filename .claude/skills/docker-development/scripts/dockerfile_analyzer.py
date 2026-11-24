#!/usr/bin/env python3
"""
docker-development: Dockerfile Analyzer

Static analysis of Dockerfiles for optimization opportunities, anti-patterns,
and security issues. Reports layer count, base image analysis, and actionable
recommendations.

Usage:
    python scripts/dockerfile_analyzer.py Dockerfile
    python scripts/dockerfile_analyzer.py Dockerfile --output json
    python scripts/dockerfile_analyzer.py Dockerfile --security
"""

import argparse
import json
import re
import sys
from pathlib import Path


# --- Analysis Rules ---

ANTI_PATTERNS = [
    {
        "id": "AP001",
        "name": "latest_tag",
        "severity": "high",
        "pattern": r"^FROM\s+\S+:latest",
        "message": "Using :latest tag — pin to a specific version for reproducibility",
        "fix": "Use a specific tag like :3.12-slim or pin by digest",
    },
    {
        "id": "AP002",
        "name": "no_tag",
        "severity": "high",
        "pattern": r"^FROM\s+([a-z][a-z0-9_.-]+)\s*$",
        "message": "No tag specified on base image — defaults to :latest",
        "fix": "Add a specific version tag",
    },
    {
        "id": "AP003",
        "name": "run_apt_no_clean",
        "severity": "medium",
        "pattern": r"^RUN\s+.*apt-get\s+install(?!.*rm\s+-rf\s+/var/lib/apt/lists)",
        "message": "apt-get install without cleanup in same layer — bloats image",
        "fix": "Add && rm -rf /var/lib/apt/lists/* in the same RUN instruction",
    },
    {
        "id": "AP004",
        "name": "run_apk_no_cache",
        "severity": "medium",
        "pattern": r"^RUN\s+.*apk\s+add(?!\s+--no-cache)",
        "message": "apk add without --no-cache — retains package index",
        "fix": "Use: apk add --no-cache <packages>",
    },
    {
        "id": "AP005",
        "name": "add_instead_of_copy",
        "severity": "low",
        "pattern": r"^ADD\s+(?!https?://)\S+",
        "message": "Using ADD for local files — COPY is more explicit and predictable",
        "fix": "Use COPY instead of ADD unless you need tar auto-extraction or URL fetching",
    },
    {
        "id": "AP006",
        "name": "multiple_cmd",
        "severity": "medium",
        "pattern": None,  # Custom check
        "message": "Multiple CMD instructions — only the last one takes effect",
        "fix": "Keep exactly one CMD instruction",
    },
    {
        "id": "AP007",
        "name": "env_secrets",
        "severity": "critical",
        "pattern": r"^(?:ENV|ARG)\s+\S*(?:PASSWORD|SECRET|TOKEN|KEY|API_KEY)\s*=",
        "message": "Secrets in ENV/ARG — baked into image layers and visible in history",
        "fix": "Use BuildKit secrets: RUN --mount=type=secret,id=mytoken",
    },
    {
        "id": "AP008",
        "name": "broad_copy",
        "severity": "medium",
        "pattern": r"^COPY\s+\.\s+\.",
        "message": "COPY . . copies everything — may include secrets, git history, node_modules",
        "fix": "Use .dockerignore and copy specific directories, or copy after dependency install",
    },
    {
        "id": "AP009",
        "name": "no_user",
        "severity": "critical",
        "pattern": None,  # Custom check
        "message": "No USER instruction — container runs as root",
        "fix": "Add USER nonroot or create a dedicated user",
    },
    {
        "id": "AP010",
        "name": "pip_no_cache",
        "severity": "low",
        "pattern": r"^RUN\s+.*pip\s+install(?!\s+--no-cache-dir)",
        "message": "pip install without --no-cache-dir — retains pip cache in layer",
        "fix": "Use: pip install --no-cache-dir -r requirements.txt",
    },
    {
        "id": "AP011",
        "name": "npm_install_dev",
        "severity": "medium",
        "pattern": r"^RUN\s+.*npm\s+install\s*$",
        "message": "npm install includes devDependencies — use npm ci --omit=dev for production",
        "fix": "Use: npm ci --omit=dev (or npm ci --production)",
    },
    {
        "id": "AP012",
        "name": "expose_all",
        "severity": "low",
        "pattern": r"^EXPOSE\s+\d+(?:\s+\d+){3,}",
        "message": "Exposing many ports — only expose what the application actually needs",
        "fix": "Remove unnecessary EXPOSE directives",
    },
    {
        "id": "AP013",
        "name": "curl_wget_without_cleanup",
        "severity": "low",
        "pattern": r"^RUN\s+.*(?:curl|wget)\s+.*(?!&&\s*rm)",
        "message": "Download without cleanup — downloaded archives may remain in layer",
        "fix": "Download, extract, and remove archive in the same RUN instruction",
    },
    {
        "id": "AP014",
        "name": "no_healthcheck",
        "severity": "medium",
        "pattern": None,  # Custom check
        "message": "No HEALTHCHECK instruction — orchestrators can't determine container health",
        "fix": "Add HEALTHCHECK CMD curl -f http://localhost:PORT/health || exit 1",
    },
    {
        "id": "AP015",
        "name": "shell_form_cmd",
        "severity": "low",
        "pattern": r'^(?:CMD|ENTRYPOINT)\s+(?!\[)["\']?\w',
        "message": "Using shell form for CMD/ENTRYPOINT — exec form is preferred for signal handling",
        "fix": 'Use exec form: CMD ["executable", "arg1", "arg2"]',
    },
]

# Approximate base image sizes (MB)
BASE_IMAGE_SIZES = {
    "scratch": 0,
    "alpine": 7,
    "distroless/static": 2,
    "distroless/base": 20,
    "distroless/cc": 25,
    "debian-slim": 80,
    "debian": 120,
    "ubuntu": 78,
    "python-slim": 130,
    "python-alpine": 50,
    "python": 900,
    "node-alpine": 130,
    "node-slim": 200,
    "node": 1000,
    "golang-alpine": 250,
    "golang": 800,
    "rust-slim": 750,
    "rust": 1400,
    "nginx-alpine": 40,
    "nginx": 140,
}


# --- Demo Dockerfile ---

DEMO_DOCKERFILE = """FROM python:3.12
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
ENV SECRET_KEY=mysecretkey123
EXPOSE 8000 5432 6379
CMD python manage.py runserver 0.0.0.0:8000
"""


def parse_dockerfile(content):
    """Parse Dockerfile into structured instructions."""
    instructions = []
    current = ""

    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.endswith("\\"):
            current += stripped[:-1] + " "
            continue
        current += stripped
        # Parse instruction
        match = re.match(r"^(\w+)\s+(.*)", current.strip())
        if match:
            instructions.append({
                "instruction": match.group(1).upper(),
                "args": match.group(2),
                "raw": current.strip(),
            })
        current = ""

    return instructions


def analyze_layers(instructions):
    """Count and classify layers."""
    layer_instructions = {"FROM", "RUN", "COPY", "ADD"}
    layers = [i for i in instructions if i["instruction"] in layer_instructions]
    stages = [i for i in instructions if i["instruction"] == "FROM"]
    return {
        "total_layers": len(layers),
        "stages": len(stages),
        "is_multistage": len(stages) > 1,
        "run_count": sum(1 for i in instructions if i["instruction"] == "RUN"),
        "copy_count": sum(1 for i in instructions if i["instruction"] == "COPY"),
        "add_count": sum(1 for i in instructions if i["instruction"] == "ADD"),
    }


def analyze_base_image(instructions):
    """Analyze base image choice."""
    from_instructions = [i for i in instructions if i["instruction"] == "FROM"]
    if not from_instructions:
        return {"image": "unknown", "tag": "unknown", "estimated_size_mb": 0}

    last_from = from_instructions[-1]["args"].split()[0]
    parts = last_from.split(":")
    image = parts[0]
    tag = parts[1] if len(parts) > 1 else "latest"

    # Estimate size
    size = 0
    image_base = image.split("/")[-1]
    for key, val in BASE_IMAGE_SIZES.items():
        if key in f"{image_base}-{tag}" or key == image_base:
            size = val
            break

    return {
        "image": image,
        "tag": tag,
        "estimated_size_mb": size,
        "is_alpine": "alpine" in tag,
        "is_slim": "slim" in tag,
        "is_distroless": "distroless" in image,
    }


def run_pattern_checks(content, instructions):
    """Run anti-pattern checks."""
    findings = []

    for rule in ANTI_PATTERNS:
        if rule["pattern"] is not None:
            for match in re.finditer(rule["pattern"], content, re.MULTILINE | re.IGNORECASE):
                findings.append({
                    "id": rule["id"],
                    "severity": rule["severity"],
                    "message": rule["message"],
                    "fix": rule["fix"],
                    "line": match.group(0).strip()[:80],
                })

    # Custom checks
    # AP006: Multiple CMD
    cmd_count = sum(1 for i in instructions if i["instruction"] == "CMD")
    if cmd_count > 1:
        r = next(r for r in ANTI_PATTERNS if r["id"] == "AP006")
        findings.append({
            "id": r["id"], "severity": r["severity"],
            "message": r["message"], "fix": r["fix"],
            "line": f"{cmd_count} CMD instructions found",
        })

    # AP009: No USER
    has_user = any(i["instruction"] == "USER" for i in instructions)
    if not has_user and instructions:
        r = next(r for r in ANTI_PATTERNS if r["id"] == "AP009")
        findings.append({
            "id": r["id"], "severity": r["severity"],
            "message": r["message"], "fix": r["fix"],
            "line": "(no USER instruction found)",
        })

    # AP014: No HEALTHCHECK
    has_healthcheck = any(i["instruction"] == "HEALTHCHECK" for i in instructions)
    if not has_healthcheck and instructions:
        r = next(r for r in ANTI_PATTERNS if r["id"] == "AP014")
        findings.append({
            "id": r["id"], "severity": r["severity"],
            "message": r["message"], "fix": r["fix"],
            "line": "(no HEALTHCHECK instruction found)",
        })

    return findings


def generate_report(content, output_format="text", security_focus=False):
    """Generate full analysis report."""
    instructions = parse_dockerfile(content)
    layers = analyze_layers(instructions)
    base = analyze_base_image(instructions)
    findings = run_pattern_checks(content, instructions)

    if security_focus:
        security_ids = {"AP007", "AP009", "AP008"}
        security_severities = {"critical", "high"}
        findings = [f for f in findings if f["id"] in security_ids or f["severity"] in security_severities]

    # Deduplicate findings by id
    seen_ids = set()
    unique_findings = []
    for f in findings:
        key = (f["id"], f["line"])
        if key not in seen_ids:
            seen_ids.add(key)
            unique_findings.append(f)
    findings = unique_findings

    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    findings.sort(key=lambda f: severity_order.get(f["severity"], 4))

    # Score (100 minus deductions)
    deductions = {"critical": 25, "high": 15, "medium": 5, "low": 2}
    score = max(0, 100 - sum(deductions.get(f["severity"], 0) for f in findings))

    result = {
        "score": score,
        "base_image": base,
        "layers": layers,
        "findings": findings,
        "finding_counts": {
            "critical": sum(1 for f in findings if f["severity"] == "critical"),
            "high": sum(1 for f in findings if f["severity"] == "high"),
            "medium": sum(1 for f in findings if f["severity"] == "medium"),
            "low": sum(1 for f in findings if f["severity"] == "low"),
        },
    }

    if output_format == "json":
        print(json.dumps(result, indent=2))
        return result

    # Text output
    print(f"\n{'=' * 60}")
    print(f"  Dockerfile Analysis Report")
    print(f"{'=' * 60}")
    print(f"  Score: {score}/100")
    print(f"  Base: {base['image']}:{base['tag']} (~{base['estimated_size_mb']}MB)")
    print(f"  Layers: {layers['total_layers']} | Stages: {layers['stages']} | Multi-stage: {'Yes' if layers['is_multistage'] else 'No'}")
    print(f"  RUN: {layers['run_count']} | COPY: {layers['copy_count']} | ADD: {layers['add_count']}")
    print()

    counts = result["finding_counts"]
    print(f"  Findings: {counts['critical']} critical | {counts['high']} high | {counts['medium']} medium | {counts['low']} low")
    print(f"{'─' * 60}")

    for f in findings:
        icon = {"critical": "!!!", "high": "!!", "medium": "!", "low": "~"}.get(f["severity"], "?")
        print(f"\n  [{f['id']}] {icon} {f['severity'].upper()}")
        print(f"  {f['message']}")
        print(f"  Line: {f['line']}")
        print(f"  Fix:  {f['fix']}")

    if not findings:
        print("\n  No issues found. Dockerfile looks good.")

    print(f"\n{'=' * 60}\n")
    return result


def main():
    parser = argparse.ArgumentParser(
        description="docker-development: Dockerfile static analyzer"
    )
    parser.add_argument("dockerfile", nargs="?", help="Path to Dockerfile (omit for demo)")
    parser.add_argument(
        "--output", "-o",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)",
    )
    parser.add_argument(
        "--security",
        action="store_true",
        help="Security-focused analysis only",
    )
    args = parser.parse_args()

    if args.dockerfile:
        path = Path(args.dockerfile)
        if not path.exists():
            print(f"Error: File not found: {args.dockerfile}", file=sys.stderr)
            sys.exit(1)
        content = path.read_text(encoding="utf-8")
    else:
        print("No Dockerfile provided. Running demo analysis...\n")
        content = DEMO_DOCKERFILE

    generate_report(content, args.output, args.security)


if __name__ == "__main__":
    main()
