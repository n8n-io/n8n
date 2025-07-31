# Architecture Documentation Guidelines

This document defines the principles and standards for maintaining technical architecture documentation in the n8n project. These guidelines are used by both human developers and automated documentation tools.

## Core Principles

### 1. Code as Source of Truth
- **Always start with code analysis** - Documentation must reflect the actual implementation
- **Verify against source** - All technical details must be verified against the actual code
- **Prioritize code over other sources** - When information conflicts, the code is the authoritative source

### 2. Developer-Focused Documentation
- **Target audience**: Engineers working on the n8n codebase
- **Purpose**: Enable developers to quickly understand how systems work and why decisions were made
- **Practical focus**: Include examples, code snippets, and clear explanations of usage patterns

## Documentation Standards

### Structure and Organization
- **Location**: All architecture documentation goes in the `docs/architecture/` directory
- **Format**: Markdown files with clear structure and navigation
- **Naming**: Use descriptive, lowercase filenames with hyphens (e.g., `execution-modes.md`)

### Content Requirements
1. **Clear headings** - Use hierarchical structure for easy navigation
2. **Code examples** - Include relevant code snippets with file paths
3. **Diagrams** - Use Mermaid diagrams to visualize complex relationships
4. **Cross-references** - Link to related documentation and code locations

### Quality Guidelines
- **Accuracy over completeness** - Better to document less with high accuracy than more with assumptions
- **Concise and focused** - Keep documentation brief and relevant to developer needs
- **Up-to-date** - Documentation must reflect the current state of the codebase
- **No speculation** - Never guess or make assumptions about implementation details

## Information Gathering Methodology

### Primary Sources (in order of priority)
1. **Source code** - Direct code analysis is the primary method
2. **Type definitions** - Interfaces and types provide architectural contracts
3. **Tests** - Test files reveal intended behavior and edge cases

### Secondary Sources
- **Git history** - For understanding evolution and rationale
- **Pull requests** - For implementation context and discussions
- **Linear tickets** - For feature requirements and design decisions
- **Existing documentation** - Must be verified against current code

## Documentation Patterns

### Feature Documentation
```markdown
# Feature Name

## Overview
Brief description of what the feature does and why it exists.

## Architecture
How the feature is implemented, including key components and their interactions.

## Code Organization
- `path/to/main/implementation.ts` - Core implementation
- `path/to/types.ts` - Type definitions
- `path/to/tests/` - Test files

## Usage
Examples of how the feature is used in the codebase.

## Technical Details
Specific implementation details developers need to know.
```

### System Architecture Documentation
```markdown
# System/Subsystem Name

## Purpose
What this system does and why it's needed.

## Components
Key components and their responsibilities.

## Data Flow
How data moves through the system (include Mermaid diagrams).

## Dependencies
What this system depends on and what depends on it.

## Configuration
Relevant configuration options and their effects.
```

## Mermaid Diagram Guidelines

### Use diagrams for:
- System architecture overviews
- Data flow visualization
- Process sequences
- Component relationships

### Diagram best practices:
- Keep diagrams simple and focused
- Use consistent naming with the code
- Include only essential details
- Add explanatory text when needed

## Maintenance Guidelines

### When to Update Documentation
- **New features** - Document architecture and design decisions
- **Significant refactoring** - Update affected documentation
- **Breaking changes** - Clearly document migration paths
- **Bug fixes that reveal design issues** - Update to reflect correct understanding

### Review Checklist
- [ ] Code references are accurate and include file paths
- [ ] Technical details are verified against source code
- [ ] Diagrams accurately represent the implementation
- [ ] Examples work with the current codebase
- [ ] No outdated information remains
- [ ] Cross-references are valid

## Automated Documentation

When using automated tools (CI/CD, AI agents) to maintain documentation:

1. **Always verify generated content** against the source code
2. **Maintain consistent style** with existing documentation
3. **Flag uncertainties** for human review
4. **Focus on changes** - Update only what has actually changed
5. **Preserve valuable context** - Don't remove important historical information

## Anti-Patterns to Avoid

- **Speculative documentation** - Don't document planned features or assumptions
- **Redundant documentation** - Don't repeat what the code clearly expresses
- **Outdated examples** - Remove or update examples that no longer work
- **Over-documentation** - Not every implementation detail needs documentation
- **Jargon without context** - Define domain-specific terms

## File and Code References

When referencing code:
- Use relative paths from the repository root
- Include line numbers for specific implementations: `path/to/file.ts:42-45`
- Quote relevant code snippets inline when helpful
- Link to type definitions and interfaces

Example:
```
The workflow execution is handled by `WorkflowExecute` class in `/packages/core/src/workflow-execute.ts:50-200`
```