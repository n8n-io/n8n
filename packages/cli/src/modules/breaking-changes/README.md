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
      v2/                     # V2-specific rules
         removed-nodes.rule.ts
         process-env-access.rule.ts
         file-access.rule.ts
         index.ts
      index.ts
   breaking-changes.service.ts          # Detection orchestration
   breaking-changes.rule-registry.service.ts  # Rule management
   breaking-changes.controller.ts       # REST API
   breaking-changes.module.ts           # Module definition
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

The system supports two types of rules:

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

## Adding Rules to the System

### Option 1: Adding a Rule to an Existing Version

If you're adding a new breaking change rule for an existing version (e.g., v2), follow these steps:

#### Step 1: Create the Rule Class

There are two types of rules you can create:

##### A. Workflow Rules (for checking workflows)

Create your rule file in the appropriate version directory (e.g., `rules/v2/my-workflow-rule.rule.ts`):

```typescript
import { BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { INode } from 'n8n-workflow';

import type {
  BreakingChangeRuleMetadata,
  IBreakingChangeWorkflowRule,
  WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
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

  async getRecommendations(): Promise<BreakingChangeRecommendation[]> {
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
    // Check if workflow uses specific node types
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

##### B. Instance Rules (for checking instance configuration)

Create your rule file in the appropriate version directory (e.g., `rules/v2/my-instance-rule.rule.ts`):

```typescript
import { BreakingChangeRecommendation } from '@n8n/api-types';
import { Service } from '@n8n/di';

import type {
  BreakingChangeRuleMetadata,
  IBreakingChangeInstanceRule,
  InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class MyInstanceRule implements IBreakingChangeInstanceRule {
  id: string = 'my-instance-rule-v2';

  getMetadata(): BreakingChangeRuleMetadata {
    return {
      version: 'v2',
      title: 'My Instance Breaking Change',
      description: 'Description of what changed at instance level',
      category: BreakingChangeCategory.instance,
      severity: 'critical',
      documentationUrl: 'https://docs.n8n.io/migration/v2/...',
    };
  }

  async detect(): Promise<InstanceDetectionReport> {
    const instanceIssues = [];
    const recommendations = [];

    // Check instance-level configuration
    // Example: check environment variables, database version, etc.
    const hasIssue = false; // Your detection logic here

    if (hasIssue) {
      instanceIssues.push({
        title: 'Configuration issue detected',
        description: 'Database version XYZ is no longer supported',
        level: 'error',
      });

      recommendations.push({
        action: 'Upgrade database',
        description: 'Update to database version ABC or higher',
      });
    }

    return {
      isAffected: instanceIssues.length > 0,
      instanceIssues,
      recommendations,
    };
  }
}
```

#### Step 2: Register the Rule in the Version Index

Add your rule to the version-specific index file (e.g., `rules/v2/index.ts`):

```typescript
import { FileAccessRule } from './file-access.rule';
import { ProcessEnvAccessRule } from './process-env-access.rule';
import { RemovedNodesRule } from './removed-nodes.rule';
import { MyNewRule } from './my-new-rule.rule'; // Import your rule

const v2Rules = [
 RemovedNodesRule,
 ProcessEnvAccessRule,
 FileAccessRule,
 MyNewRule, // Add to array
];

export { v2Rules };
```

That's it! The rule will be automatically:
- Registered in the `RuleRegistry` when the module initializes
- Available for detection when calling the API with `version=v2`

### Option 2: Adding a New Version with Breaking Changes

If you're implementing breaking changes for a new version (e.g., v3), follow these steps:

#### Step 1: Create the Version Directory Structure

```bash
mkdir -p packages/cli/src/modules/breaking-changes/rules/v3/__tests__
```

#### Step 2: Create Your First Rule

Create `rules/v3/my-first-v3-rule.rule.ts` following the rule creation pattern above. Make sure to:
- Set `version: 'v3.0.0'` in the metadata
- Use a unique rule ID like `'my-first-rule-v3'`

#### Step 3: Create the Version Index File

Create `rules/v3/index.ts`:

```typescript
import { MyFirstV3Rule } from './my-first-v3-rule.rule';
import { MySecondV3Rule } from './my-second-v3-rule.rule';
// Import all v3 rules

const v3Rules = [
 MyFirstV3Rule,
 MySecondV3Rule,
 // Add all v3 rules here
];

export { v3Rules };
```

#### Step 4: Register the Version in Main Rules Index

Update `rules/index.ts` to include the new version:

```typescript
import { v2Rules } from './v2';
import { v3Rules } from './v3'; // Import v3 rules

export { AbstractBreakingChangeRule } from './abstract-rule';

const allRules = [...v2Rules, ...v3Rules]; // Add v3Rules
type RuleConstructors = (typeof allRules)[number];
type RuleInstances = InstanceType<RuleConstructors>;

export { allRules, type RuleInstances };
```
