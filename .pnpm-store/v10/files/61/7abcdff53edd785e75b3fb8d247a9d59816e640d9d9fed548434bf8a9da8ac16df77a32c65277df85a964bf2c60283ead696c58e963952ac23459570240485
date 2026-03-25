#### 9.1.2
* 28/08/23
* #354 Amend `round` to avoid bug in v8 Maglev compiler.
* [BUGFIX] #344 `minumum(0, -0)` should be `-0`.

#### 9.1.1
* 04/12/22
* #338 [BUGFIX] `exponentiatedBy`: ensure `0**-n === Infinity` for very large `n`.

#### 9.1.0
* 08/08/22
* #329 Remove `import` example.
* #277 Resolve lint warnings and add number `toString` note.
* Correct `decimalPlaces()` return type in *bignumber.d.ts*.
* Add ES module global `crypto` example.
* #322 Add `exports` field to *package.json*.
* #251 (#308) Amend *bignumber.d.ts* to allow instantiating a BigNumber without `new`.

#### 9.0.2
* 12/12/21
* #250 [BUGFIX] Allow use of user-defined alphabet for base 10.
* #295 Remove *bignumber.min.js* and amend *README.md*.
* Update *.travis.yml* and *LICENCE.md*.

#### 9.0.1
* 28/09/20
* [BUGFIX] #276 Correct `sqrt` initial estimate.
* Update *.travis.yml*, *LICENCE.md* and *README.md*.

#### 9.0.0
* 27/05/2019
* For compatibility with legacy browsers, remove `Symbol` references.

#### 8.1.1
* 24/02/2019
* [BUGFIX] #222 Restore missing `var` to `export BigNumber`.
* Allow any key in BigNumber.Instance in *bignumber.d.ts*.

#### 8.1.0
* 23/02/2019
* [NEW FEATURE] #220 Create a BigNumber using `{s, e, c}`.
* [NEW FEATURE] `isBigNumber`: if `BigNumber.DEBUG` is `true`, also check that the BigNumber instance is well-formed.
* Remove `instanceof` checks; just use `_isBigNumber` to identify a BigNumber instance.
* Add `_isBigNumber` to prototype in *bignumber.mjs*.
* Add tests for BigNumber creation from object.
* Update *API.html*.

#### 8.0.2
* 13/01/2019
* #209 `toPrecision` without argument should follow `toString`.
* Improve *Use* section of *README*.
* Optimise `toString(10)`.
* Add verson number to API doc.

#### 8.0.1
* 01/11/2018
* Rest parameter must be array type in *bignumber.d.ts*.

#### 8.0.0
* 01/11/2018
* [NEW FEATURE] Add `BigNumber.sum` method.
* [NEW FEATURE]`toFormat`: add `prefix` and `suffix` options.
* [NEW FEATURE] #178 Pass custom formatting to `toFormat`.
* [BREAKING CHANGE] #184 `toFraction`: return array of BigNumbers not strings.
* [NEW FEATURE] #185 Enable overwrite of `valueOf` to prevent accidental addition to string.
* #183 Add Node.js `crypto` requirement to documentation.
* [BREAKING CHANGE] #198 Disallow signs and whitespace in custom alphabet.
* [NEW FEATURE] #188 Implement `util.inspect.custom` for Node.js REPL.
* #170 Make `isBigNumber` a type guard in *bignumber.d.ts*.
* [BREAKING CHANGE] `BigNumber.min` and `BigNumber.max`: don't accept an array.
* Update *.travis.yml*.
* Remove *bower.json*.

#### 7.2.1
* 24/05/2018
* Add `browser` field to *package.json*.

#### 7.2.0
* 22/05/2018
* #166 Correct *.mjs* file. Remove extension from `main` field in *package.json*.

#### 7.1.0
* 18/05/2018
* Add `module` field to *package.json* for *bignumber.mjs*.

#### 7.0.2
* 17/05/2018
* #165 Bugfix: upper-case letters for bases 11-36 in a custom alphabet.
* Add note to *README* regarding creating BigNumbers from Number values.

#### 7.0.1
* 26/04/2018
* #158 Fix global object variable name typo.

#### 7.0.0
* 26/04/2018
* #143 Remove global BigNumber from typings.
* #144 Enable compatibility with `Object.freeze(Object.prototype)`.
* #148 #123 #11 Only throw on a number primitive with more than 15 significant digits if `BigNumber.DEBUG` is `true`.
* Only throw on an invalid BigNumber value if `BigNumber.DEBUG` is `true`. Return BigNumber `NaN` instead.
* #154 `exponentiatedBy`: allow BigNumber exponent.
* #156 Prevent Content Security Policy *unsafe-eval* issue.
* `toFraction`: allow `Infinity` maximum denominator.
* Comment-out some excess tests to reduce test time.
* Amend indentation and other spacing.

#### 6.0.0
* 26/01/2018
* #137 Implement `APLHABET` configuration option.
* Remove `ERRORS` configuration option.
* Remove `toDigits` method; extend `precision` method accordingly.
* Remove s`round` method; extend `decimalPlaces` method accordingly.
* Remove methods: `ceil`, `floor`, and `truncated`.
* Remove method aliases: `add`, `cmp`, `isInt`, `isNeg`, `trunc`, `mul`, `neg` and `sub`.
* Rename methods: `shift` to `shiftedBy`, `another` to `clone`, `toPower` to `exponentiatedBy`, and `equals` to `isEqualTo`.
* Rename methods: add `is` prefix to `greaterThan`, `greaterThanOrEqualTo`, `lessThan` and `lessThanOrEqualTo`.
* Add methods: `multipliedBy`, `isBigNumber`, `isPositive`, `integerValue`, `maximum` and `minimum`.
* Refactor test suite.
* Add *CHANGELOG.md*.
* Rewrite *bignumber.d.ts*.
* Redo API image.

