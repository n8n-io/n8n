# @n8n/tournament

Tournament is an output-compatible rewrite of [`riot-tmpl`](https://github.com/riot/tmpl) for template expression evaluation.

## Installation

```sh
pnpm add @n8n/tournament
```

## Features

- Compatible with `riot-tmpl` expressions
- ES6 syntax support, e.g. arrow functions and template literals
- Built-in AST hooks for expression manipulation
- TypeScript support

## Usage

```ts
import { Tournament } from '@n8n/tournament';

const tournament = new Tournament();

// simple expressions
tournament.execute('{{ 1 + 2 }}', {}); // 3

// with data context
tournament.execute('{{ user.name }}', { user: { name: 'John' } }); // 'John'

// template strings
tournament.execute('{{ `Hello ${user.name}!` }}', { user: { name: 'John' } }); // 'Hello John!'

// error handling
const tournament = new Tournament((error) => {
	console.error('Expression error:', error);
});
```

## Release

To release, update the version in `package.json` and run:

```sh
npm version {version}
npm publish
```

You will need permissions to publish via n8n's npm org.
