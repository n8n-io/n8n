```
Copy this file next to the template and call it `component-<component-name-kebap-case>.md`.

This component specification describes the public API of a component intended to be added to the component library of our design system. To be made available for review in a GitHub pull request before implementation.
```

# Component name
_Short description of the component goes here_

- **Reference:** [Some Base UI Component](https://element-plus.org/en-US/component/checkbox)

## Why?
_Explain what this component does and why we need it_

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


### Examples

```vue
<Component  size="medium" label="Subscribe to newsletter" />
```
