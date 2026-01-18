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

- [ ] Export `workflow(id, name, settings?)` function
- [x] Export `node(type, version, config)` function
- [x] Export `trigger(type, version, config)` function
- [ ] Export `merge(branches, config)` function
- [x] Export `sticky(content, config?)` function
- [ ] Export `splitInBatches(version, config)` function
- [x] Export `placeholder(hint)` function
- [ ] Export `runOnceForAllItems<T>(fn)` helper
- [ ] Export `runOnceForEachItem<T>(fn)` helper

---

## Workflow Builder (`src/workflow-builder.ts`)

### Core Methods

- [ ] `workflow(id, name, settings?)` - creates WorkflowBuilder
- [ ] `.add(node)` - adds node to workflow
- [ ] `.then(node)` - chains node after current
- [ ] `.then(merge)` - accepts MergeComposite (fans out to branches)
- [ ] `.output(index)` - selects output branch
- [ ] `.settings(settings)` - updates workflow settings
- [ ] `.toJSON()` - exports to n8n JSON format
- [ ] `.toString()` - serializes to JSON string
- [ ] `workflow.fromJSON(json)` - static import method
- [ ] `.getNode(name)` - retrieves node by name
- [ ] `.getNode(name).update(config)` - modifies existing node

### Workflow Settings Support

- [ ] `timezone` setting
- [ ] `errorWorkflow` setting
- [ ] `saveDataErrorExecution` setting
- [ ] `saveDataSuccessExecution` setting
- [ ] `saveManualExecutions` setting
- [ ] `saveExecutionProgress` setting
- [ ] `executionTimeout` setting
- [ ] `executionOrder` setting ('v0' | 'v1')
- [ ] `callerPolicy` setting
- [ ] `callerIds` setting

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

- [ ] `merge(branches, config)` function
- [ ] Returns `MergeComposite<T>` type
- [ ] `branches` array determines input positions
- [ ] Support `mode: 'append'`
- [ ] Support `mode: 'combine'`
- [ ] Support `mode: 'multiplex'`
- [ ] Support `mode: 'chooseBranch'`
- [ ] Branches can be `.then()` chains (not just single nodes)
- [ ] `WorkflowBuilder.then(MergeComposite)` fans out from previous node

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

- [ ] `splitInBatches(version, config)` function
- [ ] `.done()` - chain from output 0 (all items processed)
- [ ] `.each()` - chain from output 1 (current batch)
- [ ] `.loop()` - connects back to splitInBatches node
- [ ] Support `executeOnce` within loop chain

---

## Placeholder (`src/placeholder.ts`)

- [x] `placeholder(hint)` function
- [x] Serializes to `<__PLACEHOLDER_VALUE__hint__>`
- [ ] Parse placeholders on JSON import

---

## Expression System (`src/expression/`)

### Context Types (`context.ts`)

- [ ] `$.json` - current item JSON data (typed from upstream)
- [ ] `$.binary` - current item binary data
- [ ] `$.input.first()` - first input item
- [ ] `$.input.all()` - all input items
- [ ] `$.input.item` - current item
- [ ] `$('nodeName')` - reference another node's output
- [ ] `$.env.VAR_NAME` - environment variables
- [ ] `$.vars.VAR_NAME` - workflow variables
- [ ] `$.secrets.PROVIDER.SECRET` - external secrets
- [ ] `$.now` - current DateTime
- [ ] `$.itemIndex` - current item index
- [ ] `$.runIndex` - current run index
- [ ] `$.execution.id` - execution ID
- [ ] `$.execution.mode` - execution mode
- [ ] `$.execution.resumeUrl` - resume URL
- [ ] `$.workflow.id` - workflow ID
- [ ] `$.workflow.name` - workflow name
- [ ] `$.workflow.active` - workflow active status

### Binary Data Support

- [ ] `$.binary[fieldName].fileName`
- [ ] `$.binary[fieldName].directory`
- [ ] `$.binary[fieldName].mimeType`
- [ ] `$.binary[fieldName].fileExtension`
- [ ] `$.binary[fieldName].fileSize`
- [ ] `$.binary.keys()` method

### Parser (`parser.ts`)

- [ ] Parse `={{ ... }}` expression strings to AST
- [ ] Handle `$json.foo` syntax
- [ ] Handle `$('NodeName').item.json.x` syntax
- [ ] Handle `$now`, `$env.VAR`, `$itemIndex` etc.
- [ ] Preserve JavaScript expressions (map, filter, join, etc.)

### Serializer (`serializer.ts`)

- [ ] Convert expression functions `$ => ...` to `={{ ... }}` strings
- [ ] Handle nested expressions in parameters
- [ ] Handle expressions in arrays/objects

---

## Code Node Helpers (`src/code-helpers.ts`)

### runOnceForAllItems

- [ ] `runOnceForAllItems<T>(fn)` helper function
- [ ] Context provides `ctx.$input.all()`
- [ ] Context provides `ctx.$input.first()`
- [ ] Context provides `ctx.$input.last()`
- [ ] Context provides `ctx.$input.itemMatching(i)`
- [ ] Return type must be array matching `T`
- [ ] Serialize to `{ mode: 'runOnceForAllItems', jsCode: '...' }`
- [ ] Strip `ctx.` prefix during serialization

### runOnceForEachItem

- [ ] `runOnceForEachItem<T>(fn)` helper function
- [ ] Context provides `ctx.$input.item`
- [ ] Context provides `ctx.$itemIndex`
- [ ] Return type is single item matching `T` or `null`
- [ ] Serialize to `{ mode: 'runOnceForEachItem', jsCode: '...' }`
- [ ] Strip `ctx.` prefix during serialization

### Shared Context

- [ ] `ctx.$env.VAR_NAME`
- [ ] `ctx.$vars.name`
- [ ] `ctx.$secrets.provider.key`
- [ ] `ctx.$now`
- [ ] `ctx.$today`
- [ ] `ctx.$runIndex`
- [ ] `ctx.$execution.id`
- [ ] `ctx.$execution.mode`
- [ ] `ctx.$execution.resumeUrl`
- [ ] `ctx.$workflow.id`
- [ ] `ctx.$workflow.name`
- [ ] `ctx.$workflow.active`
- [ ] `ctx.$('nodeName')` reference
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

- [ ] Validate workflow structure before export
- [ ] Validate required node parameters
- [ ] Validate credential references
- [ ] Validate connection integrity
- [ ] Validate expression syntax
- [ ] Surface clear error messages

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

- [ ] Unit tests for workflow builder
- [ ] Unit tests for node builder
- [ ] Unit tests for merge composite
- [ ] Unit tests for sticky notes
- [ ] Unit tests for split in batches
- [ ] Unit tests for expression parser
- [ ] Unit tests for expression serializer
- [ ] Unit tests for JSON export
- [ ] Unit tests for JSON import (round-trip)
- [ ] Unit tests for auto-layout
- [ ] Unit tests for validation
- [ ] Unit tests for type generation script
- [ ] Integration test: complete workflow example from design doc

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
