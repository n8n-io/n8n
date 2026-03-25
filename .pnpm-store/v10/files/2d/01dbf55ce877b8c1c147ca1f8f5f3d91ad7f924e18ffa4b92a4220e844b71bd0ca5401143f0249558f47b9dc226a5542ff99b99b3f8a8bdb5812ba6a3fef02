When using `node-gyp` you might see an error like this when attempting to compile/install a node.js native addon:

```
$ npm install bcrypt
npm http GET https://registry.npmjs.org/bcrypt/0.7.5
npm http 304 https://registry.npmjs.org/bcrypt/0.7.5
npm http GET https://registry.npmjs.org/bindings/1.0.0
npm http 304 https://registry.npmjs.org/bindings/1.0.0

> bcrypt@0.7.5 install /home/ubuntu/public/song-swap/node_modules/bcrypt
> node-gyp rebuild

gyp ERR! configure error
gyp ERR! stack Error: "pre" versions of node cannot be installed, use the --nodedir flag instead
gyp ERR! stack     at install (/usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/install.js:69:16)
gyp ERR! stack     at Object.self.commands.(anonymous function) [as install] (/usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/node-gyp.js:56:37)
gyp ERR! stack     at getNodeDir (/usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/configure.js:219:20)
gyp ERR! stack     at /usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/configure.js:105:9
gyp ERR! stack     at ChildProcess.exithandler (child_process.js:630:7)
gyp ERR! stack     at ChildProcess.EventEmitter.emit (events.js:99:17)
gyp ERR! stack     at maybeClose (child_process.js:730:16)
gyp ERR! stack     at Process.ChildProcess._handle.onexit (child_process.js:797:5)
gyp ERR! System Linux 3.5.0-21-generic
gyp ERR! command "node" "/usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" "rebuild"
gyp ERR! cwd /home/ubuntu/public/song-swap/node_modules/bcrypt
gyp ERR! node -v v0.11.2-pre
gyp ERR! node-gyp -v v0.9.5
gyp ERR! not ok
npm ERR! bcrypt@0.7.5 install: `node-gyp rebuild`
npm ERR! `sh "-c" "node-gyp rebuild"` failed with 1
npm ERR!
npm ERR! Failed at the bcrypt@0.7.5 install script.
npm ERR! This is most likely a problem with the bcrypt package,
npm ERR! not with npm itself.
npm ERR! Tell the author that this fails on your system:
npm ERR!     node-gyp rebuild
npm ERR! You can get their info via:
npm ERR!     npm owner ls bcrypt
npm ERR! There is likely additional logging output above.

npm ERR! System Linux 3.5.0-21-generic
npm ERR! command "/usr/local/bin/node" "/usr/local/bin/npm" "install" "bcrypt"
npm ERR! cwd /home/ubuntu/public/song-swap
npm ERR! node -v v0.11.2-pre
npm ERR! npm -v 1.2.18
npm ERR! code ELIFECYCLE
npm ERR!
npm ERR! Additional logging details can be found in:
npm ERR!     /home/ubuntu/public/song-swap/npm-debug.log
npm ERR! not ok code 0
```

The main error here is:

```
Error: "pre" versions of node cannot be installed, use the --nodedir flag instead
```

This error is caused when you attempt to compile a native addon using a version of node.js with `-pre` at the end of the version number:

``` bash
$ node -v
v0.10.4-pre
```

## How to avoid (the short answer)

To avoid this error completely just use a stable release of node.js. i.e. `v0.10.4`, and __not__ `v0.10.4-pre`.

## How to fix (the long answer)

This error happens because `node-gyp` does not know what header files were used to compile your "pre" version of node, and therefore it needs you to specify the node source code directory path using the `--nodedir` flag.

For example, if I compiled my development ("pre") version of node.js using the source code in `/Users/nrajlich/node`, then I could invoke `node-gyp` like:

``` bash
$ node-gyp rebuild --nodedir=/Users/nrajlich/node
```

Or install an native addon through `npm` like:

``` bash
$ npm install bcrypt --nodedir=/Users/nrajlich/node
```

### Always use `--nodedir`

__Note:__ This is for advanced users who use `-pre` versions of node more often than tagged releases.

If you're invoking `node-gyp` through `npm`, then you can leverage `npm`'s configuration system and not have to specify the `--nodedir` flag all the time:

``` bash
$ npm config set nodedir /Users/nrajlich/node
```