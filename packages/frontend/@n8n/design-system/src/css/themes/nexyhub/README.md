# NexyHub Theme for n8n

This directory contains the NexyHub branding theme for n8n, implemented as a CSS variable override layer.

## 🎨 Color System Overview

### Brand Colors

**Primary (Blue)**
- Base: `#6b78cc` - HSL(230, 48%, 60%)
- Usage: Interactive elements, primary buttons, links, focus states
- Reasoning: Professional, trustworthy, aligns with NexyHub's tech-forward brand

**Accent (Green)**  
- Base: `#adc91a` - HSL(68, 78%, 45%)
- Usage: Success states, secondary actions, completed workflows
- Reasoning: Vibrant, energetic, conveys growth and progress

### Neutral Scale
- Cool gray scale with slight blue undertone for visual cohesion
- Range: `#0b0d11` (darkest) → `#e8eaed` (lightest)
- Usage: UI structure, text hierarchy, backgrounds, borders

### Semantic Colors
- **Success**: `#adc91a` (Green - matches accent)
- **Warning**: `#d8921a` (Orange)
- **Critical/Error**: `#d34747` (Red)
- **Info**: `#6b78cc` (Blue - matches primary)

## 📁 File Structure

```
nexyhub/
├── _nexyhub-primitives.scss    # Raw color values from NexyHub design system
├── _nexyhub-overrides.scss     # Maps n8n tokens → NexyHub colors
└── README.md                    # This file
```

## 🔧 How It Works

### Override Strategy

n8n's design system uses a three-tier architecture:

1. **Primitives** (`_primitives.scss`) - Raw HSL color values
2. **Tokens** (`_tokens.scss`) - Semantic mappings (e.g., `--color--primary`)
3. **Theme tokens** (`_tokens.dark.scss`) - Theme-specific overrides

Our NexyHub theme operates at the **token level**, overriding semantic colors while keeping the primitive system intact. This ensures:

- ✅ Minimal code changes (only token overrides)
- ✅ Full compatibility with n8n components
- ✅ Easy upstream merges
- ✅ Consistent application-wide branding

### Integration

The theme is integrated into n8n's token system via a single mixin call in `_tokens.scss`:

```scss
@mixin theme {
  // ... n8n's original tokens ...
  
  // NexyHub theme override (runs last, takes precedence)
  @include nexyhub.nexyhub-theme;
}
```

## 🎯 Color Mapping Strategy

### Analysis & Decisions

| n8n Token | NexyHub Color | Reasoning |
|-----------|---------------|-----------|
| `--color--primary` | Blue `#6b78cc` | Main interactive color - buttons, links, navigation |
| `--color--secondary` | Green `#adc91a` | Secondary actions, differentiation from primary |
| `--color--success` | Green `#adc91a` | Success states, natural association with completion |
| `--color--warning` | Orange `#d8921a` | Warnings, caution states |
| `--color--danger` | Red `#d34747` | Errors, destructive actions |
| `--color--text` | Neutral `#b5bcc3` | High contrast on dark backgrounds |
| `--color--background` | Neutral `#1a1f24` | Cards, panels, elevated surfaces |
| `--canvas--color--background` | Neutral `#0b0d11` | Workflow editor background |

### Dark Mode (Default)

NexyHub uses **dark mode as default**, matching modern developer tool preferences:

- Background: Very dark blue-gray (`#0b0d11`)
- Text: Light gray (`#b5bcc3`)
- Surfaces: Elevated with subtle lightness variations
- Accent: Vibrant colors pop against dark background

### Light Mode (Optional)

Light mode values are defined in `_nexyhub-primitives.scss` with `-light-` suffix:
- Background: White/very light gray
- Text: Dark gray/black
- Inverted neutral scale
- Adjusted semantic colors for proper contrast

*Note: Light mode integration not yet active - can be enabled by creating light theme override file if needed.*

## 🔄 Maintenance & Updates

### Pulling Upstream Changes

