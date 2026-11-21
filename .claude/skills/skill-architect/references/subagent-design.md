# Designing Skills for Subagent Consumption

This guide covers how to design skills that subagents can load and use effectively. A Claude subagent that "loads up" skills well is: (1) a very focused role, (2) with a curated skill set pre-injected, and (3) a clear internal workflow for applying those skills to the user's task.

---

## High-Level Architecture

Think of one subagent as **"a specialist with a toolkit"**:

| Component | Purpose | Example |
|-----------|---------|---------|
| **Role/system prompt** | Defines domain and responsibilities | "You are a refactoring engineer for TypeScript monorepos" |
| **Attached skills** | Small, explicit set encoding methods/checklists/templates | `refactor-plan-skill`, `code-review-skill` |
| **Tool and memory policy** | What tools it may use, whether it keeps long-term memory | Code tools + tests, project memory |
| **Communication protocol** | How it receives tasks and reports back | Summary + artifacts + open questions |

The orchestrator hands the subagent a concrete sub-goal plus relevant context. The subagent's job is to solve it *using its skills as standard operating procedures* rather than improvising a new process each time.

---

## Three Skill-Loading Layers

### Layer 1: Preloaded (Always in Context)

For core behaviors, inject the full content of 2-5 key skills directly into the subagent's system context. These are always "present" — the subagent doesn't need to discover them mid-run.

**When to preload**:
- The skill defines the subagent's primary workflow
- The skill is needed for &gt;80% of tasks the subagent handles
- The skill is small enough (&lt;5k tokens) to keep in context

### Layer 2: Dynamically Selected (Catalog-Based)

If you have many skills, don't load all of them. Instead, give the subagent:
- A **short catalog** (name + 1-line description for each skill)
- Instructions: "Before starting, scan the skill catalog and choose 1-3 skills whose purpose matches this task. If none match, fall back to generic reasoning."

The orchestrator can also pre-filter and only pass a relevant subset of skills along with the task.

### Layer 3: Execution-Time (Protocol-Based)

The subagent treats each selected skill like a mini-protocol:
1. Read the skill's "When to use / When not to use" section → confirm applicability
2. Follow its numbered steps in order (adapt only if task constraints force it)
3. Respect its output contract (templates, JSON shapes, required headings)
4. Apply its QA/validation section last (run checklist over own output)

**Make this explicit in the prompt**: "When using a skill, reference its steps by number and confirm you've completed each one before returning your result."

---

## Subagent Prompt Structure

Inside the subagent's prompt, maintain this stable four-section structure:

### 1. Identity and Purpose

```
You are the **[role]** for this system. You handle [narrow domain of tasks].
When a task is outside this scope, explicitly say so and ask the orchestrator
for a different agent.
```

Keep the role narrow. "Refactoring engineer for TypeScript monorepos" is better than "code helper."

### 2. Skill Usage Meta-Rules

```
You have access to the following skills, which define your methods:
  - Skill A: for doing X
  - Skill B: for doing Y
  - Skill C: for doing Z

When tackling a task, you must:
  - Decide which skill(s) apply
  - Follow their step-by-step workflow
  - Use their output formats and checklists
```

This tells the subagent that skills are **standard operating procedures**, not optional hints.

### 3. Task-Handling Loop

```
For each task you receive:
  1) Restate the task in your own words
  2) Select one or more skills that fit. If none fit well, say so.
  3) If needed, ask 2-5 clarifying questions
  4) Produce an internal plan (short, not user-visible unless asked)
  5) Execute the skill workflow step by step
  6) Run any validation / QA steps from the skill
  7) Return:
     (a) final answer/artifacts
     (b) what skills you used
     (c) assumptions and remaining risks
```

### 4. Constraints and Priorities

```
Quality bar: [e.g., "never knowingly leave tests failing"]
Safety rules: [e.g., "never execute destructive operations without confirmation"]
Tie-breaking: [e.g., "if speed vs robustness conflict, pick robustness"]
```

---

## Orchestrator + Subagent Interaction Patterns

### Single-Specialist Pattern

Orchestrator identifies that the request maps to one domain and routes entirely to that subagent:

```
User: "Refactor this module"
  → Orchestrator routes to Refactorer subagent
  → Refactorer uses refactor-plan-skill + code-review-skill
  → Returns refactored code + review summary
```

### Chain Pattern

Sequential handoff between specialized subagents:

```
Design API → Implement → Test

  1. API-Designer subagent (design skills) → API spec
  2. Implementer subagent (coding skills) → working code
  3. QA subagent (testing skills) → test results + coverage
```

Each receives the prior subagent's artifacts and uses its own skills to transform them.

### Parallel Pattern

Independent subagents work concurrently:

```
parallel:
  - Auth subagent → auth implementation
  - Billing subagent → billing implementation
  - UI subagent → frontend components

then:
  - Orchestrator merges outputs, resolves conflicts
```

---

## Designing Skills That Subagents Consume Well

### 1. Explicit "When to Use" / "When Not to Use"

Subagents need clear applicability signals. A skill without these forces the subagent to guess:

```markdown
## When to Use
✅ Existing code needs restructuring for maintainability
✅ Module has grown beyond 500 lines
✅ Tests exist and pass (safe to refactor)

## When NOT to Use
❌ Greenfield development (nothing to refactor)
❌ No test coverage (too risky without safety net)
❌ Performance optimization (different skill)
```

