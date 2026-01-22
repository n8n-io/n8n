# Fix All Remaining Codegen Roundtrip Tests

## Goal

Unskip ALL 62 remaining workflows in the skip list by fixing the codegen/parser to handle their patterns correctly.

## Constraints

- **Do NOT change the SDK interface** - only fix internal codegen/parser logic
- **Commit after each batch of fixes** - commit when you fix a pattern that enables multiple workflows
- **Follow TDD** - write failing test first, then fix
- **No regressions** - all 44 unit tests and 229 roundtrip tests must continue passing

## Current State

- Location: `/Users/mutasem/repos/n8n-worktree/code-workflow-builder/packages/@n8n/workflow-sdk`
- 229 roundtrip tests passing
- 62 workflows in skip list
- 44 unit tests passing

## Files

- `src/codegen.ts` - Generates TypeScript from workflow JSON
- `src/parse-workflow-code.ts` - Parses code back to JSON
- `src/__tests__/codegen.test.ts` - Unit tests
- `src/__tests__/codegen-roundtrip.test.ts` - Roundtrip tests (skip list at top)

## Skip List Analysis

### By Pattern (62 total)

```
Cycle (simple):           10 → 4295, 4366, 4600, 5523, 5734, 5751, 6535, 9605, 10420, 10889
Cycle+IF:                  7 → 4685, 5258, 5435, 7701, 10174, 11466, 12325
Cycle+IF+Merge+Wait:       6 → 3121, 4767, 11617, 11724, 12462, 12645
Cycle+Merge:               6 → 3790, 4637, 5453, 7154, 11366, 5841
Cycle+IF+Merge:            4 → 3066, 4868, 5979, 10427
Cycle+Merge+SplitInBatches: 4 → 5045, 7946, 10196, 10729
Cycle+IF+Merge+SplitInBatches: 3 → 4557, 7945, 10132
Cycle+Switch:              3 → 4827, 5611, 6542
Cycle+SplitInBatches:      3 → 5449, 5842, 6150
Other combinations:       16 → rest
```

### Simplest Failures (1 missing node each)

| ID | Nodes | Pattern | Missing Node |
|----|-------|---------|--------------|
| 4295 | 6 | Cycle | Start |
| 4366 | 38 | Cycle | Classify Emails |
| 4600 | 50 | Cycle | When clicking 'Execute workflow' |
| 2878 | 85 | Complex | Append Blocks |
| 4868 | 29 | Cycle+IF+Merge | On new file in Google Drive |

### Parse Error

- **5789**: Code generates but fails to parse (syntax error)

## Workflow

### For each pattern group:

1. **Analyze** - Pick simplest workflow, run debug command to see what's missing
2. **Test** - Write minimal failing test in `codegen.test.ts`
3. **Fix** - Update `codegen.ts` to handle the pattern
4. **Verify** - Run unit tests, run roundtrip tests
5. **Unskip** - Comment out fixed workflows from skip list with reason
6. **Commit** - `git add -A && git commit -m "fix: handle [pattern] in codegen"`

### Debug Commands

```bash
# See generated code and what's missing
npx ts-node -T << 'SCRIPT'
const { generateWorkflowCode } = require('./src/codegen');
const { parseWorkflowCode } = require('./src/parse-workflow-code');
const fs = require('fs');
const id = '4295';  // CHANGE THIS
const json = JSON.parse(fs.readFileSync('test-fixtures/real-workflows/' + id + '.json'));
const code = generateWorkflowCode(json);
console.log(code);
console.log('\n=== MISSING ===');
const parsed = parseWorkflowCode(code);
const orig = Object.keys(json.connections).sort();
const got = Object.keys(parsed.connections).sort();
console.log('Missing:', orig.filter(k => !got.includes(k)));
SCRIPT

# Run tests
pnpm jest src/__tests__/codegen.test.ts
pnpm jest src/__tests__/codegen-roundtrip.test.ts

# Test specific workflow
pnpm jest src/__tests__/codegen-roundtrip.test.ts -t "4295"
```

## Attack Order

1. **Simple Cycle** (10 workflows) - Start with 4295 (6 nodes)
2. **Cycle+Merge** (6 workflows) - Common pattern
3. **Cycle+IF** (7 workflows)
4. **Cycle+IF+Merge** (4 workflows)
5. **Cycle+SplitInBatches patterns** (10 workflows)
6. **Cycle+Switch** (3 workflows)
7. **Complex combinations** (16 workflows)
8. **Parse error** (5789)

## Key Code Locations

- Cycle detection: `codegen.ts` ~line 280
- Cycle vars: `codegen.ts` ~line 356
- Chain with cycles: `codegen.ts` ~line 1985
- IF branches: `codegen.ts` ~line 2125
- Switch cases: `codegen.ts` ~line 2302
- Merge handling: `codegen.ts` ~line 1809

## Commit Message Format

```
fix: handle [pattern description] in codegen

- [what was wrong]
- [what was fixed]
- Unskipped: [workflow IDs]
```

## Done When

- Skip list in `codegen-roundtrip.test.ts` is empty (all commented out)
- All roundtrip tests pass
- All unit tests pass

<promise>ALL TESTS UNSKIPPED</promise>
