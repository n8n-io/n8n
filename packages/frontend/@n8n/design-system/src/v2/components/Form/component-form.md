# Component specification

Presentational components that lay out form fields with the same spacing and structure. They do not hold state and do not validate. Schema-driven forms (`N8nFormInputs`, `N8nFormBox`) and hand-written forms both use them, so all forms look the same.

- **Component Names:** N8nForm, N8nFormSection, N8nFormField

## Structure

```
N8nFormBox            (existing: title + buttons)
  └─ N8nFormInputs    (existing: schema → fields, validation, shouldDisplay)
       └─ N8nForm             ← new
            └─ N8nFormSection ← new
                 └─ N8nFormField  ← new
                      └─ control (picked from IFormInput.type)

Hand-written form
  └─ N8nForm
       └─ N8nFormSection
            └─ N8nFormField
                 └─ any control
```

### Responsibilities

- **N8nForm** controls the vertical rhythm between fields and sections, and the dividers between sections.
- **N8nFormSection** groups related fields under a title and description. It can collapse.
- **N8nFormField** controls the space around a control: label row, gap, and hint.
- **The control** controls the space inside its own box. For example, the Slider value readout, the Select chevron, and the Color picker swatch are part of the control.

Rule: the field owns the space around the control. The control owns the space inside its box. Slots change content only. They cannot change spacing.

## N8nForm

A single wrapper that sets the vertical rhythm and spacing.

**Props**

None.

**Slots**

- `default` — `N8nFormSection` items, or `N8nFormField` items for simple forms that do not need sections.

**Behavior**

- When `N8nForm` contains more than one `N8nFormSection`, it adds a divider between the sections.
- Dividers come from CSS (`.section + .section`), not from markup. Consumers do not add dividers by hand. There is never a divider above the first section or below the last section.
- The gap between sections is larger than the gap between fields in a section. This makes groups easy to see.

## N8nFormSection

Groups related fields.

**Props**

```ts
interface FormSectionProps {
	/** Displays title. Always required for aria. */
	title: string;
	/** Displays description. Always required for aria. */
	description: string;
	/** Toggle title visibility. Optional. Default true. */
	showTitle?: boolean;
	/** Toggle description visibility. Optional. Default true. */
	showDescription?: boolean;
	/** Makes the section collapsible. Optional. Default false. */
	collapsible?: boolean;
	/** Open state on first render when collapsible. Use when you do not need to control the state. Optional. */
	defaultOpen?: boolean;
	/** Controlled open state when collapsible. Bind with v-model:open. Optional. */
	open?: boolean;
}
```

**Events**

- `update:open(value: boolean)` — emits when the open state changes, in controlled and uncontrolled mode.

**Slots**

- `default` — `N8nFormField` items.

**Collapsible state**

- When `open` is passed, the parent owns the state. When `open` is not passed, the section owns the state and starts from `defaultOpen`. This matches Reka UI and `N8nSelect2`.
- The section opens itself when a field inside it becomes invalid. Each `N8nFormField` reports its `invalid` state to the nearest section through provide / inject. The section then emits `update:open(true)`. A parent in controlled mode receives the event through `v-model:open` and stays in sync.
- The section does not close itself when the error is fixed.
- Use `v-model:open` to remember the state, to open a section from a deep link or search, or to track telemetry.

**Accessibility**

- Render as a `<section>` (or `role="group"`), with `aria-labelledby` set to the title and `aria-describedby` set to the description.
- When `showTitle` or `showDescription` is `false`, hide the text visually but keep it in the DOM (use `N8nVisuallyHidden`). The section keeps its accessible name and description.
- When `collapsible` is `true`, the title is the trigger. Use `aria-expanded` and `aria-controls`. Build it on Reka `Collapsible`, or reuse `N8nCollapsiblePanel` for the same behavior as the rest of the product.

## N8nFormField

A presentational component that lays out one label, one control, and one hint.

**Props**

```ts
interface FormFieldProps {
	/** Show required mark next to label. */
	required: boolean;
	/** Show label above input. */
	label: string;
	/** Show hint below input in subtle text. Can override with slot. */
	hint?: string;
	/** Defines layout. Optional. Default vertical. */
	orientation?: 'vertical' | 'horizontal';
	/** Toggle label visibility. Optional. Default true. */
	showLabel?: boolean;
	/** Replaces hint with error text, sets error styles and aria-invalid. Optional. */
	error?: string;
}
```

**Slots**

- `label-leading` — before the label, on the left (for example, an icon).
- `label-trailing` — on the right side of the label row, with space between it and the label (for example, a slider value, a character count, or a "Reset" link).
- `hint` — replaces the `hint` prop content (for example, hint text with a link).
- `error` — replaces the `error` prop content (for example, an error with a documentation link). Shows only when `error` is set.
- `default` — the control.

**Errors**

- When `error` is set, the error text replaces the hint in the same position. The layout does not move.
- `N8nFormField` only displays the error. It does not validate and does not decide when to show the error. The consumer (`N8nFormInputs`, or a screen with its own validation) passes the string.
- The error text uses `aria-live="polite"` so screen readers announce it when it appears.

**Field context (provide / inject)**

