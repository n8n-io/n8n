# Subagent Definition Template

Template for defining specialized subagents for complex workflows. A subagent is "a specialist with a toolkit" — a focused role with curated skills pre-injected and a clear internal workflow for applying those skills.

## Single Agent Definition

The prompt has four required sections: Identity, Skill Usage Rules, Task-Handling Loop, and Constraints.

```markdown
# agents/agent-name.md

## Agent: [Agent Name]

### Purpose
[What this agent does in 1-2 sentences]

### Identity (Section 1)
You are the **[role]** for this system. You handle [narrow domain of tasks].
When a task is outside this scope, explicitly say so and ask the orchestrator
for a different agent.

### Skill Usage Rules (Section 2)
You have access to the following skills, which define your methods:
- Skill A: for doing X
- Skill B: for doing Y
- Skill C: for doing Z

When tackling a task, you must:
- Decide which skill(s) apply
- Follow their step-by-step workflow
- Use their output formats and checklists

### Task-Handling Loop (Section 3)
For each task you receive:
1. Restate the task in your own words
2. Select one or more skills that fit. If none fit well, say so.
3. If needed, ask 2-5 clarifying questions
4. Produce an internal plan (short, not user-visible unless asked)
5. Execute the skill workflow step by step
6. Run any validation / QA steps from the skill
7. Return:
   (a) final answer/artifacts
   (b) what skills you used
   (c) assumptions and remaining risks

### Constraints and Priorities (Section 4)
- Quality bar: [e.g., "never knowingly leave tests failing"]
- Safety: [e.g., "no destructive operations without confirmation"]
- Tie-breaking: [e.g., "if speed vs robustness conflict, pick robustness"]

### Tools Required
- [Tool 1]
- [Tool 2]
- [Tool 3]

### Success Criteria
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

### Output Format
[Expected output structure — define a JSON schema or markdown template
so downstream agents/orchestrator can consume it]

### Example
**Input**: [Example input]
**Skills Selected**: [Which skills and why]
**Process**: [How it's processed, referencing skill steps by number]
**Output**: [Expected output matching the Output Format]
```

## Subagent YAML Config (Skill-Aware)

```yaml
name: refactorer
description: "Use for non-trivial refactors or large cleanups."
model: inherit  # or specific model name
tools:
  - Read
  - Write
  - Edit
  - Bash(npm:test, git:*)
skills:
  - refactor-plan-skill    # How to analyze code and design a refactor plan
  - code-review-skill       # How to review diffs for correctness and risk
  - safe-refactor-skill     # How to apply changes incrementally and validate
memory: project
```

The `skills` field lists the skills preloaded into the subagent's context. Keep to 2-5 core skills; use dynamic selection for larger catalogs.

---

## Multi-Agent Orchestration Pattern

```markdown
# agents/orchestrator.md

## Pipeline: [Pipeline Name]

### Agents

1. **agent-1** - [Brief description]
   - Tools: [Tool list]
   - Input: [What it receives]
   - Output: [What it produces]

2. **agent-2** - [Brief description]
   - Tools: [Tool list]
   - Input: [What it receives]
   - Output: [What it produces]

3. **agent-3** - [Brief description]
   - Tools: [Tool list]
   - Input: [What it receives]
   - Output: [What it produces]

### Orchestration Flow

\`\`\`
parallel:
  - agent-1 → output_1
  - agent-2 → output_2

sequential:
  - agent-3(output_1, output_2) → final_result
\`\`\`

### Handoff Protocol

Each agent produces structured output:
- `status`: [Status values]
- `data`: [Data structure]
- `metadata`: [Metadata structure]

### Error Handling

If any agent fails:
1. [Retry strategy]
2. [Fallback approach]
3. [User notification]

### Example Execution

**Input**: [Example input]

**Agent 1 Output**:
\`\`\`json
{
  "status": "success",
  "data": {...}
}
\`\`\`

**Agent 2 Output**:
\`\`\`json
{
  "status": "success",
  "data": {...}
}
\`\`\`

**Final Result**:
\`\`\`json
{
  "status": "success",
  "findings": [...],
  "recommendations": [...]
}
\`\`\`
```

## Real-World Example: Code Review Pipeline

