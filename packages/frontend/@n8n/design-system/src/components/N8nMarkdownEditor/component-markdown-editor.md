# Component specification

A reusable rich-text Markdown editor for editing Markdown-backed content in the design system. The component provides block-style rich text editing with Markdown string input/output, GitHub-Flavored Markdown support where feasible, a design-system owned toolbar, and shared Markdown presentation styles.

- **Component Name:** N8nMarkdownEditor
- **Editor Library:** TipTap Vue 3

## Goals

- Provide a design-system Markdown editor for Instructions, Skills, and similar Markdown-backed fields.
- Use Markdown strings as the primary input and output format.
- Support rich block editing through TipTap's standard editing model.
- Support GitHub-Flavored Markdown as closely as TipTap allows.
- Keep Markdown rendering styles owned by `@n8n/design-system` and shared with existing Markdown renderers.
- Keep extension behavior managed by the design system rather than requiring callsites to assemble raw TipTap extension arrays.
- Provide a simple toolbar that can be hidden by callsites.
- Provide both immediate update emits and blur/save-oriented emits so callsites can choose their persistence strategy.

## Non-goals for V1

- Custom callsite-owned toolbar rendering.
- Arbitrary rich node authoring such as images, knowledge nodes, mentions, or slash commands.
- Full Markdown AST preservation. Markdown may be normalized during parse/serialize.
- Advanced table features that Markdown cannot represent, such as merged cells.
- A markdown preview mode separate from editing.

## Public API Definition

**Props**

- `modelValue: string` - The bound Markdown value. Default: `''`
- `variant?: MarkdownEditorVariant` - Visual style variant. Values: `'ghost' | 'contained'`. Default: `'contained'`
- `placeholder?: string` - Placeholder text displayed when the editor is empty. Default: `''`
- `disabled?: boolean` - When `true`, prevents user interaction and dims the editor. Default: `false`
- `readonly?: boolean` - When `true`, content can be selected but not edited. Default: `false`
- `showToolbar?: MarkdownEditorToolbarMode` - Controls toolbar visibility. Values: `'never' | 'hover' | 'always'`. Default: `'always'`
- `maxHeight?: string | number` - Maximum editor content height. Number values are treated as pixels. Default: `'480px'`
- `extensions?: Extension[]` - Optional TipTap extension escape hatch for concrete callsite needs. Default extensions remain design-system managed.
- `editorProps?: EditorOptions['editorProps']` - Optional TipTap editor props escape hatch.
- `containerClass?: string` - Optional class to apply to the editor container.

**Types**

```ts
type MarkdownEditorVariant = 'ghost' | 'contained';
type MarkdownEditorToolbarMode = 'never' | 'hover' | 'always';
```

**Default extensions**

```ts
const defaultEnabledExtensions: MarkdownEditorExtensionName[] = [
	'starterKit',
	'markdown',
	'link',
	'table',
	'taskList',
	'strike',
];
```

**Events**

- `update:modelValue` - Emitted when the editor content changes. Payload: `[value: string]`
- `input` - Emitted when the editor content changes. Payload: `[value: string]`
- `change` - Emitted when the Markdown value changes. Payload: `[value: string]`
- `focus` - Emitted when the editor gains focus. Payload: `[event: FocusEvent]`
- `blur` - Emitted when the editor loses focus, including the current Markdown value. Payload: `[value: string, event: FocusEvent]`
- `ready` - Emitted when the TipTap editor instance is created. Payload: `[editor: Editor]`

**Exposed Methods**

- `focus(): void` - Programmatically focus the editor.
- `blur(): void` - Programmatically blur the editor.
- `getMarkdown(): string` - Return the current editor content serialized as Markdown.
- `getEditor(): Editor | null` - Return the TipTap editor instance.

## Extension Registry

Extensions are assembled from a design-system owned registry. The `extensions` prop is an escape hatch for concrete callsite needs and appends to the design-system defaults.

```ts
const markdownEditorExtensions = {
	starterKit: StarterKit,
	markdown: Markdown.configure({
		markedOptions: {
			gfm: true,
		},
	}),
	link: Link.configure({
		openOnClick: false,
	}),
	table: [Table, TableRow, TableHeader, TableCell],
	taskList: [TaskList, TaskItem],
	strike: Strike,
};
```

This keeps default extension behavior consistent, testable, and owned by `@n8n/design-system`.

## Markdown and GFM Support

V1 should support the closest practical subset of GitHub-Flavored Markdown available through TipTap and its Markdown extension support.

Required Markdown features:

- Paragraphs
- Headings
- Bold
- Italic
- Strikethrough
- Inline code
- Fenced code blocks
- Links
- Blockquotes
- Horizontal rules
- Bullet lists
- Ordered lists
- Nested lists
- Task lists
- Basic pipe tables

