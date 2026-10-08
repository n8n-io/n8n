# Component specification

An input that lets the user select one numeric value within given limits.

- **Component name:** N8nSlider
- **Source of truth:** `Slider.vue`

## Scope

- Supports controlled and uncontrolled values.
- Uses a filled track with a position indicator, a label, and a value.
- Supports pointer input, including mouse and touch, and keyboard input.
- Supports one value only. It does not support ranges.
- Pointer values increase from left to right. The component does not reverse this behavior for right-to-left layouts.

## Public API

### Props

| Prop | Type | Default | Behavior |
| --- | --- | --- | --- |
| `size` | `InputSize` | `'large'` | Supports `mini`, `small`, `medium`, `large`, and `xlarge`. Sets height, padding, radius, and text size. |
| `modelValue` | `SliderValue` | `undefined` | Supplies the value in controlled mode. Supports `v-model`. |
| `defaultValue` | `SliderValue` | `undefined` | Supplies the initial local value. If omitted, the local value starts at `minValue`. Later changes do not reset it. |
| `maxValue` | `number` | `100` | Upper limit for user input. |
| `minValue` | `number` | `0` | Lower limit for user input. |
| `step` | `number` | `1` | Step interval. Pointer steps start at `minValue`. See the input rules below. |
| `minDistance` | `number` | `0` | Accepted but not used. There is no range mode. |
| `label` | `string` | Required | Supplies the visible label and accessible name. |
| `hideLabel` | `boolean` | `false` | Selects the `hiddenLabel` CSS class instead of `label`. This class has no rule in the current component styles. |
| `showStepMarkers` | `boolean` | `false` | Adds nine markers at 10% intervals when `maxValue > minValue`. Markers appear on hover, not keyboard focus. They do not follow `step`. |
| `disabled` | `boolean` | `false` | Blocks user input and removes the control from the tab order. |
| `formatValue` | `(value: number) => string` | `undefined` | Formats the visible value and accessible value text. Uses the numeric value when omitted. |
| `hideValue` | `boolean` | `false` | Removes the visible value. Keeps accessible value text. |

### Types

`Slider.types.ts` defines the public prop and event interfaces.

```typescript
export type SliderValue = [number];
```

Only the first array item supplies the value. All emitted values are new one-item arrays.

### Events

| Event | Payload | When it emits |
| --- | --- | --- |
| `update:modelValue` | `SliderValue` | When pointer or keyboard input changes the value. |
| `valueCommit` | `SliderValue` | On a changed keyboard value, or when an active pointer interaction ends with `pointerup` while enabled. |

A pointer release emits `valueCommit` even if the value did not change. Pointer cancellation and lost pointer capture end the interaction without a commit. External prop updates do not emit either event.

### Slots

The component has no slots.

## Behavior

### Value state

- `modelValue[0]` takes priority over the local value.
- The local value starts at `defaultValue[0]`, or at the initial `minValue`.
- User input updates the local value and emits a new array. It does not mutate consumer arrays.
- In controlled mode, the consumer must update `modelValue` to show the new value.
- Initial values and external values are not clamped or aligned to `step`.
- The fill width is clamped to 0–100%. It is zero when `maxValue <= minValue`.

### Pointer input

- A primary-button press anywhere in the component starts the interaction and focuses the control.
- The control captures the pointer. Other pointers do not change the active interaction.
- The pointer position maps to a value across the full control width.
- A positive `step` rounds the value to the nearest step from `minValue`.
- A zero or negative `step` allows continuous pointer values.
- The result is limited to `minValue` and `maxValue`.
- The initial press enables a fill-width transition. Pointer movement disables that transition.
- A pointer release applies its final position before it emits `valueCommit`.
- Pointer movement does not change the value if the control width is zero or `maxValue <= minValue`.

### Keyboard input

Keyboard input is ignored when disabled or during a pointer interaction.

| Key | Action |
| --- | --- |
| Arrow Right or Arrow Up | Increase by one step. |
| Arrow Left or Arrow Down | Decrease by one step. |
| Shift + Arrow key | Change by ten steps in the arrow direction. |
| Page Up | Increase by ten steps. |
| Page Down | Decrease by ten steps. |
| Home | Set the value to `minValue`. |
| End | Set the value to `maxValue`. |

Keyboard input uses a step of `1` when `step <= 0`. Arrow and Page keys change the current value directly; they do not align it to a step grid. Each result is limited to the configured bounds. A changed value emits `update:modelValue`, then `valueCommit`. An unchanged value emits neither event.

### Appearance

- The component uses design tokens for colors and sizes.
- `mini` uses text size `2xs`. `xlarge` uses `sm`. Other sizes use `xs`.
- The visible value uses tabular numerals.
- Hover shows the position indicator and any enabled markers.
- Dragging changes the position indicator color.
- Keyboard focus shows a focus ring around the component.
- The current styles do not define a disabled appearance.

## Accessibility

- The track is the single keyboard focus target and has `role="slider"`.
- `aria-labelledby` refers to the label outside the slider role.
- `aria-valuenow` contains the numeric value.
- `aria-valuemin` and `aria-valuemax` contain the configured limits.
- `aria-valuetext` contains the formatted value converted to a string.
- `aria-disabled` follows `disabled`. Disabled controls have `tabindex="-1"`; enabled controls have `tabindex="0"`.
- The fill, markers, and visible value are hidden from assistive technology.
- `hideValue` does not remove `aria-valuetext`.
- The `hideLabel` prop does not remove the label or its accessible name. Visual hiding needs a `hiddenLabel` style rule that is not present in `Slider.vue`.
- The control uses `touch-action: none` for pointer input.
- Consumers must translate labels and formatted value text.

## Template usage examples

### Controlled value

```vue
<template>
  <N8nSlider v-model="volume" :label="volumeLabel" />
</template>
```

`volume` has type `[number]`. `volumeLabel` contains translated text.

### Uncontrolled value

```vue
<template>
  <N8nSlider :default-value="[50]" :label="volumeLabel" />
</template>
```

### Formatted choices

```vue
<template>
  <N8nSlider
    v-model="size"
    :label="sizeLabel"
    :min-value="0"
    :max-value="3"
    :format-value="formatSize"
  />
</template>
```

`formatSize` returns a translated size name for each numeric value. For a short list of named choices, consider a select or segmented control to make the available choices easier to find.

### Hidden visible value

```vue
<template>
  <N8nSlider v-model="volume" :label="volumeLabel" hide-value />
</template>
```

### Disabled slider

```vue
<template>
  <N8nSlider :default-value="[50]" :label="volumeLabel" disabled />
</template>
```

### Decimal steps and markers

```vue
<template>
  <N8nSlider
    v-model="opacity"
    :label="opacityLabel"
    :min-value="0"
    :max-value="1"
    :step="0.1"
    show-step-markers
  />
</template>
```

Markers stay at 10% intervals even when `step` changes.