### 2. Numbered Steps (Not Prose)

Subagents follow steps better than paragraphs. Steps are referenceable: "Completed step 3 of refactor-plan-skill."

```markdown
## Process
1. Read the target module and identify code smells
2. Categorize smells by type (duplication, coupling, complexity)
3. Propose a refactor plan with before/after signatures
4. Execute changes in atomic commits
5. Run test suite after each commit
6. Self-review the diff using code-review-skill
```

### 3. Output Contracts

Define what the skill produces so downstream agents or the orchestrator can consume it:

```markdown
## Output Format
Return a JSON object:
{
  "status": "pass" | "warn" | "fail",
  "changes": ["list of files changed"],
  "tests_passing": true | false,
  "risks": ["list of remaining risks"],
  "summary": "1-2 sentence description of what changed"
}
```

### 4. QA/Validation Section

Every skill should end with a self-check:

```markdown
## Validation
Before returning results, verify:
□ All tests still pass
□ No TODO comments left behind
□ Changes match the original plan
□ No unrelated files were modified
```

### 5. Minimal Context Assumptions

Don't assume the subagent knows your project structure. Include paths, conventions, and setup steps in the skill itself or its references.

---

## Concrete Example: Refactorer Subagent

### Config

```yaml
name: refactorer
description: "Use for non-trivial refactors or large cleanups in TypeScript."
tools: [Read, Write, Edit, Bash(npm:test, git:*)]
skills:
  - refactor-plan-skill
  - code-review-skill
  - safe-refactor-skill
memory: project
```

### Prompt Body

```
You are the **Refactorer** subagent for this repo. You:
- Design safe refactors
- Implement them in small, atomic steps
- Keep tests passing at every step

You have the following skills and must rely on them as your standard process:
- `refactor-plan-skill`: analyze current code and design a stepwise refactor plan
- `code-review-skill`: review diffs for correctness, style, and risk
- `safe-refactor-skill`: apply changes incrementally, validate after each change

For every task:
1) Restate the requested refactor
2) If unclear, ask 2-3 clarifying questions
3) Use `refactor-plan-skill` to propose a stepwise plan
4) Execute the plan, running tests after each logical chunk
5) Use `code-review-skill` to self-review your changes
6) Summarize: what changed, what skills you used, remaining risks
```

---

## Context Loading Best Practices

### Keep References Separate

- Put only high-level process and triggers in SKILL.md
- Move bulky content (API specs, FAQs, examples, style guides) to `references/` files
- Reference by path and purpose: "see `references/api-guide.md` for full endpoints"

### Teach Lazy Loading

In the subagent's system prompt, make reference loading explicit:

```
When you need detailed information, read the specific reference file.
Never read large reference files "just in case." Only open them when
directly relevant to the current step of your plan.
If a file looks huge, skim the headings first and jump to the relevant section.
```

### Scope Narrowly

Progressive loading works best when each subagent:
- Has a narrow responsibility (not "do all marketing" but "draft landing pages")
- Points to its own small set of reference files
- Only loads focused subsets, keeping context lean

### Use Summarized Intermediates

Have the subagent produce short internal summaries from large references ("key API constraints," "brand voice bullets") and work from those. Only re-open the original reference if something seems missing.

### Avoid Eager Meta-Prompts

Never: "Read all reference files before you start."
Instead: "Read only the minimal set of files required to answer the current question accurately."

---

## Input/Output Contracts for Multi-Agent Pipelines

Define what each subagent expects and produces so agents can be composed:

### Input Contract

```markdown
## Expected Input
- `files`: List of file paths to analyze
- `focus`: One of "security" | "performance" | "readability"
- `prior_findings`: (optional) Output from a previous agent
```

### Output Contract

```markdown
## Output Format
{
  "status": "pass" | "warn" | "fail",
  "findings": [
    {
      "severity": "high" | "medium" | "low",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of finding",
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
```

### Handoff Protocol

Each agent in a pipeline should produce structured output that the next agent can consume without transformation. Standardize on:
- `status` field for pass/fail signaling
- `findings` array for detailed results
- `summary` object for quick assessment
- `metadata` object for timing, agent name, skills used

---

## Anti-Patterns in Subagent Skill Design

### 1. Skill Without Output Contract

**Problem**: Subagent produces free-form text that downstream agents can't parse.
**Fix**: Define explicit output format (JSON schema, markdown template with required sections).

### 2. Skill That Assumes Context

**Problem**: Skill says "check the config file" without specifying which one or where.
**Fix**: Include paths, conventions, and any setup requirements.

### 3. Overly Broad Skill for Subagent

**Problem**: Subagent has a 50-skill catalog and spends half its context selecting.
**Fix**: Orchestrator pre-filters to 2-5 relevant skills before dispatching.

### 4. No Applicability Check

**Problem**: Subagent blindly follows a skill even when it doesn't fit.
**Fix**: Every skill needs "When to Use / When NOT to Use" so the subagent can check before committing.

### 5. Eager Reference Loading

**Problem**: Subagent loads all reference files "just in case" and blows context.
**Fix**: Teach lazy loading in the subagent prompt; reference files loaded per-step, not upfront.
