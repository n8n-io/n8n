#!/usr/bin/env python3
"""
docker-development: Docker Compose Validator

Validate docker-compose.yml files for best practices, missing healthchecks,
network configuration, port conflicts, and security issues.

Usage:
    python scripts/compose_validator.py docker-compose.yml
    python scripts/compose_validator.py docker-compose.yml --output json
    python scripts/compose_validator.py docker-compose.yml --strict
"""

import argparse
import json
import re
import sys
from pathlib import Path


# --- Demo Compose File ---

DEMO_COMPOSE = """
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:password@db:5432/app
      - SECRET_KEY=my-secret-key
    depends_on:
      - db
      - redis

  db:
    image: postgres:latest
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: password123
    volumes:
      - ./data:/var/lib/postgresql/data

  redis:
    image: redis
    ports:
      - "6379:6379"

  worker:
    build: .
    command: python worker.py
    environment:
      - DATABASE_URL=postgres://user:password@db:5432/app
"""


def parse_yaml_simple(content):
    """Simple YAML-like parser for docker-compose files (stdlib only).

    Handles the subset of YAML used in typical docker-compose files:
    - Top-level keys
    - Service definitions
    - Lists (- items)
    - Key-value pairs
    - Nested indentation
    """
    result = {"services": {}, "volumes": {}, "networks": {}}
    current_section = None
    current_service = None
    current_key = None
    indent_stack = []

    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        indent = len(line) - len(line.lstrip())

        # Top-level keys
        if indent == 0 and ":" in stripped:
            key = stripped.split(":")[0].strip()
            if key == "services":
                current_section = "services"
            elif key == "volumes":
                current_section = "volumes"
            elif key == "networks":
                current_section = "networks"
            elif key == "version":
                val = stripped.split(":", 1)[1].strip().strip("'\"")
                result["version"] = val
            current_service = None
            current_key = None
            continue

        if current_section == "services":
            # Service name (indent level 2)
            if indent == 2 and ":" in stripped and not stripped.startswith("-"):
                key = stripped.split(":")[0].strip()
                val = stripped.split(":", 1)[1].strip() if ":" in stripped else ""
                if val and not val.startswith("{"):
                    # Simple key:value inside a service
                    if current_service and current_service in result["services"]:
                        result["services"][current_service][key] = val
                    else:
                        current_service = key
                        result["services"][current_service] = {}
                        current_key = None
                else:
                    current_service = key
                    result["services"][current_service] = {}
                    current_key = None
                continue

            if current_service and current_service in result["services"]:
                svc = result["services"][current_service]

                # Service-level keys (indent 4)
                if indent == 4 and ":" in stripped and not stripped.startswith("-"):
                    key = stripped.split(":")[0].strip()
                    val = stripped.split(":", 1)[1].strip()
                    current_key = key
                    if val:
                        svc[key] = val.strip("'\"")
                    else:
                        svc[key] = []
                    continue

                # List items (indent 6 or 8)
                if stripped.startswith("-") and current_key:
                    item = stripped[1:].strip().strip("'\"")
                    if current_key in svc:
                        if isinstance(svc[current_key], list):
                            svc[current_key].append(item)
                        else:
                            svc[current_key] = [svc[current_key], item]
                    else:
                        svc[current_key] = [item]
                    continue

                # Nested key:value under current_key (e.g., healthcheck test)
                if indent >= 6 and ":" in stripped and not stripped.startswith("-"):
                    key = stripped.split(":")[0].strip()
                    val = stripped.split(":", 1)[1].strip()
                    if current_key and current_key in svc:
                        if isinstance(svc[current_key], list):
                            svc[current_key] = {}
                        if isinstance(svc[current_key], dict):
                            svc[current_key][key] = val

    return result


