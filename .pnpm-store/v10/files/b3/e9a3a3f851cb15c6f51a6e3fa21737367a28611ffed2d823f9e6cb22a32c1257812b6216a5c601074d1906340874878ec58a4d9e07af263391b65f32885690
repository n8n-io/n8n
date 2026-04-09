# strip-indent

> Strip leading whitespace from each line in a string

The line with the least number of leading whitespace, ignoring empty lines, determines the number to remove.

Useful for removing redundant indentation.

## Install

```sh
npm install strip-indent
```

## Usage

```js
import stripIndent from 'strip-indent';

const string = '\tunicorn\n\t\tcake';
/*
	unicorn
		cake
*/

stripIndent(string);
/*
unicorn
	cake
*/
```

## API

### stripIndent(string)

Strip leading whitespace from each line in a string.

The line with the least number of leading whitespace, ignoring empty lines, determines the number to remove.

### dedent(string)

Strip leading whitespace from each line in a string and remove surrounding blank lines.

Like `stripIndent()`, but also removes leading and trailing lines that contain only whitespace. Useful for template literals and multi-line strings where you want clean boundaries.

```js
import {dedent} from 'strip-indent';

dedent(`
	unicorn
		cake
`);
/*
unicorn
	cake
*/
```

## Related

- [strip-indent-cli](https://github.com/sindresorhus/strip-indent-cli) - CLI for this module
- [indent-string](https://github.com/sindresorhus/indent-string) - Indent each line in a string
- [redent](https://github.com/sindresorhus/redent) - Strip redundant indentation and indent the string
