# Creating a new block theme

Use this file when you need to create a new block theme or convert a theme to block theme structure.

## Two practical starting points

1. **Export from a WP environment**
   - Use the official “Create Block Theme” plugin to generate/export a theme from the Site Editor.
   - This tends to produce a structure aligned with current WordPress behavior.

2. **Create the minimal filesystem structure**
   - Create a theme folder with:
     - `style.css` (theme header)
     - `theme.json` (global settings/styles)
     - `templates/index.html` (minimum viable template)
     - `parts/header.html` and `parts/footer.html` (recommended)

## References

- Create Block Theme plugin:
  - https://wordpress.org/plugins/create-block-theme/
- Block theme structure:
  - https://developer.wordpress.org/themes/block-themes/theme-structure/
- Required templates:
  - https://developer.wordpress.org/themes/block-themes/templates-and-template-parts/

## theme.json version choice (compatibility)

`theme.json` has schema versions. Pick the highest version that matches your minimum supported WordPress version.

References:

- Theme Handbook introduction:
  - https://developer.wordpress.org/themes/global-settings-and-styles/introduction-to-theme-json/
- Theme.json version 3 dev note:
  - https://make.wordpress.org/core/2024/06/19/theme-json-version-3/

