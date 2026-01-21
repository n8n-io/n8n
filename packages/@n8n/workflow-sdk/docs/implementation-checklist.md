# Workflow SDK Implementation Checklist

**Based on:** `2026-01-18-workflow-sdk-design.md`
**Status:** In Progress

---

## Package Scaffolding

- [x] Create `packages/@n8n/workflow-sdk/` directory structure
- [x] Create `package.json` with dependencies (`n8n-workflow`)
- [x] Create `tsconfig.json`
- [x] Add package to pnpm workspace

---

## Public API (`src/index.ts`)

- [x] Export `workflow(id, name, settings?)` function
- [x] Export `node(type, version, config)` function
- [x] Export `trigger(type, version, config)` function
- [x] Export `merge(branches, config)` function
- [x] Export `sticky(content, config?)` function
- [x] Export `splitInBatches(version, config)` function
- [x] Export `placeholder(hint)` function
- [x] Export `runOnceForAllItems<T>(fn)` helper
- [x] Export `runOnceForEachItem<T>(fn)` helper

---

## Workflow Builder (`src/workflow-builder.ts`)

### Core Methods

- [x] `workflow(id, name, settings?)` - creates WorkflowBuilder
- [x] `.add(node)` - adds node to workflow
- [x] `.then(node)` - chains node after current
- [ ] `.then(merge)` - accepts MergeComposite (fans out to branches)
- [x] `.output(index)` - selects output branch
- [x] `.settings(settings)` - updates workflow settings
- [x] `.toJSON()` - exports to n8n JSON format
- [x] `.toString()` - serializes to JSON string
- [x] `workflow.fromJSON(json)` - static import method
- [x] `.getNode(name)` - retrieves node by name
- [x] `.getNode(name).update(config)` - modifies existing node

### Workflow Settings Support

- [x] `timezone` setting
- [x] `errorWorkflow` setting
- [x] `saveDataErrorExecution` setting
- [x] `saveDataSuccessExecution` setting
- [x] `saveManualExecutions` setting
- [x] `saveExecutionProgress` setting
- [x] `executionTimeout` setting
- [x] `executionOrder` setting ('v0' | 'v1')
- [x] `callerPolicy` setting
- [x] `callerIds` setting

---

## Node Builder (`src/node-builder.ts`)

### Core Node Properties

- [x] `parameters` - node-specific configuration
- [x] `credentials` - credential references `{ type: { name, id } }`
- [ ] `subnodes` - for AI nodes (model, memory, tools, outputParser)
- [x] `name` - custom node name (auto-generate if omitted)
- [x] `position` - canvas position `[x, y]`
- [x] `disabled` - whether node is disabled
- [x] `notes` - node documentation
- [x] `notesInFlow` - show notes on canvas

### Execution Behavior Properties

- [x] `executeOnce` - execute only once (not per item)
- [x] `retryOnFail` - retry on failure
- [x] `alwaysOutputData` - output data even if empty
- [x] `onError` - error handling ('stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput')
- [x] `pinData` - pinned output data for testing

### Generic Output Type

- [x] Support `node<OutputType>(...)` for type inference
- [ ] Downstream nodes receive typed `$.json` from generic

---

## Merge Composite (`src/merge.ts`)

- [x] `merge(branches, config)` function
- [x] Returns `MergeComposite<T>` type
- [x] `branches` array determines input positions
- [x] Support `mode: 'append'`
- [x] Support `mode: 'combine'`
- [x] Support `mode: 'multiplex'`
- [x] Support `mode: 'chooseBranch'`
- [ ] Branches can be `.then()` chains (not just single nodes)
- [x] `WorkflowBuilder.then(MergeComposite)` fans out from previous node

---

## Sticky Notes (`src/sticky.ts`)

- [x] `sticky(content, config?)` function
- [x] Support `color` (1-7)
- [x] Support `position` `[x, y]`
- [x] Support `width` / `height`
- [x] Support `name`
- [ ] Support `nodes` array for auto-positioning
- [ ] Calculate bounding box from node positions
- [ ] Add padding around wrapped nodes
- [x] Sticky notes don't participate in node chain

---

## Split In Batches (`src/split-in-batches.ts`)

- [x] `splitInBatches(version, config)` function
- [x] `.done()` - chain from output 0 (all items processed)
- [x] `.each()` - chain from output 1 (current batch)
- [x] `.loop()` - connects back to splitInBatches node
- [ ] Support `executeOnce` within loop chain

---

## Placeholder (`src/placeholder.ts`)

- [x] `placeholder(hint)` function
- [x] Serializes to `<__PLACEHOLDER_VALUE__hint__>`
- [ ] Parse placeholders on JSON import

---

## Expression System (`src/expression/`)

### Context Types (via proxy-based serialization)

