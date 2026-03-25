![Build Status](https://github.com/evilmartians/lefthook/actions/workflows/test.yml/badge.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/evilmartians/lefthook/badge.svg?branch=master)](https://coveralls.io/github/evilmartians/lefthook?branch=master)

# Lefthook

> The fastest polyglot Git hooks manager out there

<img align="right" width="147" height="100" title="Lefthook logo"
     src="./logo_sign.svg">

A Git hooks manager for Node.js, Ruby and many other types of projects.

* **Fast.** It is written in Go. Can run commands in parallel.
* **Powerful.** It allows to control execution and files you pass to your commands.
* **Simple.** It is single dependency-free binary which can work in any environment.

📖 [Read the introduction post](https://evilmartians.com/chronicles/lefthook-knock-your-teams-code-back-into-shape?utm_source=lefthook)

<a href="https://evilmartians.com/?utm_source=lefthook">
<img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt="Sponsored by Evil Martians" width="236" height="54"></a>

## Install

With **Go** (>= 1.22):

```bash
go install github.com/evilmartians/lefthook@latest
```

With **NPM**:

```bash
npm install lefthook --save-dev
```

With **Ruby**:

```bash
gem install lefthook
```

**[Installation guide](./docs/install.md)** with more ways to install lefthook: [apt](./docs/install.md#deb), [brew](./docs/install.md#homebrew), [winget](./docs/install.md#winget), and others.

## Usage

Configure your hooks, install them once and forget about it: rely on the magic underneath.

#### TL;DR

```bash
# Configure your hooks
vim lefthook.yml

# Install them to the git project
lefthook install

# Enjoy your work with git
git add -A && git commit -m '...'
```

#### More details

- [**Configuration**](./docs/configuration.md) for `lefthook.yml` config options.
- [**Usage**](./docs/usage.md) for **lefthook** CLI options, supported ENVs, and usage tips.
- [**Discussions**](https://github.com/evilmartians/lefthook/discussions) for questions, ideas, suggestions.
<!-- - [**Wiki**](https://github.com/evilmartians/lefthook/wiki) for guides, examples, and benchmarks. -->

***

## Why Lefthook

* ### **Parallel execution**
Gives you more speed. [Example](./docs/configuration.md#parallel)

```yml
pre-push:
  parallel: true
```

* ### **Flexible list of files**
If you want your own list. [Custom](./docs/configuration.md#files) and [prebuilt](./docs/configuration.md#run) examples.

```yml
pre-commit:
  commands:
    frontend-linter:
      run: yarn eslint {staged_files}
    backend-linter:
      run: bundle exec rubocop --force-exclusion {all_files}
    frontend-style:
      files: git diff --name-only HEAD @{push}
      run: yarn stylelint {files}
```

* ### **Glob and regexp filters**
If you want to filter list of files. You could find more glob pattern examples [here](https://github.com/gobwas/glob#example).

```yml
pre-commit:
  commands:
    backend-linter:
      glob: "*.rb" # glob filter
      exclude: '(^|/)(application|routes)\.rb$' # regexp filter
      run: bundle exec rubocop --force-exclusion {all_files}
```

* ### **Execute in sub-directory**
If you want to execute the commands in a relative path

```yml
pre-commit:
  commands:
    backend-linter:
      root: "api/" # Careful to have only trailing slash
      glob: "*.rb" # glob filter
      run: bundle exec rubocop {all_files}
```

* ### **Run scripts**

If oneline commands are not enough, you can execute files. [Example](./docs/configuration.md#script).

```yml
commit-msg:
  scripts:
    "template_checker":
      runner: bash
```

* ### **Tags**
If you want to control a group of commands. [Example](./docs/configuration.md#tags).

```yml
pre-push:
  commands:
    packages-audit:
      tags: frontend security
      run: yarn audit
    gems-audit:
      tags: backend security
      run: bundle audit
```

* ### **Support Docker**

If you are in the Docker environment. [Example](./docs/configuration.md#cmd-template).

```yml
pre-commit:
  scripts:
    "good_job.js":
      runner: docker run -it --rm <container_id_or_name> {cmd}
```

* ### **Local config**

If you a frontend/backend developer and want to skip unnecessary commands or override something into Docker. [Description](./docs/usage.md#local-config).

```yml
# lefthook-local.yml
pre-push:
  exclude_tags:
    - frontend
  commands:
    packages-audit:
      skip: true
```

* ### **Direct control**

If you want to run hooks group directly.

```bash
$ lefthook run pre-commit
```

* ### **Your own tasks**

If you want to run specific group of commands directly.

```yml
fixer:
  commands:
    ruby-fixer:
      run: bundle exec rubocop --force-exclusion --safe-auto-correct {staged_files}
    js-fixer:
      run: yarn eslint --fix {staged_files}
```
```bash
$ lefthook run fixer
```

* ### **Optional output**

If you [don't want to see](./docs/configuration.md#skip_output) supporting information:

```yml
skip_output:
  - meta #(version and which hook running)
  - success #(output from runners with exit code 0)
```

---

## Table of contents:

### Guides

* [Install with Node.js](./docs/install.md#node)
* [Install with Ruby](./docs/install.md#ruby)
* [Install with Homebrew](./docs/install.md#homebrew)
* [Install with Winget](./docs/install.md#winget)
* [Install for Debian-based Linux](./docs/install.md#deb)
* [Install for RPM-based Linux](./docs/install.md#rpm)
* [Install for Arch Linux](./docs/install.md#arch)
* [Usage](./docs/usage.md)
* [Configuration](./docs/configuration.md)
<!-- * [Troubleshooting](https://github.com/evilmartians/lefthook/wiki/Troubleshooting) -->

<!-- ### Migrate from -->
<!-- * [Husky](https://github.com/evilmartians/lefthook/wiki/Migration-from-husky) -->
<!-- * [Husky and lint-staged](https://github.com/evilmartians/lefthook/wiki/Migration-from-husky-with-lint-staged) -->
<!-- * [Overcommit](https://github.com/evilmartians/lefthook/wiki/Migration-from-overcommit) -->

### Examples
* [Simple script](https://github.com/evilmartians/lefthook/tree/master/examples/with_scripts)
* [Full features](https://github.com/evilmartians/lefthook/tree/master/examples/complete)

<!-- ### Benchmarks -->
<!-- * [vs Overcommit](https://github.com/evilmartians/lefthook/wiki/Benchmark-lefthook-vs-overcommit) -->
<!-- * [vs pre-commit](https://github.com/evilmartians/lefthook/wiki/Benchmark-lefthook-vs-pre-commit) -->

<!-- ### Comparison list -->
<!-- * [vs Overcommit, Husky, pre-commit](https://github.com/evilmartians/lefthook/wiki/Comparison-with-other-solutions) -->

### Articles
* [5 cool (and surprising) ways to configure Lefthook for automation joy](https://evilmartians.com/chronicles/5-cool-and-surprising-ways-to-configure-lefthook-for-automation-joy?utm_source=lefthook)
* [Lefthook: Knock your team’s code back into shape](https://evilmartians.com/chronicles/lefthook-knock-your-teams-code-back-into-shape?utm_source=lefthook)
* [Lefthook + Crystalball](https://evilmartians.com/chronicles/lefthook-crystalball-and-git-magic?utm_source=lefthook)
* [Keeping OSS documentation in check with docsify, Lefthook, and friends](https://evilmartians.com/chronicles/keeping-oss-documentation-in-check-with-docsify-lefthook-and-friends?utm_source=lefthook)
* [Automatically linting docker containers](https://dev.to/nitzano/linting-docker-containers-2lo6?utm_source=lefthook)
* [Smooth PostgreSQL upgrades in DockerDev environments with Lefthook](https://dev.to/palkan_tula/smooth-postgresql-upgrades-in-dockerdev-environments-with-lefthook-203k?utm_source=lefthook)
* [Lefthook for React/React Native apps](https://blog.logrocket.com/deep-dive-into-lefthook-react-native?utm_source=lefthook)
