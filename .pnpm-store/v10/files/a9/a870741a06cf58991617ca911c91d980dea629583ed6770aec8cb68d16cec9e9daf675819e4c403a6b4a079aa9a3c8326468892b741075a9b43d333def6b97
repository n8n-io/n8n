# path-exists

> Check if a path exists

NOTE: `fs.existsSync` has been un-deprecated in Node.js since 6.8.0. If you only need to check synchronously, this module is not needed.

Never use this before handling a file though:

> In particular, checking if a file exists before opening it is an anti-pattern that leaves you vulnerable to race conditions: another process may remove the file between the calls to `fs.exists()` and `fs.open()`. Just open the file and handle the error when it's not there.

## Install

```
$ npm install path-exists
```

## Usage

```js
// foo.js
import {pathExists} from 'path-exists';

console.log(await pathExists('foo.js'));
//=> true
```

## API

### pathExists(path)

Returns a `Promise<boolean>` of whether the path exists.

### pathExistsSync(path)

Returns a `boolean` of whether the path exists.

## Related

- [path-exists-cli](https://github.com/sindresorhus/path-exists-cli) - CLI for this module
- [path-type](https://github.com/sindresorhus/path-type) - Check if a path exists and whether it's a file, directory, or symlink

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-path-exists?utm_source=npm-path-exists&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
