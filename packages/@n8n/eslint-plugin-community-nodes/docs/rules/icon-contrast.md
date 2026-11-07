# Warn when an SVG icon has low contrast on a light or dark node background (`@n8n/community-nodes/icon-contrast`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule reads SVG files referenced by `file:` icons in node and credential classes.
It checks a single SVG against both node backgrounds.
For `{ light, dark }` icons, it checks each SVG against its theme background.
The backgrounds are white for the light theme and `#2b2b2b` for the dark theme.

The rule checks the best contrast ratio among `fill`, `stroke`, and `stop-color` declarations.
It reads these declarations from SVG attributes, `style` attributes, and `<style>` blocks.
It applies paint opacity and uses stops from referenced gradients.
It uses the WCAG contrast formula and warns below **1.5:1** by default.

## Options

Set `minimum` to `3` to check against the WCAG 3:1 target for graphics:

```js
rules: {
  '@n8n/community-nodes/icon-contrast': ['warn', { minimum: 3 }],
}
```

An SVG used as an image does not inherit the page color.
The rule treats `currentColor` as black and `var()` as its fallback, or black if it has no fallback.
It treats an SVG without a fill declaration as black.
It skips embedded images and `url()` paint with no matching gradient stops.
It does not check PNG files or the placement of SVG shapes.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    icon: { light: 'file:icons/black.svg', dark: 'file:icons/black.svg' },
    // ...
  };
}
```

The black icon has 1.48:1 contrast on the dark background.

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    icon: { light: 'file:icons/black.svg', dark: 'file:icons/white.svg' },
    // ...
  };
}
```
