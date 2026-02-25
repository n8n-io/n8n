# Breaking Changes Detection Module

A rule-based system for detecting breaking changes before migrating to a new n8n version.

## Overview

This module scans the n8n instance (workflows, configuration, environment) to identify issues that will be affected by breaking changes in the target version.

## Architecture

```
breaking-changes/
   types/
      rule.types.ts           # Core interfaces and enums
      detection.types.ts      # Report types
      index.ts
   rules/
      v2/                     # V2-specific rules (auto-discovered)
         removed-nodes.rule.ts
         process-env-access.rule.ts
         file-access.rule.ts
         ...
      index.ts                # Auto-discovery via fast-glob
   breaking-change-rule.decorator.ts        # @BreakingChangeRule decorator
   breaking-changes.rule-metadata.service.ts # Auto-registration metadata
   breaking-changes.service.ts              # Detection orchestration
   breaking-changes.rule-registry.service.ts # Rule management
   breaking-changes.controller.ts           # REST API
   breaking-changes.module.ts               # Module definition
```

### Auto-Discovery

Rules are auto-discovered at startup using two mechanisms:

1. **`@BreakingChangeRule` decorator** — applied to each rule class, registers it
   in `BreakingChangeRuleMetadata` (following the same pattern as `@BackendModule`
   / `ModuleMetadata`).
2. **`loadAllRules()`** — uses `fast-glob` to find all `*.rule.{js,ts}` files
   under `rules/` and imports them, triggering the decorators.

```
Module.init()
  → loadAllRules()            glob **/*.rule.{js,ts}
    → import each file        @BreakingChangeRule fires
      → BreakingChangeRuleMetadata.register()
  → import controller
    → BreakingChangeService constructor
      → registerRules()       reads from metadata, resolves via DI
        → RuleRegistry.registerAll()
```

## API Endpoint

### Detect Breaking Changes
```
GET /breaking-changes/report?version=v2
```

Returns:
```json
{
 "report": {
  "generatedAt": "2025-10-17T00:00:00.000Z",
  "targetVersion": "v2",
  "currentVersion": "1.x.x",
  "instanceResults": [
   {
    "ruleId": "process-env-access-v2",
    "ruleTitle": "Process Environment Access Restrictions",
    "ruleDescription": "Access to process.env is now restricted",
    "ruleSeverity": "high",
    "instanceIssues": [
     {
      "title": "Environment access detected",
      "description": "Workflows using process.env may be affected",
      "level": "warning"
     }
    ],
    "recommendations": [
     {
      "action": "Review environment variable usage",
      "description": "Update workflows to use secure environment variable access"
     }
    ]
   }
  ],
  "workflowResults": [
   {
    "ruleId": "removed-nodes-v2",
    "ruleTitle": "Removed Deprecated Nodes",
    "ruleDescription": "Several deprecated nodes have been removed",
    "ruleSeverity": "critical",
    "affectedWorkflows": [
     {
      "id": "wf-001",
      "name": "Customer Onboarding",
      "active": true,
      "numberOfExecutions": 142,
      "lastUpdatedAt": "2025-10-15T10:30:00.000Z",
      "lastExecutedAt": "2025-10-16T14:22:00.000Z",
      "issues": [
       {
        "title": "Node 'n8n-nodes-base.spontit' with name 'Spontit' has been removed",
        "description": "The node type 'n8n-nodes-base.spontit' is no longer available",
        "level": "error",
        "nodeId": "node-123",
        "nodeName": "Spontit"
       }
      ]
     }
    ],
    "recommendations": [
     {
      "action": "Update affected workflows",
      "description": "Replace removed nodes with their updated versions or alternatives"
     }
    ]
   }
  ]
 },
 "shouldCache": false
}
```

## Rule Types

The system supports three types of rules:

### Workflow Rules (`IBreakingChangeWorkflowRule`)

- **Purpose**: Check individual workflows for breaking changes
- **Methods**:
  - `getMetadata()`: Returns rule metadata (version, title, description, severity, etc.)
  - `detectWorkflow(workflow, nodesGroupedByType)`: Checks a single workflow and returns issues
  - `getRecommendations(workflowResults)`: Returns recommendations based on detected issues
- **Returns**: `WorkflowDetectionReport` with workflow-specific issues
- **Example Use Cases**: Removed nodes, deprecated node features, changed node behavior

### Instance Rules (`IBreakingChangeInstanceRule`)

- **Purpose**: Check instance-level configuration and environment
- **Methods**:
  - `getMetadata()`: Returns rule metadata (version, title, description, severity, etc.)
  - `detect()`: Checks the entire instance and returns issues
