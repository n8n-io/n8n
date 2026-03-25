```javascript
var assert = require('assert')
var compare = require('spdx-compare')

assert(compare.gt('GPL-3.0', 'GPL-2.0'))
assert(compare.gt('GPL-3.0-only', 'GPL-2.0-only'))
assert(compare.gt('GPL-2.0-or-later', 'GPL-2.0-only'))
assert(compare.eq('GPL-3.0-or-later', 'GPL-3.0-only'))
assert(compare.lt('MPL-1.0', 'MPL-2.0'))

assert(compare.gt('LPPL-1.3a', 'LPPL-1.0'))
assert(compare.gt('LPPL-1.3c', 'LPPL-1.3a'))
assert(!compare.gt('MIT', 'ISC'))
assert(!compare.gt('OSL-1.0', 'OPL-1.0'))
assert(compare.gt('AGPL-3.0', 'AGPL-1.0'))

assert.throws(function () {
  compare.gt('(MIT OR ISC)', 'GPL-3.0')
}, '"(MIT OR ISC)" is not a simple license identifier')
```
