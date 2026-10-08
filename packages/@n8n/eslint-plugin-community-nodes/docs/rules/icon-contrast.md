# Warn when an SVG icon has low contrast against the node background of the light or dark theme (`@n8n/community-nodes/icon-contrast`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name      | Description                                                          | Type   |
| :-------- | :------------------------------------------------------------------- | :----- |
| `minimum` | Lowest contrast ratio an icon must reach against the node background | Number |

<!-- end auto-generated rule options list -->

## Rule Details

The editor renders node and credential icons on a white node background in the
light theme and on a dark grey node background in the dark theme. An icon with
only dark shapes disappears in the dark theme, and an icon with only light
shapes disappears in the light theme.

This rule reads each SVG icon and compares its painted colors with the node
background of the theme it is shown on. A single-file icon is checked against
both themes. A `{ light, dark }` icon is checked against the matching theme
only. The rule reports when no color in the icon reaches the minimum contrast
ratio.

The default minimum is 1.5:1. Below that an icon is close to invisible, for
example a black glyph on the dark node background scores 1.4:1. Every icon that
n8n ships scores 1.5:1 or higher on its own theme. Light brand colors such as
yellow or cyan on white sit between 1.5:1 and 3:1. Raise the minimum to 3, the
WCAG 1.4.11 value for graphics, to flag those too.

```json
{
  "@n8n/community-nodes/icon-contrast": ["warn", { "minimum": 3 }]
}
```

The rule is a **warning**. It is a static heuristic and has these limits:

- Only `.svg` files are analysed. PNG icons are skipped.
- Colors come from `fill`, `stroke` and `stop-color`, as attributes, in
  `style` attributes, and in `<style>` blocks. Supported syntax is hex,
  `rgb()`/`rgba()`, `black` and `white`. An SVG that declares no fill is treated
  as black, which is how browsers render it.
- Icons that use `currentColor`, `var()`, embedded images, `url()` paint without
  gradient stops, or colors the rule cannot parse are skipped, because their
  rendered color is not known statically.
- The rule looks at the best contrast any color reaches. It does not know which
  shape sits on top of which, so an icon can pass while a detail inside it is
  still hard to see.

The companion `icon-validation` rule checks that the referenced files exist.
The `icon-prefer-themed-variants` rule nudges single-file icons toward the
`{ light, dark }` form.

## Examples

### ❌ Incorrect

```typescript
// icons/my-icon.svg paints its shapes black and has no light variant
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: 'file:icons/my-icon.svg',
    // ...
  };
}
```

```typescript
// both slots point to the same black icon, so the dark theme still fails
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    icon: {
      light: 'file:icons/my-icon.svg',
      dark: 'file:icons/my-icon.svg',
    },
    // ...
  };
}
```

### ✅ Correct

```typescript
// icons/my-icon.dark.svg paints its shapes white
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    icon: {
      light: 'file:icons/my-icon.svg',
      dark: 'file:icons/my-icon.dark.svg',
    },
    // ...
  };
}
```

```typescript
// a colored badge with a white glyph reads well on both themes
export class MyApi implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  icon = 'file:icons/my-badge.svg';
}
```
