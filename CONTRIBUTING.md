# Contributing to n8n

Great that you are here and you want to contribute to n8n

## Contents

- [Code of Conduct](#code-of-conduct)
- [Directory Structure](#directory-structure)
- [Development Setup](#development-setup)
- [Development Cycle](#development-cycle)
- [Create Custom Nodes](#create-custom-nodes)
- [Create a new node to contribute to n8n](#create-a-new-node-to-contribute-to-n8n)
- [Checklist before submitting a new node](#checklist-before-submitting-a-new-node)
- [Extend Documentation](#extend-documentation)
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

We suggest using the current [Node.js](https://nodejs.org/en/) LTS version (14.18.0 which includes npm 6.14.15) for development purposes.

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
npm install -g windows-build-tools
```

#### npm workspaces

n8n is split up in different modules which are all in a single mono repository.
To facilitate the module management, [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) are
used. This automatically sets up file-links between modules which depend on each
other.

### Actual n8n setup

> **IMPORTANT**: All the steps below have to get executed at least once to get the development setup up and running!

Now that everything n8n requires to run is installed the actual n8n code can be
checked out and set up:

1. [Fork](https://guides.github.com/activities/forking/#fork) the n8n repository

2. Clone your forked repository
	```
	git clone https://github.com/<your_github_username>/n8n.git
	```

3. Add the original n8n repository as `upstream` to your forked repository
    ```
	git remote add upstream https://github.com/n8n-io/n8n.git
	```

4. Go into repository folder
	```
	cd n8n
	```

5. Install all dependencies of all modules and link them together:
	```
	npm install
	```

6. Build all the code:
	```
	npm run build
	```

### Start

To start n8n execute:

```
npm run start
```

To start n8n with tunnel:
```
./packages/cli/bin/n8n start --tunnel
```

## Development cycle

While iterating on n8n modules code, you can run `npm run dev`. It will then
automatically build your code, restart the backend and refresh the frontend
(editor-ui) on every change you make.

1. Start n8n in development mode:
	```
	npm run dev
	```
1. Hack, hack, hack
1. Check if everything still runs in production mode
	```
	npm run build
	npm run start
	```
1. Create tests
1. Run all [tests](#test-suite)
	```
	npm run test
	```
1. Commit code and [create a pull request](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)

### Test suite

The tests can be started via:
```
npm run test
```

If that gets executed in one of the package folders it will only run the tests
of this package. If it gets executed in the n8n-root folder it will run all
tests of all packages.

## Create custom nodes

> **IMPORTANT**: Avoid use of external libraries to ensure your custom nodes can be reviewed and merged quickly.

Learn about [using the node dev CLI](https://docs.n8n.io/nodes/creating-nodes/node-dev-cli.html) to create custom nodes for n8n.

More information can be found in the documentation of [n8n-node-dev](https://github.com/n8n-io/n8n/tree/master/packages/node-dev), a small CLI which helps with n8n-node-development.

## Create a new node to contribute to n8n

Follow this tutorial on [creating your first node](https://docs.n8n.io/nodes/creating-nodes/create-node.html) for n8n.

## Checklist before submitting a new node

There are several things to keep in mind when creating a node. To help you, we prepared a [checklist](https://docs.n8n.io/nodes/creating-nodes/node-review-checklist.html) that covers the requirements for creating nodes, from preparation to submission. This will help us be quicker to review and merge your PR.

## Extend documentation

The repository for the n8n documentation on [docs.n8n.io](https://docs.n8n.io) can be found [here](https://github.com/n8n-io/n8n-docs).

## Contributor License Agreement

That we do not have any potential problems later it is sadly necessary to sign a [Contributor License Agreement](CONTRIBUTOR_LICENSE_AGREEMENT.md). That can be done literally with the push of a button.

We used the most simple one that exists. It is from [Indie Open Source](https://indieopensource.com/forms/cla) which uses plain English and is literally only a few lines long.

A bot will automatically comment on the pull request once it got opened asking for the agreement to be signed. Before it did not get signed it is sadly not possible to merge it in.
