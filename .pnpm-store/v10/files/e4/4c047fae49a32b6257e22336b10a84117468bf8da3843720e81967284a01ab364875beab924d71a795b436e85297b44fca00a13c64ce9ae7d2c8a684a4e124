Steps to a new release
======================

1. Make a branch to fix a bug or add a feature, e.g. "json-diff-fix-68" or "json-diff-bignum-support".
1. Fix the bug or add the feature, add unit tests to detect that the bug fix or new feature works.
1. Make a PR from the branch against master and submit it.
1. Maintainer then does:
    * A review and squash-merge of the PR
    * git checkout master
    * git pull
    * npm ci
    * npm run test
    * update change log in README
    * git commit -a -m "Update README"; git push
    * npm version <next.version.number>
    * git push --tags; git push
    * npm publish (get one-time NPM password from authy)