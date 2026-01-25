/**
 * SDK Functions for Builder Pattern Interface
 *
 * This interface uses explicit builder methods:
 * - ifElse(ifNode).onTrue(target).onFalse(target)
 * - switchCase(switchNode).onCase(n, target).onFallback(target)
 * - merge(config) returns builder with .input(n) for targets
 * - splitInBatches(config).eachBatch(target).done(target)
 *
 * Key difference: Branches are TERMINAL - .onTrue()/.onFalse() return
 * the builder, not a chainable node. To continue after branching,
 * use merge.input(n) as the branch target.
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

**Composite Patterns (Builder Style):**
- \`ifElse(ifNode)\` - Returns builder with \`.onTrue(target)\` and \`.onFalse(target)\` methods
- \`switchCase(switchNode)\` - Returns builder with \`.onCase(n, target)\` and \`.onFallback(target)\` methods
- \`merge(config)\` - Returns builder with \`.input(n)\` method to connect sources and \`.then()\` to continue
- \`splitInBatches(config)\` - Returns builder with \`.eachBatch(target)\` and \`.done(target)\` methods

**IMPORTANT:** Branches are TERMINAL - \`.onTrue()\`/\`.onFalse()\` return the builder, not a chainable node.
To continue after branching, use \`merge.input(n)\` as the branch target.

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
- \`.then(node)\` - Chain the next node after the current one
- \`.nextBatch()\` - Connect back to the split in batches node for looping`;
