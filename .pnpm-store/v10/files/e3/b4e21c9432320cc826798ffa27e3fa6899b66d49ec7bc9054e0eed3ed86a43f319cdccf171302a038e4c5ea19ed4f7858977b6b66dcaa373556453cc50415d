# process-on-spawn

![Tests][tests-status]
[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![MIT][license-image]](LICENSE)

Execute callbacks when child processes are spawned.

## Usage

```js
'use strict';

const processOnSpawn = require('process-on-spawn');
processOnSpawn.addListener(opts => {
  opts.env.CHILD_VARIABLE = 'value';
});
```

### listener(opts)

* `options` \<[Object]\>
  * `execPath` \<[string]\> The command to run.
  * `args` \<[string\[\]][string]\> Arguments of the child process.
  * `cwd` \<[string]\> Current working directory of the child process.
  * `detached` \<[boolean]\> The child will be prepared to run independently of its parent process.
  * `uid` \<[number]\> The user identity to be used by the child.
  * `gid` \<[number]\> The group identity to be used by the child.
  * `windowsVerbatimArguments` \<[boolean]\> No quoting or escaping of arguments will be done on Windows.
  * `windowsHide` \<[boolean]\> The subprocess console window that would normally be created on Windows systems will be hidden.

All properties except `env` are read-only.

### processOnSpawn.addListener(listener)

Add a listener to be called after any listeners already attached.

### processOnSpawn.prependListener(listener)

Insert a listener to be called before any listeners already attached.

### processOnSpawn.removeListener(listener)

Remove the specified listener.  If the listener was added multiple times only
the first is removed.

### processOnSpawn.removeAllListeners()

Remove all attached listeners.

[npm-image]: https://img.shields.io/npm/v/process-on-spawn.svg
[npm-url]: https://npmjs.org/package/process-on-spawn
[tests-status]: https://github.com/cfware/process-on-spawn/workflows/Tests/badge.svg
[downloads-image]: https://img.shields.io/npm/dm/process-on-spawn.svg
[downloads-url]: https://npmjs.org/package/process-on-spawn
[license-image]: https://img.shields.io/npm/l/process-on-spawn.svg
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type
