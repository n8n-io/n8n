# Slick

Slick is a standalone selector engine that is totally slick.
Slick is split in 2 components: the Finder and the Parser. The Finder's job is to find nodes on a webpage, the Parser's job is to create a javascript object representation of any css selector.

Slick allows you to:

 * Create your own custom pseudo-classes
 * Use the Parser by itself.
 * Find nodes in XML documents.

 ---

## The Finder

Find nodes in the DOM

### `search` context for selector

Search this context for any nodes that match this selector.

Expects:
* selector: String or SelectorObject
* (**optional**) context: document or node or array of documents or nodes
* (**optional**) append: Array or Object with a push method

Returns: append argument or Array of 0 or more nodes

	slick.search("#foo > bar.baz") → [<bar>, <bar>, <bar>]
	slick.search("li > a", [<ol>, <ul>]) → [<a>, <a>, <a>]
	slick.search("#foo > bar.baz", document, []) → [<bar>, <bar>, <bar>]

### `find` first in context with selector or null

Find the first node in document that matches selector or null if none are found.

Expects:
* selector: String or SelectorObject
* (**optional**) context: document or node or array of documents or nodes

Returns: Element or null

	slick.find("#foo > bar.baz") → <bar>
	slick.find("#does-not-exist", node) → null

### node `matches` selector?

Does this node match this selector?

Expects:
* node
* node, String or SelectorObject

Returns: true or false

	slick.matches(<div class=rocks>, "div.rocks") → true
	slick.matches(<div class=lame>, "div.rocks") → false
	slick.matches(<div class=lame>, <div class=rocks>) → false

### context `contains` node?

Does this context contain this node? Is the context a parent of this node?

Expects:
* context: document or node
* node: node

Returns: true or false

	slick.contains(<ul>, <li>) → true
	slick.contains(<body>, <html>) → false

---

## The Parser

Parse a CSS selector string into a JavaScript object

### `parse` selector into object

Parse a CSS Selector String into a Selector Object.

Expects: String

Returns: SelectorObject

	slick.parse("#foo > bar.baz") → SelectorObject


### format

### `#foo > bar.baz`

	[[
		{ "combinator":" ", "tag":"*", "id":"foo" },
		{ "combinator":">", "tag":"bar", "classList": ["baz"], "classes": [{"value":"baz", "match": RegExp }]}
	]]

### `h1, h2, ul > li, .things`

	[
		[{ "combinator":" ", "tag": "h1" }],
		[{ "combinator":" ", "tag": "h2" }],
		[{ "combinator":" ", "tag": "ul" }, { "combinator": ">", "tag": "li" }],
		[{ "combinator":" ", "tag": "*", "classList": ["things"], "classes": [{"value": "things", "match": RegExp }] }]
	]
