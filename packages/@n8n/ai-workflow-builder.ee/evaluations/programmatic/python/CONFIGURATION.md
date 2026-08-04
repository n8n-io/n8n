# Configuration Format Documentation

This document provides comprehensive documentation for the workflow comparison configuration format.

## Table of Contents

- [Overview](#overview)
- [Configuration File Format](#configuration-file-format)
- [Top-Level Fields](#top-level-fields)
- [Cost Configuration](#cost-configuration)
- [Similarity Groups](#similarity-groups)
- [Ignore Rules](#ignore-rules)
- [Parameter Comparison Rules](#parameter-comparison-rules)
- [Exemptions](#exemptions)
- [Connection Rules](#connection-rules)
- [Output Configuration](#output-configuration)
- [Examples](#examples)

## Overview

Configuration files can be written in either YAML or JSON format. YAML is recommended for readability and easier maintenance. The configuration controls:

- **Cost weights** for different types of graph edits
- **Similarity groups** to treat similar node types as equivalent
- **Ignore rules** to exclude certain nodes or parameters
- **Parameter comparison** rules for flexible matching
- **Exemptions** for optional nodes
- **Output formatting** preferences

## Configuration File Format

### YAML Example

```yaml
version: "1.0"
name: "my-config"
description: "My custom configuration"

costs:
  nodes:
    insertion: 10.0
    deletion: 10.0
    # ... more costs

similarity_groups:
  triggers:
    - "n8n-nodes-base.webhook"
    - "n8n-nodes-base.manualTrigger"

ignore:
  node_types:
    - "n8n-nodes-base.stickyNote"

parameter_comparison:
  numeric_tolerance:
    - parameter: "options.temperature"
      tolerance: 0.1

output:
  max_edits: 15
```

### JSON Example

```json
{
  "version": "1.0",
  "name": "my-config",
  "description": "My custom configuration",
  "costs": {
    "nodes": {
      "insertion": 10.0,
      "deletion": 10.0
    }
  },
  "similarity_groups": {
    "triggers": [
      "n8n-nodes-base.webhook",
      "n8n-nodes-base.manualTrigger"
    ]
  }
}
```

## Top-Level Fields

### `version` (string, required)

Configuration format version. Currently `"1.0"`.

```yaml
version: "1.0"
```

### `name` (string, optional)

A unique identifier for this configuration.

```yaml
name: "my-custom-config"
```

### `description` (string, optional)

Human-readable description of what this configuration does.

```yaml
description: "Strict comparison for production workflows"
```

## Cost Configuration

The `costs` section defines penalties for different graph edit operations. These costs directly impact the similarity score.

### Structure

```yaml
costs:
  nodes:
    insertion: <float>
    deletion: <float>
    substitution:
      same_type: <float>
      similar_type: <float>
      different_type: <float>
      trigger_mismatch: <float>

  edges:
    insertion: <float>
    deletion: <float>
    substitution: <float>

  parameters:
    mismatch_weight: <float>
    nested_weight: <float>
```

### Node Costs

#### `costs.nodes.insertion` (float, default: 10.0)

Cost penalty when a node exists in the ground truth but is missing from the generated workflow.

**Use case**: Set higher for stricter matching (e.g., 15.0), lower for lenient matching (e.g., 5.0).

```yaml
costs:
  nodes:
    insertion: 10.0
```

#### `costs.nodes.deletion` (float, default: 10.0)

Cost penalty when a node exists in the generated workflow but not in the ground truth.

**Use case**: Set higher to penalize extra nodes more severely.

```yaml
costs:
  nodes:
    deletion: 15.0
```

#### `costs.nodes.substitution.same_type` (float, default: 1.0)

Cost when two nodes have the same type but different parameters.

**Use case**:
- Low values (0.5-1.0): Allow parameter variations
- High values (2.0-5.0): Require exact parameter matches

```yaml
costs:
  nodes:
    substitution:
      same_type: 1.0
```

#### `costs.nodes.substitution.similar_type` (float, default: 5.0)

Cost when two nodes are in the same similarity group (see [Similarity Groups](#similarity-groups)).

**Example**: Replacing `lmChatOpenAi` with `lmChatAnthropic` (both are LLMs).

```yaml
costs:
  nodes:
    substitution:
      similar_type: 5.0
```

#### `costs.nodes.substitution.different_type` (float, default: 15.0)

Cost when replacing a node with a completely different type.

**Example**: Replacing `httpRequest` with `webhook`.

```yaml
costs:
  nodes:
    substitution:
      different_type: 15.0
```

#### `costs.nodes.substitution.trigger_mismatch` (float, default: 50.0)

Special high-cost penalty for trigger node mismatches. Triggers are critical to workflow functionality.

**Use case**: Keep this high (50.0-100.0) to ensure trigger correctness.

```yaml
costs:
  nodes:
    substitution:
      trigger_mismatch: 50.0
```

### Edge Costs

#### `costs.edges.insertion` (float, default: 5.0)

Cost for a missing connection between nodes.

```yaml
costs:
  edges:
    insertion: 5.0
```

#### `costs.edges.deletion` (float, default: 5.0)

Cost for an extra connection that shouldn't exist.

```yaml
costs:
  edges:
    deletion: 5.0
```

#### `costs.edges.substitution` (float, default: 3.0)

Cost for changing the type or properties of a connection.

```yaml
costs:
  edges:
    substitution: 3.0
```

### Parameter Costs

#### `costs.parameters.mismatch_weight` (float, default: 0.5)

Weight multiplier for parameter mismatches within a node.

**Formula**: `parameter_cost = base_cost * mismatch_weight * num_mismatches`

```yaml
costs:
  parameters:
    mismatch_weight: 0.5
```

#### `costs.parameters.nested_weight` (float, default: 0.3)

Weight multiplier for nested/deep parameter differences.

**Use case**: Set lower to be more forgiving about deep configuration differences.

```yaml
costs:
  parameters:
    nested_weight: 0.3
```

## Similarity Groups

Similarity groups define sets of node types that should be considered "similar" rather than "different" when substituted. Nodes within the same group incur the `similar_type` cost instead of `different_type`.

### Structure

```yaml
similarity_groups:
  <group_name>:
    - "<node_type_1>"
    - "<node_type_2>"
    - "<node_type_3>"
```

### Example

```yaml
similarity_groups:
  triggers:
    - "n8n-nodes-base.webhook"
    - "n8n-nodes-base.manualTrigger"
    - "n8n-nodes-base.scheduleTrigger"

  ai_llms:
    - "@n8n/n8n-nodes-langchain.lmChatOpenAi"
    - "@n8n/n8n-nodes-langchain.lmChatAnthropic"
    - "@n8n/n8n-nodes-langchain.lmChatOllama"
    - "@n8n/n8n-nodes-langchain.lmChatMistralCloud"

  http_requests:
    - "n8n-nodes-base.httpRequest"
    - "@n8n/n8n-nodes-langchain.toolHttpRequest"
```

### Common Similarity Groups

#### AI Agents
```yaml
ai_agents:
  - "n8n-nodes-langchain.agent"
  - "@n8n/n8n-nodes-langchain.agent"
  - "n8n-nodes-langchain.basicAgent"
```

#### AI Tools
```yaml
ai_tools:
  - "@n8n/n8n-nodes-langchain.toolHttpRequest"
  - "@n8n/n8n-nodes-langchain.toolCalculator"
  - "@n8n/n8n-nodes-langchain.toolCode"
  - "@n8n/n8n-nodes-langchain.toolWorkflow"
```

## Ignore Rules

Ignore rules allow you to exclude certain nodes or parameters from comparison. This is useful for:
- UI-only elements that don't affect workflow execution
- Metadata fields like IDs and positions
- Parameters that vary legitimately across implementations

### Structure

```yaml
ignore:
  node_types: [...]
  nodes: [...]
  global_parameters: [...]
  node_type_parameters: {...}
  parameter_paths: [...]
```

### `ignore.node_types` (list of strings)

Completely ignore nodes of specific types.

**Use case**: Ignore decorative nodes like sticky notes.

```yaml
ignore:
  node_types:
    - "n8n-nodes-base.stickyNote"
    - "n8n-nodes-base.comment"
```

### `ignore.nodes` (list of objects)

Flexible rules for ignoring nodes based on name patterns or other criteria.

**Structure**:
```yaml
ignore:
  nodes:
    - pattern: "<regex_pattern>"
      reason: "Why this is ignored"
    - name: "<exact_node_name>"
      reason: "Why this is ignored"
    - node_type: "<node_type>"
      reason: "Why this is ignored"
```

**Example**:
```yaml
ignore:
  nodes:
    - pattern: "^Temp.*"
      reason: "Temporary debugging nodes"
    - name: "Development Only"
      reason: "Used only in development"
```

### `ignore.global_parameters` (list of strings)

Parameter names to ignore across all node types.

**Common use case**: Ignore UI-specific metadata.

```yaml
ignore:
  global_parameters:
    - "position"
    - "id"
    - "notes"
    - "notesInFlow"
    - "color"
    - "disabled"
```

### `ignore.node_type_parameters` (object)

Parameters to ignore for specific node types.

**Structure**:
```yaml
ignore:
  node_type_parameters:
    "<node_type>":
      - "<parameter_path_1>"
      - "<parameter_path_2>"
```

**Example**:
```yaml
ignore:
  node_type_parameters:
    "@n8n/n8n-nodes-langchain.agent":
      - "options.systemMessage"  # Allow different prompts
      - "options.maxIterations"   # Allow iteration variance

    "n8n-nodes-base.httpRequest":
      - "options.timeout"  # Timeout can vary by environment
```

### `ignore.parameter_paths` (list of strings)

Ignore parameters using path patterns. Supports wildcards:
- `*` - matches any single path segment
- `**` - matches any number of path segments

**Example**:
```yaml
ignore:
  parameter_paths:
    - "options.*.timeout"      # Ignore timeout in any option
    - "**.temperature"         # Ignore temperature at any nesting level
    - "options.advanced.**"    # Ignore all advanced options
```

## Parameter Comparison Rules

Parameter comparison rules allow for flexible matching of specific parameters, such as numeric tolerance or semantic similarity.

### Structure

```yaml
parameter_comparison:
  fuzzy_match: [...]
  numeric_tolerance: [...]
```

### Fuzzy Match Rules

For semantic or approximate text matching.

**Structure**:
```yaml
parameter_comparison:
  fuzzy_match:
    - parameter: "<parameter_path>"
      type: "semantic"
      threshold: <float>
      cost_if_below: <float>
      options:
        <key>: <value>
```

**Example**:
```yaml
parameter_comparison:
  fuzzy_match:
    - parameter: "options.systemMessage"
      type: "semantic"
      threshold: 0.8
      cost_if_below: 3.0
      options:
        model: "sentence-transformers"
```

### Numeric Tolerance Rules

For numeric parameters that should be "close enough" rather than exact.

**Structure**:
```yaml
parameter_comparison:
  numeric_tolerance:
    - parameter: "<parameter_path>"
      tolerance: <float>
      cost_if_exceeded: <float>
```

**Example**:
```yaml
parameter_comparison:
  numeric_tolerance:
    - parameter: "options.temperature"
      tolerance: 0.1
      cost_if_exceeded: 2.0

    - parameter: "options.maxTokens"
      tolerance: 100
      cost_if_exceeded: 1.0

    - parameter: "options.topP"
      tolerance: 0.05
      cost_if_exceeded: 1.5
```

**How it works**:
- If `|value1 - value2| <= tolerance`, parameters are considered equal (no cost)
- If `|value1 - value2| > tolerance`, `cost_if_exceeded` is added to the edit cost

### Wildcard Support

Parameter paths support wildcards:

```yaml
parameter_comparison:
  numeric_tolerance:
    - parameter: "options.*.temperature"
      tolerance: 0.1
      cost_if_exceeded: 2.0
```

This applies to `options.llm.temperature`, `options.model.temperature`, etc.

## Exemptions

Exemptions reduce penalties for certain nodes that are optional or conditionally required.

### Structure

```yaml
exemptions:
  optional_in_generated: [...]
  optional_in_ground_truth: [...]
```

### `exemptions.optional_in_generated` (list of objects)

Nodes that can be missing from the generated workflow without full penalty.

**Use case**: Ground truth has optional nodes that aren't critical.

**Structure**:
```yaml
exemptions:
  optional_in_generated:
    - name_pattern: "<regex>"
      penalty: <float>
      reason: "Why this is optional"
    - node_type: "<node_type>"
      penalty: <float>
      when:
        <condition_key>: <condition_value>
```

**Example**:
```yaml
exemptions:
  optional_in_generated:
    - node_type: "@n8n/n8n-nodes-langchain.memoryBufferWindow"
      penalty: 2.0
      reason: "Memory is optional for simple workflows"

    - name_pattern: ".*Debug.*"
      penalty: 1.0
      reason: "Debug nodes are optional in production"
```

### `exemptions.optional_in_ground_truth` (list of objects)

Nodes that can exist in the generated workflow as extras without full penalty.

**Use case**: Generated workflow includes helpful but non-essential nodes.

**Example**:
```yaml
exemptions:
  optional_in_ground_truth:
    - node_type: "n8n-nodes-base.set"
      penalty: 3.0
      reason: "Set nodes for data transformation are okay to add"

    - node_type: "@n8n/n8n-nodes-langchain.toolCalculator"
      penalty: 2.0
      reason: "Extra tools are acceptable"
```

### Conditional Exemptions

Use the `when` clause to apply exemptions conditionally:

```yaml
exemptions:
  optional_in_generated:
    - node_type: "n8n-nodes-base.errorTrigger"
      penalty: 1.0
      when:
        disabled: true
      reason: "Disabled error handlers are optional"
```

## Connection Rules

Rules for handling workflow connections (edges).

### Structure

```yaml
connections:
  ignore_connection_types: [...]
  equivalent_types: [...]
```

### `connections.ignore_connection_types` (list of strings)

Connection types to completely ignore during comparison.

```yaml
connections:
  ignore_connection_types:
    - "main"  # Ignore main data flow connections
```

### `connections.equivalent_types` (list of lists)

Define groups of connection types that should be treated as equivalent.

**Example**:
```yaml
connections:
  equivalent_types:
    - ["main", "ai"]
    - ["error", "fallback"]
```

This means:
- `main` and `ai` connections are interchangeable
- `error` and `fallback` connections are interchangeable

## Output Configuration

Controls how results are formatted and presented.

### Structure

```yaml
output:
  max_edits: <integer>
  group_by: "<grouping_strategy>"
  include_explanations: <boolean>
  include_suggestions: <boolean>
```

### `output.max_edits` (integer, default: 15)

Maximum number of edit operations to return in the results.

**Use case**:
- Set higher (e.g., 20-50) for detailed debugging
- Set lower (e.g., 5-10) for quick summaries

```yaml
output:
  max_edits: 15
```

### `output.group_by` (string, default: "priority")

How to group edit operations in the output.

**Options**:
- `"priority"`: Group by priority (critical, major, minor)
- `"type"`: Group by edit type (node, edge, parameter)
- `"cost"`: Order by cost (highest first)

```yaml
output:
  group_by: "priority"
```

### `output.include_explanations` (boolean, default: true)

Include detailed explanations for each edit operation.

```yaml
output:
  include_explanations: true
```

### `output.include_suggestions` (boolean, default: true)

Include suggestions for how to fix issues.

```yaml
output:
  include_suggestions: true
```

## Examples

### Example 1: Strict Production Configuration

For production workflows where exact matching is critical:

```yaml
version: "1.0"
name: "production-strict"
description: "Strict matching for production workflows"

costs:
  nodes:
    insertion: 20.0
    deletion: 20.0
    substitution:
      same_type: 0.5
      similar_type: 10.0
      different_type: 30.0
      trigger_mismatch: 100.0

  edges:
    insertion: 10.0
    deletion: 10.0
    substitution: 5.0

  parameters:
    mismatch_weight: 1.0
    nested_weight: 0.8

similarity_groups:
  triggers:
    - "n8n-nodes-base.webhook"
    - "n8n-nodes-base.scheduleTrigger"

ignore:
  node_types:
    - "n8n-nodes-base.stickyNote"

  global_parameters:
    - "position"
    - "id"

parameter_comparison:
  numeric_tolerance:
    - parameter: "options.temperature"
      tolerance: 0.05
      cost_if_exceeded: 5.0

output:
  max_edits: 20
  group_by: "priority"
  include_explanations: true
  include_suggestions: true
```

### Example 2: Lenient Development Configuration

For development workflows where flexibility is needed:

```yaml
version: "1.0"
name: "development-lenient"
description: "Lenient matching for development and testing"

costs:
  nodes:
    insertion: 5.0
    deletion: 5.0
    substitution:
      same_type: 1.0
      similar_type: 3.0
      different_type: 8.0
      trigger_mismatch: 20.0

  edges:
    insertion: 2.0
    deletion: 2.0
    substitution: 1.0

  parameters:
    mismatch_weight: 0.3
    nested_weight: 0.1

similarity_groups:
  ai_llms:
    - "@n8n/n8n-nodes-langchain.lmChatOpenAi"
    - "@n8n/n8n-nodes-langchain.lmChatAnthropic"
    - "@n8n/n8n-nodes-langchain.lmChatOllama"

  ai_tools:
    - "@n8n/n8n-nodes-langchain.toolHttpRequest"
    - "@n8n/n8n-nodes-langchain.toolCalculator"
    - "@n8n/n8n-nodes-langchain.toolCode"

ignore:
  node_types:
    - "n8n-nodes-base.stickyNote"

  global_parameters:
    - "position"
    - "id"
    - "notes"
    - "notesInFlow"
    - "color"
    - "disabled"

  node_type_parameters:
    "@n8n/n8n-nodes-langchain.agent":
      - "options.systemMessage"
      - "options.maxIterations"

parameter_comparison:
  numeric_tolerance:
    - parameter: "options.temperature"
      tolerance: 0.2
      cost_if_exceeded: 1.0

    - parameter: "options.maxTokens"
      tolerance: 500
      cost_if_exceeded: 0.5

exemptions:
  optional_in_generated:
    - node_type: "@n8n/n8n-nodes-langchain.memoryBufferWindow"
      penalty: 1.0
      reason: "Memory is optional"

  optional_in_ground_truth:
    - node_type: "n8n-nodes-base.set"
      penalty: 2.0
      reason: "Data transformation nodes are okay to add"

output:
  max_edits: 10
  group_by: "priority"
  include_explanations: true
  include_suggestions: false
```

### Example 3: AI-Specific Configuration

Optimized for AI workflow comparisons:

```yaml
version: "1.0"
name: "ai-workflows"
description: "Specialized configuration for AI agent workflows"

costs:
  nodes:
    insertion: 10.0
    deletion: 10.0
    substitution:
      same_type: 1.0
      similar_type: 4.0
      different_type: 15.0
      trigger_mismatch: 50.0

  edges:
    insertion: 5.0
    deletion: 5.0
    substitution: 3.0

  parameters:
    mismatch_weight: 0.4
    nested_weight: 0.2

similarity_groups:
  ai_agents:
    - "n8n-nodes-langchain.agent"
    - "@n8n/n8n-nodes-langchain.agent"
    - "n8n-nodes-langchain.basicAgent"

  ai_llms:
    - "@n8n/n8n-nodes-langchain.lmChatOpenAi"
    - "@n8n/n8n-nodes-langchain.lmChatAnthropic"
    - "@n8n/n8n-nodes-langchain.lmChatOllama"
    - "@n8n/n8n-nodes-langchain.lmChatMistralCloud"
    - "@n8n/n8n-nodes-langchain.lmChatAws"

  ai_tools:
    - "@n8n/n8n-nodes-langchain.toolHttpRequest"
    - "@n8n/n8n-nodes-langchain.toolCalculator"
    - "@n8n/n8n-nodes-langchain.toolCode"
    - "@n8n/n8n-nodes-langchain.toolWorkflow"

  memory_types:
    - "@n8n/n8n-nodes-langchain.memoryBufferWindow"
    - "@n8n/n8n-nodes-langchain.memoryConversation"

ignore:
  node_types:
    - "n8n-nodes-base.stickyNote"

  global_parameters:
    - "position"
    - "id"
    - "notes"
    - "color"

  node_type_parameters:
    "@n8n/n8n-nodes-langchain.agent":
      - "options.systemMessage"  # Prompts can legitimately vary

    "@n8n/n8n-nodes-langchain.lmChatOpenAi":
      - "options.modelName"  # Different models okay

    "@n8n/n8n-nodes-langchain.lmChatAnthropic":
      - "options.modelName"

parameter_comparison:
  numeric_tolerance:
    - parameter: "**.temperature"
      tolerance: 0.15
      cost_if_exceeded: 2.0

    - parameter: "**.maxTokens"
      tolerance: 200
      cost_if_exceeded: 1.0

    - parameter: "**.topP"
      tolerance: 0.1
      cost_if_exceeded: 1.5

exemptions:
  optional_in_generated:
    - node_type: "@n8n/n8n-nodes-langchain.memoryBufferWindow"
      penalty: 2.0
      reason: "Memory is optional for stateless workflows"

    - node_type: "@n8n/n8n-nodes-langchain.toolCalculator"
      penalty: 3.0
      reason: "Calculator tool is optional"

  optional_in_ground_truth:
    - node_type: "@n8n/n8n-nodes-langchain.toolCode"
      penalty: 2.0
      reason: "Additional code tools are acceptable"

output:
  max_edits: 15
  group_by: "priority"
  include_explanations: true
  include_suggestions: true
```

## Loading Configuration

### From Preset

```bash
# Python CLI
uvx --from . python -m compare_workflows workflow1.json workflow2.json --preset standard

# Python API
from config_loader import load_config
config = load_config("preset:standard")
```

### From File

```bash
# Python CLI
uvx --from . python -m compare_workflows workflow1.json workflow2.json --config my-config.yaml

# Python API
from config_loader import load_config
config = load_config("/path/to/my-config.yaml")
```

### Programmatically

```python
from config_loader import WorkflowComparisonConfig

# Create from dictionary
config_dict = {
    "version": "1.0",
    "name": "custom",
    "costs": {
        "nodes": {
            "insertion": 12.0
        }
    }
}

config = WorkflowComparisonConfig._from_dict(config_dict)
```

## Best Practices

1. **Start with a preset**: Begin with `standard`, `strict`, or `lenient` and customize from there.

2. **Test iteratively**: Make small changes and test to understand the impact on similarity scores.

3. **Use similarity groups**: Group related node types to avoid harsh penalties for equivalent substitutions.

4. **Ignore UI elements**: Always ignore cosmetic parameters like `position`, `id`, `color`, etc.

5. **Set appropriate tolerances**: Use numeric tolerances for parameters that shouldn't need exact matches (e.g., temperature, maxTokens).

6. **Document your changes**: Use the `description` field and comments to explain why you made specific choices.

7. **Version control**: Keep configuration files in version control alongside your workflows.

8. **Environment-specific configs**: Create different configurations for development, testing, and production environments.

## Further Reading

- [README.md](README.md) - General usage and examples
- [src/config_loader.py](src/config_loader.py) - Implementation details
- [src/configs/presets/](src/configs/presets/) - Built-in preset configurations