`N8nFormField` provides a context to the control in its default slot:

```ts
interface FormFieldContext {
	/** Id for the control. The label `for` attribute points to it. */
	id: Ref<string>;
	/** True when `error` is set. */
	invalid: Ref<boolean>;
	/** Id of the error text when invalid, otherwise id of the hint. */
	describedBy: Ref<string | undefined>;
	/** Mirrors the `required` prop. */
	required: Ref<boolean>;
}
```

- Expose it through a `useFormField()` composable. It returns `undefined` outside a field.
- `N8nInput`, `N8nSelect`, and the v2 controls inject the context. They set `id`, `aria-invalid`, `aria-describedby`, and `aria-required` on the focusable element, and apply their own error style.
- Controls also accept an `invalid?: boolean` prop. The prop wins over the context. Use it when a control is used outside a field, for example in table cells or the NDV.
- Each control owns its error style. Do not style errors from the field with a CSS variable. Some controls do not read `--input--border-color`.

**Orientation**

- `vertical` (default): label row above the control, hint below the control.
- `horizontal`: label and hint on the left, control on the right. Use for controls whose label describes what they do, such as Switch.

**Accessibility**

- The label is a real `<label>` connected to the control, so a click on the label focuses the control.
- When `showLabel` is `false`, hide the label visually but keep it in the DOM (use `N8nVisuallyHidden`). The control keeps its accessible name.
- Connect the hint to the control with `aria-describedby`.
- The required mark is decorative. Set `required` / `aria-required` on the control as well.

## Examples

```vue
<N8nFormField label="Name" required hint="Shown to your team">
	<N8nInput v-model="name" />
</N8nFormField>

<N8nFormField label="Temperature">
	<template #label-trailing>{{ temperature }}</template>
	<N8nSlider v-model="temperature" />
</N8nFormField>

<N8nFormField
	label="Block execution"
	hint="Stop the workflow when a guardrail fails"
	orientation="horizontal"
>
	<N8nSwitch v-model="blockExecution" />
</N8nFormField>

<N8nFormField label="Name" required :error="validationErrors.name || serverNameError">
	<N8nInput v-model="name" />
</N8nFormField>

<N8nFormField label="API key" required :error="apiKeyError">
	<template #error>
		{{ apiKeyError }}
		<N8nLink :to="docsUrl" new-window theme="danger">{{ docsText }}</N8nLink>
	</template>
	<N8nInput v-model="apiKey" type="password" />
</N8nFormField>
```

```vue
<N8nForm>
	<N8nFormSection title="General" description="Basic details" :show-title="false" :show-description="false">
		<N8nFormField label="Name" required>…</N8nFormField>
	</N8nFormSection>

	<N8nFormSection
		title="Advanced"
		description="Change these only if needed"
		collapsible
	>
		<N8nFormField label="Timeout">…</N8nFormField>
	</N8nFormSection>
</N8nForm>
```

## Changes to existing components

### New

- `N8nForm`
- `N8nFormSection`
- `N8nFormField`
- `useFormField()` composable
- New `IFormInput` types: `textarea`, `radio`, `color`, `slider`, `tags`

### Changed

- **N8nFormInput** — rebuild on `N8nFormField`. Remove its own label, hint, and error markup. Keep validation and error timing (blur, typing, `showValidationWarnings`), and pass the message to `error`. Move `documentationUrl` / `documentationText` into the `#error` slot.
- **Controls** (`N8nInput`, `N8nSelect`, v2 controls) — inject `useFormField()`, add an `invalid` prop, and add an error style. Keep it while consumers use it. Remove it later.
- **N8nFormInputs** — render inside `N8nForm` and no longer own layout. Remove `columnView` and `verticalSpacing`, or pass them to `N8nForm`.
- **IFormInput** — add an optional `section` key. Add a `sections` list (`id`, `title`, `description`) to `N8nFormInputs`. `N8nFormInputs` groups fields by section and renders one `N8nFormSection` for each group.

### Unchanged

- `N8nFormBox` — gets the new layout through `N8nFormInputs`.
- `N8nInputLabel` — can render the label inside `N8nFormField`.
- Schema consumers in editor-ui. The schema API does not change.

## Migration

Screens in editor-ui that use `N8nInput` directly handle errors in their own way: custom error classes with `!important` borders, `N8nText color="danger"` under the input, or one error message for the whole form. None set `aria-invalid`.

1. Start with screens that show one custom error message under an input. They map directly to the `error` prop.
2. Then move screens that use `N8nInputLabel` with custom hint or error markup.
3. Leave NDV parameter inputs until later. They have their own layout and use `--input--border-color`.

## Design guidelines

Follow the `n8n:ui-design` skill. Form-specific best practices live in `.agents/skills/ui-design/rules/form-guidelines.md` (to be written).

## Open questions

- **Error styles for each control:** define what an error looks like on Slider, Color picker, Radio, Checkbox, and Switch.
- **Validation for hand-written forms:** screens keep their own validation for now. Consider a shared composable for rules and timing later.
- **Sections without a title:** `title` and `description` are required for aria. A section that only groups fields and adds a divider must pass them and hide them with `showTitle` / `showDescription`.
