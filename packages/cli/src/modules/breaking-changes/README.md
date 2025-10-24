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
      abstract-rule.ts        # Base class for all rules
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
GET /breaking-changes?version=v2
```

Returns:
```json
{
  "generatedAt": "2025-10-17T00:00:00.000Z",
  "targetVersion": "v2",
  "currentVersion": "1.x.x",
  "totalIssues": 5,
  "criticalIssues": 2,
  "affectedWorkflowCount": 4,
  "results": [
    {
      "ruleId": "removed-nodes-v2",
      "isAffected": true,
      "affectedWorkflows": [
        {
          "id": "wf-001",
          "name": "Customer Onboarding",
          "active": true,
          "reason": "Uses removed nodes: n8n-nodes-base.spontit"
        }
      ],
      "instanceIssues": [],
      "recommendations": [
        {
          "action": "Update affected workflows",
          "description": "Replace removed nodes with alternatives"
        }
      ]
    }
  ]
}
```

## Adding Rules to the System

### Option 1: Adding a Rule to an Existing Version

If you're adding a new breaking change rule for an existing version (e.g., v2), follow these steps:

#### Step 1: Create the Rule Class

Create your rule file in the appropriate version directory (e.g., `rules/v2/my-new-rule.rule.ts`):

```typescript
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ErrorReporter } from 'n8n-core';

import type { DetectionResult, BreakingChangeMetadata } from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory } from '../../types';

@Service()
export class MyNewRule extends IBreakingChangeInstanceRule {
	constructor(
		protected readonly logger: Logger,
		protected errorReporter: ErrorReporter,
	) {
		super(logger);
	}

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'my-rule-v2',
			version: 'v2',
			title: 'My Breaking Change',
			description: 'Description of what changed',
			category: BreakingChangeCategory.WORKFLOW,
			severity: BreakingChangeSeverity.HIGH,
			documentationUrl: 'https://docs.n8n.io/migration/v2/...',
		};
	}

	async detect(): Promise<DetectionResult> {
		const result = this.createEmptyResult(this.getMetadata().id);

		try {
			// Instance-level issues
			result.instanceIssues.push({
				type: 'configuration',
				description: 'Database version XYZ is deprecated',
				severity: BreakingChangeSeverity.HIGH,
			});

			result.isAffected =
				result.instanceIssues.length > 0;

			if (result.isAffected) {
				result.recommendations.push({
					action: 'What to do',
					description: 'How to fix it',
					documentationUrl: 'https://docs.n8n.io/...',
				});
			}
		} catch (error) {
			this.errorReporter.error(error, { shouldBeLogged: true});
		}

		return result;
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

## Rule Categories

- **WORKFLOW**: Changes affecting workflow execution
- **INSTANCE**: Changes to instance configuration
- **ENVIRONMENT**: Changes to environment variables
- **DATABASE**: Changes to database requirements
- **INFRASTRUCTURE**: Changes to deployment/infrastructure

## Severity Levels

- **CRITICAL**: Will cause immediate workflow failures
- **HIGH**: May cause silent failures or require urgent action
- **MEDIUM**: Should be addressed but not urgent
- **LOW**: Optional improvements or deprecation notices

## Permissions

The `breakingChanges:list` scope is automatically granted to:
- **Global Owners**
- **Global Admins**
