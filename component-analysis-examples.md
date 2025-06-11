# Component Dependency Analysis Tools

This repository contains two powerful tools for analyzing component dependencies in the n8n frontend codebase.

## 🔍 Tool 1: Component Dependency Analyzer (`analyze-component-dependencies.js`)

Analyzes component dependencies from views → components (forward analysis).

### Key Features:
- **Recursive analysis** of component dependencies
- **External library tracking** (design system, n8n packages, third-party)
- **Categorized output** showing local vs external dependencies
- **Multiple output formats** (tree, JSON, CSV)

### Usage Examples:

```bash
# Basic analysis with enhanced external dependency tracking
node analyze-component-dependencies.js

# Focus on design system usage
node analyze-component-dependencies.js --type=design-system

# Deep recursive analysis
node analyze-component-dependencies.js --depth=10 --verbose

# Export to JSON for further processing
node analyze-component-dependencies.js --format=json --output=dependencies.json

# CSV table for spreadsheet analysis
node analyze-component-dependencies.js --format=table --output=dependencies.csv
```

## 🔄 Tool 2: Reverse Component Lookup (`reverse-component-lookup.js`)

Analyzes where each component is used throughout the codebase (reverse analysis).

### Key Features:
- **Complete reverse index** of component usage
- **Filter by component type** (local, design-system, n8n-package, external)
- **Pattern matching** for finding specific components
- **Usage frequency analysis**
- **Impact assessment** for component changes

### Usage Examples:

```bash
# Show all components and where they're used
node reverse-component-lookup.js

# Focus on design system components used 3+ times
node reverse-component-lookup.js --type=design-system --min-usage=3

# Find all Modal-related components
node reverse-component-lookup.js --filter="Modal"

# Show only heavily used local components
node reverse-component-lookup.js --type=local --min-usage=10

# Find all N8n design system components
node reverse-component-lookup.js --filter="N8n.*" --type=design-system

# Export high-usage components to CSV
node reverse-component-lookup.js --min-usage=5 --format=table --output=high-usage.csv

# Find specific component usage patterns
node reverse-component-lookup.js --filter="Button|Input|Select" --min-usage=2
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

### External Dependencies:
- **Total External Libraries**: 60 tracked
- **Design System**: Heavy usage of @n8n/design-system
- **Vue Ecosystem**: Vue 3, Vue Router, Pinia stores
- **Utilities**: Lodash for data manipulation

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
node reverse-component-lookup.js --type=design-system

# Most used design system components
node reverse-component-lookup.js --type=design-system --min-usage=5
```

### For Architecture Analysis:
```bash
# Deep dependency analysis
node analyze-component-dependencies.js --depth=10 --verbose

# Export full analysis for documentation
node analyze-component-dependencies.js --format=json --output=full-analysis.json
```

### For Component Cleanup:
```bash
# Find rarely used components (potential cleanup candidates)
node reverse-component-lookup.js --type=local --min-usage=1 --max-usage=2

# Components used only once
node reverse-component-lookup.js --type=local --min-usage=1 --format=table
```

## 📈 Tool Comparison

| Feature | Dependency Analyzer | Reverse Lookup |
|---------|-------------------|----------------|
| **Direction** | Views → Components | Components → Usage |
| **Best For** | Understanding deps | Impact analysis |
| **Use Case** | "What does X use?" | "What uses X?" |
| **External Deps** | ✅ Tracks all | ✅ Tracks all |
| **Filtering** | By depth/type | By pattern/usage |

## 🚀 Advanced Examples

### Find All Button Components:
```bash
node reverse-component-lookup.js --filter=".*Button.*" --type=all
```

### Design System Migration Analysis:
```bash
# Current design system usage
node reverse-component-lookup.js --type=design-system --format=json --output=current-ds.json

# Local components that could be replaced
node reverse-component-lookup.js --type=local --filter="Button|Input|Select|Modal" --min-usage=3
```

### Component Impact Assessment:
```bash
# Before changing a component, check its impact
node reverse-component-lookup.js --filter="ComponentName" --verbose
```

Both tools provide comprehensive analysis capabilities for understanding and maintaining the n8n component architecture.