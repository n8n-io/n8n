# jest-validate

Generic configuration validation tool that helps you with warnings, errors and deprecation messages as well as showing users examples of correct configuration.

```bash
npm install --save jest-validate
```

## Usage

```js
import {validate} from 'jest-validate';

validate(config, validationOptions); // => {hasDeprecationWarnings: boolean, isValid: boolean}
```

Where `ValidationOptions` are:

```ts
type ValidationOptions = {
  comment?: string;
  condition?: (option: unknown, validOption: unknown) => boolean;
  deprecate?: (
    config: Record<string, unknown>,
    option: string,
    deprecatedOptions: DeprecatedOptions,
    options: ValidationOptions,
  ) => boolean;
  deprecatedConfig?: DeprecatedOptions;
  error?: (
    option: string,
    received: unknown,
    defaultValue: unknown,
    options: ValidationOptions,
    path?: Array<string>,
  ) => void;
  exampleConfig: Record<string, unknown>;
  recursive?: boolean;
  recursiveBlacklist?: Array<string>;
  recursiveDenylist?: Array<string>;
  title?: Title;
  unknown?: (
    config: Record<string, unknown>,
    exampleConfig: Record<string, unknown>,
    option: string,
    options: ValidationOptions,
    path?: Array<string>,
  ) => void;
};

type Title = {
  deprecation?: string;
  error?: string;
  warning?: string;
};
```

`exampleConfig` is the only option required.

## API

By default `jest-validate` will print generic warning and error messages. You can however customize this behavior by providing `options: ValidationOptions` object as a second argument:

Almost anything can be overwritten to suite your needs.

### Options

- `recursiveDenylist` – optional array of string keyPaths that should be excluded from deep (recursive) validation.
- `comment` – optional string to be rendered below error/warning message.
- `condition` – an optional function with validation condition.
- `deprecate`, `error`, `unknown` – optional functions responsible for displaying warning and error messages.
- `deprecatedConfig` – optional object with deprecated config keys.
- `exampleConfig` – the only **required** option with configuration against which you'd like to test.
- `recursive` - optional boolean determining whether recursively compare `exampleConfig` to `config` (default: `true`).
- `title` – optional object of titles for errors and messages.

You will find examples of `condition`, `deprecate`, `error`, `unknown`, and `deprecatedConfig` inside source of this repository, named respectively.

## exampleConfig syntax

`exampleConfig` should be an object with key/value pairs that contain an example of a valid value for each key. A configuration value is considered valid when:

- it matches the JavaScript type of the example value, e.g. `string`, `number`, `array`, `boolean`, `function`, or `object`
- it is `null` or `undefined`
- it matches the Javascript type of any of arguments passed to `MultipleValidOptions(...)`

The last condition is a special syntax that allows validating where more than one type is permissible; see example below. It's acceptable to have multiple values of the same type in the example, so you can also use this syntax to provide more than one example. When a validation failure occurs, the error message will show all other values in the array as examples.

## Examples

Minimal example:

```js
validate(config, {exampleConfig});
```

Example with slight modifications:

```js
validate(config, {
  comment: '  Documentation: http://custom-docs.com',
  deprecatedConfig,
  exampleConfig,
  title: {
    deprecation: 'Custom Deprecation',
    // leaving 'error' and 'warning' as default
  },
});
```

This will output:

#### Warning:

```bash
● Validation Warning:

  Unknown option transformx with value "<rootDir>/node_modules/babel-jest" was found.
  This is either a typing error or a user mistake. Fixing it will remove this message.

  Documentation: http://custom-docs.com
```

#### Error:

```bash
● Validation Error:

  Option transform must be of type:
    object
  but instead received:
    string

  Example:
  {
    "transform": {
      "\\.js$": "<rootDir>/preprocessor.js"
    }
  }

  Documentation: http://custom-docs.com
```

## Example validating multiple types

```js
import {multipleValidOptions} from 'jest-validate';

validate(config, {
  // `bar` will accept either a string or a number
  bar: multipleValidOptions('string is ok', 2),
});
```

#### Error:

```bash
● Validation Error:

  Option foo must be of type:
    string or number
  but instead received:
    array

  Example:
  {
    "bar": "string is ok"
  }

  or

  {
    "bar": 2
  }

  Documentation: http://custom-docs.com
```

#### Deprecation

Based on `deprecatedConfig` object with proper deprecation messages. Note custom title:

```bash
Custom Deprecation:

  Option scriptPreprocessor was replaced by transform, which support multiple preprocessors.

  Jest now treats your current configuration as:
  {
    "transform": {".*": "xxx"}
  }

  Please update your configuration.

  Documentation: http://custom-docs.com
```
