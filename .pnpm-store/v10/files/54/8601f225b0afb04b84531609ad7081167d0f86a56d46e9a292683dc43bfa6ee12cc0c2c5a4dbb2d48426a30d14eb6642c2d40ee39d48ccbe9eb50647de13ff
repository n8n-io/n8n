# Contributing

Thank you for wanting to help make `readability` better!

For outstanding issues, see the issue list in this repo, as well as this [bug list](https://bugzilla.mozilla.org/buglist.cgi?component=Reader%20Mode&product=Toolkit&bug_status=__open__&limit=0).

Any changes to the main code should be reviewed by an [appropriate Firefox/toolkit peer](https://wiki.mozilla.org/Modules/Firefox), such as [@gijsk](https://github.com/gijsk), since these changes will be merged to mozilla-central and shipped in Firefox.

To test local changes to Readability.js, you can use the [automated tests](#tests).

This repository is governed by Mozilla's code of conduct and etiquette guidelines. 
For more details, please read the
[Mozilla Community Participation Guidelines](https://www.mozilla.org/about/governance/policies/participation/). 

## Tests

[![Build Status](https://community-tc.services.mozilla.com/api/github/v1/repository/mozilla/readability/main/badge.svg)](https://community-tc.services.mozilla.com/api/github/v1/repository/mozilla/readability/main/latest)

Please run [eslint](http://eslint.org/) as a first check that your changes are valid JS and adhere to our style guidelines:

    $ npm run lint


To run the test suite:

    $ npm test

To run a specific test page by its name:

    $ npm test -- -g 001

To run the test suite in TDD mode:

    $ npm test -- -w

Combo time:

    $ npm test -- -w -g 001

### Add new tests

There's a [node script](https://github.com/mozilla/readability/blob/master/test/generate-testcase.js) to help you create new tests.
You can run it using:

    $ node test/generate-testcase.js slug https://example.com/article

Replacing `slug` with the identifier the test should use, and providing a URL
to an actual article on which the test should be based.

On macOS, you may need to make the `tidy` binary executable before that script will succeed. If you see an `EACCES` error when running that script, try:

    $ chmod +x ./node_modules/htmltidy2/bin/darwin/tidy

## Pull Requests

We're always happy to see pull requests to improve readability.

Please ensure you run the linter and [tests](#tests) before submitting a PR.

If you're changing the algorithm to fix a specific page/article, please
[add new tests](#add-new-tests) for the case you're fixing, so we avoid
breaking it in future.

## Steps to release

1. Ensure [CHANGELOG.md](CHANGELOG.md) is up-to-date. ``git log `npm view . version`...master `` may help with this.
2. Run `npm run release` to create a release, which should:
     1. `npm version [patch | minor | major]`, depending on the nature of the changes according to
[semver](https://semver.org/). This will bump the version in `package.json` and `package-lock.json`
and create a commit and Git tag for the release.
     2. `npm publish` to push the release to the npm registry.
     3. `git push origin head --follow-tags` to push the new commit and tag to GitHub.

## Keeping a changelog

Ensure significant changes are added to `CHANGELOG.md`. Do not add
changes that only affect tests or documentation.

