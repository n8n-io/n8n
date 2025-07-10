# Modular Parameter Update Prompts

This directory contains the modular prompt system for the n8n AI workflow builder's parameter update functionality. The system dynamically loads only the necessary prompt sections based on the node type and requested changes, significantly reducing token usage.

## Overview

The previous monolithic prompt system used ~9,700 tokens for every parameter update request. This modular system typically uses only 1,500-3,000 tokens by loading sections on-demand.

## Directory Structure

```
prompts/
├── base/                    # Core prompts always included
│   ├── core-instructions.ts # Basic task and guidelines
│   ├── expression-rules.ts  # n8n expression syntax rules
│   ├── common-patterns.ts   # Common parameter patterns
│   └── output-format.ts     # Output format specification
├── node-types/             # Node-specific guides
│   ├── set-node.ts         # Set node type handling
│   ├── if-node.ts          # IF node operators
│   ├── http-request.ts     # HTTP request parameters
│   └── tool-nodes.ts       # Tool nodes with $fromAI
├── parameter-types/        # Parameter-specific guides
│   ├── resource-locator.ts # ResourceLocator handling
│   └── text-fields.ts      # Text field expressions
├── examples/               # Example updates
│   ├── basic/              # Simple examples
│   └── advanced/           # Complex scenarios
├── prompt-builder.ts       # Main builder logic
└── prompt-config.ts        # Configuration
```

## Usage

### Basic Usage

```typescript
import { ParameterUpdatePromptBuilder } from './prompts/prompt-builder';

const systemPrompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
  nodeType: 'n8n-nodes-base.set',
  nodeDefinition: nodeTypeDefinition,
  requestedChanges: ['Set message to Hello World'],
});
```

### With Options

```typescript
const systemPrompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
  nodeType: 'gmailTool',
  nodeDefinition: nodeTypeDefinition,
  requestedChanges: ['Send email to user'],
  options: {
    includeExamples: true,
    maxExamples: 2,
    verbose: true,
  },
});
```

## How It Works

1. **Context Analysis**: The builder analyzes:
   - Node type (Set, IF, HTTP Request, Tool nodes, etc.)
   - Parameter types in the node definition
   - Keywords in the requested changes

2. **Section Loading**: Based on the analysis, it loads:
   - Always: Core instructions, expression rules, output format
   - Conditionally: Node-specific guides, parameter guides
   - Optionally: 2-3 relevant examples

3. **Token Optimization**: The builder:
   - Estimates token usage for monitoring
   - Targets ~2,000-3,000 tokens per prompt
   - Logs included sections when verbose mode is enabled

## Adding New Node Types

To add support for a new node type:

1. Create a guide file in `node-types/`:
```typescript
export const NEW_NODE_GUIDE = `
### New Node Type Guide
...specific instructions...
`;
```

2. Update `prompt-config.ts` to recognize the node type:
```typescript
nodeTypePatterns: {
  newType: ['n8n-nodes-base.newNode', 'newnode'],
}
```

3. Update `prompt-builder.ts` to include the guide:
```typescript
if (this.isNewNode(context.nodeType)) {
  sections.push(NEW_NODE_GUIDE);
}
```

## Token Savings

| Scenario | Old System | New System | Savings |
|----------|------------|------------|---------|
| Set Node Update | 9,700 | 2,100 | 78% |
| IF Node Condition | 9,700 | 2,800 | 71% |
| Tool Node with AI | 9,700 | 2,400 | 75% |
| Complex HTTP Request | 9,700 | 3,200 | 67% |

## Configuration

The system can be configured via `prompt-config.ts`:

- `nodeTypePatterns`: Patterns to identify node types
- `parameterKeywords`: Keywords that trigger specific guides
- `maxExamples`: Maximum examples to include
- `targetTokenBudget`: Target token count for prompts

## Best Practices

1. **Keep sections focused**: Each section should address one specific aspect
2. **Use clear examples**: Examples should be minimal but complete
3. **Monitor token usage**: Use verbose mode during development
4. **Test thoroughly**: Ensure dynamic prompts work for all scenarios