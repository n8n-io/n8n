/**
 * SDK Functions for Graph-Based Explicit Connections Interface
 *
 * This interface uses explicit connection syntax with output/input indices:
 * - graph.addNode(node)
 * - graph.connect(source, outputIndex, target, inputIndex)
 *
 * Connection indices:
 * - Regular nodes: output 0 → input 0
 * - IF node: output 0 = true, output 1 = false
 * - Switch node: output 0 = case0, output 1 = case1, etc.
 * - Merge node: input 0, input 1, input 2, etc.
 */

export const SDK_FUNCTIONS = `# Available SDK Functions

The following functions are pre-loaded in the execution environment. Do NOT write import statements:

**Core Functions:**
- \`workflow(id, name, settings?)\` - Create a workflow graph builder
- \`node(input)\` - Create a regular node (use graph.addNode() to add)
- \`trigger(input)\` - Create a trigger node
- \`sticky(content, config?)\` - Create a sticky note for documentation

**Helper Functions:**
- \`placeholder(description)\` - Create a placeholder for user input (use this instead of $env)
- \`newCredential(name)\` - Create a credential placeholder

**Graph Construction:**
- \`graph.addNode(node)\` - Add a node to the workflow graph
- \`graph.connect(source, outputIndex, target, inputIndex)\` - Connect nodes explicitly

**Connection Indices:**
- Regular nodes: output 0 → input 0
- IF node: output 0 = true branch, output 1 = false branch
- Switch node: output 0 = case0, output 1 = case1, output 2 = case2, etc.
- Merge node: accepts multiple inputs (input 0, input 1, input 2, etc.)
- Split in Batches: output 0 = done, output 1 = loop (each batch)

**AI/LangChain Subnode Builders:**
- \`languageModel(input)\` - Create a language model subnode
- \`memory(input)\` - Create a memory subnode
- \`tool(input)\` - Create a tool subnode for AI agents
- \`outputParser(input)\` - Create an output parser subnode
- \`embedding(input)\` - Create an embedding subnode
- \`vectorStore(input)\` - Create a vector store subnode
- \`retriever(input)\` - Create a retriever subnode
- \`documentLoader(input)\` - Create a document loader subnode
- \`textSplitter(input)\` - Create a text splitter subnode

**Important:** All connections must be explicit. There is no .then() chaining.
Each node must be added with addNode() before connecting.`;
