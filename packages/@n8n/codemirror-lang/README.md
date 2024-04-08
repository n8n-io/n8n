# codemirror-lang-n8n-expression

n8n expression language support for CodeMirror 6.

## Usage

Install n8n expression language support:

```sh
npm i codemirror-lang-n8n-expression
```

Install setup dependencies:

```sh
npm i @codemirror/language @lezer/common @lezer/javascript
```

Set up language support:

```js
import { parserWithMetaData as n8nParser } from 'codemirror-lang-n8n-expression';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { parser as jsParser } from '@lezer/javascript';

const n8nPlusJsParser = n8nParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;

		return node.name === 'Resolvable'
			? { parser: jsParser, overlay: (node) => node.type.name === 'Resolvable' }
			: null;
	}),
});

const n8nLanguage = LRLanguage.define({ parser: n8nPlusJsParser });

export function n8nExpressionLanguageSupport() {
	return new LanguageSupport(n8nLanguage);
}
```

## Author

© 2022 [Iván Ovejero](https://github.com/ivov)

## License

Distributed under the [MIT License](LICENSE.md).
