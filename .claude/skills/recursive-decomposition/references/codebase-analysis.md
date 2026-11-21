# Example: error handling across a codebase

Tool calls below use Claude Code names (`Glob`, `Grep`, `Task`); map them to your agent's file search, content search and sub-agent tools.

Walkthrough of the protocol on a made-up tree. File counts are the scenario, not a paper result.

## Task

"Analyze all error handling patterns in this codebase and report where they agree, where they diverge, and what to change."

## 1. Filter

```text
Glob("**/*.ts")  → 450 files
Glob("**/*.tsx") → 120 files
total: 570 files

Grep("catch|throw|Error|exception", type="ts") → 89 files
Grep("try.*catch|\.catch\\(", type="ts")       → 67 files
union: 102 files with error handling
```

Do not read the 570. Grep first.

## 2. Partition

```text
src/api/*        23 files  batch A
src/services/*   31 files  batch B
src/components/* 28 files  batch C
src/utils/*      12 files  batch D
other             8 files  batch E
```

Five to ten files per batch is the skill default. These batches are larger; keep them only if each still fits a sub-agent window, or split again.

## 3. One sub-agent per batch

```text
Task(subagent_type="Explore", prompt="""
Analyze error handling in src/api/*.
For each file with error handling:
1. Identify error handling patterns used
2. Note any error types defined or caught
3. Check for consistent error propagation
4. Flag any unhandled promise rejections
Return structured findings.
""")
```

Launch A through E in parallel. Each brief must include the files, the question, and the output schema. Do not reuse the same query on overlapping files.

## 4. Merge

```text
A: HTTP errors, custom ApiError
B: service-level try/catch, logging
C: UI error boundaries, toasts
D: wrappers, validation errors
E: mixed, a few strays
```

## 5. Write the report from the merge

```text
API:     ApiError, HttpError, ValidationError
service: ServiceError, DatabaseError
UI:      error boundaries, user-facing messages
utils:   generic wrappers

HTTP errors always carry a status code
DatabaseError drops the original error
add error codes the client can switch on
```

## 6. Spot-check

Re-read a handful of cited lines, not the 102 files:

```text
Is ApiError used throughout src/api/?
Does DatabaseError keep the stack?
Do error boundaries cover every route component?
```

If two batches disagree, re-read the conflict.

## Report shape

```markdown
# Error handling

102 files, four error families, three consistency bugs.

## Types
### API (src/api/)
- ApiError: HTTP errors
- ValidationError: bad requests
- AuthenticationError: auth failures

### Service (src/services/)
...

## What already agrees
1. API routes wrap handlers in try/catch
2. Errors include a request ID

## What does not
1. Some services swallow errors with no log
2. Database errors lose the original stack

## Changes
1. Error-code enum
2. Error boundary on the remaining routes
```

| | |
|-|-|
| Files after grep | 102 |
| Sub-agents | 5 |
| Tokens | spread across the five, not one 150k window |
