# Import Scope

There are several ways to import Lodash methods: From single method files, as single members of the object, from single method packages, or as the full Lodash object.

For example:

| Import Syntax | Single Method                       | Destructured Members              | Full Import                   | Single Method Packages               |
|---------------|-------------------------------------|-----------------------------------|-------------------------------|-------------------------------------|
| CommonJS      | `const map = require('lodash/map')` | `const {map} = require('lodash')` | `const _ = require('lodash')` | `const map = require('lodash.map')` |
| ES6 Modules   | `import map from 'lodash/map'`      | `import {map} from 'lodash'`      | `import _ from 'lodash'`      | `import map from 'lodash.map'`      |


## Rule Details

This rule takes one argument - the preferred import scope (default is `method`):
* `method` for single method imports
* `member` for destructured members
* `full` for the full Lodash object
* `method-package` for importing single method packages


The following patterns are considered warnings:

```js
/*eslint lodash/import-scope: [2, "method"]*/

import _ from 'lodash' //Import individual methods from the Lodash module.

import {map} from 'lodash' //Import individual methods from the Lodash module.

import map from 'lodash.map' //Import individual methods from the Lodash module.

```

```js
/*eslint lodash/import-scope: [2, "member"]*/

import _ from 'lodash' //Import members from the full Lodash module.

import map from 'lodash/map' //Import members from the full Lodash module.

import map from 'lodash.map' //Import members from the full Lodash module.

```

```js
/*eslint lodash/import-scope: [2, "full"]*/

import map from 'lodash/map' //Use the full Lodash module

import {map} from 'lodash' //Use the full Lodash module

import map from 'lodash.map' //Use the full Lodash module

```

```js
/*eslint lodash/import-scope: [2, "method-package"]*/

import _ from 'lodash' //Import Lodash methods only from method packages (e.g. lodash.map)

import map from 'lodash/map' //Import Lodash methods only from method packages (e.g. lodash.map)

import {map} from 'lodash' //Import Lodash methods only from method packages (e.g. lodash.map)


```

The following patterns are not considered warnings:

```js
/*eslint lodash/import-scope: [2, "method"]*/

import map from 'lodash/map'

```

```js
/*eslint lodash/import-scope: [2, "member"]*/

import {map} from 'lodash'

import {filter as f} from 'lodash'

```

```js
/*eslint lodash/import-scope: [2, "full"]*/

import _ from 'lodash'

```

```js
/*eslint lodash/import-scope: [2, "method-package"]*/

import map from 'lodash.map'

```

## When Not To Use It

If you do not want to enforce a specific import scope in your code, then you can disable this rule.
