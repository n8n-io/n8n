<p align="center"><img src="https://raw.githubusercontent.com/beautifier/js-beautify/7db71fc/web/wordmark-light.svg" height="200px" align="center" alt="JS Beautifier"/></p>

<p align="center"><a href="https://github.com/beautifier/js-beautify/actions/workflows/main.yml"><img alt="CI" src="https://github.com/beautifier/js-beautify/workflows/CI/badge.svg"/></a>&#32;<a href="https://greenkeeper.io/" target="_blank"><img alt="Greenkeeper badge" src="https://badges.greenkeeper.io/beautifier/js-beautify.svg"/></a></p>

<p align="center"><a href="https://pypi.python.org/pypi/jsbeautifier" target="_blank"><img alt="PyPI version" src="https://img.shields.io/pypi/v/jsbeautifier.svg"/></a>&#32;<a href="https://cdnjs.com/libraries/js-beautify" target="_blank"><img alt="CDNJS version" src="https://img.shields.io/cdnjs/v/js-beautify.svg"/></a>&#32;<a href="https://www.npmjs.com/package/js-beautify" target="_blank"><img alt="NPM @latest" src="https://img.shields.io/npm/v/js-beautify.svg"/></a>&#32;<a href="https://www.npmjs.com/package/js-beautify?activeTab=versions" target="_blank"><img alt="NPM @next" src="https://img.shields.io/npm/v/js-beautify/next.svg"/></a></p>

<p align="center"><a href="https://gitter.im/beautifier/js-beautify?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge" target="_blank"><img alt="Join the chat at https://gitter.im/beautifier/js-beautify" src="https://badges.gitter.im/Join%20Chat.svg"></a>&#32;<a href="https://twitter.com/intent/user?screen_name=js_beautifier" target="_blank"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/js_beautifier.svg?style=social&label=Follow"/></a></p>

<p align="center"><a href="https://www.npmjs.org/package/js-beautify" target="_blank"><img alt="NPM stats" src=https://nodei.co/npm/js-beautify.svg?downloadRank=true&downloads=true"/></a></p>

This little beautifier will reformat and re-indent bookmarklets, ugly
JavaScript, unpack scripts packed by Dean Edward’s popular packer,
as well as partly deobfuscate scripts processed by the npm package
[javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator).

