[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Discord](https://img.shields.io/discord/1070453198000767076)](https://discord.gg/pR6duvNHtV)
<img src="https://img.shields.io/github/actions/workflow/status/pdmlab/docker-compose/ci.yml?branch=master" />
<img src="https://img.shields.io/npm/dm/docker-compose.svg" />

# Manage Docker-Compose via Node.js

`docker-compose` is a small library that allows you to run [docker-compose](https://docs.docker.com/compose/) (which is still required) via Node.js. This is useful to bootstrap test environments.

As of version 1.0, this library supports `docker compose` (v2, the docker "compose" plugin) by default. The `docker-compose` (v1) has been removed from recent releases of Docker Desktop and is no longer supported. However, you can still force the use of `docker-compose` by using the [standanlone mode](#standalone-mode).

## Installation

```bash
yarn add --dev docker-compose
```

## Documentation

The documentation can be found [here](https://pdmlab.github.io/docker-compose/).

## Example

### Import for `docker-compose`

```ts
import * as compose from 'docker-compose'
```

You can also import only the required commands:

```ts
import { run, upAll } from 'docker-compose'
```

### Usage

To start service containers based on the `docker-compose.yml` file in your current directory, just call `compose.upAll` like this:

```javascript
compose.upAll({ cwd: path.join(__dirname), log: true }).then(
  () => {
    console.log('done')
  },
  (err) => {
    console.log('something went wrong:', err.message)
  }
)
```

Start specific services using `compose.upMany`:

```javascript
const services = ['serviceA', 'serviceB']
compose.upMany(services, { cwd: path.join(__dirname), log: true })
```

Or start a single service with `compose.upOne`:

```javascript
const service = 'serviceA'
compose.upOne(service, { cwd: path.join(__dirname), log: true })
```

To execute command inside a running container

```javascript
compose.exec('node', 'npm install', { cwd: path.join(__dirname) })
```

To list the containers for a compose project

```javascript
const result = await compose.ps({ cwd: path.join(__dirname) })
result.data.services.forEach((service) => {
  console.log(service.name, service.command, service.state, service.ports)
  // state is e.g. 'Up 2 hours'
})
```

The `--format json` command option can be used to get a better state support:

```javascript
const result = await compose.ps({ cwd: path.join(__dirname), commandOptions: [["--format", "json"]] })
result.data.services.forEach((service) => {
  console.log(service.name, service.command, service.state, service.ports)
  // state is one of the defined states: paused | restarting | removing | running | dead | created | exited
})
```

### Standalone mode

While the `docker-compose` executable is no longer part of a default docker installation, it is still possible to download its binary [standalone](https://docs.docker.com/compose/install/standalone/). This is useful for example when building docker images, avoiding the need to install the whole docker stack.

To use a standalone binary, you can set the `executable.standalone` option to `true`. You can also set the `executablePath` option to the path of the `docker-compose` binary.

```js
compose.upAll({
   executable: {
      standalone: true,
      executablePath: '/path/to/docker-compose' // optional
   }
})
```

## Known issues

* During testing we noticed that `docker compose` seems to send its exit code also commands don't seem to have finished. This doesn't occur for all commands, but for example with `stop` or `down`. We had the option to wait for stopped / removed containers using third party libraries but this would make bootstrapping `docker-compose` much more complicated for the users. So we decided to use a `setTimeout(500)` workaround. We're aware this is not perfect, but it seems to be the most appropriate solution for now. Details can be found in the [v2 PR discussion](https://github.com/PDMLab/docker-compose/pull/228#issuecomment-1422895821) (we're happy to get help here).

## Running the tests

While `docker-compose` runs on Node.js 6+, running the tests requires you to use Node.js 8+ as they make use of `async/await`.

```bash
yarn test
```

## Want to help?

This project is just getting off the ground and could use some help with cleaning things up and refactoring.

If you want to contribute - we'd love it! Just open an issue to work against so you get full credit for your fork. You can open the issue first so we can discuss and you can work your fork as we go along.

If you see a bug, please be so kind as to show how it's failing, and we'll do our best to get it fixed quickly.

Before sending a PR, please [create an issue](https://github.com/PDMLab/docker-compose/issues/new) to introduce your idea and have a reference for your PR.

We're using [conventional commits](https://www.conventionalcommits.org), so please use it for your commits as well.

Also please add tests and make sure to run `yarn lint`.

### Discussions

If you want to discuss an `docker-compose` issue or PR in more detail, feel free to [start a discussion](https://github.com/PDMLab/docker-compose/discussions).

## License

MIT License

Copyright (c) 2017 - 2021 PDMLab

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
