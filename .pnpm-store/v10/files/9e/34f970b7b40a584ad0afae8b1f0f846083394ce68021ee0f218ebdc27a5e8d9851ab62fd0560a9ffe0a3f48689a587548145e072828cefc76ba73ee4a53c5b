# Overview

This directory is used for building the [node-oracledb npm
package](https://www.npmjs.com/package/oracledb).  The scripts can also be used
to create a custom package for hosting on a local server.

Most users do not need to use anything in this directory.

# Building an Install Package

In a clone or copy of the repository:

- If you want to build a package that installs node-oracledb with both 'Thin'
  and 'Thick' modes, then run `npm run buildbinary`.  This calls
  `buildbinary.js` to create a node-oracledb 'Thick' mode binary for the
  current operating system.  Depending on how Node.js was installed, you may
  need to run `npm install node-gyp -g` first.

  You can run `npm run buildbinary` on each operating system architecture that
  you want to include in your package.  Copy the node-oracledb Thick mode
  binaries and related build metadata information files from all
  `package/Staging` directories to the `package/Staging` directory on one
  machine.

- On the machine with any (or no) desired Thick mode binaries in
  `package/Staging`, run `npm run buildpackage`.  This calls `buildpackage.js`
  to make the node-oracledb package containing the node-oracledb JavaScript
  files, the available Thick mode binaries, and a `package.json` that has
  `install` and `prune` script targets.  The package will be created in the top
  level directory.  It can be uploaded to npmjs.com by maintainers of
  node-oracledb, or you can upload to your own local server and then use it as
  a dependency in your projects.

# Package Installation

- Running `npm install` with the created package always installs node-oracledb
  Thin mode.  The installation script also runs `install.js` to check the
  availability of the optional Thick mode binary module.  A warning will be
  displayed if the binary is not found for the current Node.js version and
  operating system architecture.

- If you are space-conscious, then run `npm run prune` after installation.
  This removes pre-built binaries for all other architectures.

  If you only ever want Thin mode, then remove all the Thick mode binaries by
  running `npm run prune all`.

Note the
[`package.json`](https://github.com/oracle/node-oracledb/blob/main/package.json)
in GitHub doesn't have an `install` script target by default.  This means that
node-gyp will be invoked to compile the optional node-oracledb Thick mode
binary.  This allows installation of Thick mode from GitHub [source
code](https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#github)
when no suitable pre-built binary is available.
