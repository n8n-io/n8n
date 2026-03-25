<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <picture>
      <source srcset="https://sentry-brand.storage.googleapis.com/sentry-logo-white.png" media="(prefers-color-scheme: dark)" />
      <source srcset="https://sentry-brand.storage.googleapis.com/sentry-logo-black.png" media="(prefers-color-scheme: light), (prefers-color-scheme: no-preference)" />
      <img src="https://sentry-brand.storage.googleapis.com/sentry-logo-black.png" alt="Sentry" width="280">
    </picture>
  </a>
</p>

# Official Sentry Command Line Interface

[![Build Status](https://github.com/getsentry/sentry-cli/workflows/CI/badge.svg?branch=master)](https://github.com/getsentry/sentry-cli/actions?query=workflow%3ACI)
[![GitHub release](https://img.shields.io/github/release/getsentry/sentry-cli.svg)](https://github.com/getsentry/sentry-cli/releases/latest)
[![npm version](https://img.shields.io/npm/v/@sentry/cli.svg)](https://www.npmjs.com/package/@sentry/cli)
[![license](https://img.shields.io/github/license/getsentry/sentry-cli.svg)](https://github.com/getsentry/sentry-cli/blob/master/LICENSE)

This is a Sentry command line client for some generic tasks. Right now this is
primarily used to upload debug symbols to Sentry if you are not using the
Fastlane tools.

* Downloads can be found under
  [Releases](https://github.com/getsentry/sentry-cli/releases/)
* Documentation can be found [here](https://docs.sentry.io/hosted/learn/cli/)

## Installation

If you are on macOS or Linux, you can use the automated downloader which will fetch the latest release version for you and install it:

    curl -sL https://sentry.io/get-cli/ | bash

We do, however, encourage you to pin the specific version of the CLI, so your builds are always reproducible.
To do that, you can use the exact same method, with an additional version specifier:

    curl -sL https://sentry.io/get-cli/ | SENTRY_CLI_VERSION=2.33.1 bash

This will automatically download the correct version of `sentry-cli` for your operating system and install it. If necessary, it will prompt for your admin password for `sudo`. For a different installation location or for systems without `sudo` (like Windows), you can `export INSTALL_DIR=/custom/installation/path` before running this command.

If you are using `sentry-cli` on Windows environments, [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) is required.

To verify it’s installed correctly you can bring up the help:

    sentry-cli --help

### pip

_New in 2.14.3_: `sentry-cli` can also be installed using `pip`:

```bash
pip install sentry-cli
```

### Node

Additionally, you can also install this binary via npm:

    npm install @sentry/cli

When installing globally, make sure to have set
[correct permissions on the global node_modules directory](https://docs.npmjs.com/getting-started/fixing-npm-permissions).
If this is not possible in your environment or still produces an EACCESS error,
install as root:

    sudo npm install -g @sentry/cli --unsafe-perm

By default, this package will download sentry-cli from the CDN managed by [Fastly](https://www.fastly.com/).
To use a custom CDN, set the npm config property `sentrycli_cdnurl`. The downloader will append
`"/<version>/sentry-cli-<dist>"`.

```sh
npm install @sentry/cli --sentrycli_cdnurl=https://mymirror.local/path
```

Or add property into your `.npmrc` file (https://www.npmjs.org/doc/files/npmrc.html)

```rc
sentrycli_cdnurl=https://mymirror.local/path
```

There are a few environment variables that you can provide to control the npm installation:

```
SENTRYCLI_CDNURL=<url> # Use alternative cdn url for downloading binary
SENTRYCLI_USE_LOCAL=1 # Use local instance of sentry-cli binary (looked up via $PATH environment)
SENTRYCLI_SKIP_DOWNLOAD=1 # Skip downloading binary entirely
SENTRYCLI_NO_PROGRESS_BAR=1 # Do not print the progress bar when downloading binary (default for non-TTY environments like CI)
SENTRYCLI_LOG_STREAM=<stdout|stderr> # Changes where to redirect install script output
```

When using `sentry-cli` via JavaScript API or any 3rd party plugin that is consuming said API,
you can also use `SENTRY_BINARY_PATH=<path>` alongside `SENTRYCLI_SKIP_DOWNLOAD=1` to completely
control what binaries are downloaded and used throughout the whole process.

If you're installing the CLI with NPM from behind a proxy, the install script will
use either NPM's configured HTTPS proxy server or the value from your `HTTPS_PROXY`
environment variable.

### Homebrew

A homebrew recipe is provided in the `getsentry/tools` tap:

    brew install getsentry/tools/sentry-cli

### Docker

As of version _1.25.0_, there is an official Docker image that comes with
`sentry-cli` preinstalled. If you prefer a specific version, specify it as tag.
The latest development version is published under the `edge` tag. In production,
we recommend you to use the `latest` tag. To use it, run:

```sh
docker pull getsentry/sentry-cli
docker run --rm -v $(pwd):/work getsentry/sentry-cli --help
```

Starting version _`2.8.0`_, in case you see `"error: config value 'safe.directory' was not found;"` message,
you also need to correctly set UID and GID of mounted volumes like so:

```sh
docker run --rm -u "$(id -u):$(id -g)" -v $(pwd):/work getsentry/sentry-cli --help
```

This is required due to security issue in older `git` implementations. See [here](https://github.blog/2022-04-12-git-security-vulnerability-announced/) for more details.

## Update

To update sentry-cli to the latest version run:

```sh
sentry-cli update
```

## Compiling

In case you want to compile this yourself, you need to install at minimum the
following dependencies:

* Rust stable and Cargo
* Make, CMake and a C compiler

Use cargo to compile:

    $ cargo build

Also, there is a Dockerfile that builds an Alpine-based Docker image with
`sentry-cli` in the PATH. To build and use it, run:

```sh
docker build -t sentry-cli .
docker run --rm -v $(pwd):/work sentry-cli --help
```
