---
name: n8n:ui-review
description: >
  Design review to ensure coherent interfaces. Use when reviewing code that contains .vue|scss|css changes. Triggers when given a PR to review or when user asks for code review. Returns ranked report.
---

## UI Review

This skill runs a cross-discipline UI review. It ranks changes against a set of references.

## Scoring

- **0-25**: Likely false positive
- **26-49**: Minor nitpick not explicitly against rules
- **50-79**: Low confidence or low impact issue
- **80-89**: Issue that breaks rules
- **90-100**: Clear rules violation

## Workflow

1. **Get scope**: Focus on UI changes only. Narrow to `.vue|scss|css` files. If requested, fix to commit point (`git diff <fixed-point>...HEAD`).
2. **References**: Load each reference `*.md` from `/references` (relative to this skill) to establish the source of truth. From each take the rules and common fixes.
3. **Review**: Review the code using the references above.
4. **Report**: Collect findings, rating each issue from 0-100 using the scoring system.

## Output

Finally, output a report for each high-confidence issue. Include:

- Clear description and confidence score
- File path and line number
- Concrete fix suggestion

**Only report issues with confidence ≥ 80**

Group issues by severity (Critical: 90-100, Important: 80-89).
