# markdown-it-emoji

[![Build Status](https://img.shields.io/travis/markdown-it/markdown-it-emoji/master.svg?style=flat)](https://travis-ci.org/markdown-it/markdown-it-emoji)
[![NPM version](https://img.shields.io/npm/v/markdown-it-emoji.svg?style=flat)](https://www.npmjs.org/package/markdown-it-emoji)
[![Coverage Status](https://coveralls.io/repos/markdown-it/markdown-it-emoji/badge.svg?branch=master&service=github)](https://coveralls.io/github/markdown-it/markdown-it-emoji?branch=master)

> Plugin for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser, adding emoji & emoticon syntax support.

__v1.+ requires `markdown-it` v4.+, see changelog.__

Three versions:

- __Full__ (default), with all github supported emojis.
- [Light](https://github.com/markdown-it/markdown-it-emoji/blob/master/lib/data/light.json), with only well-supported unicode emojis and reduced size.
- Bare, without included emojis or shortcuts. This requires defining your own definitions and shortcuts. 

Also supports emoticons [shortcuts](https://github.com/markdown-it/markdown-it-emoji/blob/master/lib/data/shortcuts.js) like `:)`, `:-(`, and others. See the full list in the link above.


## Install

node.js, browser:

```bash
npm install markdown-it-emoji --save
bower install markdown-it-emoji --save
```

## Use

### init

```js
var md = require('markdown-it')();
var emoji = require('markdown-it-emoji');
// Or for light version
// var emoji = require('markdown-it-emoji/light');

md.use(emoji [, options]);
```

Options are not mandatory:

- __defs__ (Object) - rewrite available emoji definitions
  - example: `{ name1: char1, name2: char2, ... }`
- __enabled__ (Array) - disable all emojis except whitelisted
- __shortcuts__ (Object) - rewrite default shortcuts
  - example: `{ "smile": [ ":)", ":-)" ], "laughing": ":D" }`

_Differences in browser._ If you load the script directly into the page without
using a package system, the module will add itself globally with the name `markdownitEmoji`.
Init code will look a bit different in this case:

```js
var md = window.markdownit().use(window.markdownitEmoji);
```


### change output

By default, emojis are rendered as appropriate unicode chars. But you can change
the renderer function as you wish.

Render as span blocks (for example, to use a custom iconic font):

```js
// ...
// initialize

md.renderer.rules.emoji = function(token, idx) {
  return '<span class="emoji emoji_' + token[idx].markup + '"></span>';
};
```

Or use [twemoji](https://github.com/twitter/twemoji):

```js
// ...
// initialize

var twemoji = require('twemoji')

md.renderer.rules.emoji = function(token, idx) {
  return twemoji.parse(token[idx].content);
};
```

__NB 1__. Read [twemoji docs](https://github.com/twitter/twemoji#string-parsing)!
In case you need more options to change image size & type.

__NB 2__. When using twemoji you can make image height match the line height with this
style:

```css
.emoji {
  height: 1.2em;
}
```

## License

[MIT](https://github.com/markdown-it/markdown-it-emoji/blob/master/LICENSE)
