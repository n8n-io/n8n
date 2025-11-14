# n8n Workflow Comparison

Graph-based workflow similarity comparison using NetworkX and graph edit distance.

## Features

- **Graph Edit Distance**: Uses NetworkX's graph edit distance algorithm for accurate structural comparison
- **Configurable Cost Functions**: Customize costs for different types of edits (node/edge insertion, deletion, substitution)
- **Special Case Handling**: Higher penalties for trigger mismatches, similar node types grouped together
- **Parameter Comparison**: Deep comparison of node parameters with configurable ignore rules
- **External Configuration**: YAML/JSON config files for easy customization without code changes
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

## Usage

### CLI Usage

```bash
# Using default (standard) configuration
uvx --from . python -m compare_workflows generated.json ground_truth.json

# Using a preset
uvx --from . python -m compare_workflows generated.json ground_truth.json --preset strict

# Using custom configuration
uvx --from . python -m compare_workflows generated.json ground_truth.json --config my-config.yaml

# Output as human-readable summary
uvx --from . python -m compare_workflows generated.json ground_truth.json --output-format summary
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

### TypeScript Integration

```typescript
import { evaluateWorkflowSimilarity } from './evaluators/workflow-similarity';

const result = await evaluateWorkflowSimilarity(
  generatedWorkflow,
  groundTruthWorkflow,
  'standard' // or 'strict', 'lenient'
);

console.log(`Similarity: ${result.score}`);
console.log(`Violations: ${result.violations.length}`);
```

## Configuration

### Built-in Presets

- **strict**: High penalties, exact matching required
- **standard**: Balanced comparison (default)
- **lenient**: Low penalties, focus on structure over details

### Custom Configuration

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
  # Ignore UI-only nodes
  node_types:
    - "n8n-nodes-base.stickyNote"

  # Ignore cosmetic parameters
  global_parameters:
    - "position"
    - "id"
    - "notes"

  # Node-specific ignores
  node_type_parameters:
    "@n8n/n8n-nodes-langchain.agent":
      - "options.systemMessage"

parameter_comparison:
  numeric_tolerance:
    - parameter: "options.temperature"
      tolerance: 0.1
      cost_if_exceeded: 2.0
```

### Configuration Options

#### Cost Weights
- `node_insertion_cost`: Cost of adding a missing node
- `node_deletion_cost`: Cost of removing an extra node
- `node_substitution_same_type`: Cost for parameter differences (same node type)
- `node_substitution_similar_type`: Cost for similar node types
- `node_substitution_different_type`: Cost for completely different node types
- `node_substitution_trigger`: Cost for trigger mismatches (critical!)
- `edge_insertion_cost`: Cost of adding a missing connection
- `edge_deletion_cost`: Cost of removing an extra connection
- `edge_substitution_cost`: Cost of changing connection type

#### Ignore Rules

**Node Ignoring:**
- `ignore.node_types`: List of node types to completely ignore
- `ignore.nodes`: Pattern-based rules for ignoring specific nodes

**Parameter Ignoring:**
- `ignore.global_parameters`: Parameters to ignore for all nodes
- `ignore.node_type_parameters`: Parameters to ignore for specific node types
- `ignore.parameter_paths`: JSONPath-like patterns (supports `*` and `**`)

#### Parameter Comparison
- `fuzzy_match`: Semantic similarity for text parameters
- `numeric_tolerance`: Tolerance ranges for numeric parameters
- `exact_match`: Parameters that must match exactly

#### Exemptions
- `optional_in_generated`: Nodes that can be missing with reduced penalty
- `optional_in_ground_truth`: Extra nodes that are acceptable with reduced penalty

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

## Performance

- **Typical workflow size**: 5-50 nodes
- **Algorithm complexity**: O(n³) for exact GED
- **Expected runtime**: < 5 seconds for typical workflows
- **Timeout**: 30 seconds (configurable in TypeScript wrapper)

## Troubleshooting

### uvx not found
Install `uv`: https://docs.astral.sh/uv/getting-started/installation/

### Timeout errors
For very large or complex workflows, the comparison may timeout. Consider:
- Using a lenient preset to reduce computation
- Simplifying the workflow structure
- Increasing the timeout in the TypeScript wrapper

### Configuration errors
- Ensure YAML/JSON syntax is valid
- Check that node types and parameter paths are correct
- Use `--verbose` flag to see detailed configuration info

## Contributing

When adding new features:
1. Update configuration schema in `config_loader.py`
2. Add tests in `tests/`
3. Update this README with new options
4. Update TypeScript types if needed

## License

Part of the n8n project.
