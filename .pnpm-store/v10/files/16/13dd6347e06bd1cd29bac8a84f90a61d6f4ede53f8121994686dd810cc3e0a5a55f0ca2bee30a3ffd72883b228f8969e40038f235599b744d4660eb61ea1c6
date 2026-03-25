# d3-selection

Selections allow powerful data-driven transformation of the document object model (DOM): set [attributes](#selection_attr), [styles](#selection_style), [properties](#selection_property), [HTML](#selection_html) or [text](#selection_text) content, and more. Using the [data join](#joining-data)’s [enter](#selection_enter) and [exit](#selection_enter) selections, you can also [add](#selection_append) or [remove](#selection_remove) elements to correspond to data.

Selection methods typically return the current selection, or a new selection, allowing the concise application of multiple operations on a given selection via method chaining. For example, to set the class and color style of all paragraph elements in the current document:

```js
d3.selectAll("p")
    .attr("class", "graf")
    .style("color", "red");
```

This is equivalent to:

```js
const p = d3.selectAll("p");
p.attr("class", "graf");
p.style("color", "red");
```

By convention, selection methods that return the current selection use *four* spaces of indent, while methods that return a new selection use only *two*. This helps reveal changes of context by making them stick out of the chain:

```js
d3.select("body")
  .append("svg")
    .attr("width", 960)
    .attr("height", 500)
  .append("g")
    .attr("transform", "translate(20,20)")
  .append("rect")
    .attr("width", 920)
    .attr("height", 460);
```

Selections are immutable. All selection methods that affect which elements are selected (or their order) return a new selection rather than modifying the current selection. However, note that elements are necessarily mutable, as selections drive transformations of the document!

For more, see [the d3-selection collection on Observable](https://observablehq.com/collection/@d3/d3-selection).

## Installing

If you use npm, `npm install d3-selection`. You can also download the [latest release on GitHub](https://github.com/d3/d3-selection/releases/latest). For vanilla HTML in modern browsers, import d3-selection from Skypack:

```html
<script type="module">

import {selectAll} from "https://cdn.skypack.dev/d3-selection@3";

const div = selectAll("div");

</script>
```

For legacy environments, you can load d3-selection’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-selection@3"></script>
<script>

const div = d3.selectAll("div");

</script>
```

[Try d3-selection in your browser.](https://observablehq.com/collection/@d3/d3-selection)

## API Reference

* [Selecting Elements](#selecting-elements)
* [Modifying Elements](#modifying-elements)
* [Joining Data](#joining-data)
* [Handling Events](#handling-events)
* [Control Flow](#control-flow)
* [Local Variables](#local-variables)
* [Namespaces](#namespaces)

### Selecting Elements

Selection methods accept [W3C selector strings](http://www.w3.org/TR/selectors-api/) such as `.fancy` to select elements with the class *fancy*, or `div` to select DIV elements. Selection methods come in two forms: select and selectAll: the former selects only the first matching element, while the latter selects all matching elements in document order. The top-level selection methods, [d3.select](#select) and [d3.selectAll](#selectAll), query the entire document; the subselection methods, [*selection*.select](#selection_select) and [*selection*.selectAll](#selection_selectAll), restrict selection to descendants of the selected elements.

<a name="selection" href="#selection">#</a> d3.<b>selection</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/index.js)

[Selects](#select) the root element, `document.documentElement`. This function can also be used to test for selections (`instanceof d3.selection`) or to extend the selection prototype. For example, to add a method to check checkboxes:

```js
d3.selection.prototype.checked = function(value) {
  return arguments.length < 1
      ? this.property("checked")
      : this.property("checked", !!value);
};
```

And then to use:

```js
d3.selectAll("input[type=checkbox]").checked(true);
```

<a name="select" href="#select">#</a> d3.<b>select</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/select.js)

Selects the first element that matches the specified *selector* string. If no elements match the *selector*, returns an empty selection. If multiple elements match the *selector*, only the first matching element (in document order) will be selected. For example, to select the first anchor element:

```js
const anchor = d3.select("a");
```

If the *selector* is not a string, instead selects the specified node; this is useful if you already have a reference to a node, such as `this` within an event listener or a global such as `document.body`. For example, to make a clicked paragraph red:

```js
d3.selectAll("p").on("click", function(event) {
  d3.select(this).style("color", "red");
});
```

<a name="selectAll" href="#selectAll">#</a> d3.<b>selectAll</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selectAll.js)

Selects all elements that match the specified *selector* string. The elements will be selected in document order (top-to-bottom). If no elements in the document match the *selector*, or if the *selector* is null or undefined, returns an empty selection. For example, to select all paragraphs:

```js
const paragraph = d3.selectAll("p");
```

If the *selector* is not a string, instead selects the specified array of nodes; this is useful if you already have a reference to nodes, such as `this.childNodes` within an event listener or a global such as `document.links`. The nodes may instead be an iterable, or a pseudo-array such as a NodeList. For example, to color all links red:

```js
d3.selectAll(document.links).style("color", "red");
```

<a name="selection_select" href="#selection_select">#</a> <i>selection</i>.<b>select</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/select.js)

For each selected element, selects the first descendant element that matches the specified *selector* string. If no element matches the specified selector for the current element, the element at the current index will be null in the returned selection. (If the *selector* is null, every element in the returned selection will be null, resulting in an empty selection.) If the current element has associated data, this data is propagated to the corresponding selected element. If multiple elements match the selector, only the first matching element in document order is selected. For example, to select the first bold element in every paragraph:

```js
const b = d3.selectAll("p").select("b");
```

If the *selector* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). It must return an element, or null if there is no matching element. For example, to select the previous sibling of each paragraph:

```js
const previous = d3.selectAll("p").select(function() {
  return this.previousElementSibling;
});
```

Unlike [*selection*.selectAll](#selection_selectAll), *selection*.select does not affect grouping: it preserves the existing group structure and indexes, and propagates data (if any) to selected children. Grouping plays an important role in the [data join](#joining-data). See [Nested Selections](http://bost.ocks.org/mike/nest/) and [How Selections Work](http://bost.ocks.org/mike/selection/) for more on this topic.

<a name="selection_selectAll" href="#selection_selectAll">#</a> <i>selection</i>.<b>selectAll</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/selectAll.js)

For each selected element, selects the descendant elements that match the specified *selector* string. The elements in the returned selection are grouped by their corresponding parent node in this selection. If no element matches the specified selector for the current element, or if the *selector* is null, the group at the current index will be empty. The selected elements do not inherit data from this selection; use [*selection*.data](#selection_data) to propagate data to children. For example, to select the bold elements in every paragraph:

```js
const b = d3.selectAll("p").selectAll("b");
```

If the *selector* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). It must return an array of elements (or an iterable, or a pseudo-array such as a NodeList), or the empty array if there are no matching elements. For example, to select the previous and next siblings of each paragraph:

```js
const sibling = d3.selectAll("p").selectAll(function() {
  return [
    this.previousElementSibling,
    this.nextElementSibling
  ];
});
```

Unlike [*selection*.select](#selection_select), *selection*.selectAll does affect grouping: each selected descendant is grouped by the parent element in the originating selection. Grouping plays an important role in the [data join](#joining-data). See [Nested Selections](http://bost.ocks.org/mike/nest/) and [How Selections Work](http://bost.ocks.org/mike/selection/) for more on this topic.

<a name="selection_filter" href="#selection_filter">#</a> <i>selection</i>.<b>filter</b>(<i>filter</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/filter.js)

Filters the selection, returning a new selection that contains only the elements for which the specified *filter* is true. The *filter* may be specified either as a selector string or a function. If the *filter* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]).

For example, to filter a selection of table rows to contain only even rows:

```js
const even = d3.selectAll("tr").filter(":nth-child(even)");
```

This is approximately equivalent to using [d3.selectAll](#selectAll) directly, although the indexes may be different:

```js
const even = d3.selectAll("tr:nth-child(even)");
```

Similarly, using a function:

```js
const even = d3.selectAll("tr").filter((d, i) => i & 1);
```

Or using [*selection*.select](#selection_select) (and avoiding an arrow function, since *this* is needed to refer to the current element):

```js
const even = d3.selectAll("tr").select(function(d, i) { return i & 1 ? this : null; });
```

Note that the `:nth-child` pseudo-class is a one-based index rather than a zero-based index. Also, the above filter functions do not have precisely the same meaning as `:nth-child`; they rely on the selection index rather than the number of preceding sibling elements in the DOM.

The returned filtered selection preserves the parents of this selection, but like [*array*.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter), it does not preserve indexes as some elements may be removed; use [*selection*.select](#selection_select) to preserve the index, if needed.

<a name="selection_merge" href="#selection_merge">#</a> <i>selection</i>.<b>merge</b>(<i>other</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/merge.js)

Returns a new selection merging this selection with the specified *other* selection or transition. The returned selection has the same number of groups and the same parents as this selection. Any missing (null) elements in this selection are filled with the corresponding element, if present (not null), from the specified *selection*. (If the *other* selection has additional groups or parents, they are ignored.)

This method is used internally by [*selection*.join](#selection_join) to merge the [enter](#selection_enter) and [update](#selection_data) selections after [binding data](#joining-data). You can also merge explicitly, although note that since merging is based on element index, you should use operations that preserve index, such as [*selection*.select](#selection_select) instead of [*selection*.filter](#selection_filter). For example:

```js
const odd = selection.select(function(d, i) { return i & 1 ? this : null; ));
const even = selection.select(function(d, i) { return i & 1 ? null : this; ));
const merged = odd.merge(even);
```

See [*selection*.data](#selection_data) for more.

This method is not intended for concatenating arbitrary selections, however: if both this selection and the specified *other* selection have (non-null) elements at the same index, this selection’s element is returned in the merge and the *other* selection’s element is ignored.

<a name="selection_selectChild" href="#selection_selectChild">#</a> <i>selection</i>.<b>selectChild</b>([<i>selector</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/selectChild.js)

Returns a new selection with the (first) child of each element of the current selection matching the *selector*. If no *selector* is specified, selects the first child (if any). If the *selector* is specified as a string, selects the first child that matches (if any). If the *selector* is a function, it is evaluated for each of the children nodes, in order, being passed the child (*child*), the child’s index (*i*), and the list of children (*children*); the method selects the first child for which the selector return truthy, if any.

<a name="selection_selectChildren" href="#selection_selectChildren">#</a> <i>selection</i>.<b>selectChildren</b>([<i>selector</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/selectChildren.js)

Returns a new selection with the children of each element of the current selection matching the *selector*. If no *selector* is specified, selects all the children. If the *selector* is specified as a string, selects the children that match (if any). If the *selector* is a function, it is evaluated for each of the children nodes, in order, being passed the child (*child*), the child’s index (*i*), and the list of children (*children*); the method selects all children for which the selector return truthy.

<a name="selection_selection" href="#selection_selection">#</a> <i>selection</i>.<b>selection</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/index.js)

Returns the selection (for symmetry with [<i>transition</i>.selection](https://github.com/d3/d3-transition/blob/master/README.md#transition_selection)).

<a name="matcher" href="#matcher">#</a> d3.<b>matcher</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/matcher.js)

Given the specified *selector*, returns a function which returns true if `this` element [matches](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches) the specified selector. This method is used internally by [*selection*.filter](#selection_filter). For example, this:

```js
const div = selection.filter("div");
```

Is equivalent to:

```js
const div = selection.filter(d3.matcher("div"));
```

(Although D3 is not a compatibility layer, this implementation does support vendor-prefixed implementations due to the recent standardization of *element*.matches.)

<a name="selector" href="#selector">#</a> d3.<b>selector</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selector.js)

Given the specified *selector*, returns a function which returns the first descendant of `this` element that matches the specified selector. This method is used internally by [*selection*.select](#selection_select). For example, this:

```js
const div = selection.select("div");
```

Is equivalent to:

```js
const div = selection.select(d3.selector("div"));
```

<a name="selectorAll" href="#selectorAll">#</a> d3.<b>selectorAll</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selectAll.js)

Given the specified *selector*, returns a function which returns all descendants of `this` element that match the specified selector. This method is used internally by [*selection*.selectAll](#selection_selectAll). For example, this:

```js
const div = selection.selectAll("div");
```

Is equivalent to:

```js
const div = selection.selectAll(d3.selectorAll("div"));
```

<a name="window" href="#window">#</a> d3.<b>window</b>(<i>node</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/window.js)

Returns the owner window for the specified *node*. If *node* is a node, returns the owner document’s default view; if *node* is a document, returns its default view; otherwise returns the *node*.

<a name="style" href="#style">#</a> d3.<b>style</b>(<i>node</i>, <i>name</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/style.js)

Returns the value of the style property with the specified *name* for the specified *node*. If the *node* has an inline style with the specified *name*, its value is returned; otherwise, the [computed property value](https://developer.mozilla.org/en-US/docs/Web/CSS/computed_value) is returned. See also [*selection*.style](#selection_style).

### Modifying Elements

After selecting elements, use the selection’s transformation methods to affect document content. For example, to set the name attribute and color style of an anchor element:

```js
d3.select("a")
    .attr("name", "fred")
    .style("color", "red");
```

To experiment with selections, visit [d3js.org](https://d3js.org) and open your browser’s developer console! (In Chrome, open the console with ⌥⌘J.) Select elements and then inspect the returned selection to see which elements are selected and how they are grouped. Call selection methods and see how the page content changes.

<a name="selection_attr" href="#selection_attr">#</a> <i>selection</i>.<b>attr</b>(<i>name</i>[, <i>value</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/attr.js)

If a *value* is specified, sets the attribute with the specified *name* to the specified value on the selected elements and returns this selection. If the *value* is a constant, all elements are given the same attribute value; otherwise, if the *value* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The function’s return value is then used to set each element’s attribute. A null value will remove the specified attribute.

If a *value* is not specified, returns the current value of the specified attribute for the first (non-null) element in the selection. This is generally useful only if you know that the selection contains exactly one element.

The specified *name* may have a namespace prefix, such as `xlink:href` to specify the `href` attribute in the XLink namespace. See [namespaces](#namespaces) for the map of supported namespaces; additional namespaces can be registered by adding to the map.

<a name="selection_classed" href="#selection_classed">#</a> <i>selection</i>.<b>classed</b>(<i>names</i>[, <i>value</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/classed.js)

If a *value* is specified, assigns or unassigns the specified CSS class *names* on the selected elements by setting the `class` attribute or modifying the `classList` property and returns this selection. The specified *names* is a string of space-separated class names. For example, to assign the classes `foo` and `bar` to the selected elements:

```js
selection.classed("foo bar", true);
```

If the *value* is truthy, then all elements are assigned the specified classes; otherwise, the classes are unassigned. If the *value* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The function’s return value is then used to assign or unassign classes on each element. For example, to randomly associate the class *foo* with on average half the selected elements:

```js
selection.classed("foo", () => Math.random() > 0.5);
```

If a *value* is not specified, returns true if and only if the first (non-null) selected element has the specified *classes*. This is generally useful only if you know the selection contains exactly one element.

<a name="selection_style" href="#selection_style">#</a> <i>selection</i>.<b>style</b>(<i>name</i>[, <i>value</i>[, <i>priority</i>]]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/style.js)

If a *value* is specified, sets the style property with the specified *name* to the specified value on the selected elements and returns this selection. If the *value* is a constant, then all elements are given the same style property value; otherwise, if the *value* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The function’s return value is then used to set each element’s style property. A null value will remove the style property. An optional *priority* may also be specified, either as null or the string `important` (without the exclamation point).

If a *value* is not specified, returns the current value of the specified style property for the first (non-null) element in the selection. The current value is defined as the element’s inline value, if present, and otherwise its [computed value](https://developer.mozilla.org/en-US/docs/Web/CSS/computed_value). Accessing the current style value is generally useful only if you know the selection contains exactly one element.

Caution: unlike many SVG attributes, CSS styles typically have associated units. For example, `3px` is a valid stroke-width property value, while `3` is not. Some browsers implicitly assign the `px` (pixel) unit to numeric values, but not all browsers do: IE, for example, throws an “invalid arguments” error!

<a name="selection_property" href="#selection_property">#</a> <i>selection</i>.<b>property</b>(<i>name</i>[, <i>value</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/property.js)

Some HTML elements have special properties that are not addressable using attributes or styles, such as a form field’s text `value` and a checkbox’s `checked` boolean. Use this method to get or set these properties.

If a *value* is specified, sets the property with the specified *name* to the specified value on selected elements. If the *value* is a constant, then all elements are given the same property value; otherwise, if the *value* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The function’s return value is then used to set each element’s property. A null value will delete the specified property.

If a *value* is not specified, returns the value of the specified property for the first (non-null) element in the selection. This is generally useful only if you know the selection contains exactly one element.

<a name="selection_text" href="#selection_text">#</a> <i>selection</i>.<b>text</b>([<i>value</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/text.js)

If a *value* is specified, sets the [text content](http://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-textContent) to the specified value on all selected elements, replacing any existing child elements. If the *value* is a constant, then all elements are given the same text content; otherwise, if the *value* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The function’s return value is then used to set each element’s text content. A null value will clear the content.

If a *value* is not specified, returns the text content for the first (non-null) element in the selection. This is generally useful only if you know the selection contains exactly one element.

<a name="selection_html" href="#selection_html">#</a> <i>selection</i>.<b>html</b>([<i>value</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/html.js)

If a *value* is specified, sets the [inner HTML](http://dev.w3.org/html5/spec-LC/apis-in-html-documents.html#innerhtml) to the specified value on all selected elements, replacing any existing child elements. If the *value* is a constant, then all elements are given the same inner HTML; otherwise, if the *value* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The function’s return value is then used to set each element’s inner HTML. A null value will clear the content.

If a *value* is not specified, returns the inner HTML for the first (non-null) element in the selection. This is generally useful only if you know the selection contains exactly one element.

Use [*selection*.append](#selection_append) or [*selection*.insert](#selection_insert) instead to create data-driven content; this method is intended for when you want a little bit of HTML, say for rich formatting. Also, *selection*.html is only supported on HTML elements. SVG elements and other non-HTML elements do not support the innerHTML property, and thus are incompatible with *selection*.html. Consider using [XMLSerializer](https://developer.mozilla.org/en-US/docs/XMLSerializer) to convert a DOM subtree to text. See also the [innersvg polyfill](https://code.google.com/p/innersvg/), which provides a shim to support the innerHTML property on SVG elements.

<a name="selection_append" href="#selection_append">#</a> <i>selection</i>.<b>append</b>(<i>type</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/append.js)

If the specified *type* is a string, appends a new element of this type (tag name) as the last child of each selected element, or before the next following sibling in the update selection if this is an [enter selection](#selection_enter). The latter behavior for enter selections allows you to insert elements into the DOM in an order consistent with the new bound data; however, note that [*selection*.order](#selection_order) may still be required if updating elements change order (*i.e.*, if the order of new data is inconsistent with old data).

If the specified *type* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). This function should return an element to be appended. (The function typically creates a new element, but it may instead return an existing element.) For example, to append a paragraph to each DIV element:

```js
d3.selectAll("div").append("p");
```

This is equivalent to:

```js
d3.selectAll("div").append(() => document.createElement("p"));
```

Which is equivalent to:

```js
d3.selectAll("div").select(function() {
  return this.appendChild(document.createElement("p"));
});
```

In both cases, this method returns a new selection containing the appended elements. Each new element inherits the data of the current elements, if any, in the same manner as [*selection*.select](#selection_select).

The specified *name* may have a namespace prefix, such as `svg:text` to specify a `text` attribute in the SVG namespace. See [namespaces](#namespaces) for the map of supported namespaces; additional namespaces can be registered by adding to the map. If no namespace is specified, the namespace will be inherited from the parent element; or, if the name is one of the known prefixes, the corresponding namespace will be used (for example, `svg` implies `svg:svg`).

<a name="selection_insert" href="#selection_insert">#</a> <i>selection</i>.<b>insert</b>(<i>type</i>[, <i>before</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/insert.js)

If the specified *type* is a string, inserts a new element of this type (tag name) before the first element matching the specified *before* selector for each selected element. For example, a *before* selector `:first-child` will prepend nodes before the first child. If *before* is not specified, it defaults to null. (To append elements in an order consistent with [bound data](#joining-data), use [*selection*.append](#selection_append).)

Both *type* and *before* may instead be specified as functions which are evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The *type* function should return an element to be inserted; the *before* function should return the child element before which the element should be inserted. For example, to append a paragraph to each DIV element:

```js
d3.selectAll("div").insert("p");
```

This is equivalent to:

```js
d3.selectAll("div").insert(() => document.createElement("p"));
```

Which is equivalent to:

```js
d3.selectAll("div").select(function() {
  return this.insertBefore(document.createElement("p"), null);
});
```

In both cases, this method returns a new selection containing the appended elements. Each new element inherits the data of the current elements, if any, in the same manner as [*selection*.select](#selection_select).

The specified *name* may have a namespace prefix, such as `svg:text` to specify a `text` attribute in the SVG namespace. See [namespaces](#namespaces) for the map of supported namespaces; additional namespaces can be registered by adding to the map. If no namespace is specified, the namespace will be inherited from the parent element; or, if the name is one of the known prefixes, the corresponding namespace will be used (for example, `svg` implies `svg:svg`).

<a name="selection_remove" href="#selection_remove">#</a> <i>selection</i>.<b>remove</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/remove.js)

Removes the selected elements from the document. Returns this selection (the removed elements) which are now detached from the DOM. There is not currently a dedicated API to add removed elements back to the document; however, you can pass a function to [*selection*.append](#selection_append) or [*selection*.insert](#selection_insert) to re-add elements.

<a name="selection_clone" href="#selection_clone">#</a> <i>selection</i>.<b>clone</b>([<i>deep</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/clone.js)

Inserts clones of the selected elements immediately following the selected elements and returns a selection of the newly added clones. If *deep* is truthy, the descendant nodes of the selected elements will be cloned as well. Otherwise, only the elements themselves will be cloned. Equivalent to:

```js
selection.select(function() {
  return this.parentNode.insertBefore(this.cloneNode(deep), this.nextSibling);
});
```

<a name="selection_sort" href="#selection_sort">#</a> <i>selection</i>.<b>sort</b>(<i>compare</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/sort.js)

Returns a new selection that contains a copy of each group in this selection sorted according to the *compare* function. After sorting, re-inserts elements to match the resulting order (per [*selection*.order](#selection_order)).

The compare function, which defaults to [ascending](https://github.com/d3/d3-array#ascending), is passed two elements’ data *a* and *b* to compare. It should return either a negative, positive, or zero value. If negative, then *a* should be before *b*; if positive, then *a* should be after *b*; otherwise, *a* and *b* are considered equal and the order is arbitrary.

Note that sorting is not guaranteed to be stable; however, it is guaranteed to have the same behavior as your browser’s built-in [sort](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort) method on arrays.

<a name="selection_order" href="#selection_order">#</a> <i>selection</i>.<b>order</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/order.js)

Re-inserts elements into the document such that the document order of each group matches the selection order. This is equivalent to calling [*selection*.sort](#selection_sort) if the data is already sorted, but much faster.

<a name="selection_raise" href="#selection_raise">#</a> <i>selection</i>.<b>raise</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/raise.js)

Re-inserts each selected element, in order, as the last child of its parent. Equivalent to:

```js
selection.each(function() {
  this.parentNode.appendChild(this);
});
```

<a name="selection_lower" href="#selection_lower">#</a> <i>selection</i>.<b>lower</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/lower.js)

Re-inserts each selected element, in order, as the first child of its parent. Equivalent to:

```js
selection.each(function() {
  this.parentNode.insertBefore(this, this.parentNode.firstChild);
});
```

<a name="create" href="#create">#</a> d3.<b>create</b>(<i>name</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/create.js)

Given the specified element *name*, returns a single-element selection containing a detached element of the given name in the current document. This method assumes the HTML namespace, so you must specify a namespace explicitly when creating SVG or other non-HTML elements; see [namespace](#namespace) for details on supported namespace prefixes.

```js
d3.create("svg") // equivalent to svg:svg
d3.create("svg:svg") // more explicitly
d3.create("svg:g") // an SVG G element
d3.create("g") // an HTML G (unknown) element
```

<a name="creator" href="#creator">#</a> d3.<b>creator</b>(<i>name</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/creator.js)

Given the specified element *name*, returns a function which creates an element of the given name, assuming that `this` is the parent element. This method is used internally by [*selection*.append](#selection_append) and [*selection*.insert](#selection_insert) to create new elements. For example, this:

```js
selection.append("div");
```

Is equivalent to:

```js
selection.append(d3.creator("div"));
```

See [namespace](#namespace) for details on supported namespace prefixes, such as for SVG elements.

### Joining Data

For an introduction to D3’s data joins, see the [*selection*.join notebook](https://observablehq.com/@d3/selection-join). Also see [Thinking With Joins](http://bost.ocks.org/mike/join/).

<a name="selection_data" href="#selection_data">#</a> <i>selection</i>.<b>data</b>([<i>data</i>[, <i>key</i>]]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/data.js), [Examples](https://observablehq.com/@d3/brushable-scatterplot)

Binds the specified array of *data* with the selected elements, returning a new selection that represents the *update* selection: the elements successfully bound to data. Also defines the [enter](#selection_enter) and [exit](#selection_exit) selections on the returned selection, which can be used to add or remove elements to correspond to the new data. The specified *data* is an array of arbitrary values (*e.g.*, numbers or objects), or a function that returns an array of values for each group. When data is assigned to an element, it is stored in the property `__data__`, thus making the data “sticky” and available on re-selection.

The *data* is specified **for each group** in the selection. If the selection has multiple groups (such as [d3.selectAll](#selectAll) followed by [*selection*.selectAll](#selection_selectAll)), then *data* should typically be specified as a function. This function will be evaluated for each group in order, being passed the group’s parent datum (*d*, which may be undefined), the group index (*i*), and the selection’s parent nodes (*nodes*), with *this* as the group’s parent element.

In conjunction with [*selection*.join](#selection_join) (or more explicitly with [*selection*.enter](#selection_enter), [*selection*.exit](#selection_exit), [*selection*.append](#selection_append) and [*selection*.remove](#selection_remove)), *selection*.data can be used to enter, update and exit elements to match data. For example, to create an HTML table from a matrix of numbers:

```js
const matrix = [
  [11975,  5871, 8916, 2868],
  [ 1951, 10048, 2060, 6171],
  [ 8010, 16145, 8090, 8045],
  [ 1013,   990,  940, 6907]
];

d3.select("body")
  .append("table")
  .selectAll("tr")
  .data(matrix)
  .join("tr")
  .selectAll("td")
  .data(d => d)
  .join("td")
    .text(d => d);
```

In this example the *data* function is the identity function: for each table row, it returns the corresponding row from the data matrix.

If a *key* function is not specified, then the first datum in *data* is assigned to the first selected element, the second datum to the second selected element, and so on. A *key* function may be specified to control which datum is assigned to which element, replacing the default join-by-index, by computing a string identifier for each datum and element. This key function is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]); the returned string is the element’s key. The key function is then also evaluated for each new datum in *data*, being passed the current datum (*d*), the current index (*i*), and the group’s new *data*, with *this* as the group’s parent DOM element; the returned string is the datum’s key. The datum for a given key is assigned to the element with the matching key. If multiple elements have the same key, the duplicate elements are put into the exit selection; if multiple data have the same key, the duplicate data are put into the enter selection.

For example, given this document:

```html
<div id="Ford"></div>
<div id="Jarrah"></div>
<div id="Kwon"></div>
<div id="Locke"></div>
<div id="Reyes"></div>
<div id="Shephard"></div>
```

You could join data by key as follows:


```js
const data = [
  {name: "Locke", number: 4},
  {name: "Reyes", number: 8},
  {name: "Ford", number: 15},
  {name: "Jarrah", number: 16},
  {name: "Shephard", number: 23},
  {name: "Kwon", number: 42}
];

d3.selectAll("div")
  .data(data, function(d) { return d ? d.name : this.id; })
    .text(d => d.number);
```

This example key function uses the datum *d* if present, and otherwise falls back to the element’s id property. Since these elements were not previously bound to data, the datum *d* is null when the key function is evaluated on selected elements, and non-null when the key function is evaluated on the new data.

The *update* and *enter* selections are returned in data order, while the *exit* selection preserves the selection order prior to the join. If a key function is specified, the order of elements in the selection may not match their order in the document; use [*selection*.order](#selection_order) or [*selection*.sort](#selection_sort) as needed. For more on how the key function affects the join, see [A Bar Chart, Part 2](http://bost.ocks.org/mike/bar/2/) and [Object Constancy](http://bost.ocks.org/mike/constancy/).

If *data* is not specified, this method returns the array of data for the selected elements.

This method cannot be used to clear bound data; use [*selection*.datum](#selection_datum) instead.

<a name="selection_join" href="#selection_join">#</a> <i>selection</i>.<b>join</b>(<i>enter</i>[, <i>update</i>][, <i>exit</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/join.js)

Appends, removes and reorders elements as necessary to match the data that was previously bound by [*selection*.data](#selection_data), returning the [merged](#selection_merge) enter and update selection. This method is a convenient alternative to the explicit [general update pattern](https://bl.ocks.org/mbostock/3808218), replacing [*selection*.enter](#selection_enter), [*selection*.exit](#selection_exit), [*selection*.append](#selection_append), [*selection*.remove](#selection_remove), and [*selection*.order](#selection_order). For example:

```js
svg.selectAll("circle")
  .data(data)
  .join("circle")
    .attr("fill", "none")
    .attr("stroke", "black");
```

The *enter* function may be specified as a string shorthand, as above, which is equivalent to [*selection*.append](#selection_append) with the given element name. Likewise, optional *update* and *exit* functions may be specified, which default to the identity function and calling [*selection*.remove](#selection_remove), respectively. The shorthand above is thus equivalent to:

```js
svg.selectAll("circle")
  .data(data)
  .join(
    enter => enter.append("circle"),
    update => update,
    exit => exit.remove()
  )
    .attr("fill", "none")
    .attr("stroke", "black");
````

By passing separate functions on enter, update and exit, you have greater control over what happens. And by specifying a key function to [*selection*.data](#selection_data), you can minimize changes to the DOM to optimize performance. For example, to set different fill colors for enter and update:

```js
svg.selectAll("circle")
  .data(data)
  .join(
    enter => enter.append("circle").attr("fill", "green"),
    update => update.attr("fill", "blue")
  )
    .attr("stroke", "black");
```

The selections returned by the *enter* and *update* functions are merged and then returned by *selection*.join.

You can animate enter, update and exit by creating transitions inside the *enter*, *update* and *exit* functions. If the *enter* and *update* functions return transitions, their underlying selections are merged and then returned by *selection*.join. The return value of the *exit* function is not used.

For more, see the [*selection*.join notebook](https://observablehq.com/@d3/selection-join).

<a name="selection_enter" href="#selection_enter">#</a> <i>selection</i>.<b>enter</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/enter.js)

Returns the enter selection: placeholder nodes for each datum that had no corresponding DOM element in the selection. (The enter selection is empty for selections not returned by [*selection*.data](#selection_data).)

The enter selection is typically used to create “missing” elements corresponding to new data. For example, to create DIV elements from an array of numbers:

```js
const div = d3.select("body")
  .selectAll("div")
  .data([4, 8, 15, 16, 23, 42])
  .enter().append("div")
    .text(d => d);
```

If the body is initially empty, the above code will create six new DIV elements, append them to the body in-order, and assign their text content as the associated (string-coerced) number:

```html
<div>4</div>
<div>8</div>
<div>15</div>
<div>16</div>
<div>23</div>
<div>42</div>
```

Conceptually, the enter selection’s placeholders are pointers to the parent element (in this example, the document body). The enter selection is typically only used transiently to append elements, and is often [merged](#selection_merge) with the update selection after appending, such that modifications can be applied to both entering and updating elements.

<a name="selection_exit" href="#selection_exit">#</a> <i>selection</i>.<b>exit</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/exit.js)

Returns the exit selection: existing DOM elements in the selection for which no new datum was found. (The exit selection is empty for selections not returned by [*selection*.data](#selection_data).)

The exit selection is typically used to remove “superfluous” elements corresponding to old data. For example, to update the DIV elements created previously with a new array of numbers:

```js
div = div.data([1, 2, 4, 8, 16, 32], d => d);
```

Since a key function was specified (as the identity function), and the new data contains the numbers [4, 8, 16] which match existing elements in the document, the update selection contains three DIV elements. Leaving those elements as-is, we can append new elements for [1, 2, 32] using the enter selection:

```js
div.enter().append("div").text(d => d);
```

Likewise, to remove the exiting elements [15, 23, 42]:

```js
div.exit().remove();
```

Now the document body looks like this:

```html
<div>1</div>
<div>2</div>
<div>4</div>
<div>8</div>
<div>16</div>
<div>32</div>
```

The order of the DOM elements matches the order of the data because the old data’s order and the new data’s order were consistent. If the new data’s order is different, use [*selection*.order](#selection_order) to reorder the elements in the DOM. See the [General Update Pattern](http://bl.ocks.org/mbostock/3808218) example thread for more on data joins.

<a name="selection_datum" href="#selection_datum">#</a> <i>selection</i>.<b>datum</b>([<i>value</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/datum.js)

Gets or sets the bound data for each selected element. Unlike [*selection*.data](#selection_data), this method does not compute a join and does not affect indexes or the enter and exit selections.

If a *value* is specified, sets the element’s bound data to the specified value on all selected elements. If the *value* is a constant, all elements are given the same datum; otherwise, if the *value* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). The function is then used to set each element’s new data. A null value will delete the bound data.

If a *value* is not specified, returns the bound datum for the first (non-null) element in the selection. This is generally useful only if you know the selection contains exactly one element.

This method is useful for accessing HTML5 [custom data attributes](http://www.w3.org/TR/html5/dom.html#custom-data-attribute). For example, given the following elements:

```html
<ul id="list">
  <li data-username="shawnbot">Shawn Allen</li>
  <li data-username="mbostock">Mike Bostock</li>
</ul>
```

You can expose the custom data attributes by setting each element’s data as the built-in [dataset](http://www.w3.org/TR/html5/dom.html#dom-dataset) property:

```js
selection.datum(function() { return this.dataset; })
```

### Handling Events

For interaction, selections allow listening for and dispatching of events.

<a name="selection_on" href="#selection_on">#</a> <i>selection</i>.<b>on</b>(<i>typenames</i>[, <i>listener</i>[, <i>options</i>]]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/on.js)

Adds or removes a *listener* to each selected element for the specified event *typenames*. The *typenames* is a string event type, such as `click`, `mouseover`, or `submit`; any [DOM event type](https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events) supported by your browser may be used. The type may be optionally followed by a period (`.`) and a name; the optional name allows multiple callbacks to be registered to receive events of the same type, such as `click.foo` and `click.bar`. To specify multiple typenames, separate typenames with spaces, such as `input change` or `click.foo click.bar`.

When a specified event is dispatched on a selected element, the specified *listener* will be evaluated for the element, being passed the current event (*event*) and the current datum (*d*), with *this* as the current DOM element (*event*.currentTarget). Listeners always see the latest datum for their element. Note: while you can use [*event*.pageX](https://developer.mozilla.org/en/DOM/event.pageX) and [*event*.pageY](https://developer.mozilla.org/en/DOM/event.pageY) directly, it is often convenient to transform the event position to the local coordinate system of the element that received the event using [d3.pointer](#pointer).

If an event listener was previously registered for the same *typename* on a selected element, the old listener is removed before the new listener is added. To remove a listener, pass null as the *listener*. To remove all listeners for a given name, pass null as the *listener* and `.foo` as the *typename*, where `foo` is the name; to remove all listeners with no name, specify `.` as the *typename*.

An optional *options* object may specify characteristics about the event listener, such as whether it is capturing or passive; see [*element*.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener).

If a *listener* is not specified, returns the currently-assigned listener for the specified event *typename* on the first (non-null) selected element, if any. If multiple typenames are specified, the first matching listener is returned.

<a name="selection_dispatch" href="#selection_dispatch">#</a> <i>selection</i>.<b>dispatch</b>(<i>type</i>[, <i>parameters</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/dispatch.js)

Dispatches a [custom event](http://www.w3.org/TR/dom/#interface-customevent) of the specified *type* to each selected element, in order. An optional *parameters* map may be specified to set additional properties of the event. It may contain the following fields:

* [`bubbles`](https://www.w3.org/TR/dom/#dom-event-bubbles) - if true, the event is dispatched to ancestors in reverse tree order.
* [`cancelable`](https://www.w3.org/TR/dom/#dom-event-cancelable) - if true, *event*.preventDefault is allowed.
* [`detail`](https://www.w3.org/TR/dom/#dom-customevent-detail) - any custom data associated with the event.

If *parameters* is a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). It must return the parameters map for the current element.

<a name="pointer" href="#pointer">#</a> d3.<b>pointer</b>(<i>event</i>[, <i>target</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/pointer.js)

Returns a two-element array of numbers [*x*, *y*] representing the coordinates of the specified *event* relative to the specified *target*. *event* can be a [MouseEvent](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent), a [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent), a [Touch](https://www.w3.org/TR/touch-events/#touch-interface), or a custom event holding a UIEvent as *event*.sourceEvent.

If *target* is not specified, it defaults to the source event’s currentTarget property, if available. If the *target* is an SVG element, the event’s coordinates are transformed using the [inverse](https://www.w3.org/TR/geometry-1/#dom-dommatrixreadonly-inverse) of the [screen coordinate transformation matrix](https://www.w3.org/TR/SVG/types.html#__svg__SVGGraphicsElement__getScreenCTM). If the *target* is an HTML element, the event’s coordinates are translated relative to the top-left corner of the *target*’s [bounding client rectangle](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect). (As such, the coordinate system can only be translated relative to the client coordinates. See also [GeometryUtils](https://www.w3.org/TR/cssom-view-1/#the-geometryutils-interface).) Otherwise, [*event*.pageX, *event*.pageY] is returned.

<a name="pointers" href="#pointers">#</a> d3.<b>pointers</b>(<i>event</i>[, <i>target</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/pointers.js)

Returns an array [[*x0*, *y0*], [*x1*, *y1*]…] of coordinates of the specified *event*’s pointer locations relative to the specified *target*. For touch events, the returned array of positions corresponds to the *event*.touches array; for other events, returns a single-element array.

If *target* is not specified, it defaults to the source event’s currentTarget property, if any.

### Control Flow

For advanced usage, selections provide methods for custom control flow.

<a name="selection_each" href="#selection_each">#</a> <i>selection</i>.<b>each</b>(<i>function</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/each.js)

Invokes the specified *function* for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element (*nodes*[*i*]). This method can be used to invoke arbitrary code for each selected element, and is useful for creating a context to access parent and child data simultaneously, such as:

```js
parent.each(function(p, j) {
  d3.select(this)
    .selectAll(".child")
      .text(d => `child ${d.name} of ${p.name}`);
});
```

See [Sized Donut Multiples](http://bl.ocks.org/mbostock/4c5fad723c87d2fd8273) for an example.

<a name="selection_call" href="#selection_call">#</a> <i>selection</i>.<b>call</b>(<i>function</i>[, <i>arguments…</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/call.js)

Invokes the specified *function* exactly once, passing in this selection along with any optional *arguments*. Returns this selection. This is equivalent to invoking the function by hand but facilitates method chaining. For example, to set several styles in a reusable function:

```js
function name(selection, first, last) {
  selection
      .attr("first-name", first)
      .attr("last-name", last);
}
```

Now say:

```js
d3.selectAll("div").call(name, "John", "Snow");
```

This is roughly equivalent to:

```js
name(d3.selectAll("div"), "John", "Snow");
```

The only difference is that *selection*.call always returns the *selection* and not the return value of the called *function*, `name`.

<a name="selection_empty" href="#selection_empty">#</a> <i>selection</i>.<b>empty</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/empty.js)

Returns true if this selection contains no (non-null) elements.

<a name="selection_nodes" href="#selection_nodes">#</a> <i>selection</i>.<b>nodes</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/nodes.js)

Returns an array of all (non-null) elements in this selection. Equivalent to:

```js
const elements = Array.from(selection);
````

See also [*selection*[Symbol.iterator]](#selection_iterator).

<a name="selection_node" href="#selection_node">#</a> <i>selection</i>.<b>node</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/node.js)

Returns the first (non-null) element in this selection. If the selection is empty, returns null.

<a name="selection_size" href="#selection_size">#</a> <i>selection</i>.<b>size</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/size.js)

Returns the total number of (non-null) elements in this selection.

<a name="selection_iterator" href="#selection_iterator">#</a> <i>selection</i>\[<b>Symbol.iterator</b>\]() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/iterator.js)

Returns an iterator over the selected (non-null) elements. For example, to iterate over the selected elements:

```js
for (const element of selection) {
  console.log(element);
}
```

To flatten the selection to an array:

```js
const elements = [...selection];
````

### Local Variables

D3 locals allow you to define local state independent of data. For instance, when rendering [small multiples](http://bl.ocks.org/mbostock/e1192fe405703d8321a5187350910e08) of time-series data, you might want the same *x*-scale for all charts but distinct *y*-scales to compare the relative performance of each metric. D3 locals are scoped by DOM elements: on set, the value is stored on the given element; on get, the value is retrieved from given element or the nearest ancestor that defines it.

<a name="local" href="#local">#</a> d3.<b>local</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/local.js)

Declares a new local variable. For example:

```js
const foo = d3.local();
```

Like `var`, each local is a distinct symbolic reference; unlike `var`, the value of each local is also scoped by the DOM.

<a name="local_set" href="#local_set">#</a> <i>local</i>.<b>set</b>(<i>node</i>, <i>value</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/local.js)

Sets the value of this local on the specified *node* to the *value*, and returns the specified *value*. This is often performed using [*selection*.each](#selection_each):

```js
selection.each(function(d) { foo.set(this, d.value); });
```

If you are just setting a single variable, consider using [*selection*.property](#selection_property):

```js
selection.property(foo, d => d.value);
```

<a name="local_get" href="#local_get">#</a> <i>local</i>.<b>get</b>(<i>node</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/local.js)

Returns the value of this local on the specified *node*. If the *node* does not define this local, returns the value from the nearest ancestor that defines it. Returns undefined if no ancestor defines this local.

<a name="local_remove" href="#local_remove">#</a> <i>local</i>.<b>remove</b>(<i>node</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/local.js)

Deletes this local’s value from the specified *node*. Returns true if the *node* defined this local prior to removal, and false otherwise. If ancestors also define this local, those definitions are unaffected, and thus [*local*.get](#local_get) will still return the inherited value.

<a name="local_toString" href="#local_toString">#</a> <i>local</i>.<b>toString</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/local.js)

Returns the automatically-generated identifier for this local. This is the name of the property that is used to store the local’s value on elements, and thus you can also set or get the local’s value using *element*[*local*] or by using [*selection*.property](#selection_property).

### Namespaces

XML namespaces are fun! Right? Fortunately you can mostly ignore them.

<a name="namespace" href="#namespace">#</a> d3.<b>namespace</b>(<i>name</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/namespace.js)

Qualifies the specified *name*, which may or may not have a namespace prefix. If the name contains a colon (`:`), the substring before the colon is interpreted as the namespace prefix, which must be registered in [d3.namespaces](#namespaces). Returns an object `space` and `local` attributes describing the full namespace URL and the local name. For example:

```js
d3.namespace("svg:text"); // {space: "http://www.w3.org/2000/svg", local: "text"}
```

If the name does not contain a colon, this function merely returns the input name.

<a name="namespaces" href="#namespaces">#</a> d3.<b>namespaces</b> · [Source](https://github.com/d3/d3-selection/blob/master/src/namespaces.js)

The map of registered namespace prefixes. The initial value is:

```js
{
  svg: "http://www.w3.org/2000/svg",
  xhtml: "http://www.w3.org/1999/xhtml",
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
}
```

Additional prefixes may be assigned as needed to create elements or attributes in other namespaces.
