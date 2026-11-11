# Warn when an SVG icon is hard to see on the light or dark node background (`@n8n/community-nodes/icon-contrast`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The editor shows node and credential icons on a white node background in the light theme and on a dark gray (`#2b2b2b`) node background in the dark theme. An icon that has the same color as the background is invisible.

This rule renders each SVG icon on the background of the theme that shows it:

- A `{ light, dark }` icon: the light file on the light background, the dark file on the dark background.
- A single icon file: on both backgrounds.

A pixel of the icon is visible when its contrast with the background is at least 1.5:1. The rule warns when less than 10% of the icon's pixels are visible. Because the rule renders the icon, it sees what the editor shows: CSS classes, opacity, gradients, and masks all apply.

The rule skips icons that are not SVG files, files that do not exist (the `icon-validation` rule reports those), and invalid SVG markup. Text in an icon does not count, because system fonts differ between machines.

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
