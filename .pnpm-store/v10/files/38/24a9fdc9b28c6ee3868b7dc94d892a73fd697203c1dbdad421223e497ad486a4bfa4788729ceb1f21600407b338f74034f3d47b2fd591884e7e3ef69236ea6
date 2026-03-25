# v-code-diff

[![NPM version](https://img.shields.io/npm/v/v-code-diff.svg?style=flat)](https://www.npmjs.com/package/v-code-diff)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/v-code-diff?minimal=true)](https://www.npmjs.com/package/v-code-diff)

> A code diff display plugin, available for Vue2 / Vue3.

<p align='center'>
<b>English</b> | <a href="https://github.com/Shimada666/v-code-diff/blob/master/README-zh.md">简体中文</a>
</p>

Old Version:

0.x version, latest version 0.3.12 (traditional version, improved based
on [vue-code-diff](https://github.com/ddchef/vue-code-diff), is no longer maintained. We will try to align the
functionality of 0.x version in 1.x version and minimize migration cost as much as possible).
This project references the following projects, and I would like to express my gratitude to the original authors!

- [vue-diff](https://github.com/hoiheart/vue-diff)
- [vue-code-diff](https://github.com/ddchef/vue-code-diff)
- Github Code Diff

## Contents
- [Install](#Install)
- [Getting started](#Getting-started)
  - [Vue3](#Vue3)
  - [Vue2](#Vue2)
- [Props](#Props)
- [Events](#Events)
- [Demo](#Demo)
- [Extend languages](#extend-languages)
- [Migrate from 0.x version](#Migrate-from-0x-version)

## Install

install `v-code-diff`

```bash
# npm
npm i v-code-diff

# yarn
yarn add v-code-diff

# pnpm
pnpm add v-code-diff
```

Vue2.6 developers need install composition-api

```shell
pnpm add @vue/composition-api
```

## Getting Started

### Vue3

#### Register locally
> Recommend using local registration for better tree-shaking support.
```vue
<script setup>
import { CodeDiff } from 'v-code-diff'
</script>

<template>
  <div>
    <CodeDiff
      old-string="12345"
      new-string="3456"
      output-format="side-by-side"
    />
  </div>
</template>
```

#### Register globally

```ts
import { createApp } from 'vue'
import CodeDiff from 'v-code-diff'

app
  .use(CodeDiff)
  .mount('#app')
```

then

```vue
<template>
  <code-diff
    old-string="12345"
    new-string="3456"
    output-format="side-by-side"
  />
</template>
```

### Vue2

#### Register locally
> Recommend using local registration for better tree-shaking support.
```vue
<script>
import { CodeDiff } from 'v-code-diff'
export default {
  components: {
    CodeDiff
  }
}
</script>

<template>
  <div>
    <CodeDiff
      old-string="12345"
      new-string="3456"
      output-format="side-by-side"
    />
  </div>
</template>
```
#### Register globally
```ts
import Vue from 'vue'
import CodeDiff from 'v-code-diff'

Vue.use(CodeDiff)
```

## Demo

|        | npm | cdn                                                                            |
| ------ | --- | ------------------------------------------------------------------------------ |
| vue2   |     | [vue2-cdn](https://stackblitz.com/edit/v-code-diff-vue2-cdn?file=index.html)   |
| vue2.7 |     | [vue27-cdn](https://stackblitz.com/edit/v-code-diff-vue27-cdn?file=index.html) |
| vue3   |     | [vue3-cdn](https://stackblitz.com/edit/v-code-diff-vue3-cdn?file=index.html)   |

## Props

| Prop                | Description                                                                                                                                                             | Type      | Optional Values           | Default Value |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------|---------------------------|---------------|
| language            | Code language, such as typescript, defaults to plain text. [View all supported languages](https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md) | string    | -                         | plaintext     |
| oldString           | Old string                                                                                                                                                              | string    | -                         | -             |
| newString           | New string                                                                                                                                                              | string    | -                         | -             |
| context             | The number of lines to separate different parts so that they are not hidden                                                                                             | number    | -                         | 10            |
| outputFormat        | Display mode                                                                                                                                                            | string    | line-by-line，side-by-side | line-by-line  |
| diffStyle           | Difference style, word-level differences or letter-level differences                                                                                                    | string    | word, char                | word          |
|forceInlineComparison| Force inline comparison (word or char level)                                                                                                                            | boolean   | -                         | false         |
| trim                | Remove blank characters at the beginning and end of the string                                                                                                          | boolean   | -                         | false         |
| noDiffLineFeed      | Don't diff Windows line feed (CRLF) and Linux line feed (LF)                                                                                                            | boolean   | -                         | false         |
| maxHeight           | Maximum height of component, for example: 300px                                                                                                                         | string    | -                         | undefined     |
| filename            | Filename                                                                                                                                                                | string    | -                         | undefined     |
| newFilename         | New filename                                                                                                                                                            | string    | -                         | undefined     |
| hideHeader          | Hide header bar                                                                                                                                                         | boolean   | -                         | false         |
| hideStat            | Hide statistical part in the header bar                                                                                                                                 | boolean   | -                         | false         |
| theme               | Add dark mode                                                                                                                                                           | ThemeType | light , dark              | light         |
| ignoreMatchingLines | Give a pattern to ignore matching lines eg: '(time\|token)'                                                                                                             | string    | -                         | undefined     |

## Events

| Name | Description                 | Type                                                                            |
| ---- | --------------------------- | ------------------------------------------------------------------------------- |
| diff | triggers when diff finished | (result: {stat: { isChanged: boolean, addNum: number, delNum: number}}) => void |

## Slot

| Name | Description                                                 |
| ---- | ----------------------------------------------------------- |
| stat | Custom statistical content, The scope parameter is { stat } |

## Extend languages

In order to reduce the size of the packaged file, the system only supports the following commonly used languages by
default.

- plaintext
- xml/html
- javascript
- json
- yaml
- python
- java
- bash
- sql

If the language you need is not included, you can manually import the relevant language highlighting module.

```shell
pnpm add highlight.js
```
#### Register locally
> Recommend using local registration for better tree-shaking support.
```vue
<script>
import { CodeDiff, hljs } from 'v-code-diff'
import c from 'highlight.js/lib/languages/c'
// Extend C language
hljs.registerLanguage('c', c)
export default {
  components: {
    CodeDiff,
  }
}
</script>

<template>
  <div>
    <CodeDiff
      old-string="#include <stdio.h>"
      new-string="#include <stdio.h>\nint a = 1;"
      output-format="side-by-side"
      language="c"
    />
  </div>
</template>
```

#### Register globally
```typescript
import CodeDiff from 'v-code-diff'
// Extend C language
import c from 'highlight.js/lib/languages/c'

CodeDiff.hljs.registerLanguage('c', c)
```

## Migrate from 0.x version

The v-code-diff 1.x version has features such as reduced packaging size and improved performance compared to the 0.x
version. And we will try to align the functions with the 0.x version as much as possible to reduce your migration cost.

Key points:

- In the 1.x version, language recognition and highlighting will no longer be automatically performed, you need to
  manually specify the language type, such as language="python", if not specified, it will default to plaintext
  and will not be highlighted.
- In the 1.x version, due to the fact that rendering and highlighting are performed at the same time, the component
  events
  have been removed.
- In the 1.x version, the following component properties (Prop) have been changed:
  - highlight - removed
  - drawFileList - removed
  - fileName - rename to "filename"
  - newFilename - new
  - theme - new

Below is a detailed comparison of the two versions, you can refer to it to complete the migration.

### The difference of event.

The component events are no longer provided in the 1.x version as rendering and highlighting are carried out
simultaneously.

| Event Name    | Change Status      |
| ------------- | ------------------ |
| before-render | No longer provided |
| after-render  | No longer provided |

### The difference of prop.

| Prop                   | Description                                                                 | Change Status                                   |
| ---------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| highlight              | Control code highlighting                                                   | Removed in version 1.x                          |
| language               | Code language                                                               | None                                            |
| oldString              | Old string                                                                  | None                                            |
| newString              | New string                                                                  | None                                            |
| context                | The number of lines to separate different parts so that they are not hidden | None                                            |
| output-format          | Display mode                                                                | None                                            |
| diffStyle              | Difference style, word-level differences or letter-level differences        | None                                            |
| drawFileList           | Display file comparison list                                                | Removed in version 1.x                          |
| renderNothingWhenEmpty | Do not render when there is no comparison                                   | Removed in version 1.x                          |
| fileName               | File name                                                                   | To be determined, not under development         |
| newFilename            |                                                                | New in version 1. To be determined, not under development         |
| isShowNoChange         | Display source code when there is no comparison                             | Removed as it became the default in version 1.x |
| trim                   | Remove blank characters at the beginning and end of the string              | None                                            |
| noDiffLineFeed         | Don't diff Windows line feed (CRLF) and Linux line feed (LF)                | None                                            |
| theme                  | Add dark mode                                                               | New in version 1                                            |

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Shimada666/v-code-diff&type=Date)](https://star-history.com/#Shimada666/v-code-diff&Date)
