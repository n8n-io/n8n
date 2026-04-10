---
description: >-
  Create new ESLint rules for the @n8n/eslint-plugin-community-nodes package.
  Use when adding a lint rule, creating a community node lint, or working on
  eslint-plugin-community-nodes. Guides rule implementation, tests, docs, and
  plugin registration.
---

# Create Community Node Lint Rule

Guide for adding new ESLint rules to `packages/@n8n/eslint-plugin-community-nodes/`.

All paths below are relative to `packages/@n8n/eslint-plugin-community-nodes/`.

## Step 1: Understand the Rule

Before writing code, clarify:
- **What** does the rule detect? (missing property, wrong pattern, bad value)
- **Where** does it apply? (`.node.ts` files, credential classes, both)
- **Severity**: `error` (must fix) or `warn` (should fix)?
- **Fixable?** Can it be auto-fixed safely, or only suggest?
- **Scope**: Both `recommended` configs, or exclude from `recommendedWithoutN8nCloudSupport`?

## Step 2: Implement the Rule

Create `src/rules/<rule-name>.ts`:

```typescript
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
  isNodeTypeClass,       // or isCredentialTypeClass
  findClassProperty,
  findObjectProperty,
  createRule,
} from '../utils/index.js';

export const YourRuleNameRule = createRule({
  name: 'rule-name',
  meta: {
    type: 'problem',  // or 'suggestion'
    docs: {
      description: 'One-line description of what the rule enforces',
    },
    messages: {
      messageId: 'Human-readable message. Use {{placeholder}} for dynamic data.',
    },
    fixable: 'code',     // omit if not auto-fixable
    hasSuggestions: true, // omit if no suggestions
    schema: [],           // add options schema if configurable
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!isNodeTypeClass(node)) return;

        const descriptionProperty = findClassProperty(node, 'description');
        if (!descriptionProperty) return;

        const descriptionValue = descriptionProperty.value;
        if (descriptionValue?.type !== AST_NODE_TYPES.ObjectExpression) return;

        // Rule logic here — use findObjectProperty(), getLiteralValue(), etc.

        context.report({
          node: targetNode,
          messageId: 'messageId',
          data: { /* template vars */ },
          fix(fixer) {
            return fixer.replaceText(targetNode, 'replacement');
          },
        });
      },
    };
  },
});
```

**Naming**: Export as `PascalCaseRule` (e.g. `MissingPairedItemRule`). The `name` field is kebab-case.

**Available AST helpers** — see [reference.md](reference.md) for the full catalog of `ast-utils` and `file-utils` exports.

## Step 3: Write Tests

Create `src/rules/<rule-name>.test.ts`:

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';

import { YourRuleNameRule } from './rule-name.js';

const ruleTester = new RuleTester();

// Helper to generate test code — keeps test cases readable
function createNodeCode(/* parameterize the varying parts */): string {
  return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Test Node',
    name: 'testNode',
    group: ['input'],
    version: 1,
    description: 'A test node',
    defaults: { name: 'Test Node' },
    inputs: [],
    outputs: [],
    properties: [],
  };
}`;
}

ruleTester.run('rule-name', YourRuleNameRule, {
  valid: [
    { name: 'class that does not implement INodeType', code: '...' },
    { name: 'node with correct pattern', code: createNodeCode(/* correct */) },
  ],
  invalid: [
    {
      name: 'descriptive case name',
      code: createNodeCode(/* incorrect */),
      errors: [{ messageId: 'messageId', data: { /* expected template vars */ } }],
      output: createNodeCode(/* expected after fix */),  // or `output: null` if no fix
    },
  ],
});
```

**Test guidelines:**
- Always test that non-INodeType classes are skipped (valid case)
- Test both the error message and the fixed output for fixable rules
- For rules with options, test each option combination
- For rules using filesystem, mock with `vi.mock('../utils/file-utils.js')`
- For suggestion-only rules, use `errors: [{ messageId, suggestions: [...] }]`

## Step 4: Register the Rule

### 4a. Add to `src/rules/index.ts`

```typescript
import { YourRuleNameRule } from './rule-name.js';

// Add to the rules object:
export const rules = {
  // ... existing rules
  'rule-name': YourRuleNameRule,
} satisfies Record<string, AnyRuleModule>;
```

### 4b. Add to `src/plugin.ts` configs

Add to **both** config objects (unless the rule depends on n8n cloud features):

```typescript
'@n8n/community-nodes/rule-name': 'error',  // or 'warn'
```

- Use `error` for rules that catch bugs or required patterns
- Use `warn` for style/convention rules (like `options-sorted-alphabetically`)
- If the rule uses `no-restricted-globals` or `no-restricted-imports` patterns,
  only add to `recommended` (not `recommendedWithoutN8nCloudSupport`)

## Step 5: Write Documentation

Create `docs/rules/<rule-name>.md`:

```markdown
# Description of what the rule does (`@n8n/community-nodes/rule-name`)

<!-- end auto-generated rule header -->

## Rule Details

Explain why this rule exists and what problem it prevents.

## Examples

### Incorrect

\`\`\`typescript
// code that triggers the rule
\`\`\`

### Correct

\`\`\`typescript
// code that passes the rule
\`\`\`
```

The header above `<!-- end auto-generated rule header -->` will be regenerated by `pnpm build:docs`. Write a reasonable first version — it gets overwritten.

## Step 6: Verify

Run from `packages/@n8n/eslint-plugin-community-nodes/`:

```bash
pushd packages/@n8n/eslint-plugin-community-nodes
pnpm test <rule-name>.test.ts   # tests pass
pnpm typecheck                   # types are clean
pnpm build                       # compiles
pnpm build:docs                  # regenerates doc headers and README table
pnpm lint:docs                   # docs match schema
popd
```

## Checklist

- [ ] Rule file: `src/rules/<rule-name>.ts`
- [ ] Test file: `src/rules/<rule-name>.test.ts`
- [ ] Registered in `src/rules/index.ts`
- [ ] Added to configs in `src/plugin.ts`
- [ ] Doc file: `docs/rules/<rule-name>.md`
- [ ] README table updated via `pnpm build:docs`
- [ ] All verification commands pass
