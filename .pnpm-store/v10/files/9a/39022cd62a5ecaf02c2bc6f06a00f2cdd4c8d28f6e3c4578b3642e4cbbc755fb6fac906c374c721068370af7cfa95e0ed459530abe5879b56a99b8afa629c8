# markdown-it-task-lists

A [markdown-it](https://www.npmjs.com/package/markdown-it) plugin to create GitHub-style [task lists](https://github.com/blog/1825-task-lists-in-all-markdown-documents)

[![Greenkeeper badge](https://badges.greenkeeper.io/revin/markdown-it-task-lists.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/revin/markdown-it-task-lists.svg?branch=master)](https://travis-ci.org/revin/markdown-it-task-lists)
[![Code Climate](https://codeclimate.com/github/revin/markdown-it-task-lists/badges/gpa.svg)](https://codeclimate.com/github/revin/markdown-it-task-lists)

## What it does

- Builds [task/todo lists](https://github.com/blog/1825-task-lists-in-all-markdown-documents) out of markdown lists with items starting with `[ ]` or `[x]`.
- Nothing else

### Why is this useful?

When you have markdown documentation with checklists, rendering HTML checkboxes
out of the list items looks nicer than the raw square brackets.

## Installation

```sh
npm install markdown-it-task-lists
```

## Usage

Use it the same as a normal markdown-it plugin:

```js
var md = require('markdown-it');
var taskLists = require('markdown-it-task-lists');

var parser = md().use(taskLists);

var result = parser.render(...); // markdown string containing task list items
```

The rendered checkboxes are disabled; to change this, pass a truthy value into
the `enabled` property of the plugin options:

```js
var parser = md().use(taskLists, {enabled: true});
```

If you'd like to wrap the rendered list items in a `<label>` element for UX
purposes, pass a truthy value to the `label` property of the plugin options:

```js
var parser = md().use(taskLists, {label: true});
```

To add the label after the checkbox pass a truthy value to `labelAfter` property:

```js
var parser = md().use(taskLists, {label: true, labelAfter: true});
```

**Note:** This option does require the `label` option to be truthy.

The options can be combined, of course.

### Browser Usage

If you use one of the versions of this module available in `dist/` directly in
a browser by including it with a `<script>` element, it will be available
globally in `window.markdownitTaskLists`.

## Tests

```sh
npm install
npm test
```

## License

ISC
