![Showdown][sd-logo]

![Build Status: Linux](https://github.com/showdownjs/showdown/actions/workflows/node.js.yml/badge.svg)
[![npm version](https://badge.fury.io/js/showdown.svg)](http://badge.fury.io/js/showdown)
[![Bower version](https://badge.fury.io/bo/showdown.svg)](http://badge.fury.io/bo/showdown)
[![Join the chat at https://gitter.im/showdownjs/showdown](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/showdownjs/showdown?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Greenkeeper badge](https://badges.greenkeeper.io/showdownjs/showdown.svg)](https://greenkeeper.io/)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.me/tiviesantos)

------

Showdown is a Javascript Markdown to HTML converter, based on the original works by John Gruber.
Showdown can be used client side (in the browser) or server side (with NodeJs).

## Live DEMO

Check a live Demo here http://demo.showdownjs.com/

## Funding

As you know, ShowdownJS is a free library and it will remain free forever. However, maintaining and improving the library costs time and money.

If you like our work and find our library useful, please donate through [paypal](https://www.paypal.me/tiviesantos)!!
Your contribution will be greatly appreciated and help us continue to develop this awesome library.

## License

ShowdownJS v 2.0 is release under the MIT version.
Previous versions are release under BSD.

## Who uses Showdown (or a fork)

 - [GoogleCloudPlatform](https://github.com/GoogleCloudPlatform)
 - [Meteor](https://www.meteor.com/)
 - [Stackexchange](http://stackexchange.com/) - forked as [PageDown](https://code.google.com/p/pagedown/)
 - [docular](https://github.com/Vertafore/docular)
 - [md-page](https://github.com/oscarmorrison/md-page)
 - [QCObjects](https://qcobjects.dev)
 - [and some others...](https://www.npmjs.com/browse/depended/showdown)

## Installation

### Download tarball

You can download the latest release tarball directly from [releases][releases]

### Bower

    bower install showdown

### npm (server-side)

    npm install showdown

### NuGet package

    PM> Install-Package showdownjs

The NuGet Packages can be [found here](https://www.nuget.org/packages/showdownjs/).

### CDN

You can also use one of several CDNs available: 

* jsDelivr

        https://cdn.jsdelivr.net/npm/showdown@<version tag>/dist/showdown.min.js

* cdnjs

        https://cdnjs.cloudflare.com/ajax/libs/showdown/<version tag>/showdown.min.js

* unpkg
       
        https://unpkg.com/showdown/dist/showdown.min.js

*Note*: replace `<version tag>` with an actual full length version you're interested in e.g. `1.9.0`
## Browser Compatibility

Showdown has been tested successfully with:

  * Firefox 1.5 and 2.0
  * Chrome 12.0
  * Internet Explorer 6 and 7
  * Safari 2.0.4
  * Opera 8.54 and 9.10
  * Netscape 8.1.2
  * Konqueror 3.5.4

In theory, Showdown will work in any browser that supports ECMA 262 3rd Edition (JavaScript 1.5).
The converter itself might even work in things that aren't web browsers, like Acrobat.  No promises.


## Node compatibility

Showdown supports node versions in the "Current", "Active" and "Maintenance" phases. Currently this includes Node 12.x, 14.x, 16.x and 17.x. See the [node release roadmap for more details](12.x, 14.x, 16.x, 17.x). 

Other versions of node may likely work, but they are not tested regularly.

## Pervious versions

If you're looking for showdown v<1.0.0, you can find it in the [**legacy branch**][legacy-branch].

If you are looking for showdown 1.* you can find it in the [version_1.x][version_1.x] branch.

## Changelog

You can check the full [changelog][changelog]

## Extended documentation
Check our [wiki pages][wiki] for examples and a more in-depth documentation.


## Quick Example

### Node

**Markdown to HTML**
```js
var showdown  = require('showdown'),
    converter = new showdown.Converter(),
    text      = '# hello, markdown!',
    html      = converter.makeHtml(text);
```

**HTML to Markdown**
```js
var showdown  = require('showdown'),
    converter = new showdown.Converter(),
    html      = '<a href="https://patreon.com/showdownjs">Please Support us!</a>',
    md        = converter.makeMarkdown(text);
```


### Browser

```js
var converter = new showdown.Converter(),
    html      = converter.makeHtml('# hello, markdown!'),
    md        = converter.makeMd('<a href="https://patreon.com/showdownjs">Please Support us!</a>');
```

### Output 

Both examples should output...

```html
    <h1 id="hellomarkdown">hello, markdown!</h1>
```

```md
[Please Support us!](https://patreon.com/showdownjs)
```

## Options

You can change some of showdown's default behavior through options. 

### Setting options

Options can be set:

#### Globally

Setting a "global" option affects all instances of showdown

```js
showdown.setOption('optionKey', 'value');
```

#### Locally
Setting a "local" option only affects the specified Converter object. 
Local options can be set:

 * **through the constructor**
    ```js
    var converter = new showdown.Converter({optionKey: 'value'});
    ```

 * **through the setOption() method**
    ```js
    var converter = new showdown.Converter();
    converter.setOption('optionKey', 'value');
    ```

### Getting an option

Showdown provides 2 methods (both local and global) to retrieve previous set options.

#### getOption()

```js
// Global
var myOption = showdown.getOption('optionKey');

//Local
var myOption = converter.getOption('optionKey');
```

#### getOptions()

```js
// Global
var showdownGlobalOptions = showdown.getOptions();

//Local
var thisConverterSpecificOptions = converter.getOptions();
```

### Retrieve the default options

You can get showdown's default options with:
```js
var defaultOptions = showdown.getDefaultOptions();
```

### Valid Options

 * **omitExtraWLInCodeBlocks**: (boolean) [default false] Omit the trailing newline in a code block. Ex:
   
    This:
    ```html
    <code><pre>var foo = 'bar';
    </pre></code>
    ```
    Becomes this:
    ```html
    <code><pre>var foo = 'bar';</pre></code>
    ```

 * **noHeaderId**: (boolean) [default false] Disable the automatic generation of header ids.
   Setting to true overrides **prefixHeaderId**

 * **customizedHeaderId**: (boolean) [default false] Use text in curly braces as header id. **(since v1.7.0)**
   Example:
   ```
   ## Sample header {real-id}     will use real-id as id
   ```

 * **ghCompatibleHeaderId**: (boolean) [default false] Generate header ids compatible with github style
   (spaces are replaced with dashes and a bunch of non alphanumeric chars are removed) **(since v1.5.5)**

 * **prefixHeaderId**: (string/boolean) [default false] Add a prefix to the generated header ids.
   Passing a string will prefix that string to the header id. Setting to `true` will add a generic 'section' prefix.

 * **rawPrefixHeaderId**: (boolean) [default false] Setting this option to true will prevent showdown from modifying the prefix.
   This might result in malformed IDs (if, for instance, the " char is used in the prefix).
   Has no effect if prefixHeaderId is set to false. **(since v 1.7.3)**

 * **rawHeaderId**: (boolean) [default false] Remove only spaces, ' and " from generated header ids (including prefixes),
    replacing them with dashes (-). WARNING: This might result in malformed ids **(since v1.7.3)**
 
 * **parseImgDimensions**: (boolean) [default false] Enable support for setting image dimensions from within markdown syntax.
   Examples:
   ```
   ![foo](foo.jpg =100x80)     simple, assumes units are in px
   ![bar](bar.jpg =100x*)      sets the height to "auto"
   ![baz](baz.jpg =80%x5em)  Image with width of 80% and height of 5em
   ```
 
 * **headerLevelStart**: (integer) [default 1] Set the header starting level. For instance, setting this to 3 means that

    ```md
    # foo
    ```
    will be parsed as 
    
    ```html
    <h3>foo</h3>
    ```

 * **simplifiedAutoLink**: (boolean) [default false] Turning this option on will enable automatic linking to urls.
   This means that:

   ```md
   some text www.google.com
   ```
   will be parsed as 
   ```html
   <p>some text <a href="www.google.com">www.google.com</a>
   ```
 
 * **excludeTrailingPunctuationFromURLs**: (boolean) [default false] This option excludes trailing punctuation from autolinking urls.
   Punctuation excluded: `. !  ? ( )`. Only applies if **simplifiedAutoLink** option is set to `true`.
   
   ```md
   check this link www.google.com!
   ```
   will be parsed as
   ```html
   <p>check this link <a href="www.google.com">www.google.com</a>!</p>
   ```
   
 * **literalMidWordUnderscores**: (boolean) [default false] Turning this on will stop showdown from interpreting
   underscores in the middle of words as `<em>` and `<strong>` and instead treat them as literal underscores.

   Example:
   
   ```md
   some text with__underscores__in middle
   ```
   will be parsed as
   ```html
   <p>some text with__underscores__in middle</p>
   ```

 * **literalMidWordAsterisks**: (boolean) [default false] Turning this on will stop showdown from interpreting asterisks
   in the middle of words as `<em>` and `<strong>` and instead treat them as literal asterisks.

   Example:

   ```md
   some text with**underscores**in middle
   ```
   will be parsed as
   ```html
   <p>some text with**underscores**in middle</p>
   ```
   
 * **strikethrough**: (boolean) [default false] Enable support for strikethrough syntax.
   `~~strikethrough~~` as `<del>strikethrough</del>`
   
 * **tables**: (boolean) [default false] Enable support for tables syntax. Example:
    
   ```md
   | h1    |    h2   |      h3 |
   |:------|:-------:|--------:|
   | 100   | [a][1]  | ![b][2] |
   | *foo* | **bar** | ~~baz~~ |
   ```
   
   See the wiki for more info

 * **tablesHeaderId**: (boolean) [default false] If enabled adds an id property to table headers tags.

 * **ghCodeBlocks**: (boolean) [default true] Enable support for GFM code block style.

 * **tasklists**: (boolean) [default false] Enable support for GFM tasklists. Example:
 
   ```md
    - [x] This task is done
    - [ ] This is still pending
   ```
 * **smoothLivePreview**: (boolean) [default false] Prevents weird effects in live previews due to incomplete input
 
 * **smartIndentationFix**: (boolean) [default false] Tries to smartly fix indentation problems related to es6 template
   strings in the midst of indented code.

 * **disableForced4SpacesIndentedSublists**: (boolean) [default false] Disables the requirement of indenting sublists
   by 4 spaces for them to be nested, effectively reverting to the old behavior where 2 or 3 spaces were enough.
   **(since v1.5.0)**
 
 * **simpleLineBreaks**: (boolean) [default false] Parses line breaks as `<br>`, like GitHub does, without
   needing 2 spaces at the end of the line **(since v1.5.1)**
 
   ```md
   a line  
   wrapped in two
   ```
    
   turns into:
    
   ```html
   <p>a line<br>
   wrapped in two</p>
   ```

 * **requireSpaceBeforeHeadingText**: (boolean) [default false] Makes adding a space between `#` and the header text mandatory **(since v1.5.3)**
 
 * **ghMentions**: (boolean) [default false] Enables github @mentions, which link to the username mentioned **(since v1.6.0)**
 
 * **ghMentionsLink**: (string) [default `https://github.com/{u}`] Changes the link generated by @mentions.
   Showdown will replace `{u}` with the username. Only applies if ghMentions option is enabled.
   Example: `@tivie` with ghMentionsOption set to `//mysite.com/{u}/profile` will result in `<a href="//mysite.com/tivie/profile">@tivie</a>`
 
 * **encodeEmails**: (boolean) [default true] Enable e-mail addresses encoding through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities. (since v1.6.1)

   NOTE: Prior to version 1.6.1, emails would always be obfuscated through dec and hex encoding.

 * **openLinksInNewWindow**: (boolean) [default false] Open all links in new windows
   (by adding the attribute `target="_blank"` to `<a>` tags) **(since v1.7.0)**

 * **backslashEscapesHTMLTags**: (boolean) [default false] Support for HTML Tag escaping. ex: `\<div>foo\</div>` **(since v1.7.2)**

 * **emoji**: (boolean) [default false] Enable emoji support. Ex: `this is a :smile: emoji`
   For more info on available emojis, see https://github.com/showdownjs/showdown/wiki/Emojis **(since v.1.8.0)**

 * **underline**: (boolean) [default false] ***EXPERIMENTAL FEATURE*** Enable support for underline.
   Syntax is **double** or **triple** **underscores** ex: `__underlined word__`. With this option enabled, underscores are no longer parses into `<em>` and `<strong>`.

 * **ellipsis**: (boolean) [default true] Replaces three dots with the ellipsis unicode character.

 * **completeHTMLDocument**: (boolean) [default false] Outputs a complete html document,
   including `<html>`, `<head>` and `<body>` tags' instead of an HTML fragment. (since v.1.8.5)

 * **metadata**: (boolean) [default false] Enable support for document metadata (defined at the top of the document
   between `«««` and `»»»` or between `---` and `---`).  (since v.1.8.5)
   
   ```js
   var conv = new showdown.Converter({metadata: true});
   var html = conv.makeHtml(someMd);
   var metadata = conv.getMetadata(); // returns an object with the document metadata
   ```

 * **splitAdjacentBlockquotes**: (boolean) [default false] Split adjacent blockquote blocks.(since v.1.8.6)

**NOTE**: Please note that until **version 1.6.0**, all of these options are ***DISABLED*** by default in the cli tool.


## Flavors

You can also use flavors or presets to set the correct options automatically, so that showdown behaves like popular markdown flavors.

Currently, the following flavors are available:

 * original - original markdown flavor as in [John Gruber's spec](https://daringfireball.net/projects/markdown/)
 * vanilla  - showdown base flavor (as from v1.3.1)
 * github   - GFM (GitHub Flavored Markdown)


### Global
```javascript
showdown.setFlavor('github');
```

### Instance
```javascript
converter.setFlavor('github');
```


## CLI Tool

Showdown also comes bundled with a Command Line Interface tool. You can check the [CLI wiki page][cli-wiki] for more info

## Integration with AngularJS

ShowdownJS project also provides seamlessly integration with AngularJS via a "plugin".
Please visit https://github.com/showdownjs/ngShowdown for more information.

## Integration with TypeScript

If you're using TypeScript you maybe want to use the types from [DefinitelyTyped][definitely-typed]

## Integration with SystemJS/JSPM

Integration with SystemJS can be obtained via the third party ["system-md" plugin](https://github.com/guybedford/system-md).

## Integration with VueJS

To use ShowdownJS as a Vue component quickly, you can check [vue-showdown](https://vue-showdown.js.org/).

## XSS vulnerability

Showdown doesn't sanitize the input. This is by design since markdown relies on it to allow certain features to be correctly parsed into HTML.
This, however, means XSS injection is quite possible.

Please refer to the wiki article [Markdown's XSS Vulnerability (and how to mitigate it)][xss-wiki]
for more information.

## Extensions

Showdown allows additional functionality to be loaded via extensions. (you can find a list of known showdown extensions [here][ext-wiki])
You can also find a boilerplate, to create your own extensions in [this repository][boilerplate-repo]

### Client-side Extension Usage

```html
<script src="showdown.js"></script>
<script src="twitter-extension.js"></script>
<script>
var converter = new showdown.Converter({ extensions: ['twitter'] });
</script>
```

### Server-side Extension Usage

```js
var showdown    = require('showdown'),
    myExtension = require('myExtension'),
    converter = new showdown.Converter({ extensions: ['myExtension'] });
```

## Tests

A suite of tests is available which require node.js.  Once node is installed, run the following command from
the project root to install the dependencies:

    npm install

Once installed the tests can be run from the project root using:

    npm test

New test cases can easily be added.  Create a markdown file (ending in `.md`) which contains the markdown to test.
Create a `.html` file of the exact same name.  It will automatically be tested when the tests are executed with `mocha`.

## Contributing

If you wish to contribute please read the following quick guide.

### Want a Feature?
You can request a new feature by submitting an issue. If you would like to implement a new feature feel free to issue a
Pull Request.


### Pull requests (PRs)
PRs are awesome. However, before you submit your pull request consider the following guidelines:

 - Search GitHub for an open or closed Pull Request that relates to your submission. You don't want to duplicate effort.
 - When issuing PRs that change code, make your changes in a new git branch based on master:

   ```bash
   git checkout -b my-fix-branch master
   ```

 - Documentation (i.e: README.md) changes can be made directly against master.
 - Run the full test suite before submitting and make sure all tests pass (obviously =P).
 - Try to follow our [**coding style rules**][coding-rules].
   Breaking them prevents the PR to pass the tests.
 - Refrain from fixing multiple issues in the same pull request. It's preferable to open multiple small PRs instead of one
   hard to review big one.
 - If the PR introduces a new feature or fixes an issue, please add the appropriate test case.
 - We use commit notes to generate the changelog. It's extremely helpful if your commit messages adhere to the
 [**AngularJS Git Commit Guidelines**][ng-commit-guide].
 - If we suggest changes then:
     - Make the required updates.
     - Re-run the Angular test suite to ensure tests are still passing.
     - Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

     ```bash
     git rebase master -i
     git push origin my-fix-branch -f
     ```
 - After your pull request is merged, you can safely delete your branch.

If you have time to contribute to this project, we feel obliged that you get credit for it.
These rules enable us to review your PR faster and will give you appropriate credit in your GitHub profile.
We thank you in advance for your contribution!

### Joining the team
We're looking for members to help maintaining Showdown.
Please see [this issue](https://github.com/showdownjs/showdown/issues/114) to express interest or comment on this note.

## Credits
Full credit list at https://github.com/showdownjs/showdown/blob/master/CREDITS.md

Showdown is powered by:<br/>
[![webstorm](https://www.jetbrains.com/webstorm/documentation/docs/logo_webstorm.png)](https://www.jetbrains.com/webstorm/)



[sd-logo]: https://raw.githubusercontent.com/showdownjs/logo/master/dist/logo.readme.png
[legacy-branch]: https://github.com/showdownjs/showdown/tree/legacy
[releases]: https://github.com/showdownjs/showdown/releases
[changelog]: https://github.com/showdownjs/showdown/blob/master/CHANGELOG.md
[wiki]: https://github.com/showdownjs/showdown/wiki
[cli-wiki]: https://github.com/showdownjs/showdown/wiki/CLI-tool
[definitely-typed]: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/showdown
[xss-wiki]: https://github.com/showdownjs/showdown/wiki/Markdown's-XSS-Vulnerability-(and-how-to-mitigate-it)
[ext-wiki]: https://github.com/showdownjs/showdown/wiki/extensions
[coding-rules]: https://github.com/showdownjs/code-style/blob/master/README.md
[ng-commit-guide]: https://github.com/showdownjs/code-style/blob/master/README.md#commit-message-convention
[boilerplate-repo]: https://github.com/showdownjs/extension-boilerplate
