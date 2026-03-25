# mustache.js - Logic-less {{mustache}} templates with JavaScript

> What could be more logical awesome than no logic at all?

[![Build Status](https://travis-ci.org/janl/mustache.js.svg?branch=master)](https://travis-ci.org/janl/mustache.js)

[mustache.js](http://github.com/janl/mustache.js) is a zero-dependency implementation of the [mustache](http://mustache.github.com/) template system in JavaScript.

[Mustache](http://mustache.github.com/) is a logic-less template syntax. It can be used for HTML, config files, source code - anything. It works by expanding tags in a template using values provided in a hash or object.

We call it "logic-less" because there are no if statements, else clauses, or for loops. Instead there are only tags. Some tags are replaced with a value, some nothing, and others a series of values.

For a language-agnostic overview of mustache's template syntax, see the `mustache(5)` [manpage](http://mustache.github.com/mustache.5.html).

## Where to use mustache.js?

You can use mustache.js to render mustache templates anywhere you can use JavaScript. This includes web browsers, server-side environments such as [Node.js](http://nodejs.org/), and [CouchDB](http://couchdb.apache.org/) views.

mustache.js ships with support for the [CommonJS](http://www.commonjs.org/) module API, the [Asynchronous Module Definition](https://github.com/amdjs/amdjs-api/wiki/AMD) API (AMD) and [ECMAScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

In addition to being a package to be used programmatically, you can use it as a [command line tool](#command-line-tool).

And this will be your templates after you use Mustache:

!['stache](https://cloud.githubusercontent.com/assets/288977/8779228/a3cf700e-2f02-11e5-869a-300312fb7a00.gif)

## Install

You can get Mustache via [npm](http://npmjs.com).

```bash
$ npm install mustache --save
```

## Usage

Below is a quick example how to use mustache.js:

```js
var view = {
  title: "Joe",
  calc: function () {
    return 2 + 4;
  }
};

var output = Mustache.render("{{title}} spends {{calc}}", view);
```

In this example, the `Mustache.render` function takes two parameters: 1) the [mustache](http://mustache.github.com/) template and 2) a `view` object that contains the data and code needed to render the template.

## Templates

A [mustache](http://mustache.github.com/) template is a string that contains any number of mustache tags. Tags are indicated by the double mustaches that surround them. `{{person}}` is a tag, as is `{{#person}}`. In both examples we refer to `person` as the tag's key. There are several types of tags available in mustache.js, described below.

There are several techniques that can be used to load templates and hand them to mustache.js, here are two of them:

#### Include Templates

If you need a template for a dynamic part in a static website, you can consider including the template in the static HTML file to avoid loading templates separately. Here's a small example:

```js
// file: render.js

function renderHello() {
  var template = document.getElementById('template').innerHTML;
  var rendered = Mustache.render(template, { name: 'Luke' });
  document.getElementById('target').innerHTML = rendered;
}
```

```html
<html>
  <body onload="renderHello()">
    <div id="target">Loading...</div>
    <script id="template" type="x-tmpl-mustache">
      Hello {{ name }}!
    </script>

    <script src="https://unpkg.com/mustache@latest"></script>
    <script src="render.js"></script>
  </body>
</html>
```

#### Load External Templates

If your templates reside in individual files, you can load them asynchronously and render them when they arrive. Another example using [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch):

```js
function renderHello() {
  fetch('template.mustache')
    .then((response) => response.text())
    .then((template) => {
      var rendered = Mustache.render(template, { name: 'Luke' });
      document.getElementById('target').innerHTML = rendered;    
    });
}
```

### Variables

The most basic tag type is a simple variable. A `{{name}}` tag renders the value of the `name` key in the current context. If there is no such key, nothing is rendered.

All variables are HTML-escaped by default. If you want to render unescaped HTML, use the triple mustache: `{{{name}}}`. You can also use `&` to unescape a variable.

If you'd like to change HTML-escaping behavior globally (for example, to template non-HTML formats), you can override Mustache's escape function. For example, to disable all escaping: `Mustache.escape = function(text) {return text;};`.

If you want `{{name}}` _not_ to be interpreted as a mustache tag, but rather to appear exactly as `{{name}}` in the output, you must change and then restore the default delimiter. See the [Custom Delimiters](#custom-delimiters) section for more information.

View:

```json
{
  "name": "Chris",
  "company": "<b>GitHub</b>"
}
```

Template:

```
* {{name}}
* {{age}}
* {{company}}
* {{{company}}}
* {{&company}}
{{=<% %>=}}
* {{company}}
<%={{ }}=%>
```

Output:

```html
* Chris
*
* &lt;b&gt;GitHub&lt;/b&gt;
* <b>GitHub</b>
* <b>GitHub</b>
* {{company}}
```

JavaScript's dot notation may be used to access keys that are properties of objects in a view.

View:

```json
{
  "name": {
    "first": "Michael",
    "last": "Jackson"
  },
  "age": "RIP"
}
```

Template:

```html
* {{name.first}} {{name.last}}
* {{age}}
```

Output:

```html
* Michael Jackson
* RIP
```

### Sections

Sections render blocks of text zero or more times, depending on the value of the key in the current context.

A section begins with a pound and ends with a slash. That is, `{{#person}}` begins a `person` section, while `{{/person}}` ends it. The text between the two tags is referred to as that section's "block".

The behavior of the section is determined by the value of the key.

#### False Values or Empty Lists

If the `person` key does not exist, or exists and has a value of `null`, `undefined`, `false`, `0`, or `NaN`, or is an empty string or an empty list, the block will not be rendered.

View:

```json
{
  "person": false
}
```

Template:

```html
Shown.
{{#person}}
Never shown!
{{/person}}
```

Output:

```html
Shown.
```

#### Non-Empty Lists

If the `person` key exists and is not `null`, `undefined`, or `false`, and is not an empty list the block will be rendered one or more times.

When the value is a list, the block is rendered once for each item in the list. The context of the block is set to the current item in the list for each iteration. In this way we can loop over collections.

View:

```json
{
  "stooges": [
    { "name": "Moe" },
    { "name": "Larry" },
    { "name": "Curly" }
  ]
}
```

Template:

```html
{{#stooges}}
<b>{{name}}</b>
{{/stooges}}
```

Output:

```html
<b>Moe</b>
<b>Larry</b>
<b>Curly</b>
```

When looping over an array of strings, a `.` can be used to refer to the current item in the list.

View:

```json
{
  "musketeers": ["Athos", "Aramis", "Porthos", "D'Artagnan"]
}
```

Template:

```html
{{#musketeers}}
* {{.}}
{{/musketeers}}
```

Output:

```html
* Athos
* Aramis
* Porthos
* D'Artagnan
```

If the value of a section variable is a function, it will be called in the context of the current item in the list on each iteration.

View:

```js
{
  "beatles": [
    { "firstName": "John", "lastName": "Lennon" },
    { "firstName": "Paul", "lastName": "McCartney" },
    { "firstName": "George", "lastName": "Harrison" },
    { "firstName": "Ringo", "lastName": "Starr" }
  ],
  "name": function () {
    return this.firstName + " " + this.lastName;
  }
}
```

Template:

```html
{{#beatles}}
* {{name}}
{{/beatles}}
```

Output:

```html
* John Lennon
* Paul McCartney
* George Harrison
* Ringo Starr
```

#### Functions

If the value of a section key is a function, it is called with the section's literal block of text, un-rendered, as its first argument. The second argument is a special rendering function that uses the current view as its view argument. It is called in the context of the current view object.

View:

```js
{
  "name": "Tater",
  "bold": function () {
    return function (text, render) {
      return "<b>" + render(text) + "</b>";
    }
  }
}
```

Template:

```html
{{#bold}}Hi {{name}}.{{/bold}}
```

Output:

```html
<b>Hi Tater.</b>
```

### Inverted Sections

An inverted section opens with `{{^section}}` instead of `{{#section}}`. The block of an inverted section is rendered only if the value of that section's tag is `null`, `undefined`, `false`, *falsy* or an empty list.

View:

```json
{
  "repos": []
}
```

Template:

```html
{{#repos}}<b>{{name}}</b>{{/repos}}
{{^repos}}No repos :({{/repos}}
```

Output:

```html
No repos :(
```

### Comments

Comments begin with a bang and are ignored. The following template:

```html
<h1>Today{{! ignore me }}.</h1>
```

Will render as follows:

```html
<h1>Today.</h1>
```

Comments may contain newlines.

### Partials

Partials begin with a greater than sign, like {{> box}}.

Partials are rendered at runtime (as opposed to compile time), so recursive partials are possible. Just avoid infinite loops.

They also inherit the calling context. Whereas in ERB you may have this:

```html+erb
<%= partial :next_more, :start => start, :size => size %>
```

Mustache requires only this:

```html
{{> next_more}}
```

Why? Because the `next_more.mustache` file will inherit the `size` and `start` variables from the calling context. In this way you may want to think of partials as includes, imports, template expansion, nested templates, or subtemplates, even though those aren't literally the case here.


For example, this template and partial:

    base.mustache:
    <h2>Names</h2>
    {{#names}}
      {{> user}}
    {{/names}}

    user.mustache:
    <strong>{{name}}</strong>

Can be thought of as a single, expanded template:

```html
<h2>Names</h2>
{{#names}}
  <strong>{{name}}</strong>
{{/names}}
```

In mustache.js an object of partials may be passed as the third argument to `Mustache.render`. The object should be keyed by the name of the partial, and its value should be the partial text.

```js
Mustache.render(template, view, {
  user: userTemplate
});
```

### Custom Delimiters

Custom delimiters can be used in place of `{{` and `}}` by setting the new values in JavaScript or in templates.

#### Setting in JavaScript

The `Mustache.tags` property holds an array consisting of the opening and closing tag values. Set custom values by passing a new array of tags to `render()`, which gets honored over the default values, or by overriding the `Mustache.tags` property itself:

```js
var customTags = [ '<%', '%>' ];
```

##### Pass Value into Render Method
```js
Mustache.render(template, view, {}, customTags);
```

##### Override Tags Property
```js
Mustache.tags = customTags;
// Subsequent parse() and render() calls will use customTags
```

#### Setting in Templates

Set Delimiter tags start with an equals sign and change the tag delimiters from `{{` and `}}` to custom strings.

Consider the following contrived example:

```html+erb
* {{ default_tags }}
{{=<% %>=}}
* <% erb_style_tags %>
<%={{ }}=%>
* {{ default_tags_again }}
```

Here we have a list with three items. The first item uses the default tag style, the second uses ERB style as defined by the Set Delimiter tag, and the third returns to the default style after yet another Set Delimiter declaration.

According to [ctemplates](https://htmlpreview.github.io/?https://raw.githubusercontent.com/OlafvdSpek/ctemplate/master/doc/howto.html), this "is useful for languages like TeX, where double-braces may occur in the text and are awkward to use for markup."

Custom delimiters may not contain whitespace or the equals sign.

## Pre-parsing and Caching Templates

By default, when mustache.js first parses a template it keeps the full parsed token tree in a cache. The next time it sees that same template it skips the parsing step and renders the template much more quickly. If you'd like, you can do this ahead of time using `mustache.parse`.

```js
Mustache.parse(template);

// Then, sometime later.
Mustache.render(template, view);
```

## Command line tool

mustache.js is shipped with a Node.js based command line tool. It might be installed as a global tool on your computer to render a mustache template of some kind

```bash
$ npm install -g mustache

$ mustache dataView.json myTemplate.mustache > output.html
```

also supports stdin.

```bash
$ cat dataView.json | mustache - myTemplate.mustache > output.html
```

or as a package.json `devDependency` in a build process maybe?

```bash
$ npm install mustache --save-dev
```

```json
{
  "scripts": {
    "build": "mustache dataView.json myTemplate.mustache > public/output.html"
  }
}
```
```bash
$ npm run build
```

The command line tool is basically a wrapper around `Mustache.render` so you get all the features.

If your templates use partials you should pass paths to partials using `-p` flag:

```bash
$ mustache -p path/to/partial1.mustache -p path/to/partial2.mustache dataView.json myTemplate.mustache
```

## Plugins for JavaScript Libraries

mustache.js may be built specifically for several different client libraries, including the following:

  - [jQuery](http://jquery.com/)
  - [MooTools](http://mootools.net/)
  - [Dojo](http://www.dojotoolkit.org/)
  - [YUI](http://developer.yahoo.com/yui/)
  - [qooxdoo](http://qooxdoo.org/)

These may be built using [Rake](http://rake.rubyforge.org/) and one of the following commands:
```bash
$ rake jquery
$ rake mootools
$ rake dojo
$ rake yui3
$ rake qooxdoo
```

## TypeScript

Since the source code of this package is written in JavaScript, we follow the [TypeScript publishing docs](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html) preferred approach
by having type definitions available via [@types/mustache](https://www.npmjs.com/package/@types/mustache).

## Testing

In order to run the tests you'll need to install [Node.js](http://nodejs.org/).

You also need to install the sub module containing [Mustache specifications](http://github.com/mustache/spec) in the project root.
```bash
$ git submodule init
$ git submodule update
```
Install dependencies.
```bash
$ npm install
```
Then run the tests.
```bash
$ npm test
```
The test suite consists of both unit and integration tests. If a template isn't rendering correctly for you, you can make a test for it by doing the following:

  1. Create a template file named `mytest.mustache` in the `test/_files`
     directory. Replace `mytest` with the name of your test.
  2. Create a corresponding view file named `mytest.js` in the same directory.
     This file should contain a JavaScript object literal enclosed in
     parentheses. See any of the other view files for an example.
  3. Create a file with the expected output in `mytest.txt` in the same
     directory.

Then, you can run the test with:
```bash
$ TEST=mytest npm run test-render
```

### Browser tests

Browser tests are not included in `npm test` as they run for too long, although they are ran automatically on Travis when merged into master. Run browser tests locally in any browser:
```bash
$ npm run test-browser-local
```
then point your browser to `http://localhost:8080/__zuul`

## Who uses mustache.js?

An updated list of mustache.js users is kept [on the Github wiki](https://github.com/janl/mustache.js/wiki/Beard-Competition). Add yourself or your company if you use mustache.js!

## Contributing

mustache.js is a mature project, but it continues to actively invite maintainers. You can help out a high-profile project that is used in a lot of places on the web. No big commitment required, if all you do is review a single [Pull Request](https://github.com/janl/mustache.js/pulls), you are a maintainer. And a hero.

### Your First Contribution

- review a [Pull Request](https://github.com/janl/mustache.js/pulls)
- fix an [Issue](https://github.com/janl/mustache.js/issues)
- update the [documentation](https://github.com/janl/mustache.js#usage)
- make a website
- write a tutorial

## Thanks

mustache.js wouldn't kick ass if it weren't for these fine souls:

  * Chris Wanstrath / defunkt
  * Alexander Lang / langalex
  * Sebastian Cohnen / tisba
  * J Chris Anderson / jchris
  * Tom Robinson / tlrobinson
  * Aaron Quint / quirkey
  * Douglas Crockford
  * Nikita Vasilyev / NV
  * Elise Wood / glytch
  * Damien Mathieu / dmathieu
  * Jakub Kuźma / qoobaa
  * Will Leinweber / will
  * dpree
  * Jason Smith / jhs
  * Aaron Gibralter / agibralter
  * Ross Boucher / boucher
  * Matt Sanford / mzsanford
  * Ben Cherry / bcherry
  * Michael Jackson / mjackson
  * Phillip Johnsen / phillipj
  * David da Silva Contín / dasilvacontin
