#!/usr/bin/env python3
"""
Agent Orchestrator - Tool for designing and validating agent workflows

Features:
- Parse agent configurations (YAML/JSON)
- Validate tool registrations
- Visualize execution flows (ASCII/Mermaid)
- Estimate token usage per run
- Detect potential issues (loops, missing tools)

Usage:
    python agent_orchestrator.py agent.yaml --validate
    python agent_orchestrator.py agent.yaml --visualize
    python agent_orchestrator.py agent.yaml --visualize --format mermaid
    python agent_orchestrator.py agent.yaml --estimate-cost
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, asdict, field
from enum import Enum


class AgentPattern(Enum):
    """Supported agent patterns"""
    REACT = "react"
    PLAN_EXECUTE = "plan-execute"
    TOOL_USE = "tool-use"
    MULTI_AGENT = "multi-agent"
    CUSTOM = "custom"


@dataclass
class ToolDefinition:
    """Definition of an agent tool"""
    name: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    required_config: List[str] = field(default_factory=list)
    estimated_tokens: int = 100


@dataclass
class AgentConfig:
    """Agent configuration"""
    name: str
    pattern: AgentPattern
    description: str
    tools: List[ToolDefinition]
    max_iterations: int = 10
    system_prompt: str = ""
    temperature: float = 0.7
    model: str = "unspecified"  # any model name; informational only — never priced from a hardcoded table


@dataclass
class ValidationResult:
    """Result of agent validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    tool_status: Dict[str, str]
    estimated_tokens_per_run: Tuple[int, int]  # (min, max)
    potential_infinite_loop: bool
    max_depth: int


def parse_yaml_simple(content: str) -> Dict[str, Any]:
    """Simple YAML parser for agent configs (no external dependencies)"""
    result = {}
    current_key = None
    current_list = None
    indent_stack = [(0, result)]

    lines = content.split('\n')

    for line in lines:
        # Skip empty lines and comments
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue

        # Calculate indent
        indent = len(line) - len(line.lstrip())

        # Check for list item
        if stripped.startswith('- '):
            item = stripped[2:].strip()
            if current_list is not None:
                # Check if it's a key-value pair
                if ':' in item and not item.startswith('{'):
                    key, _, value = item.partition(':')
                    current_list.append({key.strip(): value.strip().strip('"\'')})
                else:
                    current_list.append(item.strip('"\''))
            continue

        # Check for key-value pair
        if ':' in stripped:
            key, _, value = stripped.partition(':')
            key = key.strip()
            value = value.strip().strip('"\'')

            # Pop indent stack as needed
            while indent_stack and indent <= indent_stack[-1][0] and len(indent_stack) > 1:
                indent_stack.pop()

            current_dict = indent_stack[-1][1]

            if value:
                # Simple key-value
                current_dict[key] = value
                current_list = None
            else:
                # Start of nested structure or list
                # Peek ahead to see if it's a list
                next_line_idx = lines.index(line) + 1
                if next_line_idx < len(lines):
                    next_stripped = lines[next_line_idx].strip()
                    if next_stripped.startswith('- '):
                        current_dict[key] = []
                        current_list = current_dict[key]
                    else:
                        current_dict[key] = {}
                        indent_stack.append((indent + 2, current_dict[key]))
                        current_list = None

    return result


