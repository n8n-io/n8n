
# The Changes

I'll try to explain the reason for the some changes in tmpl 2.3.x

## Escaped brackets, backslashes, and EOLs

Escaped brackets _within expressions_ are left unescaped, except in JavaScript strings and regexes, where are preserved. So far, I have not found a case where brackets within expressions must remain escaped.

In the HTML part, escaped brackets are unescaped before the evaluation.

EOLs are normalized to `\n` in the HTML and converted to compact spaces in expressions.
In JavaScript strings and regexes, escaped characters `\r` and `\n` are preserved.

## Handling evaluation errors

The new `tmpl.errorHandler` property allows to detect errors _in the evaluation_, by setting its value to a function that receives the generated Error object, augmented with an object `riotData` containing the properties `tagName` and `_riot_id` of the context at error time.

Other (usually fatal) errors, such as "Parse Error" generated for the Function constructor, are not intercepted.

If this property is not set, or set to falsy, as in previous versions the error is silently ignored.

Example:
```html
<mytag></mytag>
<script type="riot/tag">
  <mytag><p>{ foo.bar }</p></mytag>
</script>
<script>
  riot.util.tmpl.errorHandler = function (err) {
    console.error(err.message + ' in ' + err.riotData.tagName)
  }
  riot.mount('*')
</script>
```
outputs "Cannot read property 'bar' of undefined in MYTAG" in the console.

Ref: [riot#871](https://github.com/riot/riot/issues/871), [riot#1189](https://github.com/riot/riot/issues/1189)

## The new brackets function

brackets 2.3 combines the behavior of brackets 2.2 with a new one, based on a function to make immediate, more secure changes to custom brackets. ~~There is a performance penalty in supporting both schemes, but compatibility is maintained.~~

If riot is available when `brackets` is instantiated, `brackets` uses the configuration in `riot.settings`. In this way, `brackets` works as in previous versions and the reconfiguration is delayed to the first use.
If riot is not available, you can change the brackets through the new `brackets.set` function, which accepts the same parameter as `riot.settings.brackets` and makes the reconfiguration immediately.

**NOTE:**
From v2.3.15, brackets changes in browsers via `riot.settings.brackets` has immediate effect and always reflect the brackets in use, the `brackets.settings` property is not neccesary and will be removed in v2.4.0

It is all, syntax and behavior are the same as older versions: `brackets(regex_or_number)`.

## Characters not allowed in brackets

There are characters not allowed to define brackets, some are common characters in JavaScript expressions that hinder finding the right riot brackets, and other are forbidden by the HTML specs for text elements.

This is the list of invalid characters:

- Control characters from `\x00` to `\x1F` that can be changed by browsers or minifier tools
- Alphanumeric `a-z`, `A-Z`, and `0-9`, wich are confused with JS variable names
- Single and double quotes, comma, semicolon and backslash `'`, `"`, `,`, `;`, `\`, for obvious reasons
- The dangerous `<` and `>` characters, reserved for use in markup and strictly prohibited in unquoted text for any other purpose -- out of CDATA sections.

Typically, by using `<>` the browser will send to riot something different to what the user wants. With preprocessors such as ASP, no problems. But riot is not one of them, even with precompiled tags, it's a postprocessor. See the difference:

#### ASP

Source &#x2013;>   | ASP parser &#x2013;> | Browser
-------------------|----------------|-----------
`<p><%= x %></p>`  |    `<p>X</p>`  |  (Renders "X")  

ASP takes the value of `x`, does the substitution, and stops here. The browser (HTML parser) receives valid HTML.

#### riot

Source &#x2013;>  | Browser &#x2013;>    | riot parser &#x2013;>
------------------|----------------------|----------------
`<p><%= x %></p>` | Renders `<p><></p>`? | `<p><></p>`

Here the browser (some version of IE) receives invalid markup and try to render the best it can without break the page (i.e. "fix" the error). riot has no chance to get the expression and re-render the value. Other browser _can_ keep the markup as-is depending on its location in the elements. Anyway, the result is unpredictable.

## Final Note

There's more new functions and properties added to `brackets`, you can use [hasExpr](https://github.com/riot/tmpl/blob/dev/doc/API.md#hasexpr-function) and the [regexes](https://github.com/riot/tmpl/blob/dev/doc/API.md#r_mlcomms-property) which will be maintained, but the additional functions are for internal use.
