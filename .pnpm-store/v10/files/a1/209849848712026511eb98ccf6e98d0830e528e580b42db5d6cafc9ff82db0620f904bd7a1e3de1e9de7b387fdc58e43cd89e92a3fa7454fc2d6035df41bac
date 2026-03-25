<center>
  <img src="https://raw.githubusercontent.com/storybookjs/storybook/next/code/addons/docs/docs/media/hero.png" width="100%" />
</center>

# Storybook Docs

> migration guide: This page documents the method to configure Storybook introduced recently in 7.0.0, consult the [migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md) if you want to migrate to this format of configuring Storybook.

Storybook Docs transforms your Storybook stories into world-class component documentation.

**DocsPage.** Out of the box, all your stories get a `DocsPage`. `DocsPage` is a zero-config aggregation of your component stories, text descriptions, docgen comments, props tables, and code examples into clean, readable pages.

**MDX.** If you want more control, `MDX` allows you to write long-form markdown documentation and include stories in one file. You can also use it to write pure documentation pages and embed them inside your Storybook alongside your stories.

Just like Storybook, Docs supports every major view layer including React, Vue 3, Angular, HTML, Web components, Svelte, and many more.

Read on to learn more:

- [Storybook Docs](#storybook-docs)
  - [DocsPage](#docspage)
  - [MDX](#mdx)
  - [Framework support](#framework-support)
  - [Installation](#installation)
    - [Be sure to check framework specific installation needs](#be-sure-to-check-framework-specific-installation-needs)
  - [Preset options](#preset-options)
  - [TypeScript configuration](#typescript-configuration)
  - [More resources](#more-resources)

## DocsPage

When you [install Docs](#installation), every story gets a `DocsPage`. `DocsPage` pulls information from your stories, components, source code, and story metadata to construct a sensible, zero-config default.

Click on the `Docs` tab to see it:

<center>
  <img src="https://raw.githubusercontent.com/storybookjs/storybook/next/code/addons/docs/docs/media/docs-tab.png" width="100%" />
</center>

For more information on how it works, see the [`DocsPage` reference](https://github.com/storybookjs/storybook/blob/next/code/addons/docs/docs/docspage.md).

## MDX

`MDX` is a syntax for writing long-form documentation with stories side-by-side in the same file. In contrast to `DocsPage`, which provides smart documentation out of the box, `MDX` gives you full control over your component documentation.

Here's an example file:

<!-- prettier-ignore-start -->

```md
import { Meta, Story, Canvas } from '@storybook/addon-docs/blocks';
import * as CheckboxStories from './Checkbox.stories';

<Meta title="MDX/Checkbox" of={CheckboxStories} />

# Checkbox

With `MDX` we can include a story for `Checkbox` right in the middle of our
markdown documentation.

<Canvas>
  <Story of={CheckboxStories.Unchecked} />
</Canvas>
```

<!-- prettier-ignore-end -->

And here's how that's rendered in Storybook:

<center>
  <img src="https://raw.githubusercontent.com/storybookjs/storybook/next/code/addons/docs/docs/media/mdx-simple.png" width="100%" />
</center>

For more information on `MDX`, see the [`MDX` reference](https://github.com/storybookjs/storybook/blob/next/code/addons/docs/docs/mdx.md).

## Framework support

Storybook Docs supports all view layers that Storybook supports except for React Native (currently). There are some framework-specific features as well, such as props tables and inline story rendering. The following page captures the current state of support:

[Framework Support](https://storybook.js.org/docs/configure/integration/frameworks-feature-support?ref=readme)

**Note:** `#` = WIP support

Want to add enhanced features to your favorite framework? Check out this [dev guide](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/multiframework.md)

## Installation

First add the package. Make sure that the versions for your `@storybook/*` packages match:

```sh
yarn add -D @storybook/addon-docs
```

Docs has peer dependencies on `react`. If you want to write stories in MDX, you may need to add this dependency as well:

```sh
yarn add -D react
```

Then add the following to your `.storybook/main.js`:

```js
export default {
  stories: [
    '../src/**/*.mdx', // 👈 Add this, to match your project's structure
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs', // 👈 Also add this
  ],
};
```

### Be sure to check framework specific installation needs

- [React](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/react) (covered here)
- [Vue 3](https://github.com/storybookjs/storybook/blob/next/code/addons/docs/vue3)
- [Angular](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/angular)
- [Ember](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/ember)
- [Web Components](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/web-components)
- [Common setup (all other frameworks)](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/common)

## Preset options

The `addon-docs` preset has a few configuration options that can be used to configure its babel/webpack loading behavior. Here's an example of how to use the preset with options:

```js
export default {
  addons: [
    {
      name: '@storybook/addon-docs',
      options: {
        csfPluginOptions: null,
        mdxPluginOptions: {},
      },
    },
  ],
};
```

`csfPluginOptions` is an object for configuring `@storybook/csf-plugin`. When set to `null` it tells docs not to run the `csf-plugin` at all, which can be used as an optimization, or if you're already using `csf-plugin` in your `main.js`.

> With the release of version 7.0, it is no longer possible to import `.md` files directly into Storybook using the `transcludeMarkdown` [option](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#importing-plain-markdown-files-with-transcludemarkdown-has-changed). Instead, we recommend using the [`Markdown`](https://storybook.js.org/docs/api/doc-blocks/doc-block-markdown?ref=readme) Doc Block for importing Markdown files into your Storybook documentation.

## TypeScript configuration

As of SB6 [TypeScript is zero-config](https://storybook.js.org/docs/configure/integration/typescript?ref=readme) and should work with SB Docs out of the box. For advanced configuration options, refer to the [Props documentation](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/props-tables.md).

## More resources

Want to learn more? Here are some more articles on Storybook Docs:

- References: [DocsPage](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/docspage.md) / [MDX](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/mdx.md) / [FAQ](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/faq.md) / [Recipes](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/recipes.md) / [Theming](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/theming.md) / [Props](https://github.com/storybookjs/storybook/tree/next/code/addons/docs/docs/props-tables.md)
- Announcements: [Vision](https://medium.com/storybookjs/storybook-docs-sneak-peak-5be78445094a) / [DocsPage](https://medium.com/storybookjs/storybook-docspage-e185bc3622bf) / [MDX](https://medium.com/storybookjs/rich-docs-with-storybook-mdx-61bc145ae7bc) / [Framework support](https://medium.com/storybookjs/storybook-docs-for-new-frameworks-b1f6090ee0ea)
- Example: [Storybook Design System](https://github.com/storybookjs/design-system)

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
