# Architecture Documentation

## Overview

The n8n Workflow JSON SDK is a TypeScript library that provides a Zod-like fluent API for programmatically constructing and manipulating n8n workflows. The SDK is designed to be type-safe, intuitive, and fully compatible with n8n's workflow JSON format.

## Design Philosophy

### 1. Fluent Interface (Builder Pattern)

The SDK uses the builder pattern to provide a chainable, intuitive API:

```typescript
const node = wf.node('My Node')
  .type('n8n-nodes-base.set')
  .parameters({})
  .position(100, 200)
  .version(1);
```

This approach:
- Makes the API self-documenting
- Enables IDE autocomplete
- Allows optional configuration in any order
- Provides type safety at each step

### 2. Immutability Where Appropriate

While the SDK allows mutation of workflow objects during construction, each method returns `this` to enable chaining while maintaining a clear ownership model.

### 3. Bi-directional Conversion

The SDK supports both:
- **Construction**: Building workflows from scratch
- **Parsing**: Loading existing workflows for modification

```typescript
// Create from scratch
const wf = workflow({ name: 'New Workflow' });

// Load existing
const wf = fromJSON(existingWorkflowJSON);
```

## Core Components

### 1. Workflow Class

**Purpose**: The main orchestrator that manages nodes, connections, and workflow-level metadata.

**Responsibilities**:
- Node registry (Map of node name → WorkflowNode)
- Connection registry (nested Maps for connection management)
- Workflow-level properties (metadata, settings, tags, etc.)
- JSON serialization/deserialization

**Key Design Decisions**:
- Uses Maps for O(1) node lookup
- Nested Map structure for connections: `Map<sourceName, Map<connectionType, Array<Array<connection>>>>`
- Separation of concerns: Workflow manages relationships, nodes manage their own state

### 2. WorkflowNode Class

**Purpose**: Represents a single node in the workflow with all its properties.

**Responsibilities**:
- Node-specific configuration (type, parameters, position, etc.)
- Node metadata (creator, notes, version, etc.)
- Execution settings (retry, continue on fail, etc.)
- JSON serialization for individual nodes

**Key Design Decisions**:
- All properties are private with public setter methods
- Optional properties are only included in JSON if set (reducing noise)
- Auto-generates unique IDs if not provided
- Stateless - doesn't know about connections or parent workflow

### 3. ConnectionBuilder Class

**Purpose**: Provides a fluent interface for creating connections between nodes.

**Responsibilities**:
- Managing source and destination node references
- Supporting multiple connection types (main, ai_tool, ai_memory, etc.)
- Handling multiple destinations
- Connection chaining

**Key Design Decisions**:
- Deferred execution pattern - connections are built when `.build()` is called
- Supports both simple and detailed connection configurations
- Allows chaining `.to()` calls for multiple destinations
- Delegates actual connection creation to Workflow class

## Data Structures

### Connection Map Structure

The connection map uses a nested structure for efficient lookups and to support the n8n connection format:

```typescript
Map<
  sourceName: string,
  Map<
    connectionType: string,
    Array<Array<{
      node: string,
      type: string,
      index: number
    }>>
  >
>
```

**Rationale**:
- First level: Source node name (O(1) lookup)
- Second level: Connection type (main, ai_tool, etc.) (O(1) lookup)
- Third level: Source output index (Array)
- Fourth level: Multiple destinations from same output (Array)

This structure maps directly to n8n's connection format:
```json
{
  "connections": {
    "NodeA": {
      "main": [
        [
          { "node": "NodeB", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}
```

## Type System

### Type Hierarchy

```
NodeParameterValue (primitives + objects)
  ↓
NodeParameters (recursive record)
  ↓
WorkflowNodeData (complete node structure)
  ↓
WorkflowJSON (complete workflow)
```

### Type Safety Features

1. **Unknown over Any**: All dynamic data uses `unknown` instead of `any`
2. **Strict Typing**: All public APIs are fully typed
3. **Exported Types**: Types are exported for user consumption
4. **No Runtime Type Guards**: Relies on TypeScript compile-time checking

## API Surface

### Primary API (Factory Functions)

```typescript
workflow(options?) → Workflow
fromJSON(json) → Workflow
```

### Workflow API

```typescript
// Node Management
.node(name) → WorkflowNode

// Connection Management
.connection() → ConnectionBuilder

// Metadata
.name(name) → this
.meta(meta) → this
.settings(settings) → this
.staticData(data) → this
.tags(tags) → this
.active(active) → this
.pinData(nodeName, data) → this

// Export
.toJSON() → WorkflowJSON
```

### WorkflowNode API

