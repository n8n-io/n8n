# vue-component-type-helpers

<p>
  <a href="https://www.npmjs.com/package/vue-component-type-helpers"><img src="https://img.shields.io/npm/v/vue-component-type-helpers.svg?labelColor=18181B&color=1584FC" alt="NPM version"></a>
  <a href="https://github.com/vuejs/language-tools/blob/master/LICENSE"><img src="https://img.shields.io/github/license/vuejs/language-tools.svg?labelColor=18181B&color=1584FC" alt="License"></a>
</p>

Helper utilities for extracting types such as props, slots, attrs, emit, and exposed from Vue component types. No runtime dependencies; provides TypeScript type definitions only.

## Installation

```bash
npm install vue-component-type-helpers
```

## Type Helpers

### `ComponentProps<T>`

Extracts the props type of a component.

```typescript
import type { ComponentProps } from 'vue-component-type-helpers';
import MyComponent from './MyComponent.vue';

type Props = ComponentProps<typeof MyComponent>;
```

### `ComponentSlots<T>`

Extracts the slots type of a component.

```typescript
import type { ComponentSlots } from 'vue-component-type-helpers';
import MyComponent from './MyComponent.vue';

type Slots = ComponentSlots<typeof MyComponent>;
```

### `ComponentAttrs<T>`

Extracts the attrs type of a component.

```typescript
import type { ComponentAttrs } from 'vue-component-type-helpers';
import MyComponent from './MyComponent.vue';

type Attrs = ComponentAttrs<typeof MyComponent>;
```

### `ComponentEmit<T>`

Extracts the emit function type of a component.

```typescript
import type { ComponentEmit } from 'vue-component-type-helpers';
import MyComponent from './MyComponent.vue';

type Emit = ComponentEmit<typeof MyComponent>;
```

### `ComponentExposed<T>`

Extracts the instance type exposed via `defineExpose`.

```typescript
import type { ComponentExposed } from 'vue-component-type-helpers';
import MyComponent from './MyComponent.vue';

type Exposed = ComponentExposed<typeof MyComponent>;
```

## Example

Given the following component:

```vue
<!-- MyComponent.vue -->
<script setup lang="ts">
defineProps<{
  title: string;
  count?: number;
}>();

defineEmits<{
  update: [value: string];
  close: [];
}>();

defineSlots<{
  default(props: { item: string }): any;
  header(): any;
}>();

const internalState = ref(0);
defineExpose({
  reset: () => { internalState.value = 0; },
});
</script>
```

Using type helpers:

```typescript
import type { ComponentProps, ComponentSlots, ComponentEmit, ComponentExposed } from 'vue-component-type-helpers';
import MyComponent from './MyComponent.vue';

type Props = ComponentProps<typeof MyComponent>;
// { title: string; count?: number }

type Slots = ComponentSlots<typeof MyComponent>;
// { default(props: { item: string }): any; header(): any }

type Emit = ComponentEmit<typeof MyComponent>;
// { (e: 'update', value: string): void; (e: 'close'): void }

type Exposed = ComponentExposed<typeof MyComponent>;
// { reset: () => void }
```

## License

[MIT](https://github.com/vuejs/language-tools/blob/master/LICENSE) License
