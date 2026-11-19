# Changelog

All notable changes to the color-theory-palette-harmony-expert skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-26

### Changed
- **BREAKING**: Refactored from single 1716-line file to modular structure
- Reduced SKILL.md from 1716 lines to 258 lines (85% reduction)
- Moved detailed implementations to `/references/` directory
- Updated frontmatter from custom YAML to standard `allowed-tools` format
- Simplified description with proper NOT clause and activation keywords

### Added
- **When to Use This Skill** section with clear scope boundaries
- **Do NOT use for** section with skill alternatives
- **MCP Integrations** section (Firecrawl, Stability AI)
- Created `/references/perceptual-color-spaces.md`:
  - CIELAB (LAB) and CIE LCH color space explanations
  - CIEDE2000 metric (2001, refined 2025)
  - Conversion chain and implementation notes
  - Edge case handling (grayscale, single-color, extreme lightness)
  - Python library recommendations
- Created `/references/optimal-transport.md`:
  - Earth-Mover Distance (Wasserstein) mathematical formulation
  - Sinkhorn algorithm with full Python implementation
  - ε parameter tuning guide
  - Multiscale Sliced Wasserstein Distance (ECCV 2024)
  - Adaptive epsilon strategy
  - Approximate EMD for large palettes
- Created `/references/temperature-classification.md`:
  - LCH hue angle approach with hue ranges
  - LAB b-axis approach (more robust)
  - Hue-sorted photo sequences with circular mean
  - Hue rotation optimization
  - Warm/cool alternation pattern
  - Temperature wave pattern (sinusoidal)
- Created `/references/arrangement-patterns.md`:
  - Neutral-with-splash-of-color pattern
  - Chroma classification (neutral/moderate/vivid)
  - Multi-factor palette compatibility scoring
  - Hue harmony analysis (complementary, analogous, triadic)
  - Global color grading methods (histogram matching, affine transform)
  - Complete collage assembly example
- Created `/references/diversity-algorithms.md`:
  - Maximal Marginal Relevance (MMR) with λ tuning guide
  - Determinantal Point Processes (DPPs)
  - Submodular maximization
  - Comparison table (complexity, control, use case)
- Created `/references/implementation-guide.md`:
  - Python dependencies with purpose
  - Performance targets table
  - Metal shader examples (cost matrix, Sinkhorn iterations)
  - Caching patterns
  - Progressive color matching
  - Hierarchical palette matching
  - Dynamic palette evolution
  - Color mood transfer
  - Color constancy correction
  - Troubleshooting guide

### Removed
- Custom YAML frontmatter format (tools, triggers, integrates_with, python_dependencies)
- 1458+ lines of detailed implementations (moved to references)
- Inline version info (moved to CHANGELOG)

### Improved
- Progressive disclosure: essential concepts in SKILL.md, full code in references
- Quick reference tables for algorithms and parameters
- Cross-references to related skills (collage-layout-expert, design-system-creator, vaporwave-glassomorphic-ui-designer, photo-composition-critic)

## [1.0.0] - 2024-XX-XX

### Added
- Initial color-theory-palette-harmony-expert skill
- Perceptual color space documentation (LAB, LCH)
- CIEDE2000 color difference metric
- Earth-Mover Distance (Wasserstein) for palette matching
- Sinkhorn algorithm implementation
- Multiscale Sliced Wasserstein Distance (MS-SWD)
- Warm/cool temperature classification
- Hue-sorted photo sequences
- Warm/cool alternation patterns
- Neutral-with-accent arrangements
- Diversity algorithms (MMR, DPP, submodular)
- Palette compatibility scoring
- Global color grading techniques
- Metal shader examples
- Python dependencies and performance targets
- Complete collage assembly example
- Integration guidance for Compositional Collider project
