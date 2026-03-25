A pure JavaScript implementation of [Sass][sass]. **Sass makes CSS fun again**.

<table>
  <tr>
    <td>
      <img width="118px" alt="Sass logo" src="https://rawgit.com/sass/sass-site/master/source/assets/img/logos/logo.svg" />
    </td>
    <td valign="middle">
      <a href="https://www.npmjs.com/package/sass"><img width="100%" alt="npm statistics" src="https://nodei.co/npm/sass.png?downloads=true"></a>
    </td>
    <td valign="middle">
      <a href="https://github.com/sass/dart-sass/actions"><img alt="GitHub actions build status" src="https://github.com/sass/dart-sass/workflows/CI/badge.svg"></a>
      <br>
      <a href="https://ci.appveyor.com/project/nex3/dart-sass"><img alt="Appveyor build status" src="https://ci.appveyor.com/api/projects/status/84rl9hvu8uoecgef?svg=true"></a>
    </td>
  </tr>
</table>

[sass]: https://sass-lang.com/

This package is a distribution of [Dart Sass][], compiled to pure JavaScript
with no native code or external dependencies. It provides a command-line `sass`
executable and a Node.js API.

[Dart Sass]: https://github.com/sass/dart-sass

* [Usage](#usage)
* [See Also](#see-also)
* [Behavioral Differences from Ruby Sass](#behavioral-differences-from-ruby-sass)

## Usage

You can install Sass globally using `npm install -g sass` which will provide
access to the `sass` executable. You can also add it to your project using
`npm install --save-dev sass`. This provides the executable as well as a
library:

[npm]: https://www.npmjs.com/package/sass

```js
const sass = require('sass');

const result = sass.compile(scssFilename);

// OR

// Note that `compileAsync()` is substantially slower than `compile()`.
const result = await sass.compileAsync(scssFilename);
```

See [the Sass website][js api] for full API documentation.

[js api]: https://sass-lang.com/documentation/js-api

### Legacy API

Dart Sass also supports an older JavaScript API that's fully compatible with
[Node Sass] (with a few exceptions listed below), with support for both the
[`render()`] and [`renderSync()`] functions. This API is considered deprecated
and will be removed in Dart Sass 2.0.0, so it should be avoided in new projects.

[Node Sass]: https://github.com/sass/node-sass
[`render()`]: https://sass-lang.com/documentation/js-api/functions/render
[`renderSync()`]: https://sass-lang.com/documentation/js-api/functions/renderSync

Sass's support for the legacy JavaScript API has the following limitations:

* Only the `"expanded"` and `"compressed"` values of [`outputStyle`] are
  supported.

* Dart Sass doesn't support the [`precision`] option. Dart Sass defaults to a
  sufficiently high precision for all existing browsers, and making this
  customizable would make the code substantially less efficient.

* Dart Sass doesn't support the [`sourceComments`] option. Source maps are the
  recommended way of locating the origin of generated selectors.

[`outputStyle`]: https://sass-lang.com/documentation/js-api/interfaces/LegacySharedOptions#outputStyle
[`precision`]: https://github.com/sass/node-sass#precision
[`sourceComments`]: https://github.com/sass/node-sass#sourcecomments

## See Also

* [Dart Sass][], from which this package is compiled, can be used either as a
  stand-alone executable or as a Dart library. Running Dart Sass on the Dart VM
  is substantially faster than running the pure JavaScript version, so this may
  be appropriate for performance-sensitive applications. The Dart API is also
  (currently) more user-friendly than the JavaScript API. See
  [the Dart Sass README][Using Dart Sass] for details on how to use it.

* [Node Sass][], which is a wrapper around [LibSass][], the C++ implementation
  of Sass. Node Sass supports the same API as this package and is also faster
  (although it's usually a little slower than Dart Sass). However, it requires a
  native library which may be difficult to install, and it's generally slower to
  add features and fix bugs.

[Using Dart Sass]: https://github.com/sass/dart-sass#using-dart-sass
[Node Sass]: https://www.npmjs.com/package/node-sass
[LibSass]: https://sass-lang.com/libsass

## Behavioral Differences from Ruby Sass

There are a few intentional behavioral differences between Dart Sass and Ruby
Sass. These are generally places where Ruby Sass has an undesired behavior, and
it's substantially easier to implement the correct behavior than it would be to
implement compatible behavior. These should all have tracking bugs against Ruby
Sass to update the reference behavior.

1. `@extend` only accepts simple selectors, as does the second argument of
   `selector-extend()`. See [issue 1599][].

2. Subject selectors are not supported. See [issue 1126][].

3. Pseudo selector arguments are parsed as `<declaration-value>`s rather than
   having a more limited custom parsing. See [issue 2120][].

4. The numeric precision is set to 10. See [issue 1122][].

5. The indented syntax parser is more flexible: it doesn't require consistent
   indentation across the whole document. See [issue 2176][].

6. Colors do not support channel-by-channel arithmetic. See [issue 2144][].

7. Unitless numbers aren't `==` to unit numbers with the same value. In
   addition, map keys follow the same logic as `==`-equality. See
   [issue 1496][].

8. `rgba()` and `hsla()` alpha values with percentage units are interpreted as
   percentages. Other units are forbidden. See [issue 1525][].

9. Too many variable arguments passed to a function is an error. See
   [issue 1408][].

10. Allow `@extend` to reach outside a media query if there's an identical
    `@extend` defined outside that query. This isn't tracked explicitly, because
    it'll be irrelevant when [issue 1050][] is fixed.

11. Some selector pseudos containing placeholder selectors will be compiled
    where they wouldn't be in Ruby Sass. This better matches the semantics of
    the selectors in question, and is more efficient. See [issue 2228][].

12. The old-style `:property value` syntax is not supported in the indented
    syntax. See [issue 2245][].

13. The reference combinator is not supported. See [issue 303][].

14. Universal selector unification is symmetrical. See [issue 2247][].

15. `@extend` doesn't produce an error if it matches but fails to unify. See
    [issue 2250][].

16. Dart Sass currently only supports UTF-8 documents. We'd like to support
    more, but Dart currently doesn't support them. See [dart-lang/sdk#11744][],
    for example.

[issue 1599]: https://github.com/sass/sass/issues/1599
[issue 1126]: https://github.com/sass/sass/issues/1126
[issue 2120]: https://github.com/sass/sass/issues/2120
[issue 1122]: https://github.com/sass/sass/issues/1122
[issue 2176]: https://github.com/sass/sass/issues/2176
[issue 2144]: https://github.com/sass/sass/issues/2144
[issue 1496]: https://github.com/sass/sass/issues/1496
[issue 1525]: https://github.com/sass/sass/issues/1525
[issue 1408]: https://github.com/sass/sass/issues/1408
[issue 1050]: https://github.com/sass/sass/issues/1050
[issue 2228]: https://github.com/sass/sass/issues/2228
[issue 2245]: https://github.com/sass/sass/issues/2245
[issue 303]: https://github.com/sass/sass/issues/303
[issue 2247]: https://github.com/sass/sass/issues/2247
[issue 2250]: https://github.com/sass/sass/issues/2250
[dart-lang/sdk#11744]: https://github.com/dart-lang/sdk/issues/11744

Disclaimer: this is not an official Google product.