Known limitations:

- Markdown formatting may be normalized during serialization.
- Footnotes need explicit research before being promised as supported.
- HTML paste support is useful but not required for V1.
- Images are intentionally deferred.
- Advanced table constructs such as merged cells are not supported.

## Toolbar

The toolbar is owned by the design system and can be hidden with `showToolbar="never"`.

Initial toolbar controls:

- Bold
- Italic
- Strikethrough
- Link
- Heading controls
- Bullet list
- Ordered list
- Task list
- Code block
- Blockquote
- Undo
- Redo

Toolbar controls should use existing design-system primitives such as `N8nButton`, `N8nIcon`, and accessible labels. The toolbar should reflect active formatting state where TipTap exposes it.

## Styling

Move the existing Markdown styles from chat into `@n8n/design-system`, for example:

```text
packages/frontend/@n8n/design-system/src/css/markdown.scss
```

The design-system stylesheet should expose a generic Markdown class, for example:

```scss
.n8n-markdown {
	/* shared markdown styles */
}
```

Existing consumers such as chat should be updated to import and use the design-system Markdown styles instead of owning a separate Markdown stylesheet.

Component variants:

- `ghost` - Applies shared Markdown styles with minimal editor affordances and a transparent toolbar background.
- `contained` - Applies shared Markdown styles while visually matching `N8nInput` textarea styling.

Component-level overrides are acceptable for editable TipTap behavior, selection, placeholder styling, and ProseMirror-specific DOM details.

## Template usage examples

**Basic editor:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nMarkdownEditor } from '@n8n/design-system';

const instructions = ref('# Instructions\n\nWrite clear, concise responses.');
</script>

<template>
	<N8nMarkdownEditor v-model="instructions" />
</template>
```

**Contained variant with save on blur:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nMarkdownEditor } from '@n8n/design-system';

const markdown = ref('');

const saveMarkdown = (value: string) => {
	// Persist value at the callsite.
};
</script>

<template>
	<N8nMarkdownEditor
		v-model="markdown"
		variant="contained"
		placeholder="Write instructions..."
		@blur="saveMarkdown"
	/>
</template>
```

**Hidden toolbar:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nMarkdownEditor } from '@n8n/design-system';

const markdown = ref('Use markdown shortcuts like **bold** and - lists.');
</script>

<template>
	<N8nMarkdownEditor v-model="markdown" show-toolbar="never" />
</template>
```

**Append custom extensions:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nMarkdownEditor } from '@n8n/design-system';

const markdown = ref('A lightweight editor without tables.');
const extensions = [];
</script>

<template>
	<N8nMarkdownEditor v-model="markdown" :extensions="extensions" />
</template>
```

**Access editor instance:**

```vue
<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3';
import { ref } from 'vue';
import { N8nMarkdownEditor } from '@n8n/design-system';

const markdown = ref('');
const editor = ref<Editor | null>(null);
</script>

<template>
	<N8nMarkdownEditor v-model="markdown" @ready="editor = $event" />
</template>
```

## Tests

Add unit tests for:

- Rendering an initial Markdown value as rich editor content.
- Emitting `update:modelValue`, `input`, and `change` on edits.
- Emitting the current Markdown value on blur.
- Emitting the TipTap editor instance through `ready`.
- Hiding the toolbar with `showToolbar="never"`.
- Applying `ghost` and `contained` variants.
- Respecting `disabled`.
- Respecting `readonly`.
- Toolbar commands for bold, italic, strikethrough, link, lists, and headings.
- GFM basics: tables, task lists, and strikethrough.
- Syncing external `modelValue` changes without update loops.

## Stories

Add Storybook stories for:

- Default
- Contained
- Ghost
- Without toolbar
- GFM content
- Disabled
- Readonly
- Long instructions example
- Skills Markdown example

## Open Decisions

- Confirm whether GFM footnotes are required for V1.
- Confirm whether tables need full toolbar editing controls in V1 or only parse/render support.
- Confirm the exact toolbar control list before implementation.
- Confirm whether `change` should emit on every TipTap transaction, on blur, or with debounce.
- Confirm the final path and import pattern for shared Markdown styles.

## Implementation Tasks

1. Add TipTap dependencies to `@n8n/design-system`.
2. Move Markdown SCSS into design-system.
3. Update chat Markdown renderer imports/classes to consume design-system Markdown styles.
4. Create `N8nMarkdownEditor` component source and types.
5. Add the design-system extension registry.
6. Implement Markdown string `v-model` sync.
7. Implement focus, blur, input, change, and ready emits.
8. Implement `ghost` and `contained` variants.
9. Implement the design-system owned toolbar.
10. Add unit tests.
11. Add Storybook stories.
12. Run package checks from `packages/frontend/@n8n/design-system`.