def validate_compose(parsed, strict=False):
    """Run validation rules on parsed compose file."""
    findings = []
    services = parsed.get("services", {})

    # --- Version check ---
    version = parsed.get("version", "")
    if version:
        findings.append({
            "severity": "low",
            "category": "deprecation",
            "message": f"'version: {version}' is deprecated in Compose V2 — remove it",
            "service": "(top-level)",
        })

    # --- Per-service checks ---
    all_ports = []

    for name, svc in services.items():
        # Healthcheck
        if "healthcheck" not in svc:
            findings.append({
                "severity": "medium",
                "category": "reliability",
                "message": f"No healthcheck defined — orchestrator can't detect unhealthy state",
                "service": name,
            })

        # Image tag
        image = svc.get("image", "")
        if image:
            if ":latest" in image:
                findings.append({
                    "severity": "high",
                    "category": "reproducibility",
                    "message": f"Using :latest tag on '{image}' — pin to specific version",
                    "service": name,
                })
            elif ":" not in image and "/" not in image:
                findings.append({
                    "severity": "high",
                    "category": "reproducibility",
                    "message": f"No tag on image '{image}' — defaults to :latest",
                    "service": name,
                })

        # Ports
        ports = svc.get("ports", [])
        if isinstance(ports, list):
            for p in ports:
                p_str = str(p)
                # Extract host port
                match = re.match(r"(\d+):\d+", p_str)
                if match:
                    host_port = match.group(1)
                    all_ports.append((host_port, name))

        # Environment secrets
        env = svc.get("environment", [])
        if isinstance(env, list):
            for e in env:
                e_str = str(e)
                if re.search(r"(?:PASSWORD|SECRET|TOKEN|KEY)=\S+", e_str, re.IGNORECASE):
                    if "env_file" not in svc:
                        findings.append({
                            "severity": "critical",
                            "category": "security",
                            "message": f"Inline secret in environment: {e_str[:40]}...",
                            "service": name,
                        })
        elif isinstance(env, dict):
            for k, v in env.items():
                if re.search(r"(?:PASSWORD|SECRET|TOKEN|KEY)", k, re.IGNORECASE) and v:
                    findings.append({
                        "severity": "critical",
                        "category": "security",
                        "message": f"Inline secret: {k}={str(v)[:20]}...",
                        "service": name,
                    })

        # depends_on without condition
        depends = svc.get("depends_on", [])
        if isinstance(depends, list) and depends:
            findings.append({
                "severity": "medium",
                "category": "reliability",
                "message": "depends_on without condition: service_healthy — race condition risk",
                "service": name,
            })

        # Bind mounts (./path style)
        volumes = svc.get("volumes", [])
        if isinstance(volumes, list):
            for v in volumes:
                v_str = str(v)
                if v_str.startswith("./") or v_str.startswith("/"):
                    if "/var/run/docker.sock" in v_str:
                        findings.append({
                            "severity": "critical",
                            "category": "security",
                            "message": "Docker socket mounted — container has host Docker access",
                            "service": name,
                        })

        # Restart policy
        if "restart" not in svc and "build" not in svc:
            findings.append({
                "severity": "low",
                "category": "reliability",
                "message": "No restart policy — container won't auto-restart on failure",
                "service": name,
            })

        # Resource limits
        if "mem_limit" not in svc and "deploy" not in svc:
            findings.append({
                "severity": "low" if not strict else "medium",
                "category": "resources",
                "message": "No memory limit — container can consume all host memory",
                "service": name,
            })

    # Port conflicts
    port_map = {}
    for port, svc_name in all_ports:
        if port in port_map:
            findings.append({
                "severity": "high",
                "category": "networking",
                "message": f"Port {port} conflict between '{port_map[port]}' and '{svc_name}'",
                "service": svc_name,
            })
        port_map[port] = svc_name

    # Network check
    if "networks" not in parsed or not parsed["networks"]:
        if len(services) > 1:
            findings.append({
                "severity": "low",
                "category": "networking",
                "message": "No explicit networks — all services share default bridge network",
                "service": "(top-level)",
            })

    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    findings.sort(key=lambda f: severity_order.get(f["severity"], 4))

    return findings


def generate_report(content, output_format="text", strict=False):
    """Generate validation report."""
    parsed = parse_yaml_simple(content)
    findings = validate_compose(parsed, strict)
    services = parsed.get("services", {})

    # Score
    deductions = {"critical": 25, "high": 15, "medium": 5, "low": 2}
    score = max(0, 100 - sum(deductions.get(f["severity"], 0) for f in findings))

    counts = {
        "critical": sum(1 for f in findings if f["severity"] == "critical"),
        "high": sum(1 for f in findings if f["severity"] == "high"),
        "medium": sum(1 for f in findings if f["severity"] == "medium"),
        "low": sum(1 for f in findings if f["severity"] == "low"),
    }

    result = {
        "score": score,
        "services": list(services.keys()),
        "service_count": len(services),
        "findings": findings,
        "finding_counts": counts,
    }

    if output_format == "json":
        print(json.dumps(result, indent=2))
        return result

    # Text output
    print(f"\n{'=' * 60}")
    print(f"  Docker Compose Validation Report")
    print(f"{'=' * 60}")
    print(f"  Score: {score}/100")
    print(f"  Services: {', '.join(services.keys()) if services else 'none'}")
    print()
    print(f"  Findings: {counts['critical']} critical | {counts['high']} high | {counts['medium']} medium | {counts['low']} low")
    print(f"{'─' * 60}")

    for f in findings:
        icon = {"critical": "!!!", "high": "!!", "medium": "!", "low": "~"}.get(f["severity"], "?")
        print(f"\n  {icon} {f['severity'].upper()} [{f['category']}] — {f['service']}")
        print(f"  {f['message']}")

    if not findings:
        print("\n  No issues found. Compose file looks good.")

    print(f"\n{'=' * 60}\n")
    return result


def main():
    parser = argparse.ArgumentParser(
        description="docker-development: Docker Compose validator"
    )
    parser.add_argument("composefile", nargs="?", help="Path to docker-compose.yml (omit for demo)")
    parser.add_argument(
        "--output", "-o",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Strict mode — elevate warnings to higher severity",
    )
    args = parser.parse_args()

    if args.composefile:
        path = Path(args.composefile)
        if not path.exists():
            print(f"Error: File not found: {args.composefile}", file=sys.stderr)
            sys.exit(1)
        content = path.read_text(encoding="utf-8")
    else:
        print("No compose file provided. Running demo validation...\n")
        content = DEMO_COMPOSE

    generate_report(content, args.output, args.strict)


if __name__ == "__main__":
    main()
