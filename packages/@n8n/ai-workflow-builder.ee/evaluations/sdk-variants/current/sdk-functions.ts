/**
 * SDK Functions for Current (Object-Based) Interface
 *
 * This is the existing SDK interface that uses object syntax for branching:
 * - ifElse(ifNode, { true: trueChain, false: falseChain })
 * - switchCase(switchNode, { case0: branch0, case1: branch1 })
 * - merge(mergeNode, { input0: source1, input1: source2 })
 */

export const SDK_FUNCTIONS = `# Available SDK Functions

The following functions are pre-loaded in the execution environment. Do NOT write import statements:

**Core Functions:**
- \`workflow(id, name, settings?)\` - Create a workflow builder
- \`node(input)\` - Create a regular node
- \`trigger(input)\` - Create a trigger node
- \`sticky(content, config?)\` - Create a sticky note for documentation

**Helper Functions:**
- \`placeholder(description)\` - Create a placeholder for user input (use this instead of $env)
- \`newCredential(name)\` - Create a credential placeholder

**Composite Patterns (Object Syntax):**
- \`ifElse(ifNode, { true: trueTargetChain, false: falseTargetChain })\` - Two-way conditional branching (requires pre-declared IF node)
- \`switchCase(switchNode, { case0: targetChain, case1: targetChain, ... })\` - Multi-way routing (requires pre-declared Switch node)
- \`merge(mergeNode, { input0: source, input1: source, ... })\` - Parallel execution with merge (requires pre-declared Merge node)
- \`splitInBatches(config)\` - Batch processing with loops

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

**Node Connection Methods:**
- \`.add(node)\` - Add a node or chain to the workflow
- \`.then(node)\` - Chain the next node after the current one`;
