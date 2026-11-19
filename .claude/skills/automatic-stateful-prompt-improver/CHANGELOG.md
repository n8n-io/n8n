# Changelog

## [2.0.0] - 2024-12-XX

### Changed
- **SKILL.md restructured** for progressive disclosure (481 → ~128 lines)
- **Frontmatter fixed**: `tools:` YAML list → `allowed-tools:` comma-separated

### Added
- `references/optimization-techniques.md` - APE, OPRO, Chain-of-Thought, DSPy patterns
- `references/learning-architecture.md` - Warm start, embedding indexing, performance tracking
- `references/iteration-strategy.md` - Decision matrices, convergence criteria
- Clear convergence thresholds (≥0.85 success rate, ≤10% improvement)
- Detailed iteration budget management

### Migration Guide
- **Breaking**: If you use this skill via configuration, update frontmatter format
- Old: `tools:\n  - tool1\n  - tool2`
- New: `allowed-tools: tool1,tool2,tool3`
- Reference files provide implementation details on demand
