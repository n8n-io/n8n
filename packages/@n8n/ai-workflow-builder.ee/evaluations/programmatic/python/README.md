# n8n Workflow Comparison

Graph-based workflow similarity comparison using NetworkX and graph edit distance.

## Features

- **Graph Edit Distance**: Uses NetworkX's graph edit distance algorithm for accurate structural comparison
- **Configurable Cost Functions**: Customize costs for different types of edits (node/edge insertion, deletion, substitution)
- **Special Case Handling**: Higher penalties for trigger mismatches, similar node types grouped together
- **Parameter Comparison**: Deep comparison of node parameters with configurable ignore rules
- **External Configuration**: YAML/JSON config files for easy customization without code changes ([see CONFIGURATION.md](CONFIGURATION.md))
- **Built-in Presets**: Strict, standard, and lenient comparison modes
- **Detailed Output**: Returns similarity score and top edit operations needed

## Installation

This module uses `uv` for dependency management. No installation is needed - dependencies are automatically managed by `uvx`.

### Prerequisites

Install `uv`:

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Install [just](https://github.com/casey/just)
```bash
# on macOS via homebrew
brew install just
# or gloabl install via NPM
npm install -g rust-just
# or cross platform via curl to DEST
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to DEST

```


## Usage

### CLI Usage

```bash
# Using default (standard) configuration
uvx --from . python -m src.compare_workflows generated.json ground_truth.json

# Using a preset
uvx --from . python -m src.compare_workflows generated.json ground_truth.json --preset strict

# Using custom configuration
uvx --from . python -m src.compare_workflows generated.json ground_truth.json --config my-config.yaml

# Output as human-readable summary
uvx --from . python -m src.compare_workflows generated.json ground_truth.json --output-format summary
```

### Python API Usage

```python
from config_loader import load_config
from graph_builder import build_workflow_graph
from similarity import calculate_graph_edit_distance
import json

# Load workflows
with open('generated.json') as f:
    generated = json.load(f)
with open('ground_truth.json') as f:
    ground_truth = json.load(f)

# Load configuration
config = load_config('preset:standard')

# Build graphs
g1 = build_workflow_graph(generated, config)
g2 = build_workflow_graph(ground_truth, config)

# Calculate similarity
result = calculate_graph_edit_distance(g1, g2, config)

print(f"Similarity: {result['similarity_score']:.2%}")
print(f"Edit cost: {result['edit_cost']:.1f}")
print(f"Top edits: {len(result['top_edits'])}")
```

## Configuration

> **📖 For detailed configuration documentation, see [CONFIGURATION.md](CONFIGURATION.md)**

### Built-in Presets

- **strict**: High penalties, exact matching required
- **standard**: Balanced comparison (default)
- **lenient**: Low penalties, focus on structure over details

### Quick Start

Create a YAML or JSON file with your custom rules:

```yaml
version: "1.0"
name: "my-custom-config"
description: "Custom configuration for my use case"

costs:
  nodes:
    insertion: 10.0
    deletion: 10.0
    substitution:
      same_type: 1.0
      similar_type: 5.0
      different_type: 15.0
      trigger_mismatch: 50.0

  edges:
    insertion: 5.0
    deletion: 5.0
    substitution: 3.0

similarity_groups:
  triggers:
    - "n8n-nodes-base.webhook"
    - "n8n-nodes-base.manualTrigger"

ignore:
  node_types:
    - "n8n-nodes-base.stickyNote"
  global_parameters:
    - "position"
    - "id"

parameter_comparison:
  numeric_tolerance:
    - parameter: "options.temperature"
      tolerance: 0.1
      cost_if_exceeded: 2.0
```

**For comprehensive documentation including:**
- Complete field reference
- Cost configuration strategies
- Advanced ignore rules and wildcards
- Parameter comparison rules
- Exemptions and conditional logic
- Real-world examples

See **[CONFIGURATION.md](CONFIGURATION.md)**

## Output Format

### JSON Output

```json
{
  "similarity_score": 0.78,
  "similarity_percentage": "78.0%",
  "edit_cost": 45.0,
  "max_possible_cost": 205.0,
  "top_edits": [
    {
      "type": "node_substitute",
      "description": "Replace 'Manual Trigger' with 'Webhook Trigger'",
      "cost": 25.0,
      "priority": "critical"
    }
  ],
  "metadata": {
    "generated_nodes": 5,
    "ground_truth_nodes": 6
  }
}
```

### Summary Output

```
============================================================
WORKFLOW COMPARISON SUMMARY
============================================================

Overall Similarity: 78.0%
Edit Cost:          45.0 / 205.0

Configuration: standard
  Standard balanced comparison configuration

Top 3 Required Edits:
------------------------------------------------------------
1. 🔴 [CRITICAL] Cost: 25.0
   Replace 'Manual Trigger' with 'Webhook Trigger'

2. 🟠 [MAJOR] Cost: 10.0
   Add missing 'HTTP Request' tool node

3. 🟡 [MINOR] Cost: 5.0
   Remove connection from 'Agent' to 'Extra Node'

============================================================
✅ PASS - Workflows are sufficiently similar
============================================================
```

## Testing

Run the test suite:

```bash
# Install dev dependencies
uv sync --dev

# Run tests
uv run pytest

# Run with coverage
uv run pytest --cov
```

## Algorithm Details

### Graph Representation
- Each workflow node becomes a graph node with attributes (type, parameters, etc.)
- Node and edge get a generated ID based on their position in the workflow
- Each workflow connection becomes a directed edge with connection type
- Nodes and edges are filtered based on configuration rules

### Graph Edit Distance
Uses NetworkX's `optimize_graph_edit_distance` with custom cost functions:
- Node operations: insertion, deletion, substitution
- Edge operations: insertion, deletion, substitution
- Cost functions consider node types, parameters, and configuration rules

### Similarity Score
```
similarity = 1 - (edit_cost / max_possible_cost)
```

Where `max_possible_cost` is the cost of deleting all nodes/edges from g1 and inserting all from g2.

## Troubleshooting

### Timeout errors
For very large or complex workflows, the comparison may timeout. Consider:
- Using a lenient preset to reduce computation
- Simplifying the workflow structure
- Increasing the timeout in the TypeScript wrapper

### Configuration errors
- Ensure YAML/JSON syntax is valid
- Check that node types and parameter paths are correct
- Use `--verbose` flag to see detailed configuration info
