# @n8n/workflow-engine-check

Reports whether a workflow can run on engine v2, and why not.

```ts
import { checkEngineV2Eligibility } from '@n8n/workflow-engine-check';

const { eligible, reasons } = checkEngineV2Eligibility(workflow, nodeTypes);
```

The check is pure and synchronous. The editor, the backend and the n8n Assistant can all use it. It depends only on `n8n-workflow`. It must not import `@n8n/engine` or a Node-only module.

The check is an approximation. A workflow that it reports as eligible can still fail at run time, because the engine is the final authority. A rule must never refuse a workflow that engine v2 can run.
