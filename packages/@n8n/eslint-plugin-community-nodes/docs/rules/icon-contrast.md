# Warn when an icon is hard to see on the light or dark node background (`@n8n/community-nodes/icon-contrast`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The editor shows node and credential icons on a white node background in the light theme and on a dark gray (`#2b2b2b`) node background in the dark theme. An icon that has the same color as the background is invisible.

This rule reads the paint declarations in each SVG file and checks their contrast against the background of the theme that shows it:

- A `{ light, dark }` icon: the light file on the light background, the dark file on the dark background.
- A single icon file: on both backgrounds.

The rule collects `fill`, `stroke`, and `stop-color` from attributes, inline styles, and `<style>` blocks. It parses CSS colors with `culori`. An SVG with no fill declaration uses black. The rule uses the color with the highest WCAG contrast ratio for each background. It warns when that ratio is below `minimum` (default 1.5:1). Reports show two decimal places, so black on the dark background reads as 1.48:1.

The editor loads file icons through an `<img>` tag. These SVG files do not inherit the page's text color or CSS variables. The rule treats `currentColor` as black and `var()` as its fallback, or black when it has no fallback. It composites color alpha against the theme background.

The rule skips PNG files, missing files, invalid XML or CSS, embedded images, and `url()` paint without gradient stops. The `icon-validation` rule reports missing files. An icon with no visible paint has no contrast result.

Each paint URL must refer to a local linear or radial gradient with stops. The rule follows local `href` and `xlink:href` gradient references. It skips patterns, external references, missing targets, and gradients without stops, even when another gradient has stops.

This check reads declarations. It does not render the SVG or account for shape size, overlap, the CSS cascade, masks, or separate opacity declarations. A small high-contrast shape can make an icon pass.

## Options

```js
'@n8n/community-nodes/icon-contrast': ['warn', { minimum: 3 }]
```

`minimum` sets the minimum contrast ratio for the best color against each theme background. WCAG 2.1 asks for 3:1 for graphical objects.

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
