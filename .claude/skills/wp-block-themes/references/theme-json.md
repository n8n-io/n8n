# `theme.json` guidance

Use this file when changing global settings/styles or per-block styling.

## High-level structure

Common top-level keys:

- `version`
- `settings` (what the UI exposes / allows)
- `styles` (default appearance)
- `customTemplates` and `templateParts` (optional, to describe templates and parts)

Upstream references:

- Theme Handbook: https://developer.wordpress.org/themes/global-settings-and-styles/
- Block Editor Handbook (often more current): https://developer.wordpress.org/block-editor/how-to-guides/themes/theme-json/
- Theme JSON living reference: https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/theme-json-living/
- Theme JSON version 3 (dev note): https://make.wordpress.org/core/2024/06/19/theme-json-version-3/

## Practical guardrails

- Prefer presets when you want editor-visible controls (colors, font sizes, spacing).
- Prefer `styles` when you want consistent defaults without requiring user choice.
- Be careful with specificity: user global styles override theme defaults.

## WordPress 6.9 additions

**Form element styling:**
- Style text inputs and selects via `styles.elements` (e.g., `styles.elements.input`, `styles.elements.select`).
- Supports border, color, outline, shadow, and spacing properties.
- Note: Focus state styling is not yet available in 6.9.

**Border radius presets:**
- Define presets in `settings.border.radiusSizes` for visual selection in the border radius control.
- Users can still enter custom values.

```json
{
  "settings": {
    "border": {
      "radiusSizes": [
        { "name": "Small", "slug": "small", "size": "4px" },
        { "name": "Medium", "slug": "medium", "size": "8px" },
        { "name": "Large", "slug": "large", "size": "16px" }
      ]
    }
  }
}
```

**Button pseudo-classes:**
- Style Button block hover and focus states directly in theme.json.
- No longer requires custom CSS for simple button state styling.

References:

- Border radius presets: https://make.wordpress.org/core/2025/11/12/theme-json-border-radius-presets-support-in-wordpress-6-9/
- Form element styling: https://developer.wordpress.org/news/2025/11/how-wordpress-6-9-gives-forms-a-theme-json-makeover/
