# Changelog

## [2.0.0] - 2024-01-XX

### Changed
- **BREAKING**: Restructured from monolithic 602-line file to progressive disclosure architecture
- Fixed frontmatter format: `tools:` → `allowed-tools:` (comma-separated)
- Added NOT clause to description for precise activation boundaries
- Reduced SKILL.md from 602 lines to 150 lines (75% reduction)

### Added
- `references/agent-templates.md` - Technical Expert, Creative/Design, Orchestrator templates
- `references/mcp-integration.md` - MCP server template, official packages, creation steps
- `references/creation-process.md` - Rapid prototyping workflow, quality checklist
- Anti-patterns section with "What it looks like / Why wrong / Instead" format
- Quick reference table for agent templates
- 45-minute rapid prototyping workflow

### Removed
- Verbose template descriptions (moved to references)
- Inline MCP server code (moved to references)
- Redundant design philosophy sections

### Migration Guide
Reference files are now in `/references/` directory. Import patterns:
- Agent templates → `references/agent-templates.md`
- MCP server code → `references/mcp-integration.md`
- Creation workflow → `references/creation-process.md`
