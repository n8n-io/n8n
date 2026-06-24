# Contributing to TypeORM

We would love for you to contribute to TypeORM and help make it even better than it is today!
As a contributor, here are the guidelines we would like you to follow:

 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Feature Requests](#feature)
 - [Submission Guidelines](#submit)
 - [Commit Message Format](#commit)

## <a name="question"></a> Got a Question or Problem?

There are several ways how you can ask your question:

* You can create a question on [StackOverflow](https://stackoverflow.com/questions/tagged/typeorm) where the questions should be tagged with tag `typeorm`.
* You can ask on [Slack](https://join.slack.com/t/typeorm/shared_invite/zt-uu12ljeb-OH_0086I379fUDApYJHNuw)
* You can create issue on [github](https://github.com/typeorm/typeorm/issues)
* If you have a Skype then try to find me there (`Umed Khudoiberdiev`)

Preferred way if you create your question on StackOverflow, or create a github issue.

## <a name="issue"></a> Found a security vulnerability?

If you find a security vulnerability or something that should be discussed personally,
please contact me within my [email](https://github.com/typeorm/typeorm/blob/master/package.json#L10).

## <a name="issue"></a> Found a Bug?

If you find a bug in the source code, you can help us by [submitting an issue](#submit-issue) to our
[GitHub Repository](https://github.com/typeorm/typeorm).
Even better, you can [submit a Pull Request](#submit-pr) with a fix.

## <a name="feature"></a> Missing a Feature?

You can *request* a new feature by [submitting an issue](#submit-issue) to our GitHub
Repository. If you would like to *implement* a new feature, please submit an issue with
a proposal for your work first, to be sure that we can use it.
Please consider what kind of change it is:

* For a **Major Feature**, first open an issue and outline your proposal so that it can be
discussed. This will also allow us to better coordinate our efforts, prevent duplication of work,
and help you to craft the change so that it is successfully accepted into the project.
* **Small Features** can be crafted and directly [submitted as a Pull Request](#submit-pr).

## <a name="submit"></a> Submission Guidelines

### <a name="submit-issue"></a> Submitting an Issue

Before you submit an issue, please search the issue tracker,
maybe an issue for your problem already exists and the discussion might inform you of workarounds readily available.

We want to fix all the issues as soon as possible, but before fixing a bug we need to reproduce and confirm it.
 In order to reproduce bugs we ask you to provide a minimal code snippet that shows a reproduction of the problem.

You can file new issues by filling out our [new issue form](https://github.com/typeorm/typeorm/issues/new).

### <a name="submit-pr"></a> Submitting a Pull Request (PR)
Before you submit your Pull Request (PR) consider the following guidelines:

* Search [GitHub](https://github.com/typeorm/typeorm/pulls) for an open or closed PR
  that relates to your submission. You don't want to duplicate effort.
* Make your changes in a new git branch:

     ```shell
     git checkout -b my-fix-branch master
     ```

* Create your patch, **including appropriate test cases**. Without tests your PR will not be accepted.
* Run the full TypeORM test suite, as described in the [developer documentation](DEVELOPER.md), and ensure that all tests pass.
* Commit your changes using a descriptive commit message that follows our [commit message conventions](#commit). Adherence to these conventions is necessary because release notes are automatically generated from these messages.

     ```shell
     git commit -a
     ```
    Note: the optional commit -a command line option will automatically "add" and "rm" edited files.

* Push your branch to GitHub:

    ```shell
    git push origin my-fix-branch
    ```

* In GitHub, send a pull request to `typeorm:master`.
* If we suggest changes then:
  * Make the required updates.
  * Re-run the TypeORM test suites to ensure tests are still passing.
  * Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

    ```shell
    git rebase master -i
    git push -f
    ```

That's it! Thank you for your contribution!

#### After your pull request is merged

After your pull request is merged, you can safely delete your branch and pull the changes
from the main (upstream) repository:

* Delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows:

    ```shell
    git push origin --delete my-fix-branch
    ```

* Check out the master branch:

    ```shell
    git checkout master -f
    ```

* Delete the local branch:

    ```shell
    git branch -D my-fix-branch
    ```

* Update your master with the latest upstream version:

    ```shell
    git pull --ff upstream master
    ```


## <a name="commit"></a> Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted.  This leads to **more
readable messages** that are easy to follow when looking through the **project history**.  But also,
we use the git commit messages to **generate changelog**.

### Commit Message Format
Each commit message consists of a **header**, a **body** and a **footer**.  The header has a special
format that includes a **type** and a **subject**:

```
<type>: <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

Any line of the commit message cannot be longer 100 characters! This allows the message to be easier
to read on GitHub as well as in various git tools.

### Revert
If the commit reverts a previous commit, it should begin with `revert: `, followed by the header of
the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is
the SHA of the commit being reverted.

### Type
Must be one of the following:

* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **perf**: A code change that improves performance
* **test**: Adding missing tests or correcting existing tests
* **build**: Changes that affect the build system, CI configuration or external dependencies
* **chore**: Other changes that don't modify `src` or `test` files

### Subject
The subject contains succinct description of the change:

* use the imperative, present tense: "change" not "changed" nor "changes"
* don't capitalize first letter
* no dot (.) at the end

### Body
Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer
The footer should contain any information about **Breaking Changes** and is also the place to
reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines.
The rest of the commit message is then used for this.

### Examples
Fix and close issue:
```
fix: resolve issues uppercase column names

Closes: #123456
```
Implement new feature:
```
feat: implement new magic decorator

This new feature change bahviour of typeorm to allow use new magic decorator...

Closes: #22222
```
Docs update:
```
docs: update supported mssql column types
```
Breaking change:
```
refactor: refactor driver API

BREAKING CHANGE: description of breaking change in driver API
```

## Financial contributions

We also welcome financial contributions in full transparency on our [open collective](https://opencollective.com/typeorm).
Anyone can file an expense. If the expense makes sense for the development of the community, it will be "merged" in the ledger of our open collective by the core contributors and the person who filed the expense will be reimbursed.


## Credits


### Contributors

Thank you to all the people who have already contributed to typeorm!
<a href="../../graphs/contributors"><img src="https://opencollective.com/typeorm/contributors.svg?width=890" /></a>


### Backers

Thank you to all our backers! [[Become a backer](https://opencollective.com/typeorm#backer)]

<a href="https://opencollective.com/typeorm#backers" target="_blank"><img src="https://opencollective.com/typeorm/backers.svg?width=890"></a>


### Sponsors

Thank you to all our sponsors! (please ask your company to also support this open source project by [becoming a sponsor](https://opencollective.com/typeorm#sponsor))

<a href="https://opencollective.com/typeorm/sponsor/0/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/1/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/2/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/3/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/4/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/5/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/6/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/7/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/8/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/typeorm/sponsor/9/website" target="_blank"><img src="https://opencollective.com/typeorm/sponsor/9/avatar.svg"></a>
