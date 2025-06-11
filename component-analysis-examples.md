# Component Dependency Analysis Tools

This repository contains two powerful tools for analyzing Vue component dependencies in the n8n frontend codebase.

## 🔍 Tool 1: Component Dependency Analyzer (`analyze-component-dependencies.js`)

Analyzes Vue component dependencies from views → components (forward analysis).

### Key Features:
- **Vue component focus** - only analyzes Vue components (local and design system)
- **Recursive analysis** of component dependencies (depth 5 by default)
- **Enhanced design system tracking** - detects both explicit imports and template usage
- **Template scanning** - finds design system components used without imports (PascalCase and hyphenated)
- **Categorized output** showing local vs design system dependencies
- **Multiple output formats** (tree, JSON, CSV)

### Usage Examples:

```bash
# Basic Vue component dependency analysis (depth 5)
node analyze-component-dependencies.js

# Deep recursive analysis with increased depth
node analyze-component-dependencies.js --depth=10 --verbose

# Export to JSON for further processing
node analyze-component-dependencies.js --format=json --output=dependencies.json

# CSV table for spreadsheet analysis
node analyze-component-dependencies.js --format=table --output=dependencies.csv

# Verbose output to see detailed import processing
node analyze-component-dependencies.js --verbose
```

## 🔄 Tool 2: Reverse Component Lookup (`reverse-component-lookup.js`)

Analyzes where each Vue component is used throughout the codebase (reverse analysis).

### Key Features:
- **Complete reverse index** of Vue component usage
- **Filter by component type** (local, design-system)
- **Pattern matching** for finding specific components
- **Usage frequency analysis**
- **Impact assessment** for component changes
- **Vue component focus** - filters out non-component imports automatically
- **Template scanning** - detects design system components used without explicit imports
- **Dual format support** - finds both PascalCase (`<N8nButton>`) and hyphenated (`<n8n-button>`) usage

### Usage Examples:

```bash
# Show all Vue components and where they're used
node reverse-component-lookup.js

# Focus on design system components used 3+ times
node reverse-component-lookup.js --type=design --min-usage=3

# Find all Modal-related components
node reverse-component-lookup.js --filter="Modal"

# Show only heavily used local components
node reverse-component-lookup.js --type=local --min-usage=10

# Find all N8n design system components
node reverse-component-lookup.js  --type=design

# Export high-usage components to CSV
node reverse-component-lookup.js --min-usage=5 --format=table --output=high-usage.csv

# Find specific component usage patterns
node reverse-component-lookup.js --filter="Button|Input|Select" --min-usage=2

# Show all design system components
node reverse-component-lookup.js --type=design
```

## 📊 Key Insights from Analysis

### Most Used Design System Components:
1. **N8nText** - 29 usages across views and components
2. **N8nButton** - 18 usages in forms and actions
3. **N8nTooltip** - 17 usages for help text
4. **N8nIcon** - 16 usages for visual indicators

### Most Critical Local Components:
1. **Modal.vue** - Used by 22 different modal components
2. **NodeIcon.vue** - Used by 14 components for node visualization
3. **KeyboardShortcutTooltip.vue** - Used by 8 components
4. **ParameterInputFull.vue** - Used by 6 form components

### Design System Dependencies:
- **Design System Components**: Comprehensive tracking of @n8n/design-system usage
- **Import Patterns**: Supports destructured imports `{ N8nButton, N8nText }`, default imports, and .vue file imports
- **Template Usage**: Detects components used in templates without explicit imports (both PascalCase and hyphenated)
- **Filtered Analysis**: Non-component imports (stores, composables, utilities) are automatically excluded

## 🎯 Use Cases

### For Component Refactoring:
```bash
# Check impact before changing Modal.vue
node reverse-component-lookup.js --filter="Modal"

# See all components using N8nButton
node reverse-component-lookup.js --filter="N8nButton"
```

### For Design System Analysis:
```bash
# All design system components with usage
node reverse-component-lookup.js --type=design

# Most used design system components
node reverse-component-lookup.js --type=design --min-usage=5
```

### For Architecture Analysis:
```bash
# Deep Vue component dependency analysis
node analyze-component-dependencies.js --depth=10 --verbose

# Export full component analysis for documentation
node analyze-component-dependencies.js --format=json --output=full-analysis.json
```

### For Component Cleanup:
```bash
# Find rarely used local components (potential cleanup candidates)
node reverse-component-lookup.js --type=local --min-usage=1

# Export component usage data for cleanup analysis
node reverse-component-lookup.js --type=local --format=table --output=local-components.csv
```

## 📈 Tool Comparison

| Feature | Dependency Analyzer | Reverse Lookup |
|---------|-------------------|----------------|
| **Direction** | Views → Components | Components → Usage |
| **Best For** | Understanding deps | Impact analysis |
| **Use Case** | "What does X use?" | "What uses X?" |
| **Focus** | ✅ Vue components only | ✅ Vue components only |
| **Design System** | ✅ Enhanced tracking | ✅ Enhanced tracking |
| **Filtering** | By depth/verbose | By pattern/usage/type |

## 🚀 Advanced Examples

### Find All Button Components:
```bash
node reverse-component-lookup.js --filter=".*Button.*" --type=all
```

### Design System Migration Analysis:
```bash
# Current design system usage
node reverse-component-lookup.js --type=design --format=json --output=current-ds.json

# Local components that could be replaced with design system
node reverse-component-lookup.js --type=local --filter="Button|Input|Select|Modal" --min-usage=3
```

### Component Impact Assessment:
```bash
# Before changing a component, check its impact
node reverse-component-lookup.js --filter="ComponentName" --verbose
```

Both tools provide comprehensive Vue component analysis capabilities for understanding and maintaining the n8n component architecture. They focus exclusively on Vue components (local and design system), automatically filtering out non-component imports like stores, composables, and utilities.

## ✨ Enhanced Template Scanning

Both tools now include advanced template scanning that detects design system components used without explicit imports:

- **PascalCase detection**: `<N8nButton>`, `<N8nText>`, `<N8nIcon>`
- **Hyphenated detection**: `<n8n-button>`, `<n8n-text>`, `<n8n-icon>`
- **Smart deduplication**: Avoids counting components that are both imported and used in templates
- **Comprehensive coverage**: Includes 40+ common n8n design system components

This enhancement provides a complete picture of design system usage across the codebase, including globally registered components that don't require explicit imports.
