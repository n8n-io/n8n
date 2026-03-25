This library aims to provide codegen helpers and data structure for Vue language plugin API v1.x that does not depend on Volar runtime.

## Why "Muggle"?

A better situation is Volar can use magic-string on the Vue plugin API, but currently can't do this easily.

This solution is just for Vue language plugin API v1.x and planned to be deprecate in v2.

## Usage

The example is base-on [magic-string readme](https://github.com/rich-harris/magic-string#usage).

```html
<script>problems = 99</script>

<more-script lang="js">console.log( answer )</more-script>
```

```ts
import {
	toString,
	replace,
} from 'muggle-string';

/** @type {import('@volar/vue-language-core').VueLanguagePlugin} */
const plugin = () => {
	return {
		name: 'example-vue-language-plugin',
		version: 1,
		resolveEmbeddedFile(fileName, sfc, embeddedFile) {
			if (embeddedFile.fileName.replace(fileName, '').match(/^\.(js|ts|jsx|tsx)$/)) {

				const s = embeddedFile.content;
				toString(s); // 'problems = 99'

				replace(s, 'problems', 'answer');
				toString(s); // 'answer = 99'

				replace(s, '99', '42');
				toString(s); // 'answer = 42'

				// add string by Array method directly
				s.unshift('var ');
				s.push(';');
				toString(s); // 'var answer = 42;'

				for (const block of sfc.customBlocks) {
					if (block.type === 'more-script') {
						s.push([
							block.content, // text to add
							block.name, // source
							0, // content offset in source
							{
								// language capabilities to enable in this segment
								hover: true,
								references: true,
								definition: true,
								diagnostic: true,
								rename: true,
								completion: true,
								semanticTokens: true,
							},
						]);
						toString(s); // 'var answer = 42;console.log( answer )'
					}
				}
			}
		}
	};
};
module.exports = plugin;
```
