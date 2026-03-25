# Updating the npm-bundled version of node-gyp

[Many issues](https://github.com/nodejs/node-gyp/labels/ERR%21%20node-gyp%20-v%20%3C%3D%20v5.1.0) are opened by users who are
not running a [current version of node-gyp](https://github.com/nodejs/node-gyp/releases).

`npm` bundles its own, internal, copy of `node-gyp`. This internal copy is independent of any globally installed copy of node-gyp that
may have been installed via `npm install -g node-gyp`.

Generally, npm's library files are installed inside your global "node_modules", where npm is installed (run `npm prefix` and add `lib/node_modules`, or just `node_modules` for Windows). There are some exceptions to this. Inside this global `node_modules/` there will be an `npm/` directory and inside this you'll find a `node_modules/node-gyp/` directory. So it may look something like `/usr/local/lib/node_modules/npm/node_modules/node-gyp/`. This is the version of node-gyp that ships with npm.

When you install a _new_ version of node-gyp outside of npm, it'll go into your global node_modules, but not under the `npm/node_modules`. So that may look like `/usr/local/lib/node_modules/node-gyp/`. It'll have the `node-gyp` executable linked into your `PATH` so running `node-gyp` will use this version.

The catch is that npm won't use this version unless you tell it to, it'll keep on using the one you have installed. You need to instruct it to by setting the `node_gyp` config variable (which goes into your `~/.npmrc`). You do this by running the `npm config set` command as below. Then npm will use the command in the path you supply whenever it needs to build a native addon.

**Important**: You also need to remember to unset this when you upgrade npm with a newer version of node-gyp, or you have to manually keep your globally installed node-gyp to date. See "Undo" below.

## Linux and macOS
```
npm install --global node-gyp@latest
npm config set node_gyp $(npm prefix -g)/lib/node_modules/node-gyp/bin/node-gyp.js
```

`sudo` may be required for the first command if you get a permission error.

## Windows

### Windows Command Prompt
```
npm install --global node-gyp@latest
for /f "delims=" %P in ('npm prefix -g') do npm config set node_gyp "%P\node_modules\node-gyp\bin\node-gyp.js"
```

### Powershell
```
npm install --global node-gyp@latest
npm prefix -g | % {npm config set node_gyp "$_\node_modules\node-gyp\bin\node-gyp.js"}
```

## Undo
**Beware** if you don't unset the `node_gyp` config option, npm will continue to use the globally installed version of node-gyp rather than the one it ships with, which may end up being newer.

```
npm config delete node_gyp
npm uninstall --global node-gyp
```