#### 5.0.0
* 27/11/2017
* #81 Don't throw on constructor call without `new`.

#### 4.1.0
* 26/09/2017
* Remove node 0.6 from *.travis.yml*.
* Add *bignumber.mjs*.

#### 4.0.4
* 03/09/2017
* Add missing aliases to *bignumber.d.ts*.

#### 4.0.3
* 30/08/2017
* Add types: *bignumber.d.ts*.

#### 4.0.2
* 03/05/2017
* #120 Workaround Safari/Webkit bug.

#### 4.0.1
* 05/04/2017
* #121 BigNumber.default to BigNumber['default'].

#### 4.0.0
* 09/01/2017
* Replace BigNumber.isBigNumber method with isBigNumber prototype property.

#### 3.1.2
* 08/01/2017
* Minor documentation edit.

#### 3.1.1
* 08/01/2017
* Uncomment `isBigNumber` tests.
* Ignore dot files.

#### 3.1.0
* 08/01/2017
* Add `isBigNumber` method.

#### 3.0.2
* 08/01/2017
* Bugfix: Possible incorrect value of `ERRORS` after a `BigNumber.another` call (due to `parseNumeric` declaration in outer scope).

#### 3.0.1
* 23/11/2016
* Apply fix for old ipads with `%` issue, see #57 and #102.
* Correct error message.

#### 3.0.0
* 09/11/2016
* Remove `require('crypto')` - leave it to the user.
* Add `BigNumber.set` as `BigNumber.config` alias.
* Default `POW_PRECISION` to `0`.

#### 2.4.0
* 14/07/2016
* #97 Add exports to support ES6 imports.

#### 2.3.0
* 07/03/2016
* #86 Add modulus parameter to `toPower`.

#### 2.2.0
* 03/03/2016
* #91 Permit larger JS integers.

#### 2.1.4
* 15/12/2015
* Correct UMD.

#### 2.1.3
* 13/12/2015
* Refactor re global object and crypto availability when bundling.

#### 2.1.2
* 10/12/2015
* Bugfix: `window.crypto` not assigned to `crypto`.

#### 2.1.1
* 09/12/2015
* Prevent code bundler from adding `crypto` shim.

#### 2.1.0
* 26/10/2015
* For `valueOf` and `toJSON`, include the minus sign with negative zero.

#### 2.0.8
* 2/10/2015
* Internal round function bugfix.

#### 2.0.6
* 31/03/2015
* Add bower.json. Tweak division after in-depth review.

#### 2.0.5
* 25/03/2015
* Amend README. Remove bitcoin address.

#### 2.0.4
* 25/03/2015
* Critical bugfix #58: division.

#### 2.0.3
* 18/02/2015
* Amend README. Add source map.

#### 2.0.2
* 18/02/2015
* Correct links.

#### 2.0.1
* 18/02/2015
* Add `max`, `min`, `precision`, `random`, `shiftedBy`, `toDigits` and `truncated` methods.
* Add the short-forms: `add`, `mul`, `sd`, `sub` and `trunc`.
* Add an `another` method to enable multiple independent constructors to be created.
* Add support for the base 2, 8 and 16 prefixes `0b`, `0o` and `0x`.
* Enable a rounding mode to be specified as a second parameter to `toExponential`, `toFixed`, `toFormat` and `toPrecision`.
* Add a `CRYPTO` configuration property so cryptographically-secure pseudo-random number generation can be specified.
* Add a `MODULO_MODE` configuration property to enable the rounding mode used by the `modulo` operation to be specified.
* Add a `POW_PRECISION` configuration property to enable the number of significant digits calculated by the power operation to be limited.
* Improve code quality.
* Improve documentation.

#### 2.0.0
* 29/12/2014
* Add `dividedToIntegerBy`, `isInteger` and `toFormat` methods.
* Remove the following short-forms: `isF`, `isZ`, `toE`, `toF`, `toFr`, `toN`, `toP`, `toS`.
* Store a BigNumber's coefficient in base 1e14, rather than base 10.
* Add fast path for integers to BigNumber constructor.
* Incorporate the library into the online documentation.

#### 1.5.0
* 13/11/2014
* Add `toJSON` and `decimalPlaces` methods.

#### 1.4.1
* 08/06/2014
* Amend README.

#### 1.4.0
* 08/05/2014
* Add `toNumber`.

#### 1.3.0
* 08/11/2013
* Ensure correct rounding of `sqrt` in all, rather than almost all, cases.
* Maximum radix to 64.

#### 1.2.1
* 17/10/2013
* Sign of zero when x < 0 and x + (-x) = 0.

#### 1.2.0
* 19/9/2013
* Throw Error objects for stack.

#### 1.1.1
* 22/8/2013
* Show original value in constructor error message.

#### 1.1.0
* 1/8/2013
* Allow numbers with trailing radix point.

#### 1.0.1
* Bugfix: error messages with incorrect method name

#### 1.0.0
* 8/11/2012
* Initial release
