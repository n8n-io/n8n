![Build Status](https://github.com/evilmartians/lefthook/actions/workflows/test.yml/badge.svg?branch=master)
[![codecov](https://codecov.io/gh/evilmartians/lefthook/graph/badge.svg?token=d93ya8MfmB)](https://codecov.io/gh/evilmartians/lefthook)

# Lefthook

<img align="right" width="147" height="100" title="Lefthook logo"
     src="./logo_sign.svg">

A Git hooks manager for Node.js, Ruby, Python and many other types of projects.

* **Fast.** It is written in Go. Can run commands in parallel.
* **Powerful.** It allows to control execution and files you pass to your commands.
* **Simple.** It is single dependency-free binary which can work in any environment.

📖 [Introduction post](https://evilmartians.com/chronicles/lefthook-knock-your-teams-code-back-into-shape?utm_source=lefthook)

<a href="https://evilmartians.com/?utm_source=lefthook">
<img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt="Sponsored by Evil Martians" width="100%" height="54"></a>

## Install

With **Go** (>= 1.25):

```bash
go install github.com/evilmartians/lefthook@v1.13.6
```

* or as a go tool

```bash
go get -tool github.com/evilmartians/lefthook
```

With **NPM**:

```bash
npm install lefthook --save-dev
```

For **Ruby**:

```bash
gem install lefthook
```

For **Python**:

```bash
pip install lefthook
```

**[Installation guide][installation]** with more ways to install lefthook: [apt][install-apt], [brew][install-brew], [winget][install-winget], and others.

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

- [**Configuration**][configuration] for `lefthook.yml` config options.
- [**Usage**][usage] for **lefthook** CLI options, and features.
- [**Discussions**][discussion] for questions, ideas, suggestions.
<!-- - [**Wiki**](https://github.com/evilmartians/lefthook/wiki) for guides, examples, and benchmarks. -->

## Why Lefthook

* ### **Parallel execution**
Gives you more speed. [docs][config-parallel]

```yml
pre-push:
  parallel: true
```

* ### **Flexible list of files**
If you want your own list. [Custom][config-files] and [prebuilt][config-run] examples.

```yml
pre-commit:
  jobs:
    - name: lint frontend
      run: yarn eslint {staged_files}

    - name: lint backend
      run: bundle exec rubocop --force-exclusion {all_files}

    - name: stylelint frontend
      files: git diff --name-only HEAD @{push}
      run: yarn stylelint {files}
```

* ### **Glob and regexp filters**
If you want to filter list of files. You could find more glob pattern examples [here](https://github.com/gobwas/glob#example).

```yml
pre-commit:
  jobs:
    - name: lint backend
      glob: "*.rb" # glob filter
      exclude: '(^|/)(application|routes)\.rb$' # regexp filter
      run: bundle exec rubocop --force-exclusion {all_files}
```

* ### **Execute in sub-directory**
If you want to execute the commands in a relative path

```yml
pre-commit:
  jobs:
    - name: lint backend
      root: "api/" # Careful to have only trailing slash
      glob: "*.rb" # glob filter
      run: bundle exec rubocop {all_files}
```

* ### **Run scripts**

If oneline commands are not enough, you can execute files. [docs][config-scripts]

```yml
commit-msg:
  jobs:
    - script: "template_checker"
      runner: bash
```

* ### **Tags**
If you want to control a group of commands. [docs][config-tags]

```yml
pre-push:
  jobs:
    - name: audit packages
      tags:
        - frontend
        - linters
      run: yarn lint

    - name: audit gems
      tags:
        - backend
        - security
      run: bundle audit
```

* ### **Support Docker**

If you are in the Docker environment. [docs][config-run]

```yml
pre-commit:
  jobs:
    - script: "good_job.js"
      runner: docker run -it --rm <container_id_or_name> {cmd}
```

* ### **Local config**

If you are a frontend/backend developer and want to skip unnecessary commands or override something in Docker. [docs][usage-local-config]

```yml
# lefthook-local.yml
pre-push:
  exclude_tags:
    - frontend
  jobs:
    - name: audit packages
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
  jobs:
    - run: bundle exec rubocop --force-exclusion --safe-auto-correct {staged_files}
    - run: yarn eslint --fix {staged_files}
```
```bash
$ lefthook run fixer
```

* ### **Control output**

You can control what lefthook prints with [output][config-output] option.

```yml
output:
  - execution
  - failure
```

----

### Guides

* [Install with Node.js][install-node]
* [Install with Ruby][install-ruby]
* [Install with Homebrew][install-brew]
* [Install with Winget][install-winget]
* [Install for Debian-based Linux][install-apt]
* [Install for RPM-based Linux][install-rpm]
* [Install for Arch Linux][install-arch]
* [Install for Alpine Linux][install-alpine]
* [Usage][usage]
* [Configuration][configuration]
<!-- * [Troubleshooting](https://github.com/evilmartians/lefthook/wiki/Troubleshooting) -->

<!-- ### Migrate from -->
<!-- * [Husky](https://github.com/evilmartians/lefthook/wiki/Migration-from-husky) -->
<!-- * [Husky and lint-staged](https://github.com/evilmartians/lefthook/wiki/Migration-from-husky-with-lint-staged) -->
<!-- * [Overcommit](https://github.com/evilmartians/lefthook/wiki/Migration-from-overcommit) -->

### Examples

Check [examples][examples]

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


[documentation]: https://lefthook.dev/
[configuration]: https://lefthook.dev/configuration/index.html
[examples]: https://lefthook.dev/examples/lefthook-local.html
[installation]: https://lefthook.dev/installation/
[usage]: https://lefthook.dev/usage/commands.html
[discussion]: https://github.com/evilmartians/lefthook/discussions
[install-apt]: https://lefthook.dev/installation/deb.html
[install-ruby]: https://lefthook.dev/installation/ruby.html
[install-node]: https://lefthook.dev/installation/node.html
[install-brew]: https://lefthook.dev/installation/homebrew.html
[install-winget]: https://lefthook.dev/installation/winget.html
[install-rpm]: https://lefthook.dev/installation/rpm.html
[install-arch]: https://lefthook.dev/installation/arch.html
[install-alpine]: https://lefthook.dev/installation/alpine.html
[config-parallel]: https://lefthook.dev/configuration/parallel.html
[config-files]: https://lefthook.dev/configuration/files.html
[config-glob]: https://lefthook.dev/configuration/glob.html
[config-run]: https://lefthook.dev/configuration/run.html
[config-scripts]: https://lefthook.dev/configuration/Scripts.html
[config-tags]: https://lefthook.dev/configuration/tags.html
[config-skip_output]: https://lefthook.dev/configuration/skip_output.html
[config-output]: https://lefthook.dev/configuration/output.html
[usage-local-config]: https://lefthook.dev/examples/lefthook-local.html