- [x] `$.json` - current item JSON data (typed from upstream)
- [x] `$.binary` - current item binary data
- [x] `$.input.first()` - first input item
- [x] `$.input.all()` - all input items
- [x] `$.input.item` - current item
- [ ] `$('nodeName')` - reference another node's output (use `expr()` helper)
- [x] `$.env.VAR_NAME` - environment variables
- [x] `$.vars.VAR_NAME` - workflow variables
- [x] `$.secrets.PROVIDER.SECRET` - external secrets
- [x] `$.now` - current DateTime
- [x] `$.itemIndex` - current item index
- [x] `$.runIndex` - current run index
- [x] `$.execution.id` - execution ID
- [x] `$.execution.mode` - execution mode
- [ ] `$.execution.resumeUrl` - resume URL
- [x] `$.workflow.id` - workflow ID
- [x] `$.workflow.name` - workflow name
- [ ] `$.workflow.active` - workflow active status

### Binary Data Support

- [x] `$.binary[fieldName].fileName`
- [x] `$.binary[fieldName].directory`
- [x] `$.binary[fieldName].mimeType`
- [x] `$.binary[fieldName].fileExtension`
- [x] `$.binary[fieldName].fileSize`
- [ ] `$.binary.keys()` method (use `expr()` helper)

### Parser (`parser.ts`)

- [x] Parse `={{ ... }}` expression strings to AST
- [x] Handle `$json.foo` syntax
- [x] Handle `$('NodeName').item.json.x` syntax
- [x] Handle `$now`, `$env.VAR`, `$itemIndex` etc.
- [x] Preserve JavaScript expressions (map, filter, join, etc.)

### Serializer (`serializer.ts`)

- [x] Convert expression functions `$ => ...` to `={{ ... }}` strings
- [ ] Handle nested expressions in parameters
- [ ] Handle expressions in arrays/objects

### Raw Expression Helper

- [x] `expr()` - create raw n8n expression strings for complex cases

---

## Code Node Helpers (`src/code-helpers.ts`)

### runOnceForAllItems

- [x] `runOnceForAllItems<T>(fn)` helper function
- [x] Context provides `ctx.$input.all()`
- [x] Context provides `ctx.$input.first()`
- [x] Context provides `ctx.$input.last()`
- [x] Context provides `ctx.$input.itemMatching(i)`
- [x] Return type must be array matching `T`
- [x] Serialize to `{ mode: 'runOnceForAllItems', jsCode: '...' }`
- [x] Strip `ctx.` prefix during serialization

### runOnceForEachItem

- [x] `runOnceForEachItem<T>(fn)` helper function
- [x] Context provides `ctx.$input.item`
- [x] Context provides `ctx.$itemIndex`
- [x] Return type is single item matching `T` or `null`
- [x] Serialize to `{ mode: 'runOnceForEachItem', jsCode: '...' }`
- [x] Strip `ctx.` prefix during serialization

### Shared Context

- [x] `ctx.$env.VAR_NAME`
- [x] `ctx.$vars.name`
- [x] `ctx.$secrets.provider.key`
- [x] `ctx.$now`
- [x] `ctx.$today`
- [x] `ctx.$runIndex`
- [x] `ctx.$execution.id`
- [x] `ctx.$execution.mode`
- [x] `ctx.$execution.resumeUrl`
- [x] `ctx.$workflow.id`
- [x] `ctx.$workflow.name`
- [x] `ctx.$workflow.active`
- [x] `ctx.$('nodeName')` reference
- [ ] `ctx.$jmespath(data, expr)`

### Python Support

- [ ] Support `mode: 'runOnceForAllItems'` with `language: 'python'`
- [ ] Support `mode: 'runOnceForEachItem'` with `language: 'python'`
- [ ] Accept `pythonCode` string parameter
- [ ] Support explicit `outputType` for Python

---

## JSON Serialization (`src/serialization/`)

### Export - toJSON (`to-json.ts`)

- [ ] Convert workflow to n8n-compatible JSON
- [ ] Generate `nodes[]` array
- [ ] Generate `connections{}` object
- [ ] Include `settings` object
- [ ] Generate UUIDs for node IDs if not specified
- [ ] Convert expression functions to `={{ }}` strings
- [ ] Flatten graph structure properly
- [ ] Handle multi-output connections
- [ ] Handle merge node multiple inputs

### Import - fromJSON (`from-json.ts`)

- [ ] Parse n8n workflow JSON
- [ ] Reconstruct WorkflowBuilder instance
- [ ] Parse `={{ }}` strings to expression functions
- [ ] Reconstruct node chain relationships
- [ ] Preserve all node properties
- [ ] Preserve all workflow settings
- [ ] Handle merge nodes with multiple inputs

### Layout (`layout.ts`)

- [ ] Auto-position nodes when position not specified
- [ ] Simple left-to-right layout algorithm
- [ ] Handle branching layouts
- [ ] Handle merge node positioning
- [ ] Avoid node overlap

---

## Validation (`src/validation/`)

### Schema Validation (`schema.ts`)

- [x] Validate workflow structure before export
- [x] Validate required node parameters (strict mode)
- [ ] Validate credential references
- [ ] Validate connection integrity
- [ ] Validate expression syntax
- [x] Surface clear error messages

---

## Type Generation (`scripts/generate-types.ts`)

### Input Processing

