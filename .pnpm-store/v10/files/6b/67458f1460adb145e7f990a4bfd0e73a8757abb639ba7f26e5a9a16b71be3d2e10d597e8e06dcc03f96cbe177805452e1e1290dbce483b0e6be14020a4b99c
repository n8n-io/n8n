# CSF Plugin

The CSF plugin reads CSF files and enriches their content via static analysis.
It supports Webpack, Vite, and other bundlers using [unplugin](https://github.com/unjs/unplugin).

## Source snippets

CSF plugin can add static source snippets to each story. For example:

```js
export const Basic = () => <Button />;
```

Would be transformed to:

```js
export const Basic = () => <Button />;
Basic.parameters = {
  storySource: {
    source: '() => <Button />',
  },
  ...Basic.parameters,
};
```

This allows `@storybook/addon-docs` to display the static source snippet.

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
