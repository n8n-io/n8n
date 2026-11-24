#!/usr/bin/env python3
"""
Mermaid Syntax Validator — Structural Validation Without Rendering

Validates Mermaid diagram blocks in markdown files for common structural errors
that cause render failures. Does NOT require a Mermaid renderer — works purely
on syntax analysis.

Usage:
    python scripts/validate_mermaid.py <file.md>
    python scripts/validate_mermaid.py <directory> --recursive
    python scripts/validate_mermaid.py --skill <skill-path>
    python scripts/validate_mermaid.py --all-skills

Examples:
    python validate_mermaid.py SKILL.md
    python validate_mermaid.py references/
    python validate_mermaid.py --skill .claude/skills/mermaid-graph-writer
    python validate_mermaid.py --all-skills --errors-only
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple


# ──────────────────────────────────────────────────────────────────────
# All 23 Mermaid Diagram Types — Valid Declaration Keywords
# ──────────────────────────────────────────────────────────────────────

VALID_DIAGRAM_TYPES = {
    # Stable
    "flowchart",
    "graph",              # Legacy alias for flowchart
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "requirementDiagram",
    "gitGraph",
    "mindmap",
    "timeline",
    # Beta
    "quadrantChart",
    "sankey-beta",
    "xychart-beta",
    "block-beta",
    "architecture-beta",
    "packet-beta",
    "kanban",
    "radar",
    "treemap",
    # Plugin / C4
    "zenuml",
    "C4Context",
    "C4Container",
    "C4Component",
    "C4Dynamic",
    "C4Deployment",
}

# Diagram types that use directional suffixes
DIRECTIONAL_TYPES = {"flowchart", "graph"}
VALID_DIRECTIONS = {"TD", "TB", "LR", "RL", "BT"}

# Diagram types that use curly-brace blocks
CURLY_BRACE_TYPES = {"zenuml"}

# Diagram types that use indentation-based structure
INDENT_TYPES = {"mindmap", "timeline", "kanban", "treemap"}

# Types using subgraph/end blocks
SUBGRAPH_TYPES = {"flowchart", "graph", "block-beta"}

# Types using state blocks
STATE_BLOCK_TYPES = {"stateDiagram", "stateDiagram-v2"}


# ──────────────────────────────────────────────────────────────────────
# Data Structures
# ──────────────────────────────────────────────────────────────────────

@dataclass
class DiagramIssue:
    file: str
    line: int          # Line in the original file
    diagram_line: int  # Line within the diagram block
    severity: str      # 'error', 'warning'
    message: str
    diagram_type: str


@dataclass
class DiagramBlock:
    file: str
    start_line: int    # Line number of ```mermaid
    end_line: int      # Line number of closing ```
    content: str       # Raw content between fences
    diagram_type: str  # Detected type


@dataclass
class ValidationReport:
    files_scanned: int = 0
    diagrams_found: int = 0
    issues: List[DiagramIssue] = field(default_factory=list)

    @property
    def errors(self) -> List[DiagramIssue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> List[DiagramIssue]:
        return [i for i in self.issues if i.severity == "warning"]

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0


# ──────────────────────────────────────────────────────────────────────
# Extraction: Find Mermaid blocks in markdown
# ──────────────────────────────────────────────────────────────────────

def extract_mermaid_blocks(file_path: Path) -> List[DiagramBlock]:
    """Extract all ```mermaid ... ``` blocks from a markdown file."""
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")
    blocks = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("```mermaid"):
            start = i + 1
            # Find closing fence
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("```"):
                j += 1
            if j < len(lines):
                block_content = "\n".join(lines[start:j])
                # Detect diagram type from first non-empty line
                dtype = _detect_diagram_type(block_content)
                blocks.append(DiagramBlock(
                    file=str(file_path),
                    start_line=i + 1,  # 1-indexed
                    end_line=j + 1,
                    content=block_content,
                    diagram_type=dtype,
                ))
                i = j + 1
                continue
        i += 1

    return blocks


def _detect_diagram_type(content: str) -> str:
    """Detect the diagram type from the first non-empty, non-frontmatter line."""
    lines = content.strip().split("\n")
    in_frontmatter = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped == "---":
            in_frontmatter = not in_frontmatter
            continue
        if in_frontmatter:
            continue

        # First real line is the declaration
        first_word = stripped.split()[0] if stripped.split() else ""

        # Check for directional suffix: "flowchart TD"
        if first_word in DIRECTIONAL_TYPES:
            return first_word

        # Check exact match
        if first_word in VALID_DIAGRAM_TYPES:
            return first_word

        # Check if it starts with a valid type (e.g., "pie showData")
        for dtype in VALID_DIAGRAM_TYPES:
            if stripped.startswith(dtype):
                return dtype

        return first_word  # Unknown type — will be flagged

    return "unknown"


# ──────────────────────────────────────────────────────────────────────
# Validation Checks
# ──────────────────────────────────────────────────────────────────────

def validate_block(block: DiagramBlock) -> List[DiagramIssue]:
    """Run all structural checks on a single Mermaid diagram block."""
    issues = []

    # Check 1: Valid diagram type
    issues.extend(_check_diagram_type(block))

    # Check 2: Direction suffix for flowcharts
    issues.extend(_check_direction(block))

    # Check 3: Balanced subgraph/end blocks
    issues.extend(_check_balanced_blocks(block))

    # Check 4: Balanced curly braces (ZenUML, C4)
    issues.extend(_check_balanced_braces(block))

    # Check 5: Empty diagram
    issues.extend(_check_empty_diagram(block))

    # Check 6: Node ID conflicts
    issues.extend(_check_node_ids(block))

    # Check 7: Sequence diagram specific checks
    if block.diagram_type == "sequenceDiagram":
        issues.extend(_check_sequence_diagram(block))

    # Check 8: ER diagram specific checks
    if block.diagram_type == "erDiagram":
        issues.extend(_check_er_diagram(block))

    # Check 9: Sankey CSV format
    if block.diagram_type == "sankey-beta":
        issues.extend(_check_sankey(block))

    # Check 10: Node count warning
    issues.extend(_check_node_count(block))

    return issues


def _make_issue(block: DiagramBlock, diagram_line: int, severity: str, message: str) -> DiagramIssue:
    return DiagramIssue(
        file=block.file,
        line=block.start_line + diagram_line,
        diagram_line=diagram_line,
        severity=severity,
        message=message,
        diagram_type=block.diagram_type,
    )


def _check_diagram_type(block: DiagramBlock) -> List[DiagramIssue]:
    """Verify the diagram type is recognized."""
    dtype = block.diagram_type
    if dtype == "unknown":
        return [_make_issue(block, 0, "error", "Could not detect diagram type — first line must be a valid declaration")]

    if dtype not in VALID_DIAGRAM_TYPES and dtype not in DIRECTIONAL_TYPES:
        # Check for common misspellings
        suggestions = {
            "sequencediagram": "sequenceDiagram",
            "classdiagram": "classDiagram",
            "statediagram": "stateDiagram-v2",
            "erdiagram": "erDiagram",
            "gitgraph": "gitGraph",
            "quadrantchart": "quadrantChart",
            "requirementdiagram": "requirementDiagram",
            "c4context": "C4Context",
            "c4container": "C4Container",
        }
        lower_dtype = dtype.lower()
        if lower_dtype in suggestions:
            return [_make_issue(block, 0, "error",
                f"Invalid diagram type '{dtype}' — did you mean '{suggestions[lower_dtype]}'? (case-sensitive)")]
        return [_make_issue(block, 0, "error",
            f"Unknown diagram type '{dtype}' — see all 23 valid types in references/diagram-types.md")]
    return []


def _check_direction(block: DiagramBlock) -> List[DiagramIssue]:
    """Check flowchart/graph has a valid direction suffix."""
    if block.diagram_type not in DIRECTIONAL_TYPES:
        return []

    first_line = block.content.strip().split("\n")[0].strip()
    parts = first_line.split()
    if len(parts) < 2:
        return [_make_issue(block, 0, "warning",
            f"'{block.diagram_type}' without direction — defaults to TD. Consider adding: TD, LR, BT, or RL")]

    direction = parts[1]
    if direction not in VALID_DIRECTIONS:
        return [_make_issue(block, 0, "error",
            f"Invalid direction '{direction}' — valid: TD, TB, LR, RL, BT")]
    return []


def _check_balanced_blocks(block: DiagramBlock) -> List[DiagramIssue]:
    """Check for matched block-open/close pairs.
    - flowchart/graph: subgraph/end
    - stateDiagram: state Name { ... } (curly braces)
    - block-beta: block:name/end AND subgraph/end
    """
    if block.diagram_type not in SUBGRAPH_TYPES | STATE_BLOCK_TYPES:
        return []

    issues = []
    lines = block.content.split("\n")

    if block.diagram_type in STATE_BLOCK_TYPES:
        # State diagrams use curly braces for nested states
        open_count = 0
        openers = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.endswith("{") and "state" in stripped:
                open_count += 1
                openers.append(i)
            elif stripped == "}":
                open_count -= 1

        if open_count > 0:
            issues.append(_make_issue(block, openers[-1], "error",
                f"{open_count} unclosed 'state' block(s) — add '}}' to close"))
        elif open_count < 0:
            issues.append(_make_issue(block, 0, "error",
                f"{abs(open_count)} extra '}}' without matching 'state ... {{'"))

    else:
        # Flowchart uses subgraph/end, block-beta uses block:/end
        open_count = 0
        openers = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith("subgraph ") or stripped == "subgraph":
                open_count += 1
                openers.append(i)
            elif stripped.startswith("block:") or stripped.startswith("block "):
                # block-beta nested blocks: block:groupId:span
                if block.diagram_type == "block-beta":
                    open_count += 1
                    openers.append(i)
            elif stripped == "end" or stripped.startswith("end "):
                open_count -= 1

        keyword = "subgraph" if block.diagram_type in {"flowchart", "graph"} else "block"
        if open_count > 0:
            issues.append(_make_issue(block, openers[-1], "error",
                f"{open_count} unclosed '{keyword}' block(s) — add 'end' to close"))
        elif open_count < 0:
            issues.append(_make_issue(block, 0, "error",
                f"{abs(open_count)} extra 'end' keyword(s) without matching '{keyword}'"))

    return issues


def _check_balanced_braces(block: DiagramBlock) -> List[DiagramIssue]:
    """Check for matched curly braces (ZenUML, C4 System_Boundary).
    Skips ER diagrams — they use { } in both attribute blocks AND relationship syntax."""
    if block.diagram_type == "erDiagram":
        return []  # ER uses { in relationships like ||--o{ — not block delimiters

    content = block.content
    opens = content.count("{")
    closes = content.count("}")

    if opens != closes:
        return [_make_issue(block, 0, "error",
            f"Unbalanced curly braces: {opens} opening vs {closes} closing")]
    return []


def _check_empty_diagram(block: DiagramBlock) -> List[DiagramIssue]:
    """Check for diagrams with just a type declaration and nothing else."""
    lines = [l.strip() for l in block.content.strip().split("\n") if l.strip()]
    # Remove frontmatter
    clean_lines = []
    in_fm = False
    for line in lines:
        if line == "---":
            in_fm = not in_fm
            continue
        if not in_fm:
            clean_lines.append(line)

    if len(clean_lines) <= 1:
        return [_make_issue(block, 0, "warning", "Diagram appears empty — only has type declaration")]
    return []


def _check_node_ids(block: DiagramBlock) -> List[DiagramIssue]:
    """Check for duplicate node IDs in flowcharts."""
    if block.diagram_type not in {"flowchart", "graph"}:
        return []

    # Extract node definitions: A[text], B(text), C{text}, etc.
    node_defs = re.findall(r"^\s*(\w+)\s*[\[\({]", block.content, re.MULTILINE)
    # Also from edges: A --> B[text]
    edge_node_defs = re.findall(r"--[>|].*?(\w+)\s*[\[\({]", block.content)
    all_defs = node_defs + edge_node_defs

    # Check for redefinitions with different labels (not just repeated references)
    seen = {}
    issues = []
    for node_id in all_defs:
        if node_id in {"subgraph", "end", "style", "class", "click", "linkStyle"}:
            continue
        if node_id in seen:
            seen[node_id] += 1
        else:
            seen[node_id] = 1

    # Multiple definitions of same ID with labels = potential conflict
    for node_id, count in seen.items():
        if count > 3:  # Threshold: re-using an ID many times suggests a problem
            issues.append(_make_issue(block, 0, "warning",
                f"Node '{node_id}' defined {count} times — if labels differ, only the last one renders"))

    return issues


def _check_sequence_diagram(block: DiagramBlock) -> List[DiagramIssue]:
    """Sequence-diagram-specific checks."""
    issues = []
    lines = block.content.split("\n")

    for i, line in enumerate(lines):
        stripped = line.strip()
        # Check for missing colon in messages
        if re.match(r"^\s*\w+\s*->>?\+?\s*\w+\s*$", stripped):
            if ":" not in stripped and stripped != "sequenceDiagram":
                issues.append(_make_issue(block, i, "warning",
                    f"Message without label: '{stripped}' — add ': description' after target"))

        # Check for unmatched activate/deactivate
        # (Simplified: just count them)

    activates = sum(1 for l in lines if l.strip().startswith("activate "))
    deactivates = sum(1 for l in lines if l.strip().startswith("deactivate "))
    if activates != deactivates:
        issues.append(_make_issue(block, 0, "warning",
            f"{activates} activate(s) vs {deactivates} deactivate(s) — imbalanced lifelines"))

    return issues


def _check_er_diagram(block: DiagramBlock) -> List[DiagramIssue]:
    """ER-diagram-specific checks."""
    issues = []
    lines = block.content.split("\n")

    for i, line in enumerate(lines):
        stripped = line.strip()
        # Check relationship syntax
        if re.search(r"[|}o{]-{1,2}[|}o{]", stripped):
            # Has a relationship line
            if ":" not in stripped:
                issues.append(_make_issue(block, i, "warning",
                    f"ER relationship without label: '{stripped}' — add ': verb' at end"))

    return issues


def _check_sankey(block: DiagramBlock) -> List[DiagramIssue]:
    """Sankey-specific checks: CSV format validation."""
    issues = []
    lines = block.content.split("\n")

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped == "sankey-beta":
            continue
        parts = stripped.split(",")
        if len(parts) != 3:
            issues.append(_make_issue(block, i, "error",
                f"Sankey data must be 'Source,Target,Value' — got {len(parts)} fields"))
        elif parts[2].strip():
            try:
                float(parts[2].strip())
            except ValueError:
                issues.append(_make_issue(block, i, "error",
                    f"Sankey value must be numeric — got '{parts[2].strip()}'"))

    return issues


def _check_node_count(block: DiagramBlock) -> List[DiagramIssue]:
    """Warn about overcrowded diagrams."""
    if block.diagram_type not in {"flowchart", "graph"}:
        return []

    # Count unique node IDs
    node_ids = set(re.findall(r"(?:^|\s)(\w+)\s*[\[\({>]", block.content, re.MULTILINE))
    node_ids -= {"subgraph", "end", "style", "class", "click", "linkStyle", "flowchart", "graph"}

    if len(node_ids) > 20:
        return [_make_issue(block, 0, "warning",
            f"Diagram has ~{len(node_ids)} nodes — consider splitting into multiple diagrams (max ~15 recommended)")]
    return []


# ──────────────────────────────────────────────────────────────────────
# File/Directory Scanning
# ──────────────────────────────────────────────────────────────────────

def scan_file(file_path: Path, report: ValidationReport):
    """Scan a single markdown file for Mermaid blocks and validate them."""
    if not file_path.suffix in (".md", ".mdx", ".markdown"):
        return

    report.files_scanned += 1
    blocks = extract_mermaid_blocks(file_path)
    report.diagrams_found += len(blocks)

    for block in blocks:
        issues = validate_block(block)
        report.issues.extend(issues)


def scan_directory(dir_path: Path, report: ValidationReport, recursive: bool = True):
    """Scan all markdown files in a directory."""
    pattern = "**/*.md" if recursive else "*.md"
    for md_file in sorted(dir_path.glob(pattern)):
        scan_file(md_file, report)
    # Also .mdx
    for mdx_file in sorted(dir_path.glob(pattern.replace(".md", ".mdx"))):
        scan_file(mdx_file, report)


def scan_skill(skill_path: Path, report: ValidationReport):
    """Scan a skill directory (SKILL.md + references)."""
    skill_md = skill_path / "SKILL.md"
    if skill_md.exists():
        scan_file(skill_md, report)

    refs_dir = skill_path / "references"
    if refs_dir.exists():
        scan_directory(refs_dir, report)


# ──────────────────────────────────────────────────────────────────────
# Output
# ──────────────────────────────────────────────────────────────────────

def print_report(report: ValidationReport, errors_only: bool = False):
    """Print human-readable report."""
    if not report.issues:
        print(f"\n  Scanned {report.files_scanned} files, {report.diagrams_found} diagrams — all valid")
        return

    current_file = None
    for issue in sorted(report.issues, key=lambda i: (i.file, i.line)):
        if errors_only and issue.severity != "error":
            continue

        if issue.file != current_file:
            current_file = issue.file
            print(f"\n  {current_file}")

        icon = "  " if issue.severity == "error" else "  "
        print(f"    {icon} L{issue.line} [{issue.diagram_type}] {issue.message}")

    print(f"\n  Summary: {report.files_scanned} files, {report.diagrams_found} diagrams")
    print(f"  {len(report.errors)} errors, {len(report.warnings)} warnings")

    if report.passed:
        print("  Mermaid syntax validation passed")
    else:
        print("  Mermaid syntax validation FAILED")


# ──────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Validate Mermaid diagram syntax in markdown files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("path", nargs="?", help="File or directory to scan")
    parser.add_argument("--skill", help="Scan a skill directory (SKILL.md + references)")
    parser.add_argument("--all-skills", action="store_true", help="Scan all skills under .claude/skills/")
    parser.add_argument("--recursive", action="store_true", default=True, help="Recurse into subdirectories")
    parser.add_argument("--errors-only", action="store_true", help="Only show errors, not warnings")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--base", default=".", help="Base project directory")

    args = parser.parse_args()
    report = ValidationReport()

    if args.all_skills:
        skills_dir = Path(args.base).resolve() / ".claude" / "skills"
        if not skills_dir.exists():
            print(f"No skills directory at {skills_dir}")
            return 1
        for skill_dir in sorted(skills_dir.iterdir()):
            if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
                scan_skill(skill_dir, report)

    elif args.skill:
        skill_path = Path(args.skill).resolve()
        scan_skill(skill_path, report)

    elif args.path:
        target = Path(args.path).resolve()
        if target.is_file():
            scan_file(target, report)
        elif target.is_dir():
            scan_directory(target, report, recursive=args.recursive)
        else:
            print(f"Path not found: {target}")
            return 1
    else:
        parser.error("Provide a path, --skill, or --all-skills")

    if args.json:
        output = {
            "files_scanned": report.files_scanned,
            "diagrams_found": report.diagrams_found,
            "passed": report.passed,
            "errors": len(report.errors),
            "warnings": len(report.warnings),
            "issues": [
                {
                    "file": i.file,
                    "line": i.line,
                    "severity": i.severity,
                    "diagram_type": i.diagram_type,
                    "message": i.message,
                }
                for i in report.issues
            ],
        }
        print(json.dumps(output, indent=2))
    else:
        print_report(report, errors_only=args.errors_only)

    return 0 if report.passed else 1


if __name__ == "__main__":
    sys.exit(main())
