# Component specification

Copy this file next to the template and call it `component-<component-name-kebap-case>.md`.

This component specification describes the public API of a component intended to be added to the component library of our design system.
To be made available for review in a GitHub pull request before implementation.
With two approvals, you can be quite sure that the API won't be challenged anymore on the implementation PR.

- **Component Name:** N8nCheckbox
- **Element+ Component:** [ElCheckbox](https://element-plus.org/en-US/component/checkbox)
- **Reka UI Component:** [Checkbox](https://reka-ui.com/docs/components/checkbox)
- **Nuxt UI Component:** [Checkbox](https://ui.nuxt.com/docs/components/checkbox)

^ Only list what exists in the external component libraries. Nuxt uses Reka under the hood. We use it as guideline on for the public API of our reka-ui-based components

## Public API Definition

**Props**

- `modelValue`: `boolean` | `default: false`
- `label?`: `string` | provided via slot
- `disabled?`: `boolean` | `default: false`
- `tooltipText?`: `string`
- `size?`: `'small' | 'medium'` | `default: 'medium'`

**Events**

- `update:modelValue(value: boolean)`
- `change(value: boolean)`

**Slots**

- `label`: `{ label?: string | undefined; }`

**CSS Variables**

- `--checkbox--border-color`
- `--checkbox--border-color--checked`

### Template usage example

```vue
<N8nCheckbox  size="medium" label="Subscribe to newsletter" />
```