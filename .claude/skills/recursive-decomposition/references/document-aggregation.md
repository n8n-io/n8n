# Example: features across many PRDs

Tool calls below use Claude Code names (`Glob`, `Grep`, `Task`); map them to your agent's file search, content search and sub-agent tools.

Walkthrough of the protocol on a made-up docs tree. File counts and feature counts are the scenario, not a paper result.

## Task

"What features are planned across all our PRD documents? Build one roadmap."

## 1. Find the documents

```text
Glob("**/PRD*.md")         → 12 files
Glob("**/prd-*.md")        → 5 files
Glob("docs/product/*.md")  → 8 files
dedupe: 18 unique files
```

Size them before reading. Here that is about 85k tokens, so decompose.

## 2. Group, then drop dead weight

A header scan, not a full read:

```text
Q1           4 docs  ~20k tokens
Q2           5 docs  ~25k tokens
Q3           4 docs  ~18k tokens
technical    3 docs  ~12k tokens
archived     2 docs  exclude
```

Sixteen active documents, about 75k tokens.

## 3. Extraction schema

Every sub-agent fills the same shape:

```text
{
  "document": "filename",
  "product_area": "string",
  "features": [
    {
      "name": "string",
      "description": "string",
      "priority": "P0|P1|P2",
      "status": "planned|in-progress|shipped",
      "target_quarter": "Q1|Q2|Q3|Q4"
    }
  ],
  "dependencies": ["feature_name"],
  "stakeholders": ["team_name"]
}
```

Without a schema the merge is a pile of prose.

## 4. One agent per group

```text
Agent 1 (Q1 PRDs):
Task(subagent_type="Explore", prompt="""
Read each PRD in docs/product/q1/:
- PRD-auth-improvements.md
- PRD-dashboard-v2.md
- PRD-mobile-notifications.md
- PRD-api-versioning.md

Extract features using this schema: [schema]
Return structured JSON for each document.
""")

Agent 2: Q2 documents, same schema
Agent 3: Q3 documents, same schema
Agent 4: technical PRDs, same schema
```

Name the files in the brief. "The Q1 folder" is not a brief.

## 5. Dedupe

```text
Q1 12 features
Q2 15
Q3 11
technical 8
raw total 46

"Dark mode" in three PRDs → one row
"API v2" in two PRDs → one row
after dedupe: 38
```

## 6. Dependencies

```text
Dashboard v2 → API v2
Mobile notifications → Auth improvements
Reporting → Dashboard v2, Data pipeline
```

A directed graph is enough. Do not invent a critical path the files do not state.

## 7. Roadmap from the merge

```text
# Feature roadmap (16 PRDs)

## Q1
P0 Auth improvements (PRD-auth-improvements.md)
   OAuth2, SSO. In progress.
P0 API versioning (PRD-api-versioning.md)
   v2, deprecation timeline. Planned.
P1 Dashboard v2 (PRD-dashboard-v2.md)
   depends on API v2.

## Q2
...
```

## 8. Spot-check three rows

```text
PRD-auth-improvements.md
  OAuth2 listed as P0
  Q1 target

PRD-dashboard-v2.md
  depends on API v2
  four sub-features extracted

API v2 → Dashboard v2 still holds in both files
```

Three is the skill default. If a row fails, re-read that document and rebuild that slice of the merge.

## Output shape

```markdown
# Feature roadmap

16 PRDs, 38 features, 12 cross-document dependencies.

| Feature | Priority | Quarter | Status | Dependencies |
|---------|----------|---------|--------|--------------|
| Auth improvements | P0 | Q1 | In progress | |
| API v2 | P0 | Q1 | Planned | |
| Dashboard v2 | P1 | Q1 | Planned | API v2 |
| Mobile notifications | P1 | Q2 | Planned | Auth |

Unresolved dependencies: 3
Conflicting timelines: 2
Missing stakeholder: 1
```

| | |
|-|-|
| Documents | 16 |
| Features after dedupe | 38 |
| Sub-agents | 4, in parallel |
| Tokens | ~75k, spread across the four |
| Verification reads | 3 |
