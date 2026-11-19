# Skill Description Writing Guide

The `description` field in SKILL.md frontmatter is the single most important line for activation. Claude's runtime scans descriptions at startup to build a catalog. When a user's query arrives, the runtime matches against these descriptions to decide which skills to load. A weak description means zero activations or constant false positives.

---

## The Formula

**`[What it does] [When to use it] [Trigger keywords]. NOT for [Exclusions].`**

Every description should answer:
1. **What**: What does this skill do? (specific verb + domain noun)
2. **When**: In what situations should it activate?
3. **Keywords**: What words in a user's query should trigger it?
4. **NOT for**: What should explicitly NOT trigger it?

---

## Bad → Good Examples

### 1. Too Vague / Generic

**Bad**:
> "This skill helps with writing and improving content."

**Problems**: No task type, no audience, no trigger conditions, overlaps with every writing-related skill.

**Good**:
> "Drafts and revises long-form technical blog posts for software engineers, including structure, headings, and examples. Use when creating or improving an in-depth engineering blog post. NOT for short replies, casual notes, or marketing copy."

**Why it works**: Specific audience (software engineers), specific format (long-form blog posts), clear exclusions.

---

### 2. Overlapping with Other Skills

**Bad**:
> "This skill writes documents and summaries for business use."

**Problems**: Collides with marketing, ops, product, and general summarization skills. Which one should activate?

**Good**:
> "Creates and updates quarterly business review (QBR) slide decks for executives, using a standard section layout (executive summary, KPIs, highlights, risks, next steps). Use when preparing or revising a QBR or leadership performance review. NOT for internal status docs, detailed PRDs, or marketing materials."

**Why it works**: Specific deliverable (QBR decks), specific audience (executives), clear format, explicit exclusions.

---

### 3. Description is a Mini-Manual

**Bad**:
> "This skill helps you research and summarize complex topics. First it collects requirements, then it searches, then it writes an outline, then it drafts a report, then it revises based on feedback, and it always uses clear language and bullet points with citations and examples and..."

**Problems**: Too long, procedures belong in the SKILL.md body, risks truncation in the catalog scan. The runtime only reads the description for matching — process details don't help activation.

**Good**:
> "Performs structured research and writes 1-3 page synthesis reports on technical or business topics for non-expert readers. Use when requesting a researched overview or briefing document. NOT for quick factual questions, casual brainstorming, or academic papers."

**Why it works**: Concise, specifies output format (1-3 pages), names the audience, excludes adjacent tasks.

---

### 4. Missing "When Not to Use"

**Bad**:
> "This skill reviews code changes and suggests improvements."

**Problems**: Will activate for every coding request — writing new features, debugging, refactoring, reviewing PRs. Way too broad.

**Good**:
> "Reviews existing code changes (diffs, pull requests) in TypeScript and React projects, providing structured feedback on correctness, readability, performance, and tests. Use when sharing diffs or PRs for review. NOT for implementing new features from scratch, debugging runtime errors, or general coding advice."

**Why it works**: Specific input (diffs/PRs), specific tech stack (TypeScript/React), clear boundary (review vs. implementation).

---

### 5. Not Using User Language / Domain Keywords

**Bad**:
> "This skill manages agile processes for teams and helps with planning and coordination."

**Problems**: "Agile processes" is a category, not a trigger. No mention of the specific artifacts users actually ask about.

**Good**:
> "Plans and updates agile sprints in tools like Jira or Linear, including writing user stories, prioritizing the backlog, and drafting sprint goals. Use when planning a sprint, grooming a backlog, or turning product ideas into user stories. NOT for low-level coding tasks, architecture decisions, or retrospective facilitation."

**Why it works**: Names the tools (Jira, Linear), names the artifacts (user stories, backlog, sprint goals), uses verbs users would actually type.

---

### 6. Misaligned Name and Description

**Bad**:
```yaml
name: database-migration-skill
description: This skill writes marketing emails to customers.
```

