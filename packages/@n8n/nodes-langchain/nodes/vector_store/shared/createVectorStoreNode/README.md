## Overview

`createVectorStoreNode` is a factory function that generates n8n nodes for vector store operations. It abstracts the common functionality needed for vector stores while allowing specific implementations to focus only on their unique aspects.

## Purpose

The function provides a standardized way to:
1. Create vector store nodes with consistent UIs
2. Handle different operation modes (load, insert, retrieve, update, retrieve-as-tool)
3. Process documents and embeddings
4. Maintain connection to LLM services

## Architecture

```
	/createVectorStoreNode/					 	 # Create Vector Store Node
    /constants.ts                    # Constants like operation modes and descriptions
    /types.ts                        # TypeScript interfaces and types
    /utils.ts                        # Utility functions for node configuration
    /createVectorStoreNode.ts        # Main factory function
    /processDocuments.ts             # Document processing helpers
    /operations/                     # Operation-specific logic
      /loadOperation.ts              # Handles 'load' mode
      /insertOperation.ts            # Handles 'insert' mode
      /updateOperation.ts            # Handles 'update' mode
      /retrieveOperation.ts          # Handles 'retrieve' mode
      /retrieveAsToolOperation.ts    # Handles 'retrieve-as-tool' mode
```

## Usage

To create a new vector store node:

```typescript
import { createVectorStoreNode } from './createVectorStoreNode';

export class MyVectorStoreNode {
  static description = createVectorStoreNode({
    meta: {
      displayName: 'My Vector Store',
      name: 'myVectorStore',
      description: 'Operations for My Vector Store',
      docsUrl: 'https://docs.example.com/my-vector-store',
      icon: 'file:myIcon.svg',
      // Optional: specify which operations this vector store supports
      operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
    },
    sharedFields: [
      // Fields shown in all operation modes
    ],
    loadFields: [
      // Fields specific to 'load' operation
    ],
    insertFields: [
      // Fields specific to 'insert' operation
    ],
    retrieveFields: [
      // Fields specific to 'retrieve' operation
    ],
    // Functions to implement
    getVectorStoreClient: async (context, filter, embeddings, itemIndex) => {
      // Create and return vector store instance
    },
    populateVectorStore: async (context, embeddings, documents, itemIndex) => {
      // Insert documents into vector store
    },
    // Optional: cleanup function
    releaseVectorStoreClient: (vectorStore) => {
      // Release resources if needed
    },
  });
}
```

## Operation Modes

### 1. `load` Mode
- Retrieves documents from the vector store based on a query
- Embeds the query and performs similarity search
- Returns ranked documents with their similarity scores

### 2. `insert` Mode
- Processes documents from input
- Embeds and stores documents in the vector store
- Returns serialized documents with metadata

### 3. `retrieve` Mode
- Returns the vector store instance for use with AI nodes
- Allows LLMs to query the vector store directly
- Used with chains and retrievers

### 4. `retrieve-as-tool` Mode
- Creates a tool that wraps the vector store
- Allows AI agents to use the vector store as a tool
- Returns documents in a format digestible by agents

### 5. `update` Mode (optional)
- Updates existing documents in the vector store by ID
- Requires the vector store to support document updates
- Only enabled if included in `operationModes`

## Key Components

### 1. NodeConstructorArgs Interface
Defines the configuration and callbacks that specific vector store implementations must provide:

```typescript
interface VectorStoreNodeConstructorArgs<T extends VectorStore> {
  meta: NodeMeta;                    // Node metadata (name, description, etc.)
  methods?: { ... };                 // Optional methods for list searches
  sharedFields: INodeProperties[];   // Fields shown in all modes
  insertFields?: INodeProperties[];  // Fields specific to insert mode
  loadFields?: INodeProperties[];    // Fields specific to load mode
  retrieveFields?: INodeProperties[]; // Fields specific to retrieve mode
  updateFields?: INodeProperties[];  // Fields specific to update mode
  
  // Core implementation functions
  populateVectorStore: Function;     // Store documents in vector store
  getVectorStoreClient: Function;    // Get vector store instance
  releaseVectorStoreClient?: Function; // Clean up resources
}
```

### 2. Operation Handlers
Each operation mode has its own handler module with a well-defined interface:

```typescript
// Example: loadOperation.ts
export async function handleLoadOperation<T extends VectorStore>(
  context: IExecuteFunctions,
  args: VectorStoreNodeConstructorArgs<T>,
  embeddings: Embeddings,
  itemIndex: number
): Promise<INodeExecutionData[]>
```

### 3. Document Processing
The `processDocument` function standardizes how documents are handled:

```typescript
const { processedDocuments, serializedDocuments } = await processDocument(
  documentInput,
  itemData,
  itemIndex
);
```

## Implementation Details

### Dynamic Inputs and Outputs
The node definition includes dynamic inputs and outputs based on the selected operation mode:

```typescript
inputs: `={{
  ((parameters) => {
    const mode = parameters?.mode;
    // Dynamic inputs based on mode
    // ...
  })($parameter)
}}`,
outputs: `={{
  ((parameters) => {
    const mode = parameters?.mode ?? 'retrieve';
    // Dynamic outputs based on mode
    // ...
  })($parameter)
}}`,
```

### Error Handling
Each operation handler includes error handling with proper resource cleanup:

```typescript
try {
  // Operation logic
} finally {
  // Release resources even if an error occurs
  args.releaseVectorStoreClient?.(vectorStore);
}
```

### Dynamic Tool Creation
For the `retrieve-as-tool` mode, a DynamicTool is created that exposes vector store functionality:

```typescript
const vectorStoreTool = new DynamicTool({
  name: toolName,
  description: toolDescription,
  func: async (input) => {
    // Search vector store with input
    // ...
  },
});
```

## Performance Considerations

1. **Resource Management**: Each operation properly handles resource cleanup with `releaseVectorStoreClient`.

2. **Batched Processing**: Operations like `insert` process items in batches and check for cancellation.

3. **Metadata Filtering**: Filters can be applied during search operations to reduce result sets.

4. **Execution Cancellation**: The code checks for cancellation signals to stop processing when needed.

## Testing

Each component has dedicated tests:
- Individual operation handlers are tested separately
- Utility functions have their own test suite
- Error cases are explicitly tested

## Extension Points

To add new operation modes:
1. Define the mode in `NodeOperationMode` type
2. Add it to `DEFAULT_OPERATION_MODES` if it should be widely available
3. Add description to `OPERATION_MODE_DESCRIPTIONS`
4. Create a new handler function
5. Update `execute` and/or `supplyData` methods to use the handler
