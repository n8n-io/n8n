# Type-Safe Subnode System for Workflow SDK

## Overview

Implement a type-safe subnode system that enforces which nodes can be used as specific types of subnodes (memory, languageModel, tool, outputParser, etc.) for AI agent nodes. This prevents users from incorrectly using incompatible nodes as subnodes.

## Problem

Currently, the `SubnodeConfig` interface accepts any `NodeInstance`:

```typescript
export interface SubnodeConfig {
  model?: NodeInstance<string, string, unknown>;
  memory?: NodeInstance<string, string, unknown>;
  tools?: NodeInstance<string, string, unknown>[];
  outputParser?: NodeInstance<string, string, unknown>;
}
```

This means users can pass any node as a subnode without type checking. For example, nothing prevents passing an HTTP Request node as a memory subnode.

## Solution

Create specialized factory functions and marker types for each subnode category, and update the type generator to produce union types of valid nodes for each category based on their `outputs` field.

---

## Implementation Steps

### Step 1: Add Subnode Marker Types to `base.ts`

**File:** `packages/@n8n/workflow-sdk/src/types/base.ts`

Add marker interfaces that extend `NodeInstance` with a subnode category marker:

```typescript
/**
 * Marker interface for language model subnodes
 */
export interface LanguageModelInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_languageModel';
}

/**
 * Marker interface for memory subnodes
 */
export interface MemoryInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_memory';
}

/**
 * Marker interface for tool subnodes
 */
export interface ToolInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_tool';
}

/**
 * Marker interface for output parser subnodes
 */
export interface OutputParserInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_outputParser';
}

/**
 * Marker interface for embedding subnodes
 */
export interface EmbeddingInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_embedding';
}

/**
 * Marker interface for vector store subnodes
 */
export interface VectorStoreInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_vectorStore';
}

/**
 * Marker interface for retriever subnodes
 */
export interface RetrieverInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_retriever';
}

/**
 * Marker interface for document loader subnodes
 */
export interface DocumentLoaderInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_document';
}

/**
 * Marker interface for text splitter subnodes
 */
export interface TextSplitterInstance<TType extends string = string, TVersion extends string = string, TOutput = unknown>
  extends NodeInstance<TType, TVersion, TOutput> {
  readonly _subnodeType: 'ai_textSplitter';
}

/**
 * Union of all subnode instance types
 */
export type AnySubnodeInstance =
  | LanguageModelInstance
  | MemoryInstance
  | ToolInstance
  | OutputParserInstance
  | EmbeddingInstance
  | VectorStoreInstance
  | RetrieverInstance
  | DocumentLoaderInstance
  | TextSplitterInstance;
```

Update `SubnodeConfig` to use the new marker types:

```typescript
/**
 * Subnode configuration for AI nodes
 *
 * Each field accepts only nodes that output the corresponding connection type.
 */
export interface SubnodeConfig {
  /** Language model subnode (outputs ai_languageModel) */
  model?: LanguageModelInstance;
  /** Memory subnode (outputs ai_memory) */
  memory?: MemoryInstance;
  /** Tool subnodes (outputs ai_tool) */
  tools?: ToolInstance[];
  /** Output parser subnode (outputs ai_outputParser) */
  outputParser?: OutputParserInstance;
}
```

Add factory function type signatures:

