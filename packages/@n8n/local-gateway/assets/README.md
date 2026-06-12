# Assets

## Tray Icons

Tray icons are derived from the official n8n brand guidelines:
- Dark logo: https://n8n.io/brandguidelines/logo-dark.svg
- White logo: https://n8n.io/brandguidelines/logo-white.svg

### Status-to-icon mapping

| Status      | Icon variant     | macOS (template) | Windows (color) |
|-------------|-----------------|-----------------|-----------------|
| connected   | brand color     | white+alpha     | orange (#F26522)|
| waiting     | muted orange    | white+alpha 70% | gray (#888888)  |
| disconnected| red tint        | white+alpha 50% | red (#CC3333)   |
| stopped     | gray            | white+alpha 30% | gray (#AAAAAA)  |

### Icon sizes required
- `tray-*.png` — 16×16 px (1x)
- `tray-*@2x.png` — 32×32 px (2x for retina/HiDPI)
- `icon.icns` — macOS app icon (generate with `iconutil`)
- `icon.ico` — Windows app icon (32×32 and 256×256)
- `icon.png` — 512×512 Dock icon, set at runtime via `app.dock.setIcon()`
  (unpackaged dev builds would otherwise show Electron's default icon)

`icon.png` and `icon.icns` are the white n8n mark (from `icon.ico`) on an
n8n-brand (#EA4B71) rounded square with standard macOS icon margins.

### Placeholder icons
The tray PNG files are placeholder 16×16 and 32×32 images.
Replace them with properly branded icons before distribution.
