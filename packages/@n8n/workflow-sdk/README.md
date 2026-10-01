![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# @n8n/workflow-sdk

TypeScript SDK for programmatically creating n8n workflows.

## Features

- Fluent builder API for workflow creation
- Full type safety with TypeScript
- Code generation from JSON workflows
- Control flow support (If, Switch, Merge, Loop)
- Built-in validation
- AI/LangChain node integration

## Usage

```typescript
import { WorkflowBuilder, manual, httpRequest } from '@n8n/workflow-sdk';

const workflow = new WorkflowBuilder()
  .withName('My Workflow')
  .addTrigger(manual())
  .then(httpRequest({ url: 'https://api.example.com/data' }))
  .build();
```

## License

You can find the license information [here](https://github.com/n8n-io/n8n/blob/master/README.md#license)