- **Returns**: `InstanceDetectionReport` with instance-level issues and recommendations
- **Example Use Cases**: Environment variable requirements, database version checks, configuration changes

### Batch Workflow Rules (`IBreakingChangeBatchWorkflowRule`)

- **Purpose**: Correlate data across multiple workflows (e.g., detecting parent workflows that call sub-workflows with specific characteristics)
- **Methods**:
  - `getMetadata()`: Returns rule metadata
  - `collectWorkflowData(workflow, nodesGroupedByType)`: Called per workflow during scanning
  - `produceReport()`: Called after all workflows scanned to produce final report
  - `reset()`: Resets internal state before a new detection run
  - `getRecommendations(workflowResults)`: Returns recommendations
- **Returns**: `BatchWorkflowDetectionReport`

## Adding Rules

### Adding a Rule to an Existing Version

Create a new `.rule.ts` file in the appropriate version directory. That's it — the
file is auto-discovered and the `@BreakingChangeRule` decorator handles registration.

#### Workflow Rule Example

Create `rules/v2/my-workflow-rule.rule.ts`:

```typescript
import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { BreakingChangeRule } from '../../breaking-change-rule.decorator';
import type {
  BreakingChangeRuleMetadata,
  IBreakingChangeWorkflowRule,
  WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v2' })
export class MyWorkflowRule implements IBreakingChangeWorkflowRule {
  id: string = 'my-workflow-rule-v2';

  getMetadata(): BreakingChangeRuleMetadata {
    return {
      version: 'v2',
      title: 'My Workflow Breaking Change',
      description: 'Description of what changed in workflows',
      category: BreakingChangeCategory.workflow,
      severity: 'high',
      documentationUrl: 'https://docs.n8n.io/migration/v2/...',
    };
  }

  async getRecommendations(
    _workflowResults: BreakingChangeAffectedWorkflow[],
  ): Promise<BreakingChangeRecommendation[]> {
    return [
      {
        action: 'Update affected workflows',
        description: 'Replace or update the affected nodes',
      },
    ];
  }

  async detectWorkflow(
    _workflow: WorkflowEntity,
    nodesGroupedByType: Map<string, INode[]>,
  ): Promise<WorkflowDetectionReport> {
    const affectedNodes = nodesGroupedByType.get('n8n-nodes-base.someNode') ?? [];

    if (affectedNodes.length === 0) {
      return { isAffected: false, issues: [] };
    }

    return {
      isAffected: true,
      issues: affectedNodes.map((node) => ({
        title: `Node '${node.type}' with name '${node.name}' is affected`,
        description: 'This node requires updates for v2 compatibility',
        level: 'warning',
        nodeId: node.id,
        nodeName: node.name,
      })),
    };
  }
}
```

#### Instance Rule Example

Create `rules/v2/my-instance-rule.rule.ts`:

```typescript
import { BreakingChangeRule } from '../../breaking-change-rule.decorator';
import type {
  BreakingChangeRuleMetadata,
  IBreakingChangeInstanceRule,
  InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v2' })
export class MyInstanceRule implements IBreakingChangeInstanceRule {
  id: string = 'my-instance-rule-v2';

  getMetadata(): BreakingChangeRuleMetadata {
    return {
      version: 'v2',
      title: 'My Instance Breaking Change',
      description: 'Description of what changed at instance level',
      category: BreakingChangeCategory.instance,
      severity: 'medium',
      documentationUrl: 'https://docs.n8n.io/migration/v2/...',
    };
  }

  async detect(): Promise<InstanceDetectionReport> {
    const hasIssue = false; // Your detection logic here

    if (!hasIssue) {
      return { isAffected: false, instanceIssues: [], recommendations: [] };
    }

    return {
      isAffected: true,
      instanceIssues: [
        {
          title: 'Configuration issue detected',
          description: 'Description of the issue',
          level: 'warning',
        },
      ],
      recommendations: [
        {
          action: 'Fix the configuration',
          description: 'Steps to resolve the issue',
        },
      ],
    };
  }
}
```

The rule will be automatically:
- Discovered by `loadAllRules()` via `fast-glob`
- Registered in `BreakingChangeRuleMetadata` by the `@BreakingChangeRule` decorator
- Instantiated via DI and added to `RuleRegistry` when the service starts
- Available for detection when calling the API with the matching version

### Adding a New Version

To add breaking changes for a new version (e.g., v3):

1. Create the version directory:
   ```bash
   mkdir -p packages/cli/src/modules/breaking-changes/rules/v3
   ```

2. Add rule files with `@BreakingChangeRule({ version: 'v3' })`.

That's it. The glob pattern `**/*.rule.{js,ts}` in `rules/index.ts` automatically
picks up new version directories. No barrel files or manual registration needed.
