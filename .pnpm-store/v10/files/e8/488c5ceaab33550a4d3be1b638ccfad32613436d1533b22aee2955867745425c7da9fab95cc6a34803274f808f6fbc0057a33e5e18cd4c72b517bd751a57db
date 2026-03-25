# ⚙️ node-sqlite3

Asynchronous, non-blocking [SQLite3](https://sqlite.org/) bindings for [Node.js](http://nodejs.org/).

[![Latest release](https://img.shields.io/github/release/TryGhost/node-sqlite3.svg)](https://www.npmjs.com/package/sqlite3)
![Build Status](https://github.com/TryGhost/node-sqlite3/workflows/CI/badge.svg?branch=master)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fmapbox%2Fnode-sqlite3.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fmapbox%2Fnode-sqlite3?ref=badge_shield)
[![N-API v3 Badge](https://img.shields.io/badge/N--API-v3-green.svg)](https://nodejs.org/dist/latest/docs/api/n-api.html#n_api_n_api)
[![N-API v6 Badge](https://img.shields.io/badge/N--API-v6-green.svg)](https://nodejs.org/dist/latest/docs/api/n-api.html#n_api_n_api)

# Features

 - Straightforward query and parameter binding interface
 - Full Buffer/Blob support
 - Extensive [debugging support](https://github.com/tryghost/node-sqlite3/wiki/Debugging)
 - [Query serialization](https://github.com/tryghost/node-sqlite3/wiki/Control-Flow) API
 - [Extension support](https://github.com/TryGhost/node-sqlite3/wiki/API#databaseloadextensionpath-callback), including bundled support for the [json1 extension](https://www.sqlite.org/json1.html)
 - Big test suite
 - Written in modern C++ and tested for memory leaks
 - Bundles SQLite v3.44.2, or you can build using a local SQLite

# Installing

You can use [`npm`](https://github.com/npm/cli) or [`yarn`](https://github.com/yarnpkg/yarn) to install `sqlite3`:

* (recommended) Latest published package:
```bash
npm install sqlite3
# or
yarn add sqlite3
```
* GitHub's `master` branch: `npm install https://github.com/tryghost/node-sqlite3/tarball/master`

### Prebuilt binaries

`sqlite3` v5+ was rewritten to use [Node-API](https://nodejs.org/api/n-api.html) so prebuilt binaries do not need to be built for specific Node versions. `sqlite3` currently builds for both Node-API v3 and v6. Check the [Node-API version matrix](https://nodejs.org/api/n-api.html#node-api-version-matrix) to ensure your Node version supports one of these. The prebuilt binaries should be supported on Node v10+.

The module uses [`prebuild-install`](https://github.com/prebuild/prebuild-install) to download the prebuilt binary for your platform, if it exists. These binaries are hosted on GitHub Releases for `sqlite3` versions above 5.0.2, and they are hosted on S3 otherwise. The following targets are currently provided:

* `darwin-arm64`
* `darwin-x64`
* `linux-arm64`
* `linux-x64`
* `linuxmusl-arm64`
* `linuxmusl-x64`
* `win32-ia32`
* `win32-x64`

Unfortunately, [prebuild](https://github.com/prebuild/prebuild/issues/174) cannot differentiate between `armv6` and `armv7`, and instead uses `arm` as the `{arch}`. Until that is fixed, you will still need to install `sqlite3` from [source](#source-install).

Support for other platforms and architectures may be added in the future if CI supports building on them.

If your environment isn't supported, it'll use `node-gyp` to build SQLite, but you will need to install a C++ compiler and linker.

### Other ways to install

It is also possible to make your own build of `sqlite3` from its source instead of its npm package ([See below.](#source-install)).

The `sqlite3` module also works with [node-webkit](https://github.com/rogerwang/node-webkit) if node-webkit contains a supported version of Node.js engine. [(See below.)](#building-for-node-webkit)

SQLite's [SQLCipher extension](https://github.com/sqlcipher/sqlcipher) is also supported. [(See below.)](#building-for-sqlcipher)

# API

See the [API documentation](https://github.com/TryGhost/node-sqlite3/wiki/API) in the wiki.

# Usage

**Note:** the module must be [installed](#installing) before use.

``` js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE lorem (info TEXT)");

    const stmt = db.prepare("INSERT INTO lorem VALUES (?)");
    for (let i = 0; i < 10; i++) {
        stmt.run("Ipsum " + i);
    }
    stmt.finalize();

    db.each("SELECT rowid AS id, info FROM lorem", (err, row) => {
        console.log(row.id + ": " + row.info);
    });
});

db.close();
```

## Source install

To skip searching for pre-compiled binaries, and force a build from source, use

```bash
npm install --build-from-source
```

The sqlite3 module depends only on libsqlite3. However, by default, an internal/bundled copy of sqlite will be built and statically linked, so an externally installed sqlite3 is not required.

If you wish to install against an external sqlite then you need to pass the `--sqlite` argument to `npm` wrapper:

```bash
npm install --build-from-source --sqlite=/usr/local
```

If building against an external sqlite3 make sure to have the development headers available. Mac OS X ships with these by default. If you don't have them installed, install the `-dev` package with your package manager, e.g. `apt-get install libsqlite3-dev` for Debian/Ubuntu. Make sure that you have at least `libsqlite3` >= 3.6.

Note, if building against homebrew-installed sqlite on OS X you can do:

```bash
npm install --build-from-source --sqlite=/usr/local/opt/sqlite/
```

## Custom file header (magic)

The default sqlite file header is "SQLite format 3". You can specify a different magic, though this will make standard tools and libraries unable to work with your files.

```bash
npm install --build-from-source --sqlite_magic="MyCustomMagic15"
```

Note that the magic *must* be exactly 15 characters long (16 bytes including null terminator).

## Building for node-webkit

Because of ABI differences, `sqlite3` must be built in a custom to be used with [node-webkit](https://github.com/rogerwang/node-webkit).

To build `sqlite3` for node-webkit:

1. Install [`nw-gyp`](https://github.com/rogerwang/nw-gyp) globally: `npm install nw-gyp -g` *(unless already installed)*

2. Build the module with the custom flags of `--runtime`, `--target_arch`, and `--target`:

```bash
NODE_WEBKIT_VERSION="0.8.6" # see latest version at https://github.com/rogerwang/node-webkit#downloads
npm install sqlite3 --build-from-source --runtime=node-webkit --target_arch=ia32 --target=$(NODE_WEBKIT_VERSION)
```

You can also run this command from within a `sqlite3` checkout:

```bash
npm install --build-from-source --runtime=node-webkit --target_arch=ia32 --target=$(NODE_WEBKIT_VERSION)
```

Remember the following:

* You must provide the right `--target_arch` flag. `ia32` is needed to target 32bit node-webkit builds, while `x64` will target 64bit node-webkit builds (if available for your platform).

* After the `sqlite3` package is built for node-webkit it cannot run in the vanilla Node.js (and vice versa).
   * For example, `npm test` of the node-webkit's package would fail.

Visit the “[Using Node modules](https://github.com/rogerwang/node-webkit/wiki/Using-Node-modules)” article in the node-webkit's wiki for more details.

## Building for SQLCipher

For instructions on building SQLCipher, see [Building SQLCipher for Node.js](https://coolaj86.com/articles/building-sqlcipher-for-node-js-on-raspberry-pi-2/). Alternatively, you can install it with your local package manager.

To run against SQLCipher, you need to compile `sqlite3` from source by passing build options like:

```bash
npm install sqlite3 --build-from-source --sqlite_libname=sqlcipher --sqlite=/usr/

node -e 'require("sqlite3")'
```

If your SQLCipher is installed in a custom location (if you compiled and installed it yourself), you'll need to set some environment variables:

### On OS X with Homebrew

Set the location where `brew` installed it:

```bash
export LDFLAGS="-L`brew --prefix`/opt/sqlcipher/lib"
export CPPFLAGS="-I`brew --prefix`/opt/sqlcipher/include/sqlcipher"
npm install sqlite3 --build-from-source --sqlite_libname=sqlcipher --sqlite=`brew --prefix`

node -e 'require("sqlite3")'
```

### On most Linuxes (including Raspberry Pi)

Set the location where `make` installed it:

```bash
export LDFLAGS="-L/usr/local/lib"
export CPPFLAGS="-I/usr/local/include -I/usr/local/include/sqlcipher"
export CXXFLAGS="$CPPFLAGS"
npm install sqlite3 --build-from-source --sqlite_libname=sqlcipher --sqlite=/usr/local --verbose

node -e 'require("sqlite3")'
```

### Custom builds and Electron

Running `sqlite3` through [electron-rebuild](https://github.com/electron/electron-rebuild) does not preserve the SQLCipher extension, so some additional flags are needed to make this build Electron compatible. Your `npm install sqlite3 --build-from-source` command needs these additional flags (be sure to replace the target version with the current Electron version you are working with):

```bash
--runtime=electron --target=18.2.1 --dist-url=https://electronjs.org/headers
```

In the case of MacOS with Homebrew, the command should look like the following:

```bash
npm install sqlite3 --build-from-source --sqlite_libname=sqlcipher --sqlite=`brew --prefix` --runtime=electron --target=18.2.1 --dist-url=https://electronjs.org/headers
```

# Testing

```bash
npm test
```

# Contributors

* [Daniel Lockyer](https://github.com/daniellockyer)
* [Konstantin Käfer](https://github.com/kkaefer)
* [Dane Springmeyer](https://github.com/springmeyer)
* [Will White](https://github.com/willwhite)
* [Orlando Vazquez](https://github.com/orlandov)
* [Artem Kustikov](https://github.com/artiz)
* [Eric Fredricksen](https://github.com/grumdrig)
* [John Wright](https://github.com/mrjjwright)
* [Ryan Dahl](https://github.com/ry)
* [Tom MacWright](https://github.com/tmcw)
* [Carter Thaxton](https://github.com/carter-thaxton)
* [Audrius Kažukauskas](https://github.com/audriusk)
* [Johannes Schauer](https://github.com/pyneo)
* [Mithgol](https://github.com/Mithgol)
* [Kewde](https://github.com/kewde)

# Acknowledgments

Thanks to [Orlando Vazquez](https://github.com/orlandov),
[Eric Fredricksen](https://github.com/grumdrig) and
[Ryan Dahl](https://github.com/ry) for their SQLite bindings for node, and to mraleph on Freenode's #v8 for answering questions.

This module was originally created by [Mapbox](https://mapbox.com/) & is now maintained by [Ghost](https://ghost.org).

# Changelog

We use [GitHub releases](https://github.com/TryGhost/node-sqlite3/releases) for notes on the latest versions. See [CHANGELOG.md](https://github.com/TryGhost/node-sqlite3/blob/b05f4594cf8b0de64743561fcd2cfe6f4571754d/CHANGELOG.md) in git history for details on older versions.

# License

`node-sqlite3` is [BSD licensed](https://github.com/tryghost/node-sqlite3/raw/master/LICENSE).

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fmapbox%2Fnode-sqlite3.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fmapbox%2Fnode-sqlite3?ref=badge_large)
