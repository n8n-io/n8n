# Changelog: skill-architect

## v2.1.1 (2026-02-05)

### Clarifications

**Agent parseability** — Clarified that Mermaid works for both agents AND humans. Agents read Mermaid as a text-based graph DSL with explicit edge semantics (`A -->|Yes| B`); they don't need rendered pictures. Added "Can Agents Actually Interpret Mermaid?" section to `references/visual-artifacts.md` explaining why formal graph notation is actually more precise for agents than equivalent prose.

**YAML frontmatter is optional** — Demoted YAML frontmatter from "here's how to configure" to "this is purely for rendering customization; agents ignore it; skip it unless publishing polished docs." Updated both SKILL.md and `references/visual-artifacts.md`.

**Raw vs. quoted Mermaid** — Added guidance: use raw ` ```mermaid ` blocks in SKILL.md (operative content the agent interprets). Only use outer ` ````markdown ` fences in docs *about* Mermaid (illustrative examples). Added SKILL.md's own 6-step process as a raw Mermaid flowchart — eating our own cooking.

---

## v2.1.0 (2026-02-05)

### Visual Artifacts

**New section in SKILL.md**: "Visual Artifacts: Mermaid Diagrams & Code" — encourages skills to render decision trees, workflows, architectures, timelines, and data models as Mermaid diagrams. Includes quick-reference table mapping content types to diagram types.

**New reference**: `references/visual-artifacts.md` — comprehensive guide to all 16+ Mermaid diagram types with:
- "Can Agents Interpret Mermaid?" section (yes — it's a text DSL with explicit graph structure)
- Raw vs. quoted Mermaid guidance
- Full YAML frontmatter configuration (optional — for rendering only)
- Concrete examples for every diagram type: flowchart, sequence, state, ER, gantt, mindmap, timeline, pie, quadrant, gitgraph, class, user journey, sankey, XY chart, block, architecture, kanban
- Node shapes, edge styles, and features for each diagram type
- Decision matrix: which diagram type for which skill content
- Best practices for Mermaid in progressive-disclosure skills

**Anti-pattern #10**: "Prose-Only Processes" — if a skill describes a decision tree or workflow in paragraph form when it could be a Mermaid diagram, that's an improvement opportunity.

**Updated validation checklist**: Now includes "Decision trees/workflows use Mermaid diagrams, not prose."

**Updated Step 4**: Skill creation now explicitly calls out visual artifacts and Mermaid as part of the writing process.

---

## v2.0.0 (2026-02-05)

### Major Improvements

**SKILL.md rewrite** — Reduced from 637 lines to 350 lines (was violating its own &lt;500 line rule). Restructured for clarity and actionability.

**Description Formula** — Expanded with concrete bad→good examples covering 7 common failure modes: too vague, overlapping, mini-manual, missing exclusions, wrong keywords, name mismatch, catch-all. Full guide moved to `references/description-guide.md`.

**Frontmatter Documentation** — Added newly documented optional fields: `argument-hint`, `disable-model-invocation`, `user-invocable`, `context` (fork), and `metadata`. Previous version was incomplete about what's valid.

**Subagent-Aware Skill Design** — New section covering how to design skills that subagents consume effectively: three loading layers (preloaded, dynamic, execution-time), subagent prompt structure (identity, skill rules, task loop, constraints), and orchestrator patterns (single-specialist, chain, parallel).

**Progressive Disclosure** — Enhanced with specific lazy-loading rules: reference files are NOT auto-loaded, teach agents to load on-demand per-step, never instruct "read all files first."

**Anti-Pattern #9** — Added "Eager Loading" to the anti-pattern catalog.

### New Reference Files

- `references/description-guide.md` — Comprehensive guide to writing skill descriptions with bad→good examples, keyword strategy, length guidelines, and testing checklist
- `references/subagent-design.md` — Full guide to designing skills for subagent consumption, including three loading layers, subagent prompt structure, orchestrator patterns, input/output contracts, and lazy-loading best practices

### Updated Reference Files

- `references/subagent-template.md` — Added four-section prompt structure (Identity, Skill Usage Rules, Task-Handling Loop, Constraints), YAML config with skill references, and skill-aware example patterns

### Removed (Deduplicated)

- Case studies removed from SKILL.md (were already duplicated in `references/antipatterns.md`)
- Verbose code examples moved to reference files where they belong
- Redundant script example removed (already in `references/self-contained-tools.md`)

### Philosophy Update

From "progressive disclosure machines" to "progressive disclosure machines with lazy-loaded references" — emphasizing that reference files are only loaded when the agent decides they're relevant to the current step, not eagerly.

---

## v1.0.0 (2026-01-14)

### Created
- **Unified meta-skill** combining skill-coach and skill-creator
- Merged systematic workflow from skill-creator
- Merged domain expertise encoding from skill-coach
- Consolidated best practices from both skills

### Features
- 6-step skill creation process
- Shibboleth encoding (expert knowledge patterns)
- Anti-pattern catalog with case studies
- Self-contained tool implementation (scripts, MCP, subagents)
- Progressive disclosure design principles
- Activation debugging workflows
- Comprehensive validation checklists

### References Added
- `antipatterns.md` - Shibboleths and anti-pattern catalog
- `self-contained-tools.md` - Scripts, MCP, and subagent patterns
- `mcp-template.md` - Minimal MCP server starter
- `subagent-template.md` - Agent definition format

### Philosophy
"Great skills are progressive disclosure machines that encode real domain expertise, not just surface instructions."

### Replaces
- skill-coach (v2.x) - Expertise encoding focus
- skill-creator (v1.x) - Systematic workflow focus

### Migration
Users of skill-coach or skill-creator should switch to skill-architect for the unified experience.
