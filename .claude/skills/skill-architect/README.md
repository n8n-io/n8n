# Skill Architect

The authoritative meta-skill for creating, auditing, and improving Agent Skills.

## What It Does

Skill Architect is a meta-skill that teaches Claude how to build other skills well. It combines:
- **Systematic workflow** (6-step creation process)
- **Domain expertise encoding** (shibboleths, anti-patterns, temporal knowledge)
- **Progressive disclosure architecture** (three-layer loading with lazy references)
- **Subagent-aware design** (skills that work well when consumed by subagents)

## Quick Start

**Creating a new skill**:
1. Gather 3-5 concrete example queries (what should/shouldn't trigger)
2. Plan reusable contents (scripts, references, assets)
3. Initialize: `scripts/init_skill.py <skill-name>`
4. Write scripts first, references next, SKILL.md last
5. Validate: `scripts/validate_skill.py <path>`
6. Iterate based on real-world use

**Improving an existing skill**:
1. Tighten description: `[What] [When] [Keywords]. NOT for [Exclusions]`
2. Check line count (&lt;500 lines in SKILL.md)
3. Add anti-patterns with shibboleth template
4. Remove phantom references (files that don't exist)
5. Test activation with 5 should-trigger + 5 shouldn't-trigger queries

## Key Concepts

### Progressive Disclosure (Three Layers)

| Layer | Content | When Loaded |
|-------|---------|-------------|
| 1. Metadata | `name` + `description` | Always (catalog scan) |
| 2. SKILL.md | Core process, decision trees | On skill activation |
| 3. References | Deep dives, examples, specs | On-demand, per-file, lazy |

Reference files are NOT auto-loaded. The agent reads them only when relevant to the current step.

### Description Formula

`[What it does] [When to use] [Trigger keywords]. NOT for [Exclusions].`

The description is the single most important line for activation. See `references/description-guide.md` for 7 bad→good examples.

### Frontmatter Fields

Required: `name`, `description`

Optional: `allowed-tools`, `argument-hint`, `license`, `disable-model-invocation`, `user-invocable`, `context`, `metadata`

### Visual Artifacts

Skills should render processes, decision trees, architectures, and temporal knowledge as **Mermaid diagrams** instead of prose. Mermaid is text-based, version-controllable, and renders natively in GitHub, Docusaurus, and Claude's output.

16+ diagram types are available: flowchart, sequence, state, ER, timeline, mindmap, quadrant, gantt, gitgraph, class, user journey, sankey, XY chart, block, architecture, kanban, pie.

See `references/visual-artifacts.md` for the full catalog with examples and YAML configuration.

### Subagent-Aware Design

Skills consumed by subagents should have:
- Explicit "When to Use / NOT" sections
- Numbered steps (not prose)
- Output contracts (JSON schema or markdown template)
- QA/validation checklists

See `references/subagent-design.md` for full patterns.

### Shibboleths

Expert knowledge that separates novices from experts:
- Framework evolution (React: Classes → Hooks → Server Components)
- Model limitations (CLIP can't count objects)
- Tool architecture (Script → MCP graduation path)
- Temporal traps (advice correct in 2023, harmful in 2025)

## Structure

```
skill-architect/
├── SKILL.md                          # Core instructions (<500 lines)
├── CHANGELOG.md                      # Version history
├── README.md                         # This file
└── references/
    ├── description-guide.md          # How to write effective descriptions
    ├── visual-artifacts.md           # Mermaid diagram catalog & configuration
    ├── antipatterns.md               # Shibboleths and case studies
    ├── self-contained-tools.md       # Scripts, MCP, subagent patterns
    ├── subagent-design.md            # Designing skills for subagent consumption
    ├── mcp-template.md               # Minimal MCP server starter
    └── subagent-template.md          # Agent definition format
```

## Anti-Patterns (Summary)

| # | Anti-Pattern | Fix |
|---|-------------|-----|
| 1 | Documentation Dump | Decision trees in SKILL.md, depth in references |
| 2 | Missing NOT clause | Always include exclusions in description |
| 3 | Phantom Tools | Only reference files that exist and work |
| 4 | Template Soup | Ship working code or nothing |
| 5 | Overly Permissive Tools | Least privilege, scoped Bash |
| 6 | Stale Temporal Knowledge | Date all advice, update quarterly |
| 7 | Catch-All Skill | Split by expertise type |
| 8 | Vague Description | Use the description formula |
| 9 | Eager Loading | Lazy-load references, never "read all first" |
| 10 | Prose-Only Processes | Use Mermaid for decision trees, workflows, architectures |

## Success Metrics

| Metric | Target |
|--------|--------|
| Correct activation | &gt;90% |
| False positive rate | &lt;5% |
| Token usage | &lt;5k |
| Time to productive | &lt;5 min |

## Version History

- **v2.1.0** (2026-02-05) — Visual artifacts: Mermaid diagram guide, 16+ diagram types, YAML config, anti-pattern #10
- **v2.0.0** (2026-02-05) — Major rewrite: description guide, subagent design, frontmatter fields, lazy loading, trimmed to 350 lines
- **v1.0.0** (2026-01-14) — Initial unified meta-skill combining skill-coach + skill-creator

## Replaces

This skill unifies and replaces:
- **skill-coach** — Expertise encoding
- **skill-creator** — Systematic workflow