```markdown
# agents/code-review-pipeline.md

## Pipeline: Code Review

### Purpose
Automated code review with security, style, and architecture analysis.

### Agents

1. **security-scanner**
   - Purpose: Check for vulnerabilities
   - Tools: Read, Grep, Bash(semgrep:*)
   - Output: Security report with severity ratings

2. **style-checker**
   - Purpose: Verify code style compliance
   - Tools: Read, Bash(eslint:*, prettier:*)
   - Output: Style violations with fix suggestions

3. **architecture-reviewer**
   - Purpose: Assess design patterns and maintainability
   - Tools: Read, Grep, Glob
   - Output: Architecture recommendations

### Orchestration Flow

\`\`\`
parallel:
  - security-scanner → security_report
  - style-checker → style_report

then:
  - architecture-reviewer(security_report, style_report) → final_review
\`\`\`

### Handoff Protocol

Each agent produces:
\`\`\`json
{
  "status": "pass" | "warn" | "fail",
  "findings": [
    {
      "severity": "high" | "medium" | "low",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of issue",
      "recommendation": "How to fix"
    }
  ],
  "summary": {
    "total_issues": 5,
    "high": 1,
    "medium": 2,
    "low": 2
  }
}
\`\`\`

### Success Criteria
- All high-severity issues resolved
- No security vulnerabilities
- Code style compliance &gt;95%
- Architecture review approves design

### Example Execution

**Input**: Pull request with 5 changed files

**Security Scanner Output**:
\`\`\`json
{
  "status": "warn",
  "findings": [
    {
      "severity": "medium",
      "file": "src/auth.ts",
      "line": 23,
      "message": "Hardcoded secret detected",
      "recommendation": "Use environment variable"
    }
  ],
  "summary": {"total_issues": 1, "medium": 1}
}
\`\`\`

**Style Checker Output**:
\`\`\`json
{
  "status": "pass",
  "findings": [],
  "summary": {"total_issues": 0}
}
\`\`\`

**Architecture Reviewer Output**:
\`\`\`json
{
  "status": "pass",
  "findings": [
    {
      "severity": "low",
      "file": "src/auth.ts",
      "message": "Consider extracting validation to separate module",
      "recommendation": "Create src/validators/auth.ts"
    }
  ],
  "summary": {"total_issues": 1, "low": 1}
}
\`\`\`

**Final Review**: "APPROVED with recommendations - Fix hardcoded secret before merge"
```

## Research Workflow Example

```markdown
# agents/research-workflow.md

## Agent: Research Coordinator

### Purpose
Orchestrate multi-source research with synthesis and fact-checking.

### System Prompt
You are a research coordinator. Your job is to:
1. Break down research questions into searchable queries
2. Dispatch searches to appropriate sources (web, docs, code)
3. Cross-reference findings for accuracy
4. Synthesize coherent answers with citations

Always cite sources. Flag contradictory information.

### Tools Required
- WebSearch
- WebFetch
- Read
- Grep
- Write

### Workflow
1. Receive research question from user
2. Generate 3-5 targeted search queries
3. Execute searches in parallel
4. Read and extract relevant content
5. Cross-check facts across sources
6. Synthesize findings into coherent answer
7. Add citations for all claims

### Success Criteria
- All claims have citations
- Multiple sources corroborate key findings
- Contradictions are explicitly noted
- Answer is comprehensive but concise

### Output Format
\`\`\`markdown
# [Question]

## Summary
[2-3 sentence answer]

## Detailed Findings

### [Topic 1]
[Explanation with citations]

Sources:
- [Source 1 with link]
- [Source 2 with link]

### [Topic 2]
[Explanation with citations]

Sources:
- [Source 3 with link]

## Contradictory Information
[If any sources disagree, explain the discrepancy]

## Confidence Assessment
[High/Medium/Low] - [Reasoning]
\`\`\`

### Example
**Input**: "How do React Server Components affect bundle size?"

**Process**:
1. Generate queries: "React Server Components bundle size", "RSC vs Client Components", "Next.js App Router performance"
2. Search web + official docs
3. Extract findings from 5+ sources
4. Cross-reference performance claims
5. Note any contradictions

**Output**:
\`\`\`markdown
# How React Server Components Affect Bundle Size

## Summary
React Server Components reduce client-side bundle size by 20-40% on average by rendering components on the server and sending only HTML to the client. Dynamic interactivity requires selective use of Client Components.

## Detailed Findings

### Bundle Size Reduction
Server Components don't include their code in the client bundle. A typical conversion reduces bundle by 30% (Vercel case study, Next.js docs).

Sources:
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Vercel Case Study: 33% Reduction](https://vercel.com/blog/rsc-performance)

### Trade-offs
Client Components still require client-side JavaScript. Overuse of 'use client' negates benefits.

Sources:
- [React RFC: Server Components](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)

## Confidence Assessment
High - Multiple authoritative sources (React team, Next.js team, real-world case studies) corroborate findings.
\`\`\`
```

## Agent Communication Patterns

### Request-Response

```typescript
// Parent to Agent
{
  "task": "analyze_code",
  "input": {
    "files": ["src/auth.ts", "src/users.ts"],
    "focus": "security"
  }
}

// Agent to Parent
{
  "status": "complete",
  "results": {...},
  "metadata": {"duration_ms": 2500}
}
```

### Streaming Updates

```typescript
// Agent sends incremental updates
{
  "type": "progress",
  "step": "analyzing_file",
  "file": "src/auth.ts",
  "progress": 0.5
}

{
  "type": "finding",
  "severity": "high",
  "message": "SQL injection risk"
}

{
  "type": "complete",
  "summary": {...}
}
```

## Best Practices

1. **Clear Responsibilities**: Each agent should have a single, well-defined purpose
2. **Structured Output**: Use consistent JSON schemas for agent communication
3. **Error Handling**: Define fallback strategies for agent failures
4. **Parallelization**: Run independent agents concurrently
5. **Handoff Protocol**: Standardize how agents pass data
6. **Success Criteria**: Define measurable completion conditions
7. **Documentation**: Keep agent definitions up to date