def load_config(path: Path) -> AgentConfig:
    """Load agent configuration from file"""
    content = path.read_text(encoding='utf-8')

    # Try JSON first
    if path.suffix == '.json':
        data = json.loads(content)
    else:
        # Try YAML
        try:
            data = parse_yaml_simple(content)
        except Exception:
            # Fallback to JSON if YAML parsing fails
            data = json.loads(content)

    # Parse pattern
    pattern_str = data.get('pattern', 'react').lower()
    try:
        pattern = AgentPattern(pattern_str)
    except ValueError:
        pattern = AgentPattern.CUSTOM

    # Parse tools
    tools = []
    for tool_data in data.get('tools', []):
        if isinstance(tool_data, dict):
            tools.append(ToolDefinition(
                name=tool_data.get('name', 'unknown'),
                description=tool_data.get('description', ''),
                parameters=tool_data.get('parameters', {}),
                required_config=tool_data.get('required_config', []),
                estimated_tokens=tool_data.get('estimated_tokens', 100)
            ))
        elif isinstance(tool_data, str):
            tools.append(ToolDefinition(name=tool_data, description=''))

    return AgentConfig(
        name=data.get('name', 'agent'),
        pattern=pattern,
        description=data.get('description', ''),
        tools=tools,
        max_iterations=int(data.get('max_iterations', 10)),
        system_prompt=data.get('system_prompt', ''),
        temperature=float(data.get('temperature', 0.7)),
        model=data.get('model', 'unspecified')
    )


def validate_agent(config: AgentConfig) -> ValidationResult:
    """Validate agent configuration"""
    errors = []
    warnings = []
    tool_status = {}

    # Validate name
    if not config.name:
        errors.append("Agent name is required")

    # Validate tools
    if not config.tools:
        warnings.append("No tools defined - agent will have limited capabilities")

    tool_names = set()
    for tool in config.tools:
        # Check for duplicates
        if tool.name in tool_names:
            errors.append(f"Duplicate tool name: {tool.name}")
        tool_names.add(tool.name)

        # Check required config
        if tool.required_config:
            missing = [c for c in tool.required_config if not c.startswith('$')]
            if missing:
                tool_status[tool.name] = f"WARN: Missing config: {missing}"
            else:
                tool_status[tool.name] = "OK"
        else:
            tool_status[tool.name] = "OK - No config needed"

        # Check description
        if not tool.description:
            warnings.append(f"Tool '{tool.name}' has no description")

    # Validate pattern-specific requirements
    if config.pattern == AgentPattern.MULTI_AGENT:
        if len(config.tools) < 2:
            warnings.append("Multi-agent pattern typically requires 2+ specialized tools")

    # Check for potential infinite loops
    potential_loop = config.max_iterations > 50

    # Estimate tokens
    base_tokens = len(config.system_prompt.split()) * 1.3 if config.system_prompt else 200
    tool_tokens = sum(t.estimated_tokens for t in config.tools)

    min_tokens = int(base_tokens + tool_tokens)
    max_tokens = int((base_tokens + tool_tokens * 2) * config.max_iterations)

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        tool_status=tool_status,
        estimated_tokens_per_run=(min_tokens, max_tokens),
        potential_infinite_loop=potential_loop,
        max_depth=config.max_iterations
    )