**Problems**: Name says infrastructure, description says marketing. The runtime and human readers will both be confused.

**Good**:
```yaml
name: database-migration-skill
description: Plans and reviews database schema and data migrations, focusing on safety, rollout strategy, and rollback plans. Use when designing or validating a database migration. NOT for general application feature design or marketing content.
```

---

### 7. Overly Broad "Catch-All" Skills

**Bad**:
> "This skill helps the user with anything related to product management, including discovery, strategy, roadmapping, writing, and stakeholder communication."

**Problems**: Becomes a generic PM agent that competes with every other skill, easy to misfire, impossible to test activation precisely.

**Good** (narrowed to one deliverable):
> "Structures and writes product requirement documents (PRDs) for new or existing features, including problem statement, goals, user stories, and acceptance criteria. Use when drafting or refining a PRD. NOT for high-level strategy decks, user interview notes, or OKR planning."

**Why it works**: One specific deliverable (PRDs), clear trigger ("draft a PRD"), explicit boundaries.

---

## Activation Keyword Strategy

### Use Domain-Specific Terms

Include the exact words users type:
- ✅ "CLIP", "embeddings", "similarity search"
- ❌ "computer vision techniques" (too abstract)

### Include Verb + Noun Combinations

Users ask for actions on objects:
- ✅ "create skill", "improve skill", "debug activation"
- ❌ "skill-related activities"

### Add Common Synonyms

Users phrase things differently:
- ✅ "review code", "code review", "PR review", "diff review"
- ❌ Just "review" (too generic)

### Test with Anti-Queries

For every keyword that should trigger, think of a query with that word that should NOT trigger:
- "CLIP" → triggers: "Use CLIP for image search"
- "CLIP" → should NOT trigger: "Clip the audio at 30 seconds" (different meaning)

If anti-queries would false-positive, add them to the NOT clause.

---

## Description Length Guidelines

- **Minimum**: 15 words (enough for What + When + NOT)
- **Ideal**: 25-50 words
- **Maximum**: ~100 words (longer descriptions get truncated in catalog scans)
- **Process details**: Never in description. Put in SKILL.md body.
- **Examples**: Never in description. Put in SKILL.md body.

---

## Common Description Patterns by Skill Type

### Domain Expertise Skills
```
[Domain] expertise for [specific area]. Use when [trigger situations].
Activate on [keywords]. NOT for [adjacent domains].
```

### Tool/Script Skills
```
[Action verb] [objects] using [method/tool]. Use when [trigger situations].
NOT for [related but different tasks].
```

### Process/Workflow Skills
```
[Multi-step process name] for [deliverable]. Use when [trigger situations].
NOT for [simpler/different processes].
```

### Audit/Review Skills
```
Audits/reviews [what] for [quality criteria]. Use when [trigger situations].
NOT for [creating/implementing the thing being reviewed].
```

---

## Testing a Description

After writing a description, validate with this checklist:

```
□ Contains at least one specific verb (creates, reviews, plans, debugs)
□ Names a specific deliverable or domain (PRDs, TypeScript diffs, CLIP embeddings)
□ Includes keywords users would actually type in a query
□ Has a NOT clause with 2-5 explicit exclusions
□ Name and description are aligned (no contradictions)
□ Under 100 words (ideally 25-50)
□ No process/workflow details (those go in SKILL.md body)
□ Doesn't overlap with other skills in the same repo
```

---

## Rewriting Exercise

When improving an existing description, use this process:

1. **List 5 queries that should trigger** this skill
2. **List 5 queries that should NOT trigger** (but are in a similar domain)
3. **Extract keywords** from the "should trigger" list
4. **Extract exclusions** from the "should NOT trigger" list
5. **Write**: `[What from step 1 patterns] [When from step 1 patterns] [Keywords from step 3]. NOT for [Exclusions from step 4].`
6. **Test**: Re-read each of the 10 queries. Would the description correctly match/reject each one?
