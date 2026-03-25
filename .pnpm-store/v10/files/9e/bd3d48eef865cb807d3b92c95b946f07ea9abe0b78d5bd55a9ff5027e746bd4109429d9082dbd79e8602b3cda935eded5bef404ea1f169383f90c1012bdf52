# Contribution Guide

## Issues

If you have a bug to report or a feature that you'd like to see, head over to
the [issues][] section of the repository to open an issue. Some guidelines:

 * Do a check of the existing issues (both open and closed) to see if anyone had
   the same issue/request. If you find something, feel free to add your voice to
   the conversation if there's something new to add or or [give the issue a
   thumbs up][github reactions] to show you have the same issue/request.

 * Please include the version of both Node.js (`node -v`) and get-system-fonts
   (`npm ls get-system-fonts`) that you are using. If you're not on the latest
   version, try using that first and see if it fixes your issue.

 * Include specific details about what you were doing and what went wrong and
   how to reproduce the issue. Some sample code or a sample gist/repository go a 
   long way to helping with debugging and finding a fix.

 * Be respectful of others in the conversation. Issues should be a place where
   people can discuss what they're seeing, learn and work toward a solution
   without worrying about being judged or lambasted.

 * If you have a question rather than an issue or feature request, don't be
   afraid to post it in the issues, but please be patient if it takes longer to
   get a response. All are encouraged to help answer questions.

## Pull Requests

Do you have a bugfix for an issue, a new feature, or even a fix for a typo in
the documentation? You should open a Pull Request! Some steps to follow:

 1. If your change is a substantial addition or it will result in a breaking
    change to the library, consider first [opening an issue](#issues) to dicuss
    the problem and the proposed solution.

 2. [Fork the repository][github fork] if you haven't before

 3. [Set up your development environment](#developer-setup) and make your
    changes. Also be sure to add tests for your change.

 4. When you're ready to push your changes, run `npm t` to lint, build and test
    your code. Any failures here will cause your pull request's continuous
    integration to fail, so it's best to catch it early.

 5. Once you've pushed your code into your fork, [open a pull request][new pull 
    request] and follow the template to fill in the pull request information.

## Developer Setup

### Prerequisites

 * [Node.js][] 6.x or later

### Setting Up

This package is written in [Typescript][]. You can get things installed and
built using the following:

```
npm i
npm run build
```

### Testing

Once you have made a change, you'll want to make sure that all of the tests are
passing. You can do so by running:

```
npm t
```

This will run tests and compute code coverage on the source code. You can view a
detailed html coverage report by running:

```
npm run show-coverage
```

### Committing

This project uses the [Angular commit style][angular commit style] for
generating changelogs and determining release versions. Any pull request with
commits that don't follow this style will fail continuous integration. If you're
not familiar with the style, you can run the following instead of the standard
`git commit` to get a guided walkthrough to generating your commit message:

```
npm run commit
```

[issues]: https://github.com/princjef/get-system-fonts/issues
[new pull request]: https://github.com/princjef/get-system-fonts/compare
[angular commit style]: https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines
[github reactions]: https://blog.github.com/2016-03-10-add-reactions-to-pull-requests-issues-and-comments/
[github fork]: https://help.github.com/articles/fork-a-repo
[Node.js]: https://nodejs.org
[Typescript]: https://www.typescriptlang.org/