Open [beautifier.io](https://beautifier.io/) to try it out.  Options are available via the UI.


# Contributors Needed
I'm putting this front and center above because existing owners have very limited time to work on this project currently.
This is a popular project and widely used but it desperately needs contributors who have time to commit to fixing both
customer facing bugs and underlying problems with the internal design and implementation.

If you are interested, please take a look at the [CONTRIBUTING.md](https://github.com/beautifier/js-beautify/blob/main/CONTRIBUTING.md) then fix an issue marked with the ["Good first issue"](https://github.com/beautifier/js-beautify/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) label and submit a PR. Repeat as often as possible.  Thanks!


# Installation

You can install the beautifier for Node.js or Python.

## Node.js JavaScript

You may install the NPM package `js-beautify`. When installed globally, it provides an executable `js-beautify` script. As with the Python script, the beautified result is sent to `stdout` unless otherwise configured.

```bash
$ npm -g install js-beautify
$ js-beautify foo.js
```

You can also use `js-beautify` as a `node` library (install locally, the `npm` default):

```bash
$ npm install js-beautify
```

## Node.js JavaScript (vNext)

The above install the latest stable release. To install beta or RC versions:

```bash
$ npm install js-beautify@next
```

## Web Library
The beautifier can be added on your page as web library.

JS Beautifier is hosted on two CDN services: [cdnjs](https://cdnjs.com/libraries/js-beautify) and rawgit.

To pull the latest version from one of these services include one set of the script tags below in your document:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-css.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-html.js"></script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-html.min.js"></script>
```

Example usage of a JS tag in html:

```html
<!DOCTYPE html>
<html lang="en">
  <body>

. . .

    <script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify.min.js"></script>
    <script src="script.js"></script>
  </body>
</html>
```
Older versions are available by changing the version number.

Disclaimer: These are free services, so there are [no uptime or support guarantees](https://github.com/rgrove/rawgit/wiki/Frequently-Asked-Questions#i-need-guaranteed-100-uptime-should-i-use-cdnrawgitcom).


## Python
To install the Python version of the beautifier:

```bash
$ pip install jsbeautifier
```
Unlike the JavaScript version, the Python version can only reformat JavaScript. It does not work against HTML or CSS files, but you can install _css-beautify_ for CSS:

```bash
$ pip install cssbeautifier
```

# Usage
You can beautify JavaScript using JS Beautifier in your web browser, or on the command-line using Node.js or Python.

## Web Browser
Open [beautifier.io](https://beautifier.io/).  Options are available via the UI.

## Web Library
After you embed the `<script>` tags in your `html` file, they expose three functions: `js_beautify`, `css_beautify`, and `html_beautify` 

Example usage of beautifying a json string:

```js
const options = { indent_size: 2, space_in_empty_paren: true }

const dataObj = {completed: false,id: 1,title: "delectus aut autem",userId: 1,}

const dataJson = JSON.stringify(dataObj)

js_beautify(dataJson, options)

/* OUTPUT
{
  "completed": false,
  "id": 1,
  "title": "delectus aut autem",
  "userId": 1,
}
*/
```

## Node.js JavaScript

When installed globally, the beautifier provides an executable `js-beautify` script. The beautified result is sent to `stdout` unless otherwise configured.

```bash
$ js-beautify foo.js
```

To use `js-beautify` as a `node` library (after install locally), import and call the appropriate beautifier method for JavaScript (JS), CSS, or HTML.  All three method signatures are `beautify(code, options)`. `code` is the string of code to be beautified. options is an object with the settings you would like used to beautify the code.

The configuration option names are the same as the CLI names but with underscores instead of dashes.  For example, `--indent-size 2 --space-in-empty-paren` would be `{ indent_size: 2, space_in_empty_paren: true }`.

```js
var beautify = require('js-beautify/js').js,
    fs = require('fs');

fs.readFile('foo.js', 'utf8', function (err, data) {
    if (err) {
        throw err;
    }
    console.log(beautify(data, { indent_size: 2, space_in_empty_paren: true }));
});
```

If you are using ESM Imports, you can import `js-beautify` like this:

```js
// 'beautify' can be any name here.
import beautify from 'js-beautify';

beautify.js(data, options);
beautify.html(data, options);
beautify.css(data, options);
```

## Python
After installing, to beautify using Python:

```bash
$ js-beautify file.js
```

Beautified output goes to `stdout` by default.

To use `jsbeautifier` as a library is simple:

```python
import jsbeautifier
res = jsbeautifier.beautify('your JavaScript string')
res = jsbeautifier.beautify_file('some_file.js')
```

...or, to specify some options:

```python
opts = jsbeautifier.default_options()
opts.indent_size = 2
opts.space_in_empty_paren = True
res = jsbeautifier.beautify('some JavaScript', opts)
```

The configuration option names are the same as the CLI names but with underscores instead of dashes.  The example above would be set on the command-line as `--indent-size 2 --space-in-empty-paren`.


# Options

These are the command-line flags for both Python and JS scripts:

```text
CLI Options:
  -f, --file       Input file(s) (Pass '-' for stdin)
  -r, --replace    Write output in-place, replacing input
  -o, --outfile    Write output to file (default stdout)
  --config         Path to config file
  --type           [js|css|html] ["js"] Select beautifier type (NOTE: Does *not* filter files, only defines which beautifier type to run)
  -q, --quiet      Suppress logging to stdout
  -h, --help       Show this help
  -v, --version    Show the version

Beautifier Options:
  -s, --indent-size                 Indentation size [4]
  -c, --indent-char                 Indentation character [" "]
  -t, --indent-with-tabs            Indent with tabs, overrides -s and -c
  -e, --eol                         Character(s) to use as line terminators.
                                    [first newline in file, otherwise "\n]
  -n, --end-with-newline            End output with newline
  --editorconfig                    Use EditorConfig to set up the options
  -l, --indent-level                Initial indentation level [0]
  -p, --preserve-newlines           Preserve line-breaks (--no-preserve-newlines disables)
  -m, --max-preserve-newlines       Number of line-breaks to be preserved in one chunk [10]
  -P, --space-in-paren              Add padding spaces within paren, ie. f( a, b )
  -E, --space-in-empty-paren        Add a single space inside empty paren, ie. f( )
  -j, --jslint-happy                Enable jslint-stricter mode
  -a, --space-after-anon-function   Add a space before an anonymous function's parens, ie. function ()
  --space-after-named-function      Add a space before a named function's parens, i.e. function example ()
  -b, --brace-style                 [collapse|expand|end-expand|none][,preserve-inline] [collapse,preserve-inline]
  -u, --unindent-chained-methods    Don't indent chained method calls
  -B, --break-chained-methods       Break chained method calls across subsequent lines
  -k, --keep-array-indentation      Preserve array indentation
  -x, --unescape-strings            Decode printable characters encoded in xNN notation
  -w, --wrap-line-length            Wrap lines that exceed N characters [0]
  -X, --e4x                         Pass E4X xml literals through untouched
  --good-stuff                      Warm the cockles of Crockford's heart
  -C, --comma-first                 Put commas at the beginning of new line instead of end
  -O, --operator-position           Set operator position (before-newline|after-newline|preserve-newline) [before-newline]
  --indent-empty-lines              Keep indentation on empty lines
  --templating                      List of templating languages (auto,django,erb,handlebars,php,smarty,angular) ["auto"] auto = none in JavaScript, all in HTML
```

Which correspond to the underscored option keys for both library interfaces

**defaults per CLI options**
```json
{
    "indent_size": 4,
    "indent_char": " ",
    "indent_with_tabs": false,
    "editorconfig": false,
    "eol": "\n",
    "end_with_newline": false,
    "indent_level": 0,
    "preserve_newlines": true,
    "max_preserve_newlines": 10,
    "space_in_paren": false,
    "space_in_empty_paren": false,
    "jslint_happy": false,
    "space_after_anon_function": false,
    "space_after_named_function": false,
    "brace_style": "collapse",
    "unindent_chained_methods": false,
    "break_chained_methods": false,
    "keep_array_indentation": false,
    "unescape_strings": false,
    "wrap_line_length": 0,
    "e4x": false,
    "comma_first": false,
    "operator_position": "before-newline",
    "indent_empty_lines": false,
    "templating": ["auto"]
}
```

**defaults not exposed in the cli**
```json
{
  "eval_code": false,
  "space_before_conditional": true
}
```

Notice not all defaults are exposed via the CLI.  Historically, the Python and
JS APIs have not been 100% identical. There are still a
few other additional cases keeping us from 100% API-compatibility.


## Loading settings from environment or .jsbeautifyrc (JavaScript-Only)

In addition to CLI arguments, you may pass config to the JS executable via:

 * any `jsbeautify_`-prefixed environment variables
 * a `JSON`-formatted file indicated by the `--config` parameter
 * a `.jsbeautifyrc` file containing `JSON` data at any level of the filesystem above `$PWD`

Configuration sources provided earlier in this stack will override later ones.

## Setting inheritance and Language-specific overrides

The settings are a shallow tree whose values are inherited for all languages, but
can be overridden.  This works for settings passed directly to the API in either implementation.
In the JavaScript implementation, settings loaded from a config file, such as .jsbeautifyrc, can also use inheritance/overriding.

Below is an example configuration tree showing all the supported locations
for language override nodes.  We'll use `indent_size` to discuss how this configuration would behave, but any number of settings can be inherited or overridden:

```json
{
    "indent_size": 4,
    "html": {
        "end_with_newline": true,
        "js": {
            "indent_size": 2
        },
        "css": {
            "indent_size": 2
        }
    },
    "css": {
        "indent_size": 1
    },
    "js": {
       "preserve-newlines": true
    }
}
```

Using the above example would have the following result:

* HTML files
  * Inherit `indent_size` of 4 spaces from the top-level setting.
  * The files would also end with a newline.
  * JavaScript and CSS inside HTML
    * Inherit the HTML `end_with_newline` setting.
    * Override their indentation to 2 spaces.
* CSS files
  * Override the top-level setting to an `indent_size` of 1 space.
* JavaScript files
  * Inherit `indent_size` of 4 spaces from the top-level setting.
  * Set `preserve-newlines` to `true`.

## CSS & HTML

In addition to the `js-beautify` executable, `css-beautify` and `html-beautify`
are also provided as an easy interface into those scripts. Alternatively,
`js-beautify --css` or `js-beautify --html` will accomplish the same thing, respectively.

```js
// Programmatic access
var beautify_js = require('js-beautify'); // also available under "js" export
var beautify_css = require('js-beautify').css;
var beautify_html = require('js-beautify').html;

// All methods accept two arguments, the string to be beautified, and an options object.
```

The CSS & HTML beautifiers are much simpler in scope, and possess far fewer options.

```text
CSS Beautifier Options:
  -s, --indent-size                  Indentation size [4]
  -c, --indent-char                  Indentation character [" "]
  -t, --indent-with-tabs             Indent with tabs, overrides -s and -c
  -e, --eol                          Character(s) to use as line terminators. (default newline - "\\n")
  -n, --end-with-newline             End output with newline
  -b, --brace-style                  [collapse|expand] ["collapse"]
  -L, --selector-separator-newline   Add a newline between multiple selectors
  -N, --newline-between-rules        Add a newline between CSS rules
  --indent-empty-lines               Keep indentation on empty lines

HTML Beautifier Options:
  -s, --indent-size                  Indentation size [4]
  -c, --indent-char                  Indentation character [" "]
  -t, --indent-with-tabs             Indent with tabs, overrides -s and -c
  -e, --eol                          Character(s) to use as line terminators. (default newline - "\\n")
  -n, --end-with-newline             End output with newline
  -p, --preserve-newlines            Preserve existing line-breaks (--no-preserve-newlines disables)
  -m, --max-preserve-newlines        Maximum number of line-breaks to be preserved in one chunk [10]
  -I, --indent-inner-html            Indent <head> and <body> sections. Default is false.
  -b, --brace-style                  [collapse-preserve-inline|collapse|expand|end-expand|none] ["collapse"]
  -S, --indent-scripts               [keep|separate|normal] ["normal"]
  -w, --wrap-line-length             Maximum characters per line (0 disables) [250]
  -A, --wrap-attributes              Wrap attributes to new lines [auto|force|force-aligned|force-expand-multiline|aligned-multiple|preserve|preserve-aligned] ["auto"]
  -M, --wrap-attributes-min-attrs    Minimum number of html tag attributes for force wrap attribute options [2]
  -i, --wrap-attributes-indent-size  Indent wrapped attributes to after N characters [indent-size] (ignored if wrap-attributes is "aligned")
  -d, --inline                       List of tags to be considered inline tags
  --inline_custom_elements           Inline custom elements [true]
  -U, --unformatted                  List of tags (defaults to inline) that should not be reformatted
  -T, --content_unformatted          List of tags (defaults to pre) whose content should not be reformatted
  -E, --extra_liners                 List of tags (defaults to [head,body,/html] that should have an extra newline before them.
  --editorconfig                     Use EditorConfig to set up the options
  --indent_scripts                   Sets indent level inside script tags ("normal", "keep", "separate")
  --unformatted_content_delimiter    Keep text content together between this string [""]
  --indent-empty-lines               Keep indentation on empty lines
  --templating                       List of templating languages (auto,none,django,erb,handlebars,php,smarty,angular) ["auto"] auto = none in JavaScript, all in html
```

## Directives

Directives let you control the behavior of the Beautifier from within your source files. Directives are placed in comments inside the file.  Directives are in the format `/* beautify {name}:{value} */` in CSS and JavaScript. In HTML they are formatted as `<!-- beautify {name}:{value} -->`.

### Ignore directive

The `ignore` directive makes the beautifier completely ignore part of a file, treating it as literal text that is not parsed.
The input below will remain unchanged after beautification:

```js
// Use ignore when the content is not parsable in the current language, JavaScript in this case.
var a =  1;
/* beautify ignore:start */
 {This is some strange{template language{using open-braces?
/* beautify ignore:end */
```

### Preserve directive

NOTE: this directive only works in HTML and JavaScript, not CSS.

The `preserve` directive makes the Beautifier parse and then keep the existing formatting of a section of code.

The input below will remain unchanged after beautification:

```js
// Use preserve when the content is valid syntax in the current language, JavaScript in this case.
// This will parse the code and preserve the existing formatting.
/* beautify preserve:start */
{
    browserName: 'internet explorer',
    platform:    'Windows 7',
    version:     '8'
}
/* beautify preserve:end */
```

# License

You are free to use this in any way you want, in case you find this useful or working for you but you must keep the copyright notice and license. (MIT)

# Credits

* Created by Einar Lielmanis, <einar@beautifier.io>
* Python version flourished by Stefano Sanfilippo <a.little.coder@gmail.com>
* Command-line for node.js by Daniel Stockman <daniel.stockman@gmail.com>
* Maintained and expanded by Liam Newman <bitwiseman@beautifier.io>

Thanks also to Jason Diamond, Patrick Hof, Nochum Sossonko, Andreas Schneider, Dave
Vasilevsky, Vital Batmanov, Ron Baldwin, Gabriel Harrison, Chris J. Shull,
Mathias Bynens, Vittorio Gambaletta and others.

(README.md: js-beautify@1.15.4)
