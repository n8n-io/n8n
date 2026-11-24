![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# @n8n/workflow-sdk

TypeScript SDK to create n8n workflows as code. You describe a workflow with `workflow()`, `trigger()`, `node()` and `.to()`. The SDK converts the code to n8n workflow JSON and validates it.

SDK code is a restricted subset of TypeScript. For the full reference (builder functions, language rules, patterns, and expressions), call the `get_workflow_sdk_reference` tool of the n8n MCP server.

## Install

```sh
npm install @n8n/workflow-sdk
```

## Example

```typescript
import { workflow, trigger, node } from '@n8n/workflow-sdk';

const start = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' },
});

const fetchPosts = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Fetch Posts',
    parameters: { method: 'GET', url: 'https://api.example.com/posts' },
  },
});

export default workflow('example', 'Fetch posts').add(start).to(fetchPosts);
```

## Convert code to workflow JSON

n8n reads SDK code with an AST interpreter. The code never runs. The interpreter does not accept `import` declarations, so remove the import line before you parse the code.

```typescript
import { parseWorkflowCodeToBuilder, validateWorkflowBuilder } from '@n8n/workflow-sdk';

// `code` is the workflow code without its import line.
const builder = parseWorkflowCodeToBuilder(code);
const result = validateWorkflowBuilder(builder);
if (!result.ok) {
  console.error(result.blocking);
}
const workflowJson = builder.toJSON();
```
