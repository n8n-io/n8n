Filing tickets against loglevel
===============================

If you'd like to file a bug or a feature request for loglevel, the best option is to [open an issue on Github](https://github.com/pimterry/loglevel/issues/new).

If you're filing a feature request, please remember:

* Feature requests significantly expanding the scope of loglevel outside the description in [the readme](https://github.com/pimterry/loglevel/blob/master/README.md) will probably be rejected.
* Features that can't be meaningfully implemented in a cross-environment compatible manner won't be implemented.
* Please check the previously opened issues to see if somebody else has suggested it first.
* Consider submitting a pull request to add the feature instead, if you're confident it fits within the above.

If you're filing a bug, please remember:

* To provide detailed steps to reproduce the behaviour.
* If possible, provide a Jasmine test which reproduces the behaviour.
* Please specify the exact details of the environment in which it fails: OS + Environment (i.e. Browser or Node) + version.
* Consider submitting a pull request to fix the bug instead.

Helping develop loglevel
================================

If you'd like to help develop loglevel further, please submit a pull request! I'm very keen to improve loglevel further, and good pull requests will be enthusiastically merged.

Before submitting a pull request to fix a bug or add a new feature, please check the lists above to ensure it'll be accepted. Browser compatibility is particularly important here; if you add a feature or fix a bug which breaks things on other browsers it will not be merged, no matter how awesome it may be.

To be more specific, before submitting your pull request please ensure:

* You haven't broken the existing test suite in any obvious browsers (at least check latest IE/FF/Chrome).
* You've added relevant tests for the bug you're fixing/the new feature you're adding/etc, which pass in all the relevant browsers.
* JSHint is happy with your new code.
* You've updated the API docs (in `README.md`) to detail any changes you've made to the public interface.
* Your change is backward-compatible (or you've explicitly said that it's not; this isn't great, but will be considered).
* You haven't changed any files in `dist/` (these are auto-generated, and should only be changed on release).

Compatibility and JavaScript Runtimes
-------------------------------------

loglevel aims to stay compatible with browsers, Node.js versions, and other JS runtimes that may be fairly old at this point! Please take care to match existing conventions and JavaScript language features wherever possible. For example, loglevel uses `var` instead of the newer `let` and `const` keywords to define variables, uses old-style `for` loops instead of the newer `for...of` loop, and so on.

That said, loglevel's *test and development tools* utilize newer JavaScript and Node.js features. To run most tests or build releases, you will need a newer version of Node.js than is required at runtime (see details below in ["how to make your change…"](#how-to-make-your-change-and-submit-it)). Using newer features or making breaking changes to the *dev tools* is OK.

Project structure
-----------------

The core project code is all in [`lib/loglevel.js`](./lib/loglevel.js), and this should be the only file you need to touch for functional changes themselves.

The released code is in `dist/*.js`, and should not be touched by anything except releases (pull requests should *not* update these files).

The test suite is entirely in `test/*.js`:

* Every file ending in `-test.js` is a unit test, is written in RequireJS, and should pass in any environment.
* `global-integration.js` and `node-integration.js` are quick integration smoke tests for node and for browser global usage.
* `test-helpers.js` contains some test utilities.
* `manual-test.html` is a test page which includes the current loglevel build, so you can manually check that it works in a given browser.

How to make your change and submit it
-------------------------------------

1. Ensure you have Node.js v14 or later (some tests can run on earlier versions, but the full suite requires this version).
2. Fork loglevel.
3. Clone your fork locally.
4. Create a branch from `master` for your change.
5. Write some tests in `test/` for your change, as relevant.
6. Make your code changes in `lib/loglevel.js`.
7. Check your code all passes (run `npm test`). If you have issues and need to debug the tests, see the details on ["running tests"](#running-tests) below.
8. Commit your changes.
9. Open a pull request back to `master` in loglevel.

Running Tests
-------------

There are several types of tests and test tools that loglevel uses to verify different types of support in different environments. When you run `npm test`, *all* of these tests are run automatically. However, you may want to run individual types of tests during development, or run some tests manually to debug them.

Test commands (see `"scripts"` in `package.json` for a complete list of tools):
- `npm test` — Runs all the below tests.
- `npm run test-browser` — Runs detailed tests in a headless browser. There are actually 3 sub-groups here:
    - `npx grunt jasmine:global` — Tests general usage of the global `log` variable.
    - `npx grunt test-browser-context` — Tests usage when loglevel is injected into an anonymous function instead of included as a regular script on the page.
    - `npx grunt jasmine:requirejs` — Tests the main test suite via Jasmine & RequireJS.
- `npm run test-node` — Runs tests that check loglevel in Node.js.
- `npm run test-types` — Runs tests of the TypeScript type definitions for loglevel.

Alternatively, you might want to run tests manually in your browser in order to use debugging tools to step through the code:
1. Run `npx grunt integration-test` to start a test server on port `8000`.
2. Your default browser should open the tests automatically, but if not, open `http://127.0.0.1:8000/_SpecRunner.html` in any browser.
3. Open your browser's dev tools and place breakpoints where you'd like to debug a test.
4. Reload the page to re-run the tests and pause on breakpoints.

You can also open a blank webpage with loglevel pre-loaded to experiment in your browser's console:
1. Run `npx grunt integration-test` to start a test server on port `8000`.
2. In whatever browser you want to test, open `http://127.0.0.1:8000/test/manual-test.html`.
3. Play around with the global `log` object in the browser's dev console.

Reporting security issues
-------------------------

Tidelift acts as the security contact for loglevel. Issues can be reported to security@tidelift.com, see https://tidelift.com/security for more details.
