# Versioning

## Overview
Nodes have versions, defined in the `version` property:
- If the node has only one version -> `version: 1`
- If the node supports **light versioning** -> `version: [1, 1.1, 1.2]`
  etc.

Use versioning when you make **breaking changes** that should not alter
the behavior of existing workflows.

## Checking version in code
```typescript
async execute(this: IExecuteFunctions) {
    const version = this.getNode().typeVersion;
    if (version >= 1.1) {
        // v1.1+ behavior
    } else {
        // v1 behavior
    }
}
```

## Full versioning
For more complex changes, nodes can extend `VersionedNodeType`, where
each "full" version is a separate implementation. This is called **full
versioning** and is **only supported for programmatic-style nodes**:
```typescript
// If.node.ts
export class If extends VersionedNodeType {
  constructor() {
    const baseDescription: INodeTypeBaseDescription = {
      displayName: 'If',
      name: 'if',
      icon: 'fa:map-signs',
      iconColor: 'green',
      group: ['transform'],
      description: 'Route items to different branches (true/false)',
      defaultVersion: 2.3,
    };

    const nodeVersions: IVersionedNodeType['nodeVersions'] = {
      1: new IfV1(baseDescription),
      2: new IfV2(baseDescription),
      2.1: new IfV2(baseDescription),
      2.2: new IfV2(baseDescription),
      2.3: new IfV2(baseDescription),
    };

    super(nodeVersions, baseDescription);
  }
}

// IfV1.node.ts
export class IfV1 implements INodeType {
  description: INodeTypeDescription;

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      version: 1,
      defaults: {
        name: 'If',
        color: '#408000',
      },
      inputs: [NodeConnectionTypes.Main],
      outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
      outputNames: ['true', 'false'],
      properties: [
        // ...
      ],
    };
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // ...
  }
}
```

## Important rules
- **Declarative-style nodes do not support full versioning**, only light
  versioning
- Do **not** introduce full versioning unless:
  - The node already uses it, or
  - You are explicitly asked to add a new full version, or
  - You're doing a complete **rewrite** of the node from scratch and it
    has different resources/operations compared to last version
- **Do NOT** introduce full versioning when writing the very first
  version of the node
