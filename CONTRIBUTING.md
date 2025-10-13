# Contributing to n8n

Great that you are here and you want to contribute to n8n

## Contents

- [Contributing to n8n](#contributing-to-n8n)
	- [Contents](#contents)
	- [Code of conduct](#code-of-conduct)
	- [Directory structure](#directory-structure)
	- [Development setup](#development-setup)
		- [Dev Container](#dev-container)
		- [Requirements](#requirements)
			- [Node.js](#nodejs)
			- [pnpm](#pnpm)
				- [pnpm workspaces](#pnpm-workspaces)
			- [corepack](#corepack)
			- [Build tools](#build-tools)
		- [Actual n8n setup](#actual-n8n-setup)
		- [Start](#start)
	- [Development cycle](#development-cycle)
		- [Community PR Guidelines](#community-pr-guidelines)
			- [**1. Change Request/Comment**](#1-change-requestcomment)
			- [**2. General Requirements**](#2-general-requirements)
			- [**3. PR Specific Requirements**](#3-pr-specific-requirements)
			- [**4. Workflow Summary for Non-Compliant PRs**](#4-workflow-summary-for-non-compliant-prs)
		- [Test suite](#test-suite)
			- [Unit tests](#unit-tests)
			- [Code Coverage](#code-coverage)
			- [E2E tests](#e2e-tests)
	- [Releasing](#releasing)
	- [Create custom nodes](#create-custom-nodes)
	- [Extend documentation](#extend-documentation)
	- [Contribute workflow templates](#contribute-workflow-templates)
	- [Contributor License Agreement](#contributor-license-agreement)

## Code of conduct

This project and everyone participating in it are governed by the Code of
Conduct which can be found in the file [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report
unacceptable behavior to jan@n8n.io.

## Directory structure

n8n is split up in different modules which are all in a single mono repository.

The most important directories:

- [/docker/images](/docker/images) - Dockerfiles to create n8n containers
- [/packages](/packages) - The different n8n modules
- [/packages/cli](/packages/cli) - CLI code to run front- & backend
- [/packages/core](/packages/core) - Core code which handles workflow
  execution, active webhooks and
  workflows. **Contact n8n before
  starting on any changes here**
- [/packages/frontend/@n8n/design-system](/packages/design-system) - Vue frontend components
- [/packages/frontend/editor-ui](/packages/editor-ui) - Vue frontend workflow editor
- [/packages/node-dev](/packages/node-dev) - CLI to create new n8n-nodes
- [/packages/nodes-base](/packages/nodes-base) - Base n8n nodes
- [/packages/workflow](/packages/workflow) - Workflow code with interfaces which
  get used by front- & backend

## Development setup

If you want to change or extend n8n you have to make sure that all the needed
dependencies are installed and the packages get linked correctly. Here's a short guide on how that can be done:

### Dev Container

If you already have VS Code and Docker installed, you can click [here](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/n8n-io/n8n) to get started. Clicking these links will cause VS Code to automatically install the Dev Containers extension if needed, clone the source code into a container volume, and spin up a dev container for use.

### Requirements

#### Node.js

[Node.js](https://nodejs.org/en/) version 22.16 or newer is required for development purposes.

#### pnpm

[pnpm](https://pnpm.io/) version 10.2 or newer is required for development purposes. We recommend installing it with [corepack](#corepack).

##### pnpm workspaces

n8n is split up into different modules which are all in a single mono repository.
To facilitate the module management, [pnpm workspaces](https://pnpm.io/workspaces) are used.
This automatically sets up file-links between modules which depend on each other.

#### corepack

We recommend enabling [Node.js corepack](https://nodejs.org/docs/latest-v16.x/api/corepack.html) with `corepack enable`.

You can install the correct version of pnpm using `corepack prepare --activate`.

**IMPORTANT**: If you have installed Node.js via homebrew, you'll need to run `brew install corepack`, since homebrew explicitly removes `npm` and `corepack` from [the `node` formula](https://github.com/Homebrew/homebrew-core/blob/master/Formula/node.rb#L66).

**IMPORTANT**: If you are on windows, you'd need to run `corepack enable` and `corepack prepare --activate` in a terminal as an administrator.

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

MacOS:

No additional packages required.

#### actionlint (for GitHub Actions workflow development)

If you plan to modify GitHub Actions workflow files (`.github/workflows/*.yml`), you'll need [actionlint](https://github.com/rhysd/actionlint) for workflow validation:

**macOS (Homebrew):**
```
brew install actionlint
```
> **Note:** actionlint is only required if you're modifying workflow files. It runs automatically via git hooks when workflow files are changed.

### Actual n8n setup

> **IMPORTANT**: All the steps below have to get executed at least once to get the development setup up and running!

Now that everything n8n requires to run is installed, the actual n8n code can be
checked out and set up:

1. [Fork](https://guides.github.com/activities/forking/#fork) the n8n repository.

2. Clone your forked repository:

   ```
   git clone https://github.com/<your_github_username>/n8n.git
   ```

3. Go into repository folder:

   ```
   cd n8n
   ```

4. Add the original n8n repository as `upstream` to your forked repository:

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

### Basic Development Workflow

1. Start n8n in development mode:
   ```
   pnpm dev
   ```
2. Hack, hack, hack
3. Check if everything still runs in production mode:
   ```
   pnpm build
   pnpm start
   ```
4. Create tests
5. Run all [tests](#test-suite):
   ```
   pnpm test
   ```
6. Commit code and [create a pull request](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)

### Hot Reload for Nodes (N8N_DEV_RELOAD)

When developing custom nodes or credentials, you can enable hot reload to automatically detect changes without restarting the server:

```bash
N8N_DEV_RELOAD=true pnpm dev
```

**Performance considerations:**
- File watching adds overhead to your system, especially on slower machines
- The watcher monitors potentially thousands of files, which can impact CPU and memory usage
- On resource-constrained systems, consider developing without hot reload and manually restarting when needed

### Selective Package Development

Running all packages in development mode can be resource-intensive. For better performance, run only the packages relevant to your work:

#### Available Filtered Commands

- **Backend-only development:**
  ```bash
  pnpm dev:be
  ```
  Excludes frontend packages like editor-ui and design-system

- **Frontend-only development:**
  ```bash
  pnpm dev:fe
  ```
  Runs the backend server and editor-ui development server

- **AI/LangChain nodes development:**
  ```bash
  pnpm dev:ai
  ```
  Runs only essential packages for AI node development

#### Custom Selective Development

For even more focused development, you can run packages individually:

**Example 1: Working on custom nodes**
```bash
# Terminal 1: Build and watch nodes package
cd packages/nodes-base
pnpm dev

# Terminal 2: Run the CLI with hot reload
cd packages/cli
N8N_DEV_RELOAD=true pnpm dev
```

**Example 2: Pure frontend development**
```bash
# Terminal 1: Start the backend server (no watching)
pnpm start

# Terminal 2: Run frontend dev server
cd packages/editor-ui
pnpm dev
```

**Example 3: Working on a specific node package**
```bash
# Terminal 1: Watch your node package
cd packages/nodes-base  # or your custom node package
pnpm watch

# Terminal 2: Run CLI with hot reload
cd packages/cli
N8N_DEV_RELOAD=true pnpm dev
```

### Performance Considerations

The full development mode (`pnpm dev`) runs multiple processes in parallel:

1. **TypeScript compilation** for each package
2. **File watchers** monitoring source files
3. **Nodemon** restarting the backend on changes
4. **Vite dev server** for the frontend with HMR
5. **Multiple build processes** for various packages

**Performance impact:**
- Can consume significant CPU and memory resources
- File system watching creates overhead, especially on:
  - Networked file systems
  - Virtual machines with shared folders
  - Systems with slower I/O performance
- The more packages you run in dev mode, the more system resources are consumed

**Recommendations for resource-constrained environments:**
1. Use selective development commands based on your task
2. Close unnecessary applications to free up resources
3. Monitor system performance and adjust your development approach accordingly

---

### Community PR Guidelines

#### **1. Change Request/Comment**

Please address the requested changes or provide feedback within 14 days. If there is no response or updates to the pull request during this time, it will be automatically closed. The PR can be reopened once the requested changes are applied.

#### **2. General Requirements**

- **Follow the Style Guide:**
  - Ensure your code adheres to n8n's coding standards and conventions (e.g., formatting, naming, indentation). Use linting tools where applicable.
- **TypeScript Compliance:**
  - Do not use `ts-ignore` .
  - Ensure code adheres to TypeScript rules.
- **Avoid Repetitive Code:**
  - Reuse existing components, parameters, and logic wherever possible instead of redefining or duplicating them.
  - For nodes: Use the same parameter across multiple operations rather than defining a new parameter for each operation (if applicable).
- **Testing Requirements:**
  - PRs **must include tests**:
    - Unit tests
    - Workflow tests for nodes (example [here](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Switch/V3/test))
    - UI tests (if applicable)
- **Typos:**
  - Use a spell-checking tool, such as [**Code Spell Checker**](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker), to avoid typos.

#### **3. PR Specific Requirements**

- **Small PRs Only:**
  - Focus on a single feature or fix per PR.
- **Naming Convention:**
  - Follow [n8n's PR Title Conventions](https://github.com/n8n-io/n8n/blob/master/.github/pull_request_title_conventions.md#L36).
- **New Nodes:**
  - PRs that introduce new nodes will be **auto-closed** unless they are explicitly requested by the n8n team and aligned with an agreed project scope. However, you can still explore [building your own nodes](https://docs.n8n.io/integrations/creating-nodes/overview/), as n8n offers the flexibility to create your own custom nodes.
- **Typo-Only PRs:**
  - Typos are not sufficient justification for a PR and will be rejected.

#### **4. Workflow Summary for Non-Compliant PRs**

- **No Tests:** If tests are not provided, the PR will be auto-closed after **14 days**.
- **Non-Small PRs:** Large or multifaceted PRs will be returned for segmentation.
- **New Nodes/Typo PRs:** Automatically rejected if not aligned with project scope or guidelines.

---

### Test suite

#### Unit tests

Unit tests can be started via:

```
pnpm test
```

If that gets executed in one of the package folders it will only run the tests
of this package. If it gets executed in the n8n-root folder it will run all
tests of all packages.

If you made a change which requires an update on a `.test.ts.snap` file, pass `-u` to the command to run tests or press `u` in watch mode.

#### Code Coverage
We track coverage for all our code on [Codecov](https://app.codecov.io/gh/n8n-io/n8n).
But when you are working on tests locally, we recommend running your tests with env variable `COVERAGE_ENABLED` set to `true`. You can then view the code coverage in the `coverage` folder, or you can use [this VSCode extension](https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters) to visualize the coverage directly in VSCode.

#### E2E tests

⚠️ You have to run `pnpm cypress:install` to install cypress before running the tests for the first time and to update cypress.

E2E tests can be started via one of the following commands:

- `pnpm test:e2e:ui`: Start n8n and run e2e tests interactively using built UI code. Does not react to code changes (i.e. runs `pnpm start` and `cypress open`)
- `pnpm test:e2e:dev`: Start n8n in development mode and run e2e tests interactively. Reacts to code changes (i.e. runs `pnpm dev` and `cypress open`)
- `pnpm test:e2e:all`: Start n8n and run e2e tests headless (i.e. runs `pnpm start` and `cypress run --headless`)

⚠️ Remember to stop your dev server before. Otherwise port binding will fail.

## Releasing

To start a release, trigger [this workflow](https://github.com/n8n-io/n8n/actions/workflows/release-create-pr.yml) with the SemVer release type, and select a branch to cut this release from. This workflow will then:

1. Bump versions of packages that have changed or have dependencies that have changed
2. Update the Changelog
3. Create a new branch called `release/${VERSION}`, and
4. Create a new pull-request to track any further changes that need to be included in this release

Once ready to release, simply merge the pull-request.
This triggers [another workflow](https://github.com/n8n-io/n8n/actions/workflows/release-publish.yml), that will:

1. Build and publish the packages that have a new version in this release
2. Create a new tag, and GitHub release from squashed release commit
3. Merge the squashed release commit back into `master`

## Create custom nodes

Learn about [building nodes](https://docs.n8n.io/integrations/creating-nodes/overview/) to create custom nodes for n8n. You can create community nodes and make them available using [npm](https://www.npmjs.com/).

## Extend documentation

The repository for the n8n documentation on [docs.n8n.io](https://docs.n8n.io) can be found [here](https://github.com/n8n-io/n8n-docs).

## Contribute workflow templates

You can submit your workflows to n8n's template library.

n8n is working on a creator program, and developing a marketplace of templates. This is an ongoing project, and details are likely to change.

Refer to [n8n Creator hub](https://www.notion.so/n8n/n8n-Creator-hub-7bd2cbe0fce0449198ecb23ff4a2f76f) for information on how to submit templates and become a creator.

## Contributor License Agreement

That we do not have any potential problems later it is sadly necessary to sign a [Contributor License Agreement](CONTRIBUTOR_LICENSE_AGREEMENT.md). That can be done literally with the push of a button.

We used the most simple one that exists. It is from [Indie Open Source](https://indieopensource.com/forms/cla) which uses plain English and is literally only a few lines long.

Once a pull request is opened, an automated bot will promptly leave a comment requesting the agreement to be signed. The pull request can only be merged once the signature is obtained.