```typescript
/**
 * Creates a language model subnode instance
 */
export type LanguageModelFn = <TNode extends NodeInput>(
  input: TNode,
) => LanguageModelInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates a memory subnode instance
 */
export type MemoryFn = <TNode extends NodeInput>(
  input: TNode,
) => MemoryInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates a tool subnode instance
 */
export type ToolFn = <TNode extends NodeInput>(
  input: TNode,
) => ToolInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates an output parser subnode instance
 */
export type OutputParserFn = <TNode extends NodeInput>(
  input: TNode,
) => OutputParserInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates an embedding subnode instance
 */
export type EmbeddingFn = <TNode extends NodeInput>(
  input: TNode,
) => EmbeddingInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates a vector store subnode instance
 */
export type VectorStoreFn = <TNode extends NodeInput>(
  input: TNode,
) => VectorStoreInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates a retriever subnode instance
 */
export type RetrieverFn = <TNode extends NodeInput>(
  input: TNode,
) => RetrieverInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates a document loader subnode instance
 */
export type DocumentLoaderFn = <TNode extends NodeInput>(
  input: TNode,
) => DocumentLoaderInstance<TNode['type'], `${TNode['version']}`, unknown>;

/**
 * Creates a text splitter subnode instance
 */
export type TextSplitterFn = <TNode extends NodeInput>(
  input: TNode,
) => TextSplitterInstance<TNode['type'], `${TNode['version']}`, unknown>;
```

### Step 2: Create Subnode Factory Functions

**File:** `packages/@n8n/workflow-sdk/src/subnode-builders.ts` (new file)

Create the implementation classes and factory functions - see full implementation in the complete plan file.

### Step 3: Export Subnode Factories from Index

**File:** `packages/@n8n/workflow-sdk/src/index.ts`

Add exports for the new subnode builders:

```typescript
// Subnode builders
export {
  languageModel,
  memory,
  tool,
  outputParser,
  embedding,
  vectorStore,
  retriever,
  documentLoader,
  textSplitter,
} from './subnode-builders';

// Export subnode types
export type {
  LanguageModelInstance,
  MemoryInstance,
  ToolInstance,
  OutputParserInstance,
  EmbeddingInstance,
  VectorStoreInstance,
  RetrieverInstance,
  DocumentLoaderInstance,
  TextSplitterInstance,
  AnySubnodeInstance,
  LanguageModelFn,
  MemoryFn,
  ToolFn,
  OutputParserFn,
  EmbeddingFn,
  VectorStoreFn,
  RetrieverFn,
  DocumentLoaderFn,
  TextSplitterFn,
} from './types/base';
```

### Step 4: Enhance Type Generator to Extract Outputs

**File:** `packages/@n8n/workflow-sdk/scripts/generate-types.ts`

Add functions to:
1. Extract output connection types from node definitions
2. Identify AI subnode types
3. Generate union types for each subnode category
4. Add `@subnodeType` JSDoc tags to generated types

See full implementation details in the complete plan file.

### Step 5: Update Tests

**Files:**
- `packages/@n8n/workflow-sdk/src/__tests__/node-builder.test.ts` (update)
- `packages/@n8n/workflow-sdk/src/__tests__/subnodes.test.ts` (new)

Create comprehensive tests for subnode factory functions.

### Step 6: Update Documentation

**File:** `packages/@n8n/workflow-sdk/docs/2026-01-18-workflow-sdk-design.md`

Update the Agent Nodes & Structured Output section with new subnode factory documentation.

---

## Critical Files

- `packages/@n8n/workflow-sdk/src/types/base.ts` - Add subnode marker interfaces
- `packages/@n8n/workflow-sdk/src/subnode-builders.ts` - New subnode factory implementations
- `packages/@n8n/workflow-sdk/src/index.ts` - Export new factories
- `packages/@n8n/workflow-sdk/scripts/generate-types.ts` - Extract output types, generate unions
- `packages/@n8n/workflow-sdk/src/__tests__/subnodes.test.ts` - New test file for subnodes
- `packages/@n8n/workflow-sdk/docs/2026-01-18-workflow-sdk-design.md` - Update documentation

---

## Verification

After implementation:

1. **Regenerate Types** - `pnpm generate-types`
2. **Run Tests** - `pnpm test`
3. **Type Check** - `pnpm typecheck`
4. **Build Package** - `pnpm build`
5. **Test Integration** - Create example using new factories

---

## Open Questions

1. **Runtime Validation**: Should we add runtime validation to verify nodes output the correct connection type?
2. **Migration Path**: Should we provide a codemod or migration guide for existing code?
3. **Node() vs Specialized Functions**: Should `node()` continue to work for subnodes (without type safety), or deprecate that usage?
