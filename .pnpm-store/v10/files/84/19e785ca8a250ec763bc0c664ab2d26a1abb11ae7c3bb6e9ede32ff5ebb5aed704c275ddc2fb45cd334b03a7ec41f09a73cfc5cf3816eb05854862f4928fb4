# babel-jest

[Babel](https://github.com/babel/babel) [jest](https://github.com/facebook/jest) plugin

## Usage

If you are already using `jest-cli`, add `babel-jest` and it will automatically compile JavaScript code using Babel.

```bash
yarn add --dev babel-jest @babel/core
```

If you would like to write your own preprocessor, uninstall and delete babel-jest and set the [config.transform](https://jestjs.io/docs/configuration#transform-object-string-string) option to your preprocessor.

## Setup

_Note: this step is only required if you are using `babel-jest` with additional code preprocessors._

To explicitly define `babel-jest` as a transformer for your JavaScript code, map _.js_ files to the `babel-jest` module. Typescript files are also supported.

```json
"transform": {
  "\\.[jt]sx?$": "babel-jest"
},
```