```typescript
// Required
.type(type) → this
.parameters(params) → this

// Optional Configuration
.position(x, y) → this
.version(version) → this
.id(id) → this
.disabled(disabled) → this
.notes(notes, inFlow) → this
.creator(creator) → this
.cid(cid) → this
.webhookId(webhookId) → this
.credentials(credentials) → this
.retryOnFail(retry, maxTries, waitBetweenTries) → this
.alwaysOutputData(always) → this
.executeOnce(once) → this
.continueOnFail(continue) → this

// Export
.toJSON() → WorkflowNodeData
```

### ConnectionBuilder API

```typescript
.from(node | { node, type?, index? }) → this
.to(node | node[] | { node, type?, index? }) → this
.build() → void
```

## Extension Points

The SDK is designed to be extended in the following ways:

### 1. Adding New Node Properties

To add a new node property:

1. Add private field to `WorkflowNode`
2. Add public setter method
3. Include in `toJSON()` if set
4. Add to `WorkflowNodeData` type
5. Handle in `fromJSON()` parser

### 2. Adding New Workflow Properties

Similar to node properties but in `Workflow` class.

### 3. Adding New Connection Types

No code changes needed - the connection type is a string parameter. Simply use the new type name.

### 4. Custom Validation

Future enhancement: Add a validation layer that can check:
- Node type validity
- Required parameters
- Connection validity
- Circular dependencies

## Performance Considerations

### Time Complexity

- Node creation: O(1)
- Node lookup: O(1) (Map-based)
- Connection creation: O(1)
- JSON export: O(n + c) where n = nodes, c = connections
- JSON import: O(n + c)

### Space Complexity

- Workflow storage: O(n + c)
- No redundant data structures
- Efficient Map-based storage

### Optimization Opportunities

1. **Lazy Evaluation**: JSON generation could be cached and invalidated on changes
2. **Connection Validation**: Could add optional validation mode for development
3. **Streaming**: For very large workflows, could support streaming JSON generation

## Error Handling

Current approach:
- No explicit error handling in most cases
- TypeScript provides compile-time safety
- Runtime errors are JavaScript native (TypeError, etc.)

Future enhancements:
- Custom error classes for SDK-specific errors
- Validation errors with helpful messages
- Warning system for deprecated features

## Testing Strategy

### Unit Tests

- Each class is tested independently
- Tests cover all public methods
- Edge cases and error conditions
- Integration between components

### Test Organization

```
describe('Workflow JSON SDK', () => {
  describe('Basic Workflow Creation', () => { ... });
  describe('Connections', () => { ... });
  describe('AI Agent Workflow Example', () => { ... });
  describe('Additional Features', () => { ... });
  describe('fromJSON', () => { ... });
  describe('API Examples', () => { ... });
});
```

### Coverage Goals

- 100% of public API
- Common use cases
- Complex scenarios (AI agents, multiple connection types)
- Round-trip conversion (JSON → SDK → JSON)

## Dependencies

### Zero Runtime Dependencies

The SDK has no runtime dependencies, only dev dependencies:
- `vitest` for testing
- `typescript` for type checking
- `@n8n/*` packages for configuration

This ensures:
- Small bundle size
- No security vulnerabilities from dependencies
- Fast installation
- Easy maintenance

## Future Enhancements

### Planned Features

1. **Validation Layer**: Optional validation of workflow structure
2. **Node Type Registry**: Type-safe node parameters based on node type
3. **Connection Helpers**: Smart connection suggestions based on node types
4. **Workflow Analysis**: Utilities for analyzing workflow structure
5. **Workflow Transformations**: Higher-order functions for workflow manipulation
6. **Diff/Patch**: Compare workflows and generate patches

### API Stability

The current API is considered stable for 1.0. Future versions will:
- Maintain backward compatibility
- Use semantic versioning
- Provide migration guides for breaking changes
- Deprecate features before removal

## Comparison to Alternatives

### Manual JSON Construction

**Before (Manual)**:
```typescript
const workflow = {
  nodes: [{
    id: 'abc',
    name: 'Node',
    type: 'n8n-nodes-base.set',
    position: [100, 200],
    parameters: {}
  }],
  connections: {
    'Node': {
      main: [[{ node: 'Other', type: 'main', index: 0 }]]
    }
  }
};
```

**After (SDK)**:
```typescript
const wf = workflow();
const node = wf.node('Node')
  .type('n8n-nodes-base.set')
  .position(100, 200)
  .parameters({});

wf.connection()
  .from(node)
  .to(otherNode)
  .build();

const json = wf.toJSON();
```

### Benefits of SDK Approach

1. **Type Safety**: Catches errors at compile time
2. **Discoverability**: IDE autocomplete for all options
3. **Maintainability**: Less error-prone than manual JSON
4. **Readability**: Self-documenting code
5. **Flexibility**: Easy to modify and extend

## Conclusion

The n8n Workflow JSON SDK provides a robust, type-safe, and intuitive API for working with n8n workflows programmatically. Its design prioritizes developer experience while maintaining full compatibility with n8n's workflow format. The architecture is extensible and prepared for future enhancements while remaining simple and focused on its core purpose.
