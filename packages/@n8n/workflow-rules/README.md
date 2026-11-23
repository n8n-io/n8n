# @n8n/workflow-rules

Evaluates admin-defined Workflow Rules against the content of a workflow.

```ts
import {
	evaluateWorkflowRules,
	getBlockingFindings,
	resolveEffectiveRules,
	ruleSetSchema,
} from '@n8n/workflow-rules';

const rules = resolveEffectiveRules(ruleSetSchema.parse(instanceRuleSet), projectRuleSet);
const { findings } = evaluateWorkflowRules(workflow, rules, { exemptedRuleIds });
const blocking = getBlockingFindings(findings);
```

The engine is pure and synchronous. The editor, the server and `n8n-cli` use the same code, so they report the same findings.

- **Catalogue rules** are built in. Each has a severity (`off`, `warn` or `block`) and options.
- **Custom rules** are declarative: a target (the workflow, or nodes of some types), a subject, an operator and a value. They run no code.
- **Merge:** a project can make any instance rule stricter. It can lower or turn off an instance rule only when the instance admin marks the rule adjustable.

The engine must not import `n8n-workflow` or a Node-only module. It reads workflows through the structural types in `src/types.ts`. Pass a `RegexTester` that limits run time when the engine runs on a server. The backend passes `safeRegex` from `n8n-workflow`.
