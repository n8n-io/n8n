# Contributing to n8n

Great that you are here and you want to contribute to n8n

## Contents

- [Contributing to n8n](#contributing-to-n8n)
  - [Contents](#contents)
  - [Code of conduct](#code-of-conduct)
  - [Directory structure](#directory-structure)
  - [Development setup](#development-setup)
    - [Requirements](#requirements)
      - [Node.js](#nodejs)
      - [Build tools](#build-tools)
      - [pnpm workspaces](#pnpm-workspaces)
    - [Actual n8n setup](#actual-n8n-setup)
    - [Start](#start)
  - [Development cycle](#development-cycle)
    - [Test suite](#test-suite)
  - [Create custom nodes](#create-custom-nodes)
  - [Create a new node to contribute to n8n](#create-a-new-node-to-contribute-to-n8n)
  - [Checklist before submitting a new node](#checklist-before-submitting-a-new-node)
  - [Extend documentation](#extend-documentation)
  - [Contributor License Agreement](#contributor-license-agreement)

## Code of conduct

This project and everyone participating in it are governed by the Code of
Conduct which can be found in the file [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report
unacceptable behavior to jan@n8n.io.

## Directory structure

n8n is split up in different modules which are all in a single mono repository.

The most important directories:

- [/docker/image](/docker/images) - Dockerfiles to create n8n containers
- [/docker/compose](/docker/compose) - Examples Docker Setups
- [/packages](/packages) - The different n8n modules
- [/packages/cli](/packages/cli) - CLI code to run front- & backend
- [/packages/core](/packages/core) - Core code which handles workflow
  execution, active webhooks and
  workflows. **Contact n8n before
  starting on any changes here**
- [/packages/design-system](/packages/design-system) - Vue frontend components
- [/packages/editor-ui](/packages/editor-ui) - Vue frontend workflow editor
- [/packages/node-dev](/packages/node-dev) - CLI to create new n8n-nodes
- [/packages/nodes-base](/packages/nodes-base) - Base n8n nodes
- [/packages/workflow](/packages/workflow) - Workflow code with interfaces which
  get used by front- & backend

## Development setup

If you want to change or extend n8n you have to make sure that all needed
dependencies are installed and the packages get linked correctly. Here a short guide on how that can be done:

### Requirements

#### Node.js

We suggest using [Node.js](https://nodejs.org/en/) version 16.9 or newer for development purposes.

After that we recommend enabling [Node.js corepack](https://nodejs.org/docs/latest-v16.x/api/corepack.html) with `corepack enable`, and [pnpm](https://pnpm.io/) with `corepack prepare pnpm --activate`.

**IMPORTANT**: If you have installed Node.js via homebrew, you'll need to run `brew install corepack`, since homebrew explicitly removes `npm` and `corepack` from [the `node` formula](https://github.com/Homebrew/homebrew-core/blob/master/Formula/node.rb#L66).

**IMPORTANT**: If you are on windows, you'd need to run `corepack enable` and `corepack prepare pnpm --activate` in a terminal as an administrator.

#### Build tools

The packages which n8n uses depend on a few build tools:

Debian/Ubuntu:

```
apt-get install -y build-essential python
```

CentOS:

```
yum install gcc gcc-c++ make
```

Windows:

```
npm add -g windows-build-tools
```

#### pnpm workspaces

n8n is split up in different modules which are all in a single mono repository.
To facilitate the module management, [pnpm workspaces](https://pnpm.io/workspaces) are used.
This automatically sets up file-links between modules which depend on each other.

### Actual n8n setup

> **IMPORTANT**: All the steps below have to get executed at least once to get the development setup up and running!

Now that everything n8n requires to run is installed the actual n8n code can be
checked out and set up:

1. [Fork](https://guides.github.com/activities/forking/#fork) the n8n repository

2. Clone your forked repository

   ```
   git clone https://github.com/<your_github_username>/n8n.git
   ```

3. Go into repository folder

   ```
   cd n8n
   ```

4. Add the original n8n repository as `upstream` to your forked repository

   ```
   git remote add upstream https://github.com/n8n-io/n8n.git
   ```

5. Install all dependencies of all modules and link them together:

   ```
   pnpm install
   ```

6. Build all the code:
   ```
   pnpm build
   ```

### Start

To start n8n execute:

```
pnpm start
```

To start n8n with tunnel:

```
./packages/cli/bin/n8n start --tunnel
```

## Development cycle

While iterating on n8n modules code, you can run `pnpm dev`. It will then
automatically build your code, restart the backend and refresh the frontend
(editor-ui) on every change you make.

1. Start n8n in development mode:
   ```
   pnpm dev
   ```
1. Hack, hack, hack
1. Check if everything still runs in production mode
   ```
   pnpm build
   pnpm start
   ```
1. Create tests
1. Run all [tests](#test-suite)
   ```
   pnpm test
   ```
1. Commit code and [create a pull request](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)

### Test suite

The tests can be started via:

```
pnpm test
```

If that gets executed in one of the package folders it will only run the tests
of this package. If it gets executed in the n8n-root folder it will run all
tests of all packages.

## Create custom nodes

Learn about [building nodes](https://docs.n8n.io/integrations/creating-nodes/) to create custom nodes for n8n. You can create community nodes and make them available using [npm](https://www.npmjs.com/).

## Extend documentation

The repository for the n8n documentation on [docs.n8n.io](https://docs.n8n.io) can be found [here](https://github.com/n8n-io/n8n-docs).

## Contributor License Agreement

That we do not have any potential problems later it is sadly necessary to sign a [Contributor License Agreement](CONTRIBUTOR_LICENSE_AGREEMENT.md). That can be done literally with the push of a button.

We used the most simple one that exists. It is from [Indie Open Source](https://indieopensource.com/forms/cla) which uses plain English and is literally only a few lines long.

A bot will automatically comment on the pull request once it got opened asking for the agreement to be signed. Before it did not get signed it is sadly not possible to merge it in.
