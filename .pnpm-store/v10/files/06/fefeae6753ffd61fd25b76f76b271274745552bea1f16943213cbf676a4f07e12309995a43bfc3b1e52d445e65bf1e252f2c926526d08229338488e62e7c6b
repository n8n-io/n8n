# @storybook/addon-themes

Storybook Addon Themes can be used to switch between multiple themes for components inside the preview in [Storybook](https://storybook.js.org?ref=readme).

![React Storybook Screenshot](https://user-images.githubusercontent.com/18172605/274302488-77a39112-cdbe-4d16-9966-0d8e9e7e3399.gif)

## Usage

Requires Storybook 7.0 or later. If you need to add it to your Storybook, you can run:

```sh
npm i -D @storybook/addon-themes
```

Then, add following content to [`.storybook/main.js`](https://storybook.js.org/docs/configure#configure-your-storybook-project?ref=readme):

```js
export default {
  addons: ['@storybook/addon-themes'],
};
```

### 👇 Tool specific configuration

For tool-specific setup, check out the recipes below

- [`@emotion/styled`](https://github.com/storybookjs/storybook/tree/next/code/addons/themes/docs/getting-started/emotion.md)
- [`@mui/material`](https://github.com/storybookjs/storybook/tree/next/code/addons/themes/docs/getting-started/material-ui.md)
- [`bootstrap`](https://github.com/storybookjs/storybook/tree/next/code/addons/themes/docs/getting-started/bootstrap.md)
- [`postcss`](https://github.com/storybookjs/storybook/tree/next/code/addons/themes/docs/getting-started/postcss.md)
- [`styled-components`](https://github.com/storybookjs/storybook/tree/next/code/addons/themes/docs/getting-started/styled-components.md)
- [`tailwind`](https://github.com/storybookjs/storybook/tree/next/code/addons/themes/docs/getting-started/tailwind.md)
- [`vuetify@3.x`](https://github.com/storybookjs/storybook/blob/next/code/addons/themes/docs/api.md#writing-a-custom-decorator)

Don't see your favorite tool listed? Don't worry! That doesn't mean this addon isn't for you. Check out the ["Writing a custom decorator"](https://github.com/storybookjs/storybook/blob/next/code/addons/themes/docs/api.md#writing-a-custom-decorator) section of the [api reference](https://github.com/storybookjs/storybook/blob/next/code/addons/themes/docs/api.md).

### ❗️ Overriding theme

If you want to override your theme for a particular component or story, you can use the `globals.theme` parameter.

```js
import React from 'react';
import { Button } from './Button';

export default {
  title: 'Example/Button',
  component: Button,
  // meta level override
  globals: { theme: 'dark' },
};

export const Primary = {
  args: {
    primary: true,
    label: 'Button',
  },
};

export const PrimaryDark = {
  args: {
    primary: true,
    label: 'Button',
  },
  // story level override
  globals: { theme: 'dark' },
};
```

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).
