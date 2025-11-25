#!/usr/bin/env python3
"""
Workflow comparison using graph edit distance.

Options:
    --config PATH          Path to custom config file (.yaml or .json)
    --preset NAME          Use built-in preset (strict|standard|lenient)
    --output-format FORMAT Output format (json|summary) [default: json]
    --verbose              Show detailed comparison info
    --help                 Show this help message
"""

import argparse
import json
import sys
from typing import Dict, Any

from src.graph_builder import build_workflow_graph, graph_stats
from src.similarity import calculate_graph_edit_distance
from src.config_loader import load_config


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Compare n8n workflows using graph edit distance",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Use default configuration
  python compare_workflows.py generated.json ground_truth.json

  # Use a preset
  python compare_workflows.py generated.json ground_truth.json --preset strict

  # Use custom configuration
  python compare_workflows.py generated.json ground_truth.json --config my-config.yaml

  # Output summary instead of JSON
  python compare_workflows.py generated.json ground_truth.json --output-format summary
        """,
    )

    parser.add_argument("generated", help="Path to generated workflow JSON file")
    parser.add_argument("ground_truth", help="Path to ground truth workflow JSON file")
    parser.add_argument(
        "--config", help="Path to custom configuration file (.yaml or .json)"
    )
    parser.add_argument(
        "--preset",
        choices=["strict", "standard", "lenient"],
        help="Use built-in configuration preset",
    )
    parser.add_argument(
        "--output-format",
        choices=["json", "summary"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Show detailed comparison information"
    )

    return parser.parse_args()


def load_workflow(path: str) -> Dict[str, Any]:
    """
    Load workflow JSON from file.

    Args:
        path: Path to workflow JSON file

    Returns:
        Workflow dictionary

    Raises:
        SystemExit: If file cannot be loaded
    """
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Workflow file not found: {path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {path}: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error loading {path}: {e}", file=sys.stderr)
        sys.exit(1)


def format_output_json(
    result: Dict[str, Any], metadata: Dict[str, Any], verbose: bool = False
) -> str:
    """Format result as JSON"""
    output: Dict[str, Any] = {
        "similarity_score": result["similarity_score"],
        "similarity_percentage": f"{result['similarity_score'] * 100:.1f}%",
        "edit_cost": result["edit_cost"],
        "max_possible_cost": result["max_possible_cost"],
        "top_edits": result["top_edits"],
        "metadata": metadata,
    }

    if verbose:
        metadata_dict = output["metadata"]
        assert isinstance(metadata_dict, dict)
        metadata_dict["verbose"] = True
    else:
        for edit in output["top_edits"]:
            if "parameter_diff" in edit:
                del edit["parameter_diff"]

    return json.dumps(output, indent=2)


def _format_parameter_diff(
    diff: Dict[str, Any],
    indent: str = "",
    max_value_length: int = 50,
) -> list:
    """
    Format parameter diff for human-readable display.

    Args:
        diff: Parameter diff dictionary with 'added', 'removed', 'changed' keys
        indent: Indentation prefix for each line
        max_value_length: Maximum length for displayed values before truncation

    Returns:
        List of formatted lines
    """
    lines = []

    def truncate_value(value: Any) -> str:
        """Truncate long values for display"""
        value_str = str(value)
        if len(value_str) > max_value_length:
            return value_str[:max_value_length] + "..."
        return value_str

    # Added parameters
    if "added" in diff and diff["added"]:
        lines.append(f"{indent}Added:")
        for key, value in diff["added"].items():
            lines.append(f"{indent}  + {key}: {truncate_value(value)}")

    # Removed parameters
    if "removed" in diff and diff["removed"]:
        lines.append(f"{indent}Removed:")
        for key, value in diff["removed"].items():
            lines.append(f"{indent}  - {key}: {truncate_value(value)}")

    # Changed parameters
    if "changed" in diff and diff["changed"]:
        lines.append(f"{indent}Changed:")
        for key, value in diff["changed"].items():
            if isinstance(value, dict) and "from" in value and "to" in value:
                # Simple value change
                lines.append(f"{indent}  ~ {key}:")
                lines.append(f"{indent}      from: {truncate_value(value['from'])}")
                lines.append(f"{indent}      to:   {truncate_value(value['to'])}")
            elif isinstance(value, dict):
                # Nested diff
                lines.append(f"{indent}  ~ {key}:")
                nested_lines = _format_parameter_diff(
                    value, indent + "    ", max_value_length
                )
                lines.extend(nested_lines)

    return lines


def format_output_summary(
    result: Dict[str, Any], metadata: Dict[str, Any], verbose: bool = False
) -> str:
    """Format result as human-readable summary"""
    lines = []

    # Header
    lines.append("=" * 60)
    lines.append("WORKFLOW COMPARISON SUMMARY")
    lines.append("=" * 60)
    lines.append("")

    # Similarity score
    similarity_pct = result["similarity_score"] * 100
    lines.append(f"Overall Similarity: {similarity_pct:.1f}%")
    lines.append(
        f"Edit Cost:          {result['edit_cost']:.1f} / {result['max_possible_cost']:.1f}"
    )
    lines.append("")

    # Configuration info
    lines.append(f"Configuration: {metadata['config_name']}")
    if metadata.get("config_description"):
        lines.append(f"  {metadata['config_description']}")
    lines.append("")

    # Graph statistics
    lines.append("Graph Statistics:")
    lines.append(
        f"  Generated workflow:    {metadata['generated_nodes']} nodes "
        f"({metadata.get('generated_nodes_after_filter', metadata['generated_nodes'])} after filtering)"
    )
    lines.append(
        f"  Ground truth workflow: {metadata['ground_truth_nodes']} nodes "
        f"({metadata.get('ground_truth_nodes_after_filter', metadata['ground_truth_nodes'])} after filtering)"
    )
    lines.append("")

    # Top edits
    if result["top_edits"]:
        lines.append(f"Top {len(result['top_edits'])} Required Edits:")
        lines.append("-" * 60)

        for i, edit in enumerate(result["top_edits"], 1):
            priority = edit["priority"].upper()
            cost = edit["cost"]
            desc = edit["description"]

            # Priority indicator
            if priority == "CRITICAL":
                indicator = "🔴"
            elif priority == "MAJOR":
                indicator = "🟠"
            else:
                indicator = "🟡"

            lines.append(f"{i}. {indicator} [{priority}] Cost: {cost:.1f}")
            lines.append(f"   {desc}")

            # Add parameter diff if present
            if verbose and "parameter_diff" in edit:
                lines.append("")
                lines.extend(
                    _format_parameter_diff(edit["parameter_diff"], indent="   ")
                )

            lines.append("")
    else:
        lines.append("No edits required - workflows are identical!")
        lines.append("")

    # Pass/Fail indicator
    lines.append("=" * 60)
    if similarity_pct >= 70:
        lines.append("✅ PASS - Workflows are sufficiently similar")
    else:
        lines.append("❌ FAIL - Workflows differ significantly")
    lines.append("=" * 60)

    return "\n".join(lines)


def main():
    """Main entry point"""
    args = parse_args()

    # Load workflows
    generated = load_workflow(args.generated)
    ground_truth = load_workflow(args.ground_truth)

    # Load configuration
    try:
        if args.config:
            config = load_config(args.config)
        elif args.preset:
            config = load_config(f"preset:{args.preset}")
        else:
            config = load_config()  # Default (standard)
    except Exception as e:
        print(f"Error loading configuration: {e}", file=sys.stderr)
        sys.exit(1)

    # Build graphs with config filtering
    try:
        g1 = build_workflow_graph(generated, config)
        g2 = build_workflow_graph(ground_truth, config)
    except Exception as e:
        print(f"Error building workflow graphs: {e}", file=sys.stderr)
        sys.exit(1)

    # Get graph statistics
    stats1 = graph_stats(g1)
    stats2 = graph_stats(g2)

    # Calculate similarity
    try:
        result = calculate_graph_edit_distance(g1, g2, config)
    except Exception as e:
        print(f"Error calculating similarity: {e}", file=sys.stderr)
        sys.exit(1)

    # Prepare metadata
    metadata = {
        "generated_nodes": len(generated.get("nodes", [])),
        "ground_truth_nodes": len(ground_truth.get("nodes", [])),
        "generated_nodes_after_filter": stats1["node_count"],
        "ground_truth_nodes_after_filter": stats2["node_count"],
        "config_name": config.name,
        "config_description": config.description,
    }

    if args.verbose:
        metadata["verbose_info"] = {
            "generated_stats": stats1,
            "ground_truth_stats": stats2,
            "config_details": config.to_dict(),
        }

    # Format and output result
    if args.output_format == "json":
        output = format_output_json(result, metadata, args.verbose)
        print(output)
    elif args.output_format == "summary":
        output = format_output_summary(result, metadata, args.verbose)
        print(output)

    # Always exit with 0 - let the caller interpret the similarity score
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)