```bash
# Switch to main branch
git checkout main

# Pull latest from n8n upstream
git pull upstream master

# Rebase branding branch
git checkout nexyhub-branding
git rebase main

# Resolve conflicts (if any)
# Test build
pnpm build
```

### Conflict Resolution

Conflicts should be rare since we only modify:
1. One line in `_tokens.scss` (the `@include` statement)
2. Files in our isolated `themes/nexyhub/` directory

If n8n adds new tokens:
- They'll use n8n's default colors initially
- You can optionally add them to `_nexyhub-overrides.scss`
- No breaking changes expected

### Testing After Updates

```bash
# Build design system
cd packages/frontend/@n8n/design-system
pnpm build

# Check Storybook for visual regressions
pnpm storybook

# Build full application
cd /Users/runner/Documents/n8n
pnpm build

# Test Docker image
pnpm dockerize-n8n
```

## 🎨 Customization Guide

### Adding New Colors

If you need to add new NexyHub colors:

1. **Add to primitives** (`_nexyhub-primitives.scss`):
```scss
--nh--custom-color: #hexvalue;
```

2. **Map to n8n token** (`_nexyhub-overrides.scss`):
```scss
--color--custom: var(--nh--custom-color);
```

### Adjusting Existing Colors

Simply modify the color value in `_nexyhub-primitives.scss`:

```scss
// Before
--nh--primary-500: #6b78cc;

// After
--nh--primary-500: #5a67bb; // Darker blue
```

All components will automatically update.

### Creating Theme Variants

To create alternate themes (e.g., high contrast):

1. Create new file: `_nexyhub-high-contrast.scss`
2. Copy structure from `_nexyhub-overrides.scss`
3. Adjust color mappings
4. Conditionally include based on user preference

## 🚀 Deployment

### Docker Integration

No changes needed to Docker workflow. The CSS is compiled during the build process:

```bash
# Standard n8n build process includes our theme
pnpm build

# Docker image creation (unchanged)
pnpm dockerize-n8n
```

### Environment Variables

No environment variables required. The theme is baked into the compiled CSS.

### CDN/Asset Serving

The compiled CSS is served as part of n8n's standard asset pipeline. No special CDN configuration needed.

## 📊 Design Token Reference

### Complete Token List

See `_nexyhub-overrides.scss` for the full list of overridden tokens. Key categories:

- **Primary**: Interactive elements (5 shades)
- **Secondary**: Alternative actions (4 shades)
- **Success**: Positive states (6 shades)
- **Warning**: Caution states (4 shades)
- **Danger**: Error states (6 shades)
- **Text**: Typography (6 shades)
- **Foreground**: Borders/dividers (5 shades)
- **Background**: Surfaces (6 shades)
- **Canvas**: Workflow editor (multiple values)
- **Node**: Workflow nodes (multiple values)
- **Sticky**: Note colors (7 variants)

### Design System Alignment

NexyHub colors align with modern design principles:

- **WCAG AA Compliance**: All text/background combinations tested
- **Color Blind Friendly**: Blue/green distinction sufficient
- **Dark Mode Optimized**: Reduced eye strain for long sessions
- **Brand Consistency**: Matches NexyHub website and marketing

## 🤝 Contributing

When adding new n8n features that introduce color tokens:

1. Check if existing NexyHub colors map naturally
2. If new color needed, add to both primitive and override files
3. Document reasoning in this README
4. Test in Storybook and live application
5. Commit with descriptive message

## 📝 Version History

- **v1.0.0** (2025-10-29) - Initial NexyHub theme implementation
  - Dark mode as default
  - Complete token override system
  - Full n8n component compatibility

## 🐛 Known Issues

None currently. If you encounter visual issues:

1. Clear browser cache
2. Rebuild design system: `pnpm build`
3. Check browser console for CSS loading errors
4. Verify all three theme files are present

## 📧 Support

For NexyHub branding questions or theme modifications, contact your design team or refer to the main NexyHub design system documentation.

---

**Last Updated**: October 29, 2025  
**Maintainer**: NexyHub Development Team  
**n8n Version Compatibility**: v1.x.x+