def generate_ascii_diagram(config: AgentConfig) -> str:
    """Generate ASCII workflow diagram"""
    lines = []

    # Header
    width = max(40, len(config.name) + 10)
    lines.append("┌" + "─" * width + "┐")
    lines.append("│" + config.name.center(width) + "│")
    lines.append("│" + f"({config.pattern.value} Pattern)".center(width) + "│")
    lines.append("└" + "─" * (width // 2 - 1) + "┬" + "─" * (width // 2) + "┘")
    lines.append(" " * (width // 2) + "│")

    # User Query
    lines.append(" " * (width // 2 - 8) + "┌───────────────┐")
    lines.append(" " * (width // 2 - 8) + "│  User Query   │")
    lines.append(" " * (width // 2 - 8) + "└───────┬───────┘")
    lines.append(" " * (width // 2) + "│")

    if config.pattern == AgentPattern.REACT:
        # ReAct loop
        lines.append(" " * (width // 2 - 8) + "┌───────────────┐")
        lines.append(" " * (width // 2 - 8) + "│    Think      │◄──────┐")
        lines.append(" " * (width // 2 - 8) + "└───────┬───────┘       │")
        lines.append(" " * (width // 2) + "│               │")
        lines.append(" " * (width // 2 - 8) + "┌───────────────┐       │")
        lines.append(" " * (width // 2 - 8) + "│  Select Tool  │       │")
        lines.append(" " * (width // 2 - 8) + "└───────┬───────┘       │")
        lines.append(" " * (width // 2) + "│               │")

        # Tools
        if config.tools:
            tool_line = "   ".join([f"[{t.name}]" for t in config.tools[:4]])
            if len(config.tools) > 4:
                tool_line += " ..."
            lines.append(" " * 4 + tool_line)
            lines.append(" " * (width // 2) + "│               │")

        lines.append(" " * (width // 2 - 8) + "┌───────────────┐       │")
        lines.append(" " * (width // 2 - 8) + "│   Observe     │───────┘")
        lines.append(" " * (width // 2 - 8) + "└───────┬───────┘")

    elif config.pattern == AgentPattern.PLAN_EXECUTE:
        # Plan phase
        lines.append(" " * (width // 2 - 8) + "┌───────────────┐")
        lines.append(" " * (width // 2 - 8) + "│  Create Plan  │")
        lines.append(" " * (width // 2 - 8) + "└───────┬───────┘")
        lines.append(" " * (width // 2) + "│")

        # Execute loop
        lines.append(" " * (width // 2 - 8) + "┌───────────────┐")
        lines.append(" " * (width // 2 - 8) + "│ Execute Step  │◄──────┐")
        lines.append(" " * (width // 2 - 8) + "└───────┬───────┘       │")
        lines.append(" " * (width // 2) + "│               │")

        if config.tools:
            tool_line = "   ".join([f"[{t.name}]" for t in config.tools[:4]])
            lines.append(" " * 4 + tool_line)
            lines.append(" " * (width // 2) + "│               │")

        lines.append(" " * (width // 2 - 8) + "┌───────────────┐       │")
        lines.append(" " * (width // 2 - 8) + "│  Check Done?  │───────┘")
        lines.append(" " * (width // 2 - 8) + "└───────┬───────┘")

    else:
        # Generic tool use
        lines.append(" " * (width // 2 - 8) + "┌───────────────┐")
        lines.append(" " * (width // 2 - 8) + "│ Process Query │")
        lines.append(" " * (width // 2 - 8) + "└───────┬───────┘")
        lines.append(" " * (width // 2) + "│")

        if config.tools:
            for tool in config.tools[:6]:
                lines.append(" " * (width // 2 - 8) + f"├──▶ [{tool.name}]")
            if len(config.tools) > 6:
                lines.append(" " * (width // 2 - 8) + "├──▶ [...]")

    # Final answer
    lines.append(" " * (width // 2) + "│")
    lines.append(" " * (width // 2 - 8) + "┌───────────────┐")
    lines.append(" " * (width // 2 - 8) + "│ Final Answer  │")
    lines.append(" " * (width // 2 - 8) + "└───────────────┘")

    return '\n'.join(lines)


def generate_mermaid_diagram(config: AgentConfig) -> str:
    """Generate Mermaid flowchart"""
    lines = ["```mermaid", "flowchart TD"]

    # Start and query
    lines.append(f"    subgraph {config.name}[{config.name}]")
    lines.append("    direction TB")
    lines.append("    A[User Query] --> B{Process}")

    if config.pattern == AgentPattern.REACT:
        lines.append("    B --> C[Think]")
        lines.append("    C --> D{Select Tool}")

        for i, tool in enumerate(config.tools[:6]):
            lines.append(f"    D -->|{tool.name}| T{i}[{tool.name}]")
            lines.append(f"    T{i} --> E[Observe]")

        lines.append("    E -->|Continue| C")
        lines.append("    E -->|Done| F[Final Answer]")

    elif config.pattern == AgentPattern.PLAN_EXECUTE:
        lines.append("    B --> P[Create Plan]")
        lines.append("    P --> X{Execute Step}")

        for i, tool in enumerate(config.tools[:6]):
            lines.append(f"    X -->|{tool.name}| T{i}[{tool.name}]")
            lines.append(f"    T{i} --> R[Review]")

        lines.append("    R -->|More Steps| X")
        lines.append("    R -->|Complete| F[Final Answer]")

    else:
        for i, tool in enumerate(config.tools[:6]):
            lines.append(f"    B -->|use| T{i}[{tool.name}]")
            lines.append(f"    T{i} --> F[Final Answer]")

    lines.append("    end")
    lines.append("```")

    return '\n'.join(lines)


def estimate_cost(config: AgentConfig, runs: int = 100,
                  input_price_per_mtok: Optional[float] = None,
                  output_price_per_mtok: Optional[float] = None) -> Dict[str, Any]:
    """Estimate token usage (always) and dollar costs (only with user-supplied prices).

    Model pricing changes too often to hardcode. Look up your provider's current
    rates and pass --input-price-per-mtok / --output-price-per-mtok; without them
    the tool reports token estimates only.
    """
    validation = validate_agent(config)
    min_tokens, max_tokens = validation.estimated_tokens_per_run

    result: Dict[str, Any] = {
        'model': config.model,
        'tokens_per_run': {'min': min_tokens, 'max': max_tokens},
        'cost_per_run': None,
        'estimated_monthly': {'runs': runs * 30, 'cost_min': None, 'cost_max': None},
    }

    if input_price_per_mtok is None or output_price_per_mtok is None:
        return result

    # Assume 60% input, 40% output
    def run_cost(tokens: int) -> float:
        return (tokens * 0.6 / 1_000_000 * input_price_per_mtok +
                tokens * 0.4 / 1_000_000 * output_price_per_mtok)

    cost_per_run_min = run_cost(min_tokens)
    cost_per_run_max = run_cost(max_tokens)

    result['cost_per_run'] = {'min': round(cost_per_run_min, 4), 'max': round(cost_per_run_max, 4)}
    result['estimated_monthly'] = {
        'runs': runs * 30,
        'cost_min': round(cost_per_run_min * runs * 30, 2),
        'cost_max': round(cost_per_run_max * runs * 30, 2),
    }
    return result


def format_validation_report(config: AgentConfig, result: ValidationResult) -> str:
    """Format validation result as human-readable report"""
    lines = []
    lines.append("=" * 50)
    lines.append("AGENT VALIDATION REPORT")
    lines.append("=" * 50)
    lines.append("")

    lines.append(f"📋 AGENT INFO")
    lines.append(f"  Name:    {config.name}")
    lines.append(f"  Pattern: {config.pattern.value}")
    lines.append(f"  Model:   {config.model}")
    lines.append("")

    lines.append(f"🔧 TOOLS ({len(config.tools)} registered)")
    for tool in config.tools:
        status = result.tool_status.get(tool.name, "Unknown")
        emoji = "✅" if status.startswith("OK") else "⚠️"
        lines.append(f"  {emoji} {tool.name} - {status}")
    lines.append("")

    lines.append("📊 FLOW ANALYSIS")
    lines.append(f"  Max iterations:      {result.max_depth}")
    lines.append(f"  Estimated tokens:    {result.estimated_tokens_per_run[0]:,} - {result.estimated_tokens_per_run[1]:,}")
    lines.append(f"  Potential loop:      {'⚠️ Yes' if result.potential_infinite_loop else '✅ No'}")
    lines.append("")

    if result.errors:
        lines.append(f"❌ ERRORS ({len(result.errors)})")
        for error in result.errors:
            lines.append(f"  • {error}")
        lines.append("")

    if result.warnings:
        lines.append(f"⚠️ WARNINGS ({len(result.warnings)})")
        for warning in result.warnings:
            lines.append(f"  • {warning}")
        lines.append("")

    # Overall status
    if result.is_valid:
        lines.append("✅ VALIDATION PASSED")
    else:
        lines.append("❌ VALIDATION FAILED")

    lines.append("")
    lines.append("=" * 50)

    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Agent Orchestrator - Design and validate agent workflows",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s agent.yaml --validate
  %(prog)s agent.yaml --visualize
  %(prog)s agent.yaml --visualize --format mermaid
  %(prog)s agent.yaml --estimate-cost --runs 100

Agent config format (YAML):

name: research_assistant
pattern: react
model: any-model-id   # optional, informational only
max_iterations: 10
tools:
  - name: web_search
    description: Search the web
    required_config: [api_key]
  - name: calculator
    description: Evaluate math expressions
        """
    )

    parser.add_argument('config', help='Agent configuration file (YAML or JSON)')
    parser.add_argument('--validate', '-V', action='store_true', help='Validate agent configuration')
    parser.add_argument('--visualize', '-v', action='store_true', help='Visualize agent workflow')
    parser.add_argument('--format', '-f', choices=['ascii', 'mermaid'], default='ascii',
                       help='Visualization format (default: ascii)')
    parser.add_argument('--estimate-cost', '-e', action='store_true',
                       help='Estimate token usage (and dollar cost if prices supplied)')
    parser.add_argument('--runs', '-r', type=int, default=100, help='Daily runs for cost estimation')
    parser.add_argument('--input-price-per-mtok', type=float, default=None,
                       help='Input price in USD per million tokens (your provider\'s current rate)')
    parser.add_argument('--output-price-per-mtok', type=float, default=None,
                       help='Output price in USD per million tokens (your provider\'s current rate)')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--json', '-j', action='store_true', help='Output as JSON')

    args = parser.parse_args()

    # Load config
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"Error: Config file not found: {args.config}", file=sys.stderr)
        sys.exit(1)

    try:
        config = load_config(config_path)
    except Exception as e:
        print(f"Error parsing config: {e}", file=sys.stderr)
        sys.exit(1)

    # Default to validate if no action specified
    if not any([args.validate, args.visualize, args.estimate_cost]):
        args.validate = True

    output_parts = []

    # Validate
    if args.validate:
        result = validate_agent(config)
        if args.json:
            output_parts.append(json.dumps(asdict(result), indent=2))
        else:
            output_parts.append(format_validation_report(config, result))

    # Visualize
    if args.visualize:
        if args.format == 'mermaid':
            diagram = generate_mermaid_diagram(config)
        else:
            diagram = generate_ascii_diagram(config)
        output_parts.append(diagram)

    # Cost estimation
    if args.estimate_cost:
        costs = estimate_cost(config, args.runs,
                              args.input_price_per_mtok, args.output_price_per_mtok)
        if args.json:
            output_parts.append(json.dumps(costs, indent=2))
        else:
            output_parts.append("")
            output_parts.append("💰 COST ESTIMATION")
            output_parts.append(f"  Model: {costs['model']}")
            output_parts.append(f"  Tokens per run: {costs['tokens_per_run']['min']:,} - {costs['tokens_per_run']['max']:,}")
            if costs['cost_per_run'] is not None:
                output_parts.append(f"  Cost per run: ${costs['cost_per_run']['min']:.4f} - ${costs['cost_per_run']['max']:.4f}")
                output_parts.append(f"  Monthly ({costs['estimated_monthly']['runs']:,} runs):")
                output_parts.append(f"    Min: ${costs['estimated_monthly']['cost_min']:.2f}")
                output_parts.append(f"    Max: ${costs['estimated_monthly']['cost_max']:.2f}")
            else:
                output_parts.append("  Dollar cost: n/a — pass --input-price-per-mtok and "
                                    "--output-price-per-mtok with your provider's current rates")

    # Output
    output = '\n'.join(output_parts)
    print(output)

    if args.output:
        Path(args.output).write_text(output)
        print(f"\nOutput saved to {args.output}")


if __name__ == '__main__':
    main()
