# eslint-plugin-unused-imports

Find and remove unused es6 module imports. It works by splitting up the `no-unused-vars` rule depending on it being an import statement in the AST and providing an autofix rule to remove the nodes if they are imports. This plugin composes the rule `no-unused-vars` of either the typescript or js plugin so be aware that the other plugins needs to be installed and reporting correctly for this to do so.

## _Versions_

-   Version 4.1.x is for eslint 9 with @typescript-eslint/eslint-plugin v8 to v5
-   Version 3.x.x is for eslint 8 with @typescript-eslint/eslint-plugin 6 - 7
-   Version 2.x.x is for eslint 8 with @typescript-eslint/eslint-plugin 5
-   Version 1.x.x is for eslint 6 and 7.

## Typescript

If running typescript with [@typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) make sure to use both `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`.

## React

If writing react code you need to install `eslint-plugin-react` and enable the two rules `react/jsx-uses-react` and `react/jsx-uses-vars`. Otherwise all imports for components will be reported unused.

## Installation

You'll first need to install [ESLint](http://eslint.org) (and [@typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) if using typescript):

```bash
npm i eslint --save-dev
```

Next, install `eslint-plugin-unused-imports`:

```bash
npm install eslint-plugin-unused-imports --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-unused-imports` globally.

## Usage

Add `unused-imports` to the plugins section of your `eslint.config.js` configuration file.

```js
import unusedImports from "eslint-plugin-unused-imports";

export default [{
    plugins: {
        "unused-imports": unusedImports,
    },
    rules: {
        "no-unused-vars": "off", // or "@typescript-eslint/no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
            "warn",
            {
                "vars": "all",
                "varsIgnorePattern": "^_",
                "args": "after-used",
                "argsIgnorePattern": "^_",
            },
        ]
    }
}];
```

## Supported Rules

-   `no-unused-imports`
-   `no-unused-vars`
