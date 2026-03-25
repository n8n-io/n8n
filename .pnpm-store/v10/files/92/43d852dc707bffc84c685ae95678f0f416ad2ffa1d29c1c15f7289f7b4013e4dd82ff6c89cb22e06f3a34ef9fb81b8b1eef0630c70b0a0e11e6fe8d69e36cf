# Contributing to mark.js

These are the contributing guidelines of mark.js. If you are interested in contributing to the website of mark.js, please head over to the [mark.js website contributing guidelines][markjs-website-contributing].

## 1. Issues

If you have a question, problem, feature request or found a bug please open an [issue][issue].

### 1.1 Questions, Problems and Bugs

For each issue please provide:

1. What kind of browser and version you are using
2. What kind of mark.js version you are using
3. A detailed description
4. The exact steps to reproduce (bugs and problems)
5. A [fiddle][jsfiddle] that demonstrates your issue (if possible)

### 1.2 Feature Requests

Please provide the following information:

1. Your use case, why your enhancement is necessary
2. How to solve it in your opinion

## 2. Development

### 2.1 General

_Requirements: Latest [NodeJS][nodejs] (including npm) installed._

Before you start developing, you should clone or download this repository and run:

```bash
$ npm install
```

Now you are ready for development.

### 2.2 ES6 (ES2015) Information

mark.js was developed in ECMAScript 6. But as most browsers don't fully support ES6 yet, it has only those features implemented that can be converted "locally" to ES5 using [Babel][babel] without making a [polyfill][babel-polyfill] necessary. This means to forgo using generators, Set, Map, for...of loops etc..  

### 2.3 Build

The project is using [rollup][rollup] as a bundler, [Karma][karma] as a task runner and [Jasmine][jasmine] (with [jasmine-jquery][jasmine-jquery]) as a testing framework.

To lint, test and compile the project and also generate a documentation (see 2.4) please run:

```bash
$ npm run build
```

### 2.4 Source Code Documentation

[JSDoc][jsdoc] is being used as an API documentation generator. If you want to extend mark.js it might be helpful for you to view the documentation first, to learn more about the internal structure. Simply run the build and open the file `./build/doc/`.

During development, please also add the corresponding JSDoc comments.

### 2.5 Pull Requests

Pull requests are very much appreciated! :thumbsup:

Please note the following things when doing a pull request:

- If your pull request is implementing a feature, please open a new issue first.  
  Therein we can discuss about it and determine if it brings a benefit
- Do not change any version
- Always include a test if possible. Please avoid referencing existing test
  files to keep flexibility
  - Add a new fixture (test/fixtures/)
  - Add a new spec (test/specs/)
- Reference related issues in the pull request description
- Describe your changes and why they are necessary
  (if not stated in referenced issues)
- When changing something in the source code, please run the build afterwards
- Make sure that you format code to fit the [code style][code-style]. If something isn't covered, please see existing code for orientation. The maximum line length for JavaScript files is 80 characters. You'll be notified if something is wrong with the code style when running the build
- Pull requests will not be accepted if they worsen test coverage significantly. You can view test coverage in `./build/coverage/` after running the build

### 2.6 Contribution and License Agreement

If you contribute to this project, you are implicitly allowing your code to be distributed under [this license][license]. You are also implicitly verifying that all code is your original work.

__Thank you for contributing!__

[markjs-website-contributing]: https://github.com/julmot/mark.js/blob/website/CONTRIBUTING.md
[issue]: https://github.com/julmot/mark.js/issues/new
[jsfiddle]: https://jsfiddle.net
[nodejs]: https://nodejs.org/en/
[bower]: http://bower.io/
[rollup]: https://rollupjs.org/
[karma]: http://karma-runner.github.io/latest/index.html
[jasmine]: http://jasmine.github.io/
[jasmine-jquery]: https://github.com/velesin/jasmine-jquery
[jsdoc]: http://usejsdoc.org/about-getting-started.html
[babel-polyfill]: https://babeljs.io/docs/usage/polyfill/
[babel]: https://babeljs.io/
[code-style]: https://github.com/julmot/mark.js/blob/master/.jsbeautifyrc
[license]: https://raw.githubusercontent.com/julmot/mark.js/master/LICENSE
