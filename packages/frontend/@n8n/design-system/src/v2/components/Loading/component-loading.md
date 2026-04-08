# Component specification

Displays loading placeholders (skeleton screens) while content is being fetched or processed. Provides visual feedback to users that content is loading without showing a blank screen.

- **Component Name:** N8nLoading
- **Figma Component:** TBD
- **Element+ Component:** [ElSkeleton](https://element-plus.org/en-US/component/skeleton.html)
- **Reka UI Component:** [Primitive](https://reka-ui.com/docs/utilities/primitive) (no native Skeleton component)
- **Nuxt UI Component:** [Skeleton](https://ui.nuxt.com/docs/components/skeleton)


## Public API Definition

**Props**

- `animated?: boolean` - Controls whether the skeleton shows pulsing animation. Default: `true`
- `rows?: number` - Number of skeleton rows to display. Default: `1`
- `cols?: number` - Number of skeleton columns to display. When set (non-zero), overrides row-based layout. Default: `0`
- `shrinkLast?: boolean` - Whether to shrink the last row to a shorter width. Only applies to `'h1'` and `'p'` variants when `rows > 1`. Default: `true`
- `variant?: SkeletonVariant` - Visual variant determining the shape and style of skeleton items. Values: `'custom' | 'p' | 'text' | 'h1' | 'h3' | 'caption' | 'button' | 'image' | 'circle' | 'rect'`. Default: `'p'`

**Events**

None - This is a purely presentational component.

**Slots**

None - Content is generated based on props.

### Template usage example

**Basic loading with rows:**
```typescript
<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system'
</script>

<template>
  <!-- Simple 3-row skeleton -->
  <N8nLoading :rows="3" />

  <!-- Conditional loading with 5 rows (use v-if for visibility control) -->
  <N8nLoading v-if="isLoading" :rows="5" />
</template>
```

**Variant-specific loading:**
```typescript
<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system'
</script>

<template>
  <!-- Heading skeleton -->
  <N8nLoading variant="h1" />

  <!-- Button skeleton -->
  <N8nLoading variant="button" />

  <!-- Paragraph skeleton with 3 rows -->
  <N8nLoading variant="p" :rows="3" />

  <!-- Rectangular shape -->
  <N8nLoading variant="rect" />

  <!-- Image placeholder -->
  <N8nLoading variant="image" />

  <!-- Text skeleton -->
  <N8nLoading variant="text" />

  <!-- Custom size (100% width/height) -->
  <N8nLoading variant="custom" />
</template>
```

**Without shrinking the last row:**
```typescript
<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system'
</script>

<template>
  <!-- All rows will be full width -->
  <N8nLoading :rows="10" :shrink-last="false" />
</template>
```

**Controlling animation:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nLoading } from '@n8n/design-system'

const isLoading = ref(true)
const loadingRows = ref(5)
</script>

<template>
  <!-- Animated paragraph skeleton -->
  <N8nLoading v-if="isLoading" :rows="loadingRows" animated variant="p" />

  <!-- Static text skeleton without animation -->
  <N8nLoading :class="$style.loading" :animated="false" variant="text" />
</template>
```

**Multiple instances for list items:**
```typescript
<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system'
</script>

<template>
  <div class="list">
    <N8nLoading :rows="3" class="mb-xs" />
    <N8nLoading :rows="3" class="mb-xs" />
    <N8nLoading :rows="3" class="mb-xs" />
  </div>
</template>

<style>
.mb-xs {
  margin-bottom: var(--spacing--xs);
}
</style>
```

**Conditional loading based on data availability:**
```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { N8nLoading } from '@n8n/design-system'

const template = ref(null)
</script>

<template>
  <div>
    <!-- Show skeleton until data loads -->
    <N8nLoading v-if="!template" :rows="1" variant="button" />
    <N8nLoading v-if="!template?.name" :rows="2" variant="h1" />

    <!-- Show actual content when loaded -->
    <template v-if="template">
      <h1>{{ template.name }}</h1>
      <p>{{ template.description }}</p>
    </template>
  </div>
</template>
```

**Column-based layout:**
```typescript
<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system'
</script>

<template>
  <!-- Renders 4 columns instead of rows (variant is ignored when cols is set) -->
  <N8nLoading :cols="4" />
</template>
```

**Custom styling with CSS classes:**
```typescript
<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system'
</script>

<template>
  <N8nLoading :rows="3" class="custom-loader" />
</template>

<style>
:global(.n8n-loading) div {
  height: 32px;
  width: 300px;
  margin: 0;
}

:global(.n8n-loading) > div {
  display: flex;
  flex-direction: column;
  gap: var(--spacing--2xs);
}
</style>
```
