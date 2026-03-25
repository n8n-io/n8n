/**
Import a module lazily.

@example
```
// Pass in `require` or a custom import function
import importLazy = require('import-lazy');
const _ = importLazy(require)('lodash');

// Instead of referring to its exported properties directly…
_.isNumber(2);

// …it's cached on consecutive calls
_.isNumber('unicorn');

// Works out of the box for functions and regular properties
const stuff = importLazy(require)('./math-lib');
console.log(stuff.sum(1, 2)); // => 3
console.log(stuff.PHI); // => 1.618033
```
*/
declare function importLazy<T = unknown>(
	importFn: (moduleId: string) => T
): (moduleId: string) => T;

export = importLazy;
