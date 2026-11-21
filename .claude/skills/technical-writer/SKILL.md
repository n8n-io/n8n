---
name: technical-writer
description: 'Expert technical documentation specialist for developer docs, API references, and runbooks. Activate on: documentation, docs, README, API reference, technical writing, user guide, runbook,
  ADR, changelog, release notes, tutorial, how-to guide. NOT for: marketing copy (use copywriting skills), blog posts (use content skills), code comments (handled by developers).'
allowed-tools: Read,Write,Edit,Bash(npm run docs:*,mkdocs:*,docusaurus:*)
metadata:
  category: Content & Writing
  pairs-with:
  - skill: diagramming-expert
    reason: Visual documentation
  - skill: seo-visibility-expert
    reason: SEO for technical docs
  tags:
  - documentation
  - readme
  - api-docs
  - tutorials
  - runbooks
---

# Technical Writer

Expert technical documentation specialist focusing on developer documentation, API references, system architecture docs, runbooks, and knowledge base articles.

## Quick Start

1. **Identify doc type** using Diátaxis: Tutorial, How-to, Explanation, or Reference
2. **Know your audience** - what they know, what they need to accomplish
3. **Start with structure** - outline before writing, use templates
4. **Include working examples** - all code must be tested and runnable
5. **Add troubleshooting** - anticipate common problems
6. **Validate completeness** - links work, steps accurate, nothing assumed

## Core Capabilities

| Doc Type | Purpose | Key Characteristics |
|----------|---------|---------------------|
| **Tutorials** | Learning-oriented | Hands-on, step-by-step introduction |
| **How-to Guides** | Task-oriented | Solve specific problems |
| **Explanations** | Understanding-oriented | Background, context, concepts |
| **References** | Information-oriented | Accurate, complete, searchable |

## Diátaxis Framework

```
              PRACTICAL                    THEORETICAL
        ┌──────────────────────┬──────────────────────┐
LEARNING│     TUTORIALS        │    EXPLANATIONS      │
        │  "Learning by doing" │  "Understanding why" │
        ├──────────────────────┼──────────────────────┤
WORKING │    HOW-TO GUIDES     │     REFERENCE        │
        │  "Solve problems"    │  "Look up facts"     │
        └──────────────────────┴──────────────────────┘
```

## Reference Templates

Complete templates in `./references/`:

| Template | Use Case |
|----------|----------|
| `readme-template.md` | Project README with all essential sections |
| `adr-template.md` | Architecture Decision Records |
| `api-reference-template.md` | REST API documentation |
| `runbook-template.md` | Operational procedures |

## Anti-Patterns (10 Critical Mistakes)

### 1. Wall of Text
**Symptom**: Dense paragraphs, no headings or visual breaks
**Fix**: Headings, bullet points, tables, code blocks, whitespace

### 2. Outdated Examples
**Symptom**: Code samples that don't compile or use deprecated APIs
**Fix**: Test all examples in CI, version-lock dependencies, add "last verified" dates

### 3. Missing Prerequisites
**Symptom**: Tutorials assume knowledge/setup without stating it
**Fix**: List prerequisites upfront, link to setup guides, specify versions

### 4. Expert Blindness
**Symptom**: Skipping "obvious" steps that aren't obvious to beginners
**Fix**: Have newcomers test docs, include all steps, explain the "why"

### 5. No Error Guidance
**Symptom**: Happy path only, no troubleshooting
**Fix**: Include common errors and solutions, link to support channels

### 6. Broken Links
**Symptom**: 404s to moved or deleted pages
**Fix**: Link checking in CI, relative links where possible, redirects for moved content

### 7. Inconsistent Formatting
**Symptom**: Different styles, code block languages, heading levels
**Fix**: Style guide, linting (markdownlint), templates for common doc types

### 8. Missing Context
**Symptom**: Docs assume reader knows system architecture
**Fix**: Brief context at top, link to architecture docs, explain "where this fits"

### 9. Stale Screenshots
**Symptom**: UI screenshots from 3 versions ago
**Fix**: Automate screenshot capture, note UI version, prefer text over images

### 10. No Versioning
**Symptom**: Docs don't match user's installed version
**Fix**: Version selector, version badges, maintain docs per major version

## Quality Checklist

**Structure:**
- [ ] Follows Diátaxis framework (tutorial/how-to/explanation/reference)
- [ ] Appropriate for target audience level
- [ ] Consistent formatting and style
- [ ] Updated table of contents

**Content:**
- [ ] Code examples are tested and runnable
- [ ] All links work (no 404s)
- [ ] Version information where relevant
- [ ] Includes troubleshooting section

**Completeness:**
- [ ] Prerequisites listed upfront
- [ ] All steps included (no expert blindness)
- [ ] Error scenarios covered
- [ ] Related documentation linked

## Validation Script

Run `./scripts/validate-docs.sh` to check:
- README completeness
- Documentation structure
- ADR format compliance
- Broken links
- Common documentation issues

## Documentation Tools

**Static Sites**: Docusaurus, MkDocs, VitePress, Astro
**API Docs**: Swagger/Redoc, Stoplight, ReadMe.io
**Diagrams**: Mermaid, PlantUML, Excalidraw, Diagrams.net

## External Resources

- [Diátaxis Framework](https://diataxis.fr/)
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Write the Docs](https://www.writethedocs.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [ADR GitHub](https://adr.github.io/)
