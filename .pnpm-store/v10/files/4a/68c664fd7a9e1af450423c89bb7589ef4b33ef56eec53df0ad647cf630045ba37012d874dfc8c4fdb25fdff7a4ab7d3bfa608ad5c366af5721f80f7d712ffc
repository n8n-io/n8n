declare namespace cleanStack {
	interface Options {
		/**
		Prettify the file paths in the stack:

		`/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `~/dev/clean-stack/unicorn.js:2:15`

		@default false
		*/
		readonly pretty?: boolean;
	}
}

/**
Clean up error stack traces. Removes the mostly unhelpful internal Node.js entries.

@param stack - The `stack` property of an `Error`.

@example
```
import cleanStack = require('clean-stack');

const error = new Error('Missing unicorn');

console.log(error.stack);

// Error: Missing unicorn
//     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
//     at Module._compile (module.js:409:26)
//     at Object.Module._extensions..js (module.js:416:10)
//     at Module.load (module.js:343:32)
//     at Function.Module._load (module.js:300:12)
//     at Function.Module.runMain (module.js:441:10)
//     at startup (node.js:139:18)

console.log(cleanStack(error.stack));

// Error: Missing unicorn
//     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
```
*/
declare function cleanStack(
	stack: string,
	options?: cleanStack.Options
): string;

export = cleanStack;