- [ ] Read node definitions from `packages/nodes-base/nodes/**/*.ts`
- [ ] Read node definitions from `packages/@n8n/nodes-langchain/nodes/**/*.ts`
- [ ] Parse `INodeTypeDescription` from each file
- [ ] Handle multiple versions per node

### Output Generation

- [ ] Generate `src/types/generated/index.ts`
- [ ] Generate `src/types/generated/nodes-base.ts`
- [ ] Generate `src/types/generated/nodes-langchain.ts`
- [ ] Generate interface per node version (e.g., `HttpRequestV42Params`)
- [ ] Generate credentials interface per node
- [ ] Generate function overloads for `node()` function

### JSDoc Generation (Required)

- [ ] Extract `displayName` for interface description
- [ ] Extract `description` for interface description
- [ ] Extract `properties[].description` for property JSDoc
- [ ] Extract `properties[].default` for `@default` tag
- [ ] Extract `properties[].hint` for property description
- [ ] Extract `codex.categories` for `@category` tag
- [ ] Extract `documentationUrl` for `@see` tag
- [ ] Document options inline with their descriptions

### Property Type Generation

- [ ] Map `type: 'string'` to `string | Expression<string>`
- [ ] Map `type: 'number'` to `number | Expression<number>`
- [ ] Map `type: 'boolean'` to `boolean | Expression<boolean>`
- [ ] Map `type: 'options'` to union type
- [ ] Map `type: 'fixedCollection'` to nested interface
- [ ] Map `type: 'collection'` to optional object
- [ ] Handle `displayOptions` for conditional fields
- [ ] Document display conditions in JSDoc

### Schema Categories

- [ ] Handle fixed schema nodes (Slack, Gmail, etc.)
- [ ] Handle operation-dependent schemas
- [ ] Handle user-defined schema nodes (HTTP Request, Code)

---

## AI/Agent Nodes Support

### Subnodes

- [ ] Support `subnodes.model` (required for agent)
- [ ] Support `subnodes.memory` (optional)
- [ ] Support `subnodes.tools` (array)
- [ ] Support `subnodes.outputParser` (optional)
- [ ] Type enforcement for required subnodes

### Structured Output Parser

- [ ] Support `schemaType: 'manual'` with `inputSchema`
- [ ] Support `schemaType: 'fromJson'` with `jsonExample`
- [ ] Output type via explicit generic `node<OutputType>(...)`

---

## Base Types (`src/types/base.ts`)

- [ ] `WorkflowBuilder` interface
- [ ] `NodeInstance<Type, Version, Output>` interface
- [ ] `TriggerInstance` interface
- [ ] `MergeComposite<Branches>` interface
- [ ] `MergeConfig` type
- [ ] `Expression<T>` type (function `$ => T`)
- [ ] `ExpressionContext` interface
- [ ] `WorkflowSettings` interface
- [ ] `CredentialReference` type `{ name: string; id: string }`
- [ ] `NodeConfig` base interface
- [ ] `StickyNoteConfig` interface
- [ ] `SplitInBatchesBuilder` interface

---

## Testing

- [x] Unit tests for workflow builder
- [x] Unit tests for node builder
- [x] Unit tests for merge composite
- [x] Unit tests for sticky notes
- [x] Unit tests for split in batches
- [x] Unit tests for expression parser
- [x] Unit tests for expression serializer
- [x] Unit tests for JSON export
- [x] Unit tests for JSON import (round-trip)
- [x] Unit tests for auto-layout
- [x] Unit tests for validation
- [ ] Unit tests for type generation script
- [x] Real workflow round-trip tests (n8n.io templates)

---

## Documentation

- [ ] README.md with quick start
- [ ] API reference for public functions
- [ ] Examples for common patterns
- [ ] Guide for expression syntax
- [ ] Guide for AI/agent nodes
- [ ] Troubleshooting common issues

---

## Open Questions to Resolve

- [ ] **Version format** - Use `'v4.2'` string or `4.2` number?
- [ ] **Error handling** - Define validation error types and messages
- [ ] **Position layout** - Finalize auto-positioning algorithm
- [ ] **Subnode connection types** - Handle 13 AI connection types in types

---

## Build Process Integration

- [ ] Add `generate-types` script to `package.json`
- [ ] Run type generation before build
- [ ] Add to monorepo build pipeline (turbo)
- [ ] Ensure generated types are excluded from git (or included?)

---

## Summary

| Category | Items |
|----------|-------|
| Package Setup | 4 |
| Public API | 9 |
| Workflow Builder | 20 |
| Node Builder | 16 |
| Merge | 10 |
| Sticky Notes | 11 |
| Split In Batches | 5 |
| Placeholder | 3 |
| Expression System | 32 |
| Code Node Helpers | 26 |
| JSON Serialization | 20 |
| Validation | 6 |
| Type Generation | 26 |
| AI/Agent Nodes | 8 |
| Base Types | 14 |
| Testing | 14 |
| Documentation | 6 |
| Open Questions | 4 |
| Build Process | 4 |
| **Total** | **~228** |
