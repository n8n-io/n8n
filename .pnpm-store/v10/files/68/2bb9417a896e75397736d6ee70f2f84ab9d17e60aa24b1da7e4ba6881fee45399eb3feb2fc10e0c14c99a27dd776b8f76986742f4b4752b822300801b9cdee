# email-providers

**A list of common eMail providers.** [Thanks to @goware](https://github.com/goware/emailproviders)!

[![npm version](https://img.shields.io/npm/v/email-providers.svg)](https://www.npmjs.com/package/email-providers)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/email-providers.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)

The npm package (not this Git repo) contains the following data:

- roughly 8k domains of email providers in `all.json`, and
- roughly 360 with a [Majestic Million rank](https://majestic.com/reports/majestic-million) of `< 100000` in `common.json`.


## Installing

```shell
npm install email-providers
```


## Usage

The [package published to npm](https://npmjs.com/email-providers) contains two files `all.json` and `common.json`. The `index.js` entrypoint also exports `all.json`.

```js
// use ES Modules with import assertions if your environment already supports them
// https://github.com/tc39/proposal-import-assertions
import all from 'email-providers/all.json' assert {type: 'json'}
import common from 'email-providers/common.json' assert {type: 'json'}
import alsoAll from 'email-providers'

// alernatively, use module.createRequire
import {createRequire} from 'module'
const require = createRequire(import.meta.url)

// in a CommonJS environment, you can use require right away, of course
const all = require('email-providers/all.json')
const common = require('email-providers/common.json')

all.length    // 4149
common.length // 312
all[0]        // 1033edge.com
common[0]     // yahoo.com
```


## Contributing

If you **have a question**, **found a bug** or want to **propose a feature**, have a look at [the issues page](https://github.com/derhuerst/email-providers/issues).
