# Warn when an icon is hard to see on the light or dark node background (`@n8n/community-nodes/icon-contrast`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The editor shows node and credential icons on a white node background in the light theme and on a dark gray (`#2b2b2b`) node background in the dark theme. An icon that has the same color as the background is invisible.

This rule reads paint declarations from each SVG icon and checks the theme that shows it:

- A `{ light, dark }` icon: the light file on the light background, the dark file on the dark background.
- A single icon file: on both backgrounds.

The rule collects `fill`, `stroke`, and `stop-color` from attributes, inline styles, and `<style>` blocks. It parses CSS colors with `culori` and compares the best color with the node background. The default minimum is 1.5:1. A black glyph scores 1.48:1 on the dark background, so the warning shows two decimal places.

An SVG with no fill uses black. Because file icons render in an `<img>`, `currentColor` uses black and `var()` uses its fallback or black. Color alpha is composited with the theme background.

The rule skips PNG files, embedded images, invalid SVG or CSS, and `url()` paint that does not refer to a local gradient with stops. Local gradient `href` and `xlink:href` chains are supported. It also skips missing files (`icon-validation` reports those) and icons with no visible paint.

The rule reads declarations. It does not rasterize the SVG or apply the CSS cascade. It cannot judge shape size, overlap, masks, or separate opacity properties.

## Options

```js
'@n8n/community-nodes/icon-contrast': ['warn', { minimum: 3 }]
```

`minimum` sets the lowest contrast ratio that the best paint color must reach. It defaults to 1.5. Use 3 for the WCAG contrast value for graphical objects.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    // A black logo used on both themes is invisible on the dark node background
    icon: 'file:icons/black-logo.svg',
    // ...
  };
}
```

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    // The variants are swapped: a white logo on the light theme
    icon: { light: 'file:icons/logo.white.svg', dark: 'file:icons/logo.black.svg' },
    // ...
  };
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: { light: 'file:icons/logo.black.svg', dark: 'file:icons/logo.white.svg' },
    // ...
  };
}
```
