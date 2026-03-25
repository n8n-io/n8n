# domino x.x.x (not yet released)

# domino 2.1.6 (16 Jul 2020)
* Bumped version of lodash (#169)
* Performance improvement to DOMTokenList (#166)
* `mocha` dependency has been updated to 6.x.  As a result, we are
  no longer testing on node 4.

# domino 2.1.5 (30 Apr 2020)
* Bumped version of jquery dev dependency (#163)
* Omit tests/ directory from NPM package (#161)

# domino 2.1.4 (16 Dec 2019)
* Bug fix for `Element#closest` when selector doesn't match (#154)

# domino 2.1.3 (6 Mar 2019)
* Bug fix for CSS `$=` selector and for matches on root `<html>` element.
* Renamed CSS `:matches` to `:is`
  ( https://github.com/w3c/csswg-drafts/issues/3258 )
* Bug fix for CSS matches with escape characters in tag name.

# domino 2.1.2 (14 Feb 2019)
* Allow writable Element constructors unless __domino_frozen__ is set to true (#138)
* Bug fix for CSS `$=` selector. (#135)
* Move `Node#_serializeOne()` to `NodeUtils.serializeOne()` to reduce pressure
  on the megamorphic stub cache in V8, and thereby improve throughput (#142).
* Implemented `HTMLOptionElement#text` and `HTMLOptionElement#value` (#136)

# domino 2.1.1 (30 Nov 2018)
* Add `domino.createIncrementalHTMLParser` interface.

# domino 2.1.0 (13 Aug 2018)
* Fix `ContainerNode#removeChildren()` when there is more than one child (#129)
* Implement `Document#scrollingElement` (#107)
* Implement setter for `Element#outerHTML` (#102)
* Handle null/undefined in setter for `Node#textContent`
* Handle null/undefined/negative values in `CharacterData` interface methods
* Spec-correctness fixes for `DOMTokenList`, including handling of duplicate
  keys.
* Fix `[src=...]` selectors in `Document#querySelector()` and similar
* Spec-correctness fixes for `Document#createElement()` and
  `Document#createElementNS()`, including proper exception type and type
  coercion.
* Implement `Attr#cloneNode()`, `Element#getAttributeNode()`,
  `Element#getAttributeNodeNS()`, `Element#setAttributeNode()`,
  `Element#setAttributeNodeNS()`, and `Element#removeAttributeNode()`
  (DOM3 compatibility)
* Implement `Document#createAttribute()` and `Document#createAttributeNS()`
* Implement `Element#hasAttributes()`, `Element#toggleAttribute()`, and
  `Element#getAttributeNames()`
* Implement `Text#wholeText`
* Implement `Document#cloneNode()` and `DocumentType#cloneNode()`
* Spec-correctness fixes for `Node#lookupPrefix()`,
  `Node#lookupNamespaceURI()`, and `Node#isDefaultNamespace`, including
  proper type coercion and reconciling DOM 3 and DOM 4 specifications.
* Ensure `Document#title` continues to use correct whitespace stripping
  for node > 4, and properly set `<title>` when `undefined` is passed to
  `DOMImplementation#createHTMLDocument()`
* Ensure `Element#attributes` implements `NamedNodeMap` and that indexed
  properties of `Element#attributes` work (previously you needed to use
  the `item()` accessor method)
* Improve stubs for `HTMLElement#style`, `Document#documentURI`, and
  `Document#contentType`
* Implement proper accessors for `HTMLSelectElement#autocomplete`,
  `HTMLTextAreaElement#type/value/defaultValue/textLength`, and
  `HTMLInputElement#width/height/minLength`
* Implement `Element#insertAdjacentElement()`, `Element#insertAdjacentText()`,
  and `Element#insertAdjacentHTML()` (#102)
* Spec-correctness fixes for `TreeWalker` and `NodeIterator`: read-only
  properties, proper exception types, type coercion of `NodeFilter` results.
* Implement `NodeIterator` pre-removal steps.  Note that in the absence
  of weak references, be cautious about the number of `NodeIterator`s you
  create on any single document, since domino does not artificially limit
  these.
  See https://github.com/tc39/proposal-weakrefs/issues/17 for details.
* Preserve prefix of SVG elements during parsing. (#102)

# domino 2.0.3 (12 Jul 2018)
* Define `blur()`, `focus()` and `forceSpellCheck()` on `HTMLElement` (#125)
* Stringify argument tokens for DOMTokenList methods (#126)
* Fix `HTMLAnchorElement#hash` when `href` attribute contains bare
  fragment (#127)
* Implement case-insensitive CSS attribute matching (#128)
* Implement `DOMTokenList#replace()`, `DOMTokenList#toggle(token, force)`,
  and `DOMTokenList#value`. Fix handling of non-space whitespace. (#111)

# domino 2.0.2 (28 Mar 2018)
* Add TypeScript definitions (#103)
* Add `flex` CSS styles (#119, #120)
* Fix Element#matches with ~= selectors (#121)

# domino 2.0.1 (14 Feb 2018)
* Allow attributes named 'xmlns' (#112)
* Make DOMTokenList add/remove variadic (#109)
* Make `Array.from` and for-of loops work on `Node#attributes`.

# domino 2.0.0 ( 8 Nov 2017)
* Fix potential O(N^2) slowdown in FilteredElementList#item.
* `mocha` dependency has been updated to 4.0.x.  As a result, we are
  no longer testing on node pre-v4.0.0; see:
    https://boneskull.com/mocha-v4-nears-release/
* Domino now uses a linked list representation for children of Node,
  unless/until the Node#childNodes accessor is used (which requires
  an indexed array to be built).  Inserting a removing nodes can be
  much quicker using the linked list representation if care is
  taken not to deoptimize the tree by using the #childNodes accessor.
  This implementation strategy matches the one used by webkit and
  other browser-based implementations, and thus ought to match
  performance expectations of folks used to writing browser-based
  DOM manipulation code.

# domino 1.0.30 (24 Oct 2017)
* Fix regexp capitalization in URLUtils (#101)
* Fix O(N^2) slowdown in initial tree traversal using nextSibling/prevSibling
* Update `mocha` dependency to 3.5.x and `should` to 13.1.x.

# domino 1.0.29 ( 7 Aug 2017)
* Fix "#id" optimization in querySelectorAll() when 0 or 2 matches for
  `id`. (#99)
* Correct return value of CSSStyleDeclaration#getPropertyValue() when
  style is not set. (#98)

# domino 1.0.28 (27 Jan 2017)
* Fix unescape mechanism in attribute values. (#95)
* Disable nonstandard "ignore case" version of attribute matching.
* Add `dom/nodes` tests from w3c/web-platform-tests. (#92, @pimterry)
* Make selected API methods writable to support polyfills. (#89, @pimterry)
* Fix `Element#hasAttribute`/`Element#hasAttributeNS` after
  `Element#removeAttribute`/`Element#removeAttributeNS`. (#90, @clint-tseng)
* Fix deep `Document#importNode`. (#93)
* Ensure that `Node#parentNode` is `null` (not `undefined`) when removed.
* Tweak JavaScript properties which are DOM reflections of element
  attributes in order to more closely match the DOM 4 spec.
* Implement `ChildNode#before()`, `ChildNode#after()`, and
  `ChildNode#replaceWith()`.

# domino 1.0.27 (17 Oct 2016)
* Fix bug in AFE list replacement over existing bookmark.
* Update htmlwg test suite to latest w3c/web-platform-tests.
* Update html5lib test suite to latest.
* HTML5 spec update: <menuitem> is no longer an empty element.
* HTML5 spec update: tweaked HTML entity parsing in attributes.
* HTML5 spec update: dashes are allowed in HTML comments.
* HTML5 spec update: remove special handling of <isindex>.
* Improve handling of legacy elements: `<xmp>`, `<listing>`, `acronym`,
  `basefont`, `big`, `center`, `nobr`, `noembed`, `noframes`, `plaintext`,
  `rb`, `rtc`, `strike`, and `tt`.
* HTML5 spec update: Remove extra newline in serialization of `<pre>`,
  `<listing>`, `<textarea>`. (#88)
* HTML5 spec update: Remove case normalization for defunct SVG attributes.
* Implement HTMLMenuItemElement#label.
* Basic SVG support. (#81, #82)

# domino 1.0.26 (15 Oct 2016)
* Implement Document#dir.
* Minor spec-compliance fixes to Document#title and classList#contains.
* Implement Element#closest(). (#84)
* Actually run the HTMLWG tests (#83)
* Expose the HTML5 tree builder implementation. (#87)
* Add workaround to W3C test harness for node >= 0.11.7.
* Update the form-associated element list to match HTML5.

# domino 1.0.25 (19 May 2016)
* Fix broken stopping of immediate propagation of Events. (#78)
* Properly set "scripting enabled" flag when parsing fragments.
* Fix handling of escaped or invalid CSS identifiers in
  `querySelector` and friends. (#79)

# domino 1.0.24 (05 Apr 2016)
* Implement WindowTimers interface on Window. (#72)
* Factor out the NavigatorID interface and make more spec-compliant.
* Implement `HTMLTemplateElement` and parse `<template>` tags.
* Properly parse the `<main>` tag.
* Remove support for the non-standard `<command>` tag.
* Create `HTMLCanvasElement` when parsing `<canvas>` tags.
* Create `HTMLDialogElement` when parsing `<dialog>` tags.
* Fix parsing of `<ruby>` tags, especially `<rb>` and `<rtc>`.
* Create `HTMLMenuItemElement` when parsing `<menuitem>` tags.
* Create `HTMLSourceElement` when parsing `<source>` tags.
* Create `HTMLTrackElement` when parsing `<track>` tags.
* Improve parsing of `<svg>` elements.
* Fix parsing of `<isindex>` element in unusual contexts.
* Serialize `<!DOCTYPE>` according to latest HTML5 spec.
* Update adoption agency algorithm to match latest HTML5 spec.
* Add additional parameter to `domino.createDocument` to
  allow creating a document from an empty string if desired.
* Add tree builder test cases from `html5lib-tests`.
* Implement `Document#location`. (#75)
* Stub out additional properties of `HTMLIFrameElement`. (#76)

# domino 1.0.23 (30 Jan 2016)
* Fix `CSSStyleDeclaration#setProperty`. (#71)
* Update bundled CSS parser to 0.2.5+domino1.

# domino 1.0.22 (27 Jan 2016)
* Prevent TypeError due to undefined property when parsing styles. (#68)
* Support legacy `Attr#nodeValue` and `Attr#textContent` aliases. (#70)

# domino 1.0.21 (23 Dec 2015)
* Improve performance when adding nodes with duplicate IDs. (#60)
* Be more careful about setting prototype to `null` when using
  Objects as a Map. (#61)
* Fix a global leak in NodeIterator.
* Improve efficiency of `Node#replaceChild` and `Node#insert`. (#62)
* Bug fix for `Node#normalize` which could cause deletion of empty
  `Comment` or `ProcessingInstruction` nodes. (#63)
* Don't lowercase non-ASCII tag and attribute names. (#65)
* Fix a number of minor bugs in rarely used code, discovered
  during delinting. (#66)
* Implement `Node.contains`. (#67)

# domino 1.0.20 (20 Nov 2015)
* CharacterData implements the NonDocumentTypeChildNode
  interface. (#57, #58)
* Fix CSS `[style]` selector. (#59)

# domino 1.0.19 (29 Jul 2015)
* Bug fixes for `TreeWalker` / `document.createTreeWalker` (filter
  argument was ignored; various traversal issues)
* Implement `NodeIterator` / `document.createNodeIterator` (#54)
* Update `mocha` dependency to 2.2.x and `should` to 7.0.x.

# domino 1.0.18 (25 Sep 2014)
* HTMLAnchorElement now implements URLUtils. (#47)
* Be consistent with our handling of null/empty namespaces. (#48)
* Update `mocha` dependency to 1.21.x and `should` to 4.0.x.

# domino 1.0.17 (14 May 2014)
* Brown paper bag bug fix for an HTML parsing regression introduced in
  domino 1.0.16. (#45)
* Update `mocha` dependency to 1.18.x and `should` to 3.3.x.

# domino 1.0.16 (13 May 2014)
**DO NOT USE:** contains parser regression, fixed in 1.0.17.
* Various performance improvements to the HTML5 parser. (#43, #44)
* Fix `Element#isHTML` for non-HTML elements. (#41)

# domino 1.0.15 (21 Jan 2014)
* Implement `Element#matches()`.
* Fix CSS `[lang]`, `[dir]`, etc selectors.
* Update `mocha` dependency to 1.17.x.

# domino 1.0.14 (21 Dec 2013)
* `Element#classList.length` should be 0 if there's no `class`
  attribute.
* Add `height`/`width` attributes to `HTMLImageElement`.
* Fix node 0.11 incompatibility in the w3c test harness.
* Update `mocha` dependency to 1.16.x; update `should` dependency to 2.1.x.

# domino 1.0.13 (8 Oct 2013)
* Include `<th>` elements in `HTMLTableRowElement#cells`. (#38, #39)
* Fix old call to `toLowerCase()` function. (#37)
* Update `mocha` and `should` dependencies.

# domino 1.0.12 (9 Jul 2013)
* Fix bug in formatting element adoption agency algorithm. (#36)
* Coerce `document.createTextNode` argument to a string. (#34, #35)
* Work around performance regression in node <= 0.6.

# domino 1.0.11 (1 May 2013)
* Fix rooted element traversal (`Element#nextElement`,
  `Element#getElementsByTagName`).  (#31, #32)
* Update zest to fix bugs in `+` and `>` combinators.
* Don't overflow the stack if attribute values are very large (>64k).

# domino 1.0.10 (12 Apr 2013)
* Document issues with `Element#attributes`. (#27)
* Fix `Document#title` to match DOM spec. (#29)
* Add missing `require('utils')` for `handleErrors`. (#28)
* Implement `DocumentFragment#querySelector` and
  `DocumentFragment#querySelectorAll`. (#20, #26)
* Fix `querySelectorAll` on unparented `Element`s. (#23)
* Move `outerHTML`/`innerHTML` properties from `HTMLElement` to
  `Element` to match dom parsing spec. (#21)
* Update zest selector library to 0.0.4. (#25)
* Fix regression in node 0.10. (#22, #24)
* Update `mocha` and `should` dependencies.

# domino 1.0.9 (11 Mar 2013)
* Support jQuery 1.9.x by allowing `Element#attributes[qname]`.
* Implement `HTMLElement#outerHTML`. (#18)
* Only add newlines after `<pre>`/`<textarea>`/`<listing>` if
  necessary, to match HTML5 serialization spec. (#16, #17)
* Mirror node type properties (`ELEMENT_NODE`, etc) into
  `Node.prototype`. (#14, #15)

# domino 1.0.8

**DO NOT USE:** was inadvertently published identical to domino 1.0.7.

# domino 1.0.7 (16 Jan 2013)
* Throw `SyntaxError` upon invocation rather than build-time. (#10)
* Return nodes in document order. (#11)
* Added a TreeWalker implementation.
