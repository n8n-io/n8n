# Changelog

All notable changes to the design-system-creator skill will be documented in this file.

## [2.0.0] - 2024-12-14

### Changed
- **BREAKING**: Restructured skill following progressive disclosure pattern
- Reduced SKILL.md from 359 lines to ~175 lines for faster loading
- Extracted detailed content to reference files

### Added
- `references/token-architecture.md` - Three-tier token system, dark mode, multi-brand
- `references/css-organization.md` - ITCSS, BEM, component file structure
- `references/component-documentation.md` - Component doc templates, quick reference cards

### Improved
- Clearer activation triggers and boundary definitions
- Expanded anti-patterns section (5 → 6 items)
- Better MCP integration documentation
- Streamlined working process description

## [1.1.0] - 2025-11-26

### Added
- Complete "When to Use This Skill" section with ✅/❌ checklists
- "When NOT to Use" with redirects to appropriate skills
- NOT clause in description for precise activation
- Activation keywords in description
- 5 common anti-patterns with detailed explanations:
  - Token Explosion
  - Missing Semantic Layer
  - Documentation Drift
  - Utility Class Overload
  - Breaking the Scale
- MCP Integrations section with:
  - Storybook MCP options (mcpland, freema, stefanoamorelli)
  - Figma MCP for design token sync
  - 21st.dev MCP guidance
- Integration with Other Skills section

### Changed
- Converted frontmatter from custom YAML format to standard allowed-tools format
- Expanded from 270 lines to 359 lines
- Improved description with clear activation triggers and exclusions

### Removed
- Custom frontmatter fields (triggers, integrates_with, outputs, official_mcps) - moved to documentation sections

## [1.0.0] - 2024-12-01

### Added
- Initial skill creation
- Design system architecture guidance
- CSS mastery section
- Design token systems
- Design Bible structure template
- CSS organization patterns
- Working process workflow
- Output deliverables list
- Best practices sections
- Example button component documentation
