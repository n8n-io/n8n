# d3-transition

A transition is a [selection](https://github.com/d3/d3-selection)-like interface for animating changes to the DOM. Instead of applying changes instantaneously, transitions smoothly interpolate the DOM from its current state to the desired target state over a given duration.

To apply a transition, select elements, call [*selection*.transition](#selection_transition), and then make the desired changes. For example:

```js
d3.select("body")
  .transition()
    .style("background-color", "red");
```

Transitions support most selection methods (such as [*transition*.attr](#transition_attr) and [*transition*.style](#transition_style) in place of [*selection*.attr](https://github.com/d3/d3-selection#selection_attr) and [*selection*.style](https://github.com/d3/d3-selection#selection_style)), but not all methods are supported; for example, you must [append](https://github.com/d3/d3-selection#selection_append) elements or [bind data](https://github.com/d3/d3-selection#joining-data) before a transition starts. A [*transition*.remove](#transition_remove) operator is provided for convenient removal of elements when the transition ends.

To compute intermediate state, transitions leverage a variety of [built-in interpolators](https://github.com/d3/d3-interpolate). [Colors](https://github.com/d3/d3-interpolate#interpolateRgb), [numbers](https://github.com/d3/d3-interpolate#interpolateNumber), and [transforms](https://github.com/d3/d3-interpolate#interpolateTransform) are automatically detected. [Strings](https://github.com/d3/d3-interpolate#interpolateString) with embedded numbers are also detected, as is common with many styles (such as padding or font sizes) and paths. To specify a custom interpolator, use [*transition*.attrTween](#transition_attrTween), [*transition*.styleTween](#transition_styleTween) or [*transition*.tween](#transition_tween).

## Installing

If you use npm, `npm install d3-transition`. You can also download the [latest release on GitHub](https://github.com/d3/d3-transition/releases/latest). For vanilla HTML in modern browsers, import d3-transition from Skypack:

```html
<script type="module">

import {transition} from "https://cdn.skypack.dev/d3-transition@3";

const t = transition();

</script>
```

For legacy environments, you can load d3-transition’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-color@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-dispatch@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-ease@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-interpolate@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-selection@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-timer@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-transition@3"></script>
<script>

const t = d3.transition();

</script>
```

[Try d3-transition in your browser.](https://observablehq.com/collection/@d3/d3-transition)

## API Reference

* [Selecting Elements](#selecting-elements)
* [Modifying Elements](#modifying-elements)
* [Timing](#timing)
* [Control Flow](#control-flow)
* [The Life of a Transition](#the-life-of-a-transition)

### Selecting Elements

Transitions are derived from [selections](https://github.com/d3/d3-selection) via [*selection*.transition](#selection_transition). You can also create a transition on the document root element using [d3.transition](#transition).

<a name="selection_transition" href="#selection_transition">#</a> <i>selection</i>.<b>transition</b>([<i>name</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/selection/transition.js)

Returns a new transition on the given *selection* with the specified *name*. If a *name* is not specified, null is used. The new transition is only exclusive with other transitions of the same name.

If the *name* is a [transition](#transition) instance, the returned transition has the same id and name as the specified transition. If a transition with the same id already exists on a selected element, the existing transition is returned for that element. Otherwise, the timing of the returned transition is inherited from the existing transition of the same id on the nearest ancestor of each selected element. Thus, this method can be used to synchronize a transition across multiple selections, or to re-select a transition for specific elements and modify its configuration. For example:

```js
var t = d3.transition()
    .duration(750)
    .ease(d3.easeLinear);

d3.selectAll(".apple").transition(t)
    .style("fill", "red");

d3.selectAll(".orange").transition(t)
    .style("fill", "orange");
```

If the specified *transition* is not found on a selected node or its ancestors (such as if the transition [already ended](#the-life-of-a-transition)), the default timing parameters are used; however, in a future release, this will likely be changed to throw an error. See [#59](https://github.com/d3/d3-transition/issues/59).

<a name="selection_interrupt" href="#selection_interrupt">#</a> <i>selection</i>.<b>interrupt</b>([<i>name</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/selection/interrupt.js)

Interrupts the active transition of the specified *name* on the selected elements, and cancels any pending transitions with the specified *name*, if any. If a name is not specified, null is used.

Interrupting a transition on an element has no effect on any transitions on any descendant elements. For example, an [axis transition](https://github.com/d3/d3-axis) consists of multiple independent, synchronized transitions on the descendants of the axis [G element](https://www.w3.org/TR/SVG/struct.html#Groups) (the tick lines, the tick labels, the domain path, *etc.*). To interrupt the axis transition, you must therefore interrupt the descendants:

```js
selection.selectAll("*").interrupt();
```

The [universal selector](https://developer.mozilla.org/en-US/docs/Web/CSS/Universal_selectors), `*`, selects all descendant elements. If you also want to interrupt the G element itself:

```js
selection.interrupt().selectAll("*").interrupt();
```

<a name="interrupt" href="#interrupt">#</a> d3.<b>interrupt</b>(<i>node</i>[, <i>name</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/interrupt.js)

Interrupts the active transition of the specified *name* on the specified *node*, and cancels any pending transitions with the specified *name*, if any. If a name is not specified, null is used. See also [*selection*.interrupt](#selection_interrupt).

<a name="transition" href="#transition">#</a> d3.<b>transition</b>([<i>name</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/index.js#L29)

Returns a new transition on the root element, `document.documentElement`, with the specified *name*. If a *name* is not specified, null is used. The new transition is only exclusive with other transitions of the same name. The *name* may also be a [transition](#transition) instance; see [*selection*.transition](#selection_transition). This method is equivalent to:

```js
d3.selection()
  .transition(name)
```

This function can also be used to test for transitions (`instanceof d3.transition`) or to extend the transition prototype.

<a name="transition_select" href="#transition_select">#</a> <i>transition</i>.<b>select</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/select.js)

For each selected element, selects the first descendant element that matches the specified *selector* string, if any, and returns a transition on the resulting selection. The *selector* may be specified either as a selector string or a function. If a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The new transition has the same id, name and timing as this transition; however, if a transition with the same id already exists on a selected element, the existing transition is returned for that element.

This method is equivalent to deriving the selection for this transition via [*transition*.selection](#transition_selection), creating a subselection via [*selection*.select](https://github.com/d3/d3-selection#selection_select), and then creating a new transition via [*selection*.transition](#selection_transition):

```js
transition
  .selection()
  .select(selector)
  .transition(transition)
```

<a name="transition_selectAll" href="#transition_selectAll">#</a> <i>transition</i>.<b>selectAll</b>(<i>selector</i>) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/selectAll.js)

For each selected element, selects all descendant elements that match the specified *selector* string, if any, and returns a transition on the resulting selection. The *selector* may be specified either as a selector string or a function. If a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The new transition has the same id, name and timing as this transition; however, if a transition with the same id already exists on a selected element, the existing transition is returned for that element.

This method is equivalent to deriving the selection for this transition via [*transition*.selection](#transition_selection), creating a subselection via [*selection*.selectAll](https://github.com/d3/d3-selection#selection_selectAll), and then creating a new transition via [*selection*.transition](#selection_transition):

```js
transition
  .selection()
  .selectAll(selector)
  .transition(transition)
```

<a name="transition_selectChild" href="#transition_selectChild">#</a> <i>transition</i>.<b>selectChild</b>([<i>selector</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/select.js)

For each selected element, selects the first child element that matches the specified *selector* string, if any, and returns a transition on the resulting selection. The *selector* may be specified either as a selector string or a function. If a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The new transition has the same id, name and timing as this transition; however, if a transition with the same id already exists on a selected element, the existing transition is returned for that element.

This method is equivalent to deriving the selection for this transition via [*transition*.selection](#transition_selection), creating a subselection via [*selection*.selectChild](https://github.com/d3/d3-selection#selection_selectChild), and then creating a new transition via [*selection*.transition](#selection_transition):

```js
transition
  .selection()
  .selectChild(selector)
  .transition(transition)
```

<a name="transition_selectChildren" href="#transition_selectChildren">#</a> <i>transition</i>.<b>selectChildren</b>([<i>selector</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/selectAll.js)

For each selected element, selects all children that match the specified *selector* string, if any, and returns a transition on the resulting selection. The *selector* may be specified either as a selector string or a function. If a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The new transition has the same id, name and timing as this transition; however, if a transition with the same id already exists on a selected element, the existing transition is returned for that element.

This method is equivalent to deriving the selection for this transition via [*transition*.selection](#transition_selection), creating a subselection via [*selection*.selectChildren](https://github.com/d3/d3-selection#selection_selectChildren), and then creating a new transition via [*selection*.transition](#selection_transition):

```js
transition
  .selection()
  .selectChildren(selector)
  .transition(transition)
```

<a name="transition_filter" href="#transition_filter">#</a> <i>transition</i>.<b>filter</b>(<i>filter</i>) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/filter.js)

For each selected element, selects only the elements that match the specified *filter*, and returns a transition on the resulting selection. The *filter* may be specified either as a selector string or a function. If a function, it is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The new transition has the same id, name and timing as this transition; however, if a transition with the same id already exists on a selected element, the existing transition is returned for that element.

This method is equivalent to deriving the selection for this transition via [*transition*.selection](#transition_selection), creating a subselection via [*selection*.filter](https://github.com/d3/d3-selection#selection_filter), and then creating a new transition via [*selection*.transition](#selection_transition):

```js
transition
  .selection()
  .filter(filter)
  .transition(transition)
```

<a name="transition_merge" href="#transition_merge">#</a> <i>transition</i>.<b>merge</b>(<i>other</i>) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/merge.js)

Returns a new transition merging this transition with the specified *other* transition, which must have the same id as this transition. The returned transition has the same number of groups, the same parents, the same name and the same id as this transition. Any missing (null) elements in this transition are filled with the corresponding element, if present (not null), from the *other* transition.

This method is equivalent to deriving the selection for this transition via [*transition*.selection](#transition_selection), merging with the selection likewise derived from the *other* transition via [*selection*.merge](https://github.com/d3/d3-selection#selection_merge), and then creating a new transition via [*selection*.transition](#selection_transition):

```js
transition
  .selection()
  .merge(other.selection())
  .transition(transition)
```

<a name="transition_transition" href="#transition_transition">#</a> <i>transition</i>.<b>transition</b>() · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/transition.js)

Returns a new transition on the same selected elements as this transition, scheduled to start when this transition ends. The new transition inherits a reference time equal to this transition’s time plus its [delay](#transition_delay) and [duration](#transition_duration). The new transition also inherits this transition’s name, duration, and [easing](#transition_ease). This method can be used to schedule a sequence of chained transitions. For example:

```js
d3.selectAll(".apple")
  .transition() // First fade to green.
    .style("fill", "green")
  .transition() // Then red.
    .style("fill", "red")
  .transition() // Wait one second. Then brown, and remove.
    .delay(1000)
    .style("fill", "brown")
    .remove();
```

The delay for each transition is relative to its previous transition. Thus, in the above example, apples will stay red for one second before the last transition to brown starts.

<a name="transition_selection" href="#transition_selection">#</a> <i>transition</i>.<b>selection</b>() · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/selection.js)

Returns the [selection](https://github.com/d3/d3-selection#selection) corresponding to this transition.

<a name="active" href="#active">#</a> d3.<b>active</b>(<i>node</i>[, <i>name</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/active.js)

Returns the active transition on the specified *node* with the specified *name*, if any. If no *name* is specified, null is used. Returns null if there is no such active transition on the specified node. This method is useful for creating chained transitions. For example, to initiate disco mode:

```js
d3.selectAll("circle").transition()
    .delay(function(d, i) { return i * 50; })
    .on("start", function repeat() {
        d3.active(this)
            .style("fill", "red")
          .transition()
            .style("fill", "green")
          .transition()
            .style("fill", "blue")
          .transition()
            .on("start", repeat);
      });
```

See [chained transitions](https://bl.ocks.org/mbostock/70d5541b547cc222aa02) for an example.

### Modifying Elements

After selecting elements and creating a transition with [*selection*.transition](#selection_transition), use the transition’s transformation methods to affect document content.

<a name="transition_attr" href="#transition_attr">#</a> <i>transition</i>.<b>attr</b>(<i>name</i>, <i>value</i>) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/attr.js)

For each selected element, assigns the [attribute tween](#transition_attrTween) for the attribute with the specified *name* to the specified target *value*. The starting value of the tween is the attribute’s value when the transition starts. The target *value* may be specified either as a constant or a function. If a function, it is immediately evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element.

If the target value is null, the attribute is removed when the transition starts. Otherwise, an interpolator is chosen based on the type of the target value, using the following algorithm:

1. If *value* is a number, use [interpolateNumber](https://github.com/d3/d3-interpolate#interpolateNumber).
2. If *value* is a [color](https://github.com/d3/d3-color#color) or a string coercible to a color, use [interpolateRgb](https://github.com/d3/d3-interpolate#interpolateRgb).
3. Use [interpolateString](https://github.com/d3/d3-interpolate#interpolateString).

To apply a different interpolator, use [*transition*.attrTween](#transition_attrTween).

<a name="transition_attrTween" href="#transition_attrTween">#</a> <i>transition</i>.<b>attrTween</b>(<i>name</i>[, <i>factory</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/attrTween.js)

If *factory* is specified and not null, assigns the attribute [tween](#transition_tween) for the attribute with the specified *name* to the specified interpolator *factory*. An interpolator factory is a function that returns an [interpolator](https://github.com/d3/d3-interpolate); when the transition starts, the *factory* is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The returned interpolator will then be invoked for each frame of the transition, in order, being passed the [eased](#transition_ease) time *t*, typically in the range [0, 1]. Lastly, the return value of the interpolator will be used to set the attribute value. The interpolator must return a string. (To remove an attribute at the start of a transition, use [*transition*.attr](#transition_attr); to remove an attribute at the end of a transition, use [*transition*.on](#transition_on) to listen for the *end* event.)

If the specified *factory* is null, removes the previously-assigned attribute tween of the specified *name*, if any. If *factory* is not specified, returns the current interpolator factory for attribute with the specified *name*, or undefined if no such tween exists.

For example, to interpolate the fill attribute from red to blue:

```js
transition.attrTween("fill", function() {
  return d3.interpolateRgb("red", "blue");
});
```

Or to interpolate from the current fill to blue, like [*transition*.attr](#transition_attr):

```js
transition.attrTween("fill", function() {
  return d3.interpolateRgb(this.getAttribute("fill"), "blue");
});
```

Or to apply a custom rainbow interpolator:

```js
transition.attrTween("fill", function() {
  return function(t) {
    return "hsl(" + t * 360 + ",100%,50%)";
  };
});
```

This method is useful to specify a custom interpolator, such as one that understands [SVG paths](https://bl.ocks.org/mbostock/3916621). A useful technique is *data interpolation*, where [d3.interpolateObject](https://github.com/d3/d3-interpolate#interpolateObject) is used to interpolate two data values, and the resulting value is then used (say, with a [shape](https://github.com/d3/d3-shape)) to compute the new attribute value.

<a name="transition_style" href="#transition_style">#</a> <i>transition</i>.<b>style</b>(<i>name</i>, <i>value</i>[, <i>priority</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/style.js)

For each selected element, assigns the [style tween](#transition_styleTween) for the style with the specified *name* to the specified target *value* with the specified *priority*. The starting value of the tween is the style’s inline value if present, and otherwise its computed value, when the transition starts. The target *value* may be specified either as a constant or a function. If a function, it is immediately evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element.

If the target value is null, the style is removed when the transition starts. Otherwise, an interpolator is chosen based on the type of the target value, using the following algorithm:

1. If *value* is a number, use [interpolateNumber](https://github.com/d3/d3-interpolate#interpolateNumber).
2. If *value* is a [color](https://github.com/d3/d3-color#color) or a string coercible to a color, use [interpolateRgb](https://github.com/d3/d3-interpolate#interpolateRgb).
3. Use [interpolateString](https://github.com/d3/d3-interpolate#interpolateString).

To apply a different interpolator, use [*transition*.styleTween](#transition_styleTween).

<a name="transition_styleTween" href="#transition_styleTween">#</a> <i>transition</i>.<b>styleTween</b>(<i>name</i>[, <i>factory</i>[, <i>priority</i>]]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/styleTween.js)

If *factory* is specified and not null, assigns the style [tween](#transition_tween) for the style with the specified *name* to the specified interpolator *factory*. An interpolator factory is a function that returns an [interpolator](https://github.com/d3/d3-interpolate); when the transition starts, the *factory* is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The returned interpolator will then be invoked for each frame of the transition, in order, being passed the [eased](#transition_ease) time *t*, typically in the range [0, 1]. Lastly, the return value of the interpolator will be used to set the style value with the specified *priority*. The interpolator must return a string. (To remove an style at the start of a transition, use [*transition*.style](#transition_style); to remove an style at the end of a transition, use [*transition*.on](#transition_on) to listen for the *end* event.)

If the specified *factory* is null, removes the previously-assigned style tween of the specified *name*, if any. If *factory* is not specified, returns the current interpolator factory for style with the specified *name*, or undefined if no such tween exists.

For example, to interpolate the fill style from red to blue:

```js
transition.styleTween("fill", function() {
  return d3.interpolateRgb("red", "blue");
});
```

Or to interpolate from the current fill to blue, like [*transition*.style](#transition_style):

```js
transition.styleTween("fill", function() {
  return d3.interpolateRgb(this.style.fill, "blue");
});
```

Or to apply a custom rainbow interpolator:

```js
transition.styleTween("fill", function() {
  return function(t) {
    return "hsl(" + t * 360 + ",100%,50%)";
  };
});
```

This method is useful to specify a custom interpolator, such as with *data interpolation*, where [d3.interpolateObject](https://github.com/d3/d3-interpolate#interpolateObject) is used to interpolate two data values, and the resulting value is then used to compute the new style value.

<a name="transition_text" href="#transition_text">#</a> <i>transition</i>.<b>text</b>(<i>value</i>) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/text.js)

For each selected element, sets the [text content](http://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-textContent) to the specified target *value* when the transition starts. The *value* may be specified either as a constant or a function. If a function, it is immediately evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The function’s return value is then used to set each element’s text content. A null value will clear the content.

To interpolate text rather than to set it on start, use [*transition*.textTween](#transition_textTween) or append a replacement element and cross-fade opacity. Text is not interpolated by default because it is usually undesirable.

<a name="transition_textTween" href="#transition_textTween">#</a> <i>transition</i>.<b>textTween</b>(<i>factory</i>) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/textTween.js), [Examples](https://observablehq.com/@d3/transition-texttween)

If *factory* is specified and not null, assigns the text [tween](#transition_tween) to the specified interpolator *factory*. An interpolator factory is a function that returns an [interpolator](https://github.com/d3/d3-interpolate); when the transition starts, the *factory* is evaluated for each selected element, in order, being passed the current datum `d` and index `i`, with the `this` context as the current DOM element. The returned interpolator will then be invoked for each frame of the transition, in order, being passed the [eased](#transition_ease) time *t*, typically in the range [0, 1]. Lastly, the return value of the interpolator will be used to set the text. The interpolator must return a string.

For example, to interpolate the text with integers from 0 to 100:

```js
transition.textTween(function() {
  return d3.interpolateRound(0, 100);
});
```

If the specified *factory* is null, removes the previously-assigned text tween, if any. If *factory* is not specified, returns the current interpolator factory for text, or undefined if no such tween exists.

<a name="transition_remove" href="#transition_remove">#</a> <i>transition</i>.<b>remove</b>() · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/remove.js)

For each selected element, [removes](https://github.com/d3/d3-selection#selection_remove) the element when the transition ends, as long as the element has no other active or pending transitions. If the element has other active or pending transitions, does nothing.

<a name="transition_tween" href="#transition_tween">#</a> <i>transition</i>.<b>tween</b>(<i>name</i>[, <i>value</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/tween.js)

For each selected element, assigns the tween with the specified *name* with the specified *value* function. The *value* must be specified as a function that returns a function. When the transition starts, the *value* function is evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The returned function is then invoked for each frame of the transition, in order, being passed the [eased](#transition_ease) time *t*, typically in the range [0, 1]. If the specified *value* is null, removes the previously-assigned tween of the specified *name*, if any.

For example, to interpolate the fill attribute to blue, like [*transition*.attr](#transition_attr):

```js
transition.tween("attr.fill", function() {
  var i = d3.interpolateRgb(this.getAttribute("fill"), "blue");
  return function(t) {
    this.setAttribute("fill", i(t));
  };
});
```

This method is useful to specify a custom interpolator, or to perform side-effects, say to animate the [scroll offset](https://bl.ocks.org/mbostock/1649463).

### Timing

The [easing](#transition_ease), [delay](#transition_delay) and [duration](#transition_duration) of a transition is configurable. For example, a per-element delay can be used to [stagger the reordering](https://observablehq.com/@d3/sortable-bar-chart) of elements, improving perception. See [Animated Transitions in Statistical Data Graphics](http://vis.berkeley.edu/papers/animated_transitions/) for recommendations.

<a name="transition_delay" href="#transition_delay">#</a> <i>transition</i>.<b>delay</b>([<i>value</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/delay.js)

For each selected element, sets the transition delay to the specified *value* in milliseconds. The *value* may be specified either as a constant or a function. If a function, it is immediately evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The function’s return value is then used to set each element’s transition delay. If a delay is not specified, it defaults to zero.

If a *value* is not specified, returns the current value of the delay for the first (non-null) element in the transition. This is generally useful only if you know that the transition contains exactly one element.

Setting the delay to a multiple of the index `i` is a convenient way to stagger transitions across a set of elements. For example:

```js
transition.delay(function(d, i) { return i * 10; });
```

Of course, you can also compute the delay as a function of the data, or [sort the selection](https://github.com/d3/d3-selection#selection_sort) before computed an index-based delay.

<a name="transition_duration" href="#transition_duration">#</a> <i>transition</i>.<b>duration</b>([<i>value</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/duration.js)

For each selected element, sets the transition duration to the specified *value* in milliseconds. The *value* may be specified either as a constant or a function. If a function, it is immediately evaluated for each selected element, in order, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. The function’s return value is then used to set each element’s transition duration. If a duration is not specified, it defaults to 250ms.

If a *value* is not specified, returns the current value of the duration for the first (non-null) element in the transition. This is generally useful only if you know that the transition contains exactly one element.

<a name="transition_ease" href="#transition_ease">#</a> <i>transition</i>.<b>ease</b>([<i>value</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/ease.js)

Specifies the transition [easing function](https://github.com/d3/d3-ease) for all selected elements. The *value* must be specified as a function. The easing function is invoked for each frame of the animation, being passed the normalized time *t* in the range [0, 1]; it must then return the eased time *tʹ* which is typically also in the range [0, 1]. A good easing function should return 0 if *t* = 0 and 1 if *t* = 1. If an easing function is not specified, it defaults to [d3.easeCubic](https://github.com/d3/d3-ease#easeCubic).

If a *value* is not specified, returns the current easing function for the first (non-null) element in the transition. This is generally useful only if you know that the transition contains exactly one element.

<a name="transition_easeVarying" href="#transition_easeVarying">#</a> <i>transition</i>.<b>easeVarying</b>(<i>factory</i>) [<>](https://github.com/d3/d3-transition/blob/master/src/transition/easeVarying.js "Source")

Specifies a factory for the transition [easing function](https://github.com/d3/d3-ease). The *factory* must be a function. It is invoked for each node of the selection, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. It must return an easing function.

### Control Flow

For advanced usage, transitions provide methods for custom control flow.

<a name="transition_end" href="#transition_end">#</a> <i>transition</i>.<b>end</b>() · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/end.js)

Returns a promise that resolves when every selected element finishes transitioning. If any element’s transition is cancelled or interrupted, the promise rejects.

<a name="transition_on" href="#transition_on">#</a> <i>transition</i>.<b>on</b>(<i>typenames</i>[, <i>listener</i>]) · [Source](https://github.com/d3/d3-transition/blob/master/src/transition/on.js)

Adds or removes a *listener* to each selected element for the specified event *typenames*. The *typenames* is one of the following string event types:

* `start` - when the transition starts.
* `end` - when the transition ends.
* `interrupt` - when the transition is interrupted.
* `cancel` - when the transition is cancelled.

See [The Life of a Transition](#the-life-of-a-transition) for more. Note that these are *not* native DOM events as implemented by [*selection*.on](https://github.com/d3/d3-selection#selection_on) and [*selection*.dispatch](https://github.com/d3/d3-selection#selection_dispatch), but transition events!

The type may be optionally followed by a period (`.`) and a name; the optional name allows multiple callbacks to be registered to receive events of the same type, such as `start.foo` and `start.bar`. To specify multiple typenames, separate typenames with spaces, such as `interrupt end` or `start.foo start.bar`.

When a specified transition event is dispatched on a selected node, the specified *listener* will be invoked for the transitioning element, being passed the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. Listeners always see the latest datum for their element, but the index is a property of the selection and is fixed when the listener is assigned; to update the index, re-assign the listener.

If an event listener was previously registered for the same *typename* on a selected element, the old listener is removed before the new listener is added. To remove a listener, pass null as the *listener*. To remove all listeners for a given name, pass null as the *listener* and `.foo` as the *typename*, where `foo` is the name; to remove all listeners with no name, specify `.` as the *typename*.

If a *listener* is not specified, returns the currently-assigned listener for the specified event *typename* on the first (non-null) selected element, if any. If multiple typenames are specified, the first matching listener is returned.

<a name="transition_each" href="#transition_each">#</a> <i>transition</i>.<b>each</b>(<i>function</i>) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/each.js)

Invokes the specified *function* for each selected element, passing in the current datum (*d*), the current index (*i*), and the current group (*nodes*), with *this* as the current DOM element. This method can be used to invoke arbitrary code for each selected element, and is useful for creating a context to access parent and child data simultaneously. Equivalent to [*selection*.each](https://github.com/d3/d3-selection#selection_each).

<a name="transition_call" href="#transition_call">#</a> <i>transition</i>.<b>call</b>(<i>function</i>[, <i>arguments…</i>]) · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/call.js)

Invokes the specified *function* exactly once, passing in this transition along with any optional *arguments*. Returns this transition. This is equivalent to invoking the function by hand but facilitates method chaining. For example, to set several attributes in a reusable function:

```js
function color(transition, fill, stroke) {
  transition
      .style("fill", fill)
      .style("stroke", stroke);
}
```

Now say:

```js
d3.selectAll("div").transition().call(color, "red", "blue");
```

This is equivalent to:

```js
color(d3.selectAll("div").transition(), "red", "blue");
```

Equivalent to [*selection*.call](https://github.com/d3/d3-selection#selection_call).

<a name="transition_empty" href="#transition_empty">#</a> <i>transition</i>.<b>empty</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/empty.js)

Returns true if this transition contains no (non-null) elements. Equivalent to [*selection*.empty](https://github.com/d3/d3-selection#selection_empty).

<a name="transition_nodes" href="#transition_nodes">#</a> <i>transition</i>.<b>nodes</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/nodes.js)

Returns an array of all (non-null) elements in this transition. Equivalent to [*selection*.nodes](https://github.com/d3/d3-selection#selection_nodes).

<a name="transition_node" href="#transition_node">#</a> <i>transition</i>.<b>node</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/node.js)

Returns the first (non-null) element in this transition. If the transition is empty, returns null. Equivalent to [*selection*.node](https://github.com/d3/d3-selection#selection_node).

<a name="transition_size" href="#transition_size">#</a> <i>transition</i>.<b>size</b>() · [Source](https://github.com/d3/d3-selection/blob/master/src/selection/size.js)

Returns the total number of elements in this transition. Equivalent to [*selection*.size](https://github.com/d3/d3-selection#selection_size).

### The Life of a Transition

Immediately after creating a transition, such as by [*selection*.transition](#selection_transition) or [*transition*.transition](#transition_transition), you may configure the transition using methods such as [*transition*.delay](#transition_delay), [*transition*.duration](#transition_duration), [*transition*.attr](#transition_attr) and [*transition*.style](#transition_style). Methods that specify target values (such as *transition*.attr) are evaluated synchronously; however, methods that require the starting value for interpolation, such as [*transition*.attrTween](#transition_attrTween) and [*transition*.styleTween](#transition_styleTween), must be deferred until the transition starts.

Shortly after creation, either at the end of the current frame or during the next frame, the transition is scheduled. At this point, the delay and `start` event listeners may no longer be changed; attempting to do so throws an error with the message “too late: already scheduled” (or if the transition has ended, “transition not found”).

When the transition subsequently starts, it interrupts the active transition of the same name on the same element, if any, dispatching an `interrupt` event to registered listeners. (Note that interrupts happen on start, not creation, and thus even a zero-delay transition will not immediately interrupt the active transition: the old transition is given a final frame. Use [*selection*.interrupt](#selection_interrupt) to interrupt immediately.) The starting transition also cancels any pending transitions of the same name on the same element that were created before the starting transition. The transition then dispatches a `start` event to registered listeners. This is the last moment at which the transition may be modified: the transition’s timing, tweens, and listeners may not be changed when it is running; attempting to do so throws an error with the message “too late: already running” (or if the transition has ended, “transition not found”). The transition initializes its tweens immediately after starting.

During the frame the transition starts, but *after* all transitions starting this frame have been started, the transition invokes its tweens for the first time. Batching tween initialization, which typically involves reading from the DOM, improves performance by avoiding interleaved DOM reads and writes.

For each frame that a transition is active, it invokes its tweens with an [eased](#transition_ease) *t*-value ranging from 0 to 1. Within each frame, the transition invokes its tweens in the order they were registered.

When a transition ends, it invokes its tweens a final time with a (non-eased) *t*-value of 1. It then dispatches an `end` event to registered listeners. This is the last moment at which the transition may be inspected: after ending, the transition is deleted from the element, and its configuration is destroyed. (A transition’s configuration is also destroyed on interrupt or cancel.) Attempting to inspect a transition after it is destroyed throws an error with the message “transition not found”.
