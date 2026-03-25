# d3-drag

[Drag-and-drop](https://en.wikipedia.org/wiki/Drag_and_drop) is a popular and easy-to-learn pointing gesture: move the pointer to an object, press and hold to grab it, “drag” the object to a new location, and release to “drop”. D3’s [drag behavior](#api-reference) provides a convenient but flexible abstraction for enabling drag-and-drop interaction on [selections](https://github.com/d3/d3-selection). For example, you can use d3-drag to facilitate interaction with a [force-directed graph](https://github.com/d3/d3-force), or a simulation of colliding circles:

[<img alt="Force-Directed Graph" src="https://raw.githubusercontent.com/d3/d3-drag/master/img/force-graph.png" width="420" height="219">](https://observablehq.com/@d3/force-directed-graph)[<img alt="Force Dragging II" src="https://raw.githubusercontent.com/d3/d3-drag/master/img/force-collide.png" width="420" height="219">](https://observablehq.com/d/c55a5839a5bb7c73)

You can also use d3-drag to implement custom user interface elements, such as a slider. But the drag behavior isn’t just for moving elements around; there are a variety of ways to respond to a drag gesture. For example, you can use it to lasso elements in a scatterplot, or to paint lines on a canvas:

[<img alt="Line Drawing" src="https://raw.githubusercontent.com/d3/d3-drag/master/img/drawing.png" width="420" height="219">](https://observablehq.com/@d3/draw-me)

The drag behavior can be combined with other behaviors, such as [d3-zoom](https://github.com/d3/d3-zoom) for zooming.

[<img alt="Drag & Zoom II" src="https://raw.githubusercontent.com/d3/d3-drag/master/img/dots.png" width="420" height="219">](https://observablehq.com/@d3/drag-zoom)

The drag behavior is agnostic about the DOM, so you can use it with SVG, HTML or even Canvas! And you can extend it with advanced selection techniques, such as a Voronoi overlay or a closest-target search:

[<img alt="Circle Dragging IV" src="https://raw.githubusercontent.com/d3/d3-drag/master/img/voronoi.png" width="420" height="219">](https://observablehq.com/@d3/circle-dragging-iii)[<img alt="Circle Dragging II" src="https://raw.githubusercontent.com/d3/d3-drag/master/img/canvas.png" width="420" height="219">](https://observablehq.com/@d3/circle-dragging-ii)

Best of all, the drag behavior automatically unifies mouse and touch input, and avoids browser idiosyncrasies. When [Pointer Events](https://www.w3.org/TR/pointerevents/) are more widely available, the drag behavior will support those, too.

## Installing

If you use npm, `npm install d3-drag`. You can also download the [latest release on GitHub](https://github.com/d3/d3-drag/releases/latest). For vanilla HTML in modern browsers, import d3-drag from Skypack:

```html
<script type="module">

import {drag} from "https://cdn.skypack.dev/d3-drag@3";

const handler = drag();

</script>
```

For legacy environments, you can load d3-drag’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-dispatch@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-selection@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-drag@3"></script>
<script>

const handler = d3.drag();

</script>
```

[Try d3-drag in your browser.](https://observablehq.com/collection/@d3/d3-drag)

## API Reference

This table describes how the drag behavior interprets native events:

| Event        | Listening Element | Drag Event | Default Prevented? |
| ------------ | ----------------- | ---------- | ------------------ |
| mousedown⁵   | selection         | start      | no¹                |
| mousemove²   | window¹           | drag       | yes                |
| mouseup²     | window¹           | end        | yes                |
| dragstart²   | window            | -          | yes                |
| selectstart² | window            | -          | yes                |
| click³       | window            | -          | yes                |
| touchstart   | selection         | start      | no⁴                |
| touchmove    | selection         | drag       | yes                |
| touchend     | selection         | end        | no⁴                |
| touchcancel  | selection         | end        | no⁴                |

The propagation of all consumed events is [immediately stopped](https://dom.spec.whatwg.org/#dom-event-stopimmediatepropagation). If you want to prevent some events from initiating a drag gesture, use [*drag*.filter](#drag_filter).

¹ Necessary to capture events outside an iframe; see [#9](https://github.com/d3/d3-drag/issues/9).
<br>² Only applies during an active, mouse-based gesture; see [#9](https://github.com/d3/d3-drag/issues/9).
<br>³ Only applies immediately after some mouse-based gestures; see [*drag*.clickDistance](#drag_clickDistance).
<br>⁴ Necessary to allow [click emulation](https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW7) on touch input; see [#9](https://github.com/d3/d3-drag/issues/9).
<br>⁵ Ignored if within 500ms of a touch gesture ending; assumes [click emulation](https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW7).

<a href="#drag" name="drag">#</a> d3.<b>drag</b>() · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js), [Examples](https://observablehq.com/collection/@d3/d3-drag)

Creates a new drag behavior. The returned behavior, [*drag*](#_drag), is both an object and a function, and is typically applied to selected elements via [*selection*.call](https://github.com/d3/d3-selection#selection_call).

<a href="#_drag" name="_drag">#</a> <i>drag</i>(<i>selection</i>) · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js), [Examples](https://observablehq.com/collection/@d3/d3-drag)

Applies this drag behavior to the specified [*selection*](https://github.com/d3/d3-selection). This function is typically not invoked directly, and is instead invoked via [*selection*.call](https://github.com/d3/d3-selection#selection_call). For example, to instantiate a drag behavior and apply it to a selection:

```js
d3.selectAll(".node").call(d3.drag().on("start", started));
```

Internally, the drag behavior uses [*selection*.on](https://github.com/d3/d3-selection#selection_on) to bind the necessary event listeners for dragging. The listeners use the name `.drag`, so you can subsequently unbind the drag behavior as follows:

```js
selection.on(".drag", null);
```

Applying the drag behavior also sets the [-webkit-tap-highlight-color](https://developer.apple.com/library/mac/documentation/AppleApplications/Reference/SafariWebContent/AdjustingtheTextSize/AdjustingtheTextSize.html#//apple_ref/doc/uid/TP40006510-SW5) style to transparent, disabling the tap highlight on iOS. If you want a different tap highlight color, remove or re-apply this style after applying the drag behavior.

<a href="#drag_container" name="drag_container">#</a> <i>drag</i>.<b>container</b>([<i>container</i>]) · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js), [Examples](https://observablehq.com/collection/@d3/d3-drag)

If *container* is specified, sets the container accessor to the specified object or function and returns the drag behavior. If *container* is not specified, returns the current container accessor, which defaults to:

```js
function container() {
  return this.parentNode;
}
```

The *container* of a drag gesture determines the coordinate system of subsequent [drag events](#drag-events), affecting *event*.x and *event*.y. The element returned by the container accessor is subsequently passed to [d3.pointer](https://github.com/d3/d3-selection#pointer) to determine the local coordinates of the pointer.

The default container accessor returns the parent node of the element in the originating selection (see [*drag*](#_drag)) that received the initiating input event. This is often appropriate when dragging SVG or HTML elements, since those elements are typically positioned relative to a parent. For dragging graphical elements with a Canvas, however, you may want to redefine the container as the initiating element itself:

```js
function container() {
  return this;
}
```

Alternatively, the container may be specified as the element directly, such as `drag.container(canvas)`.


<a href="#drag_filter" name="drag_filter">#</a> <i>drag</i>.<b>filter</b>([<i>filter</i>])  · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js), [Examples](https://observablehq.com/d/c55a5839a5bb7c73)

If *filter* is specified, sets the event filter to the specified function and returns the drag behavior. If *filter* is not specified, returns the current filter, which defaults to:

```js
function filter(event) {
  return !event.ctrlKey && !event.button;
}
```

If the filter returns falsey, the initiating event is ignored and no drag gestures are started. Thus, the filter determines which input events are ignored; the default filter ignores mousedown events on secondary buttons, since those buttons are typically intended for other purposes, such as the context menu.

<a href="#drag_touchable" name="drag_touchable">#</a> <i>drag</i>.<b>touchable</b>([<i>touchable</i>]) · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js), [Examples](https://observablehq.com/d/c55a5839a5bb7c73)

If *touchable* is specified, sets the touch support detector to the specified function and returns the drag behavior. If *touchable* is not specified, returns the current touch support detector, which defaults to:

```js
function touchable() {
  return navigator.maxTouchPoints || ("ontouchstart" in this);
}
```

Touch event listeners are only registered if the detector returns truthy for the corresponding element when the drag behavior is [applied](#_drag). The default detector works well for most browsers that are capable of touch input, but not all; Chrome’s mobile device emulator, for example, fails detection.

<a href="#drag_subject" name="drag_subject">#</a> <i>drag</i>.<b>subject</b>([<i>subject</i>]) · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js), [Examples](https://observablehq.com/collection/@d3/d3-drag)

If *subject* is specified, sets the subject accessor to the specified object or function and returns the drag behavior. If *subject* is not specified, returns the current subject accessor, which defaults to:

```js
function subject(event, d) {
  return d == null ? {x: event.x, y: event.y} : d;
}
```

The *subject* of a drag gesture represents *the thing being dragged*. It is computed when an initiating input event is received, such as a mousedown or touchstart, immediately before the drag gesture starts. The subject is then exposed as *event*.subject on subsequent [drag events](#drag-events) for this gesture.

The default subject is the [datum](https://github.com/d3/d3-selection#selection_datum) of the element in the originating selection (see [*drag*](#_drag)) that received the initiating input event; if this datum is undefined, an object representing the coordinates of the pointer is created. When dragging circle elements in SVG, the default subject is thus the datum of the circle being dragged. With [Canvas](https://html.spec.whatwg.org/multipage/scripting.html#the-canvas-element), the default subject is the canvas element’s datum (regardless of where on the canvas you click). In this case, a custom subject accessor would be more appropriate, such as one that picks the closest circle to the mouse within a given search *radius*:

```js
function subject(event) {
  let n = circles.length,
      i,
      dx,
      dy,
      d2,
      s2 = radius * radius,
      circle,
      subject;

  for (i = 0; i < n; ++i) {
    circle = circles[i];
    dx = event.x - circle.x;
    dy = event.y - circle.y;
    d2 = dx * dx + dy * dy;
    if (d2 < s2) subject = circle, s2 = d2;
  }

  return subject;
}
```

(If necessary, the above can be accelerated using [*quadtree*.find](https://github.com/d3/d3-quadtree/blob/master/README.md#quadtree_find),  [*simulation*.find](https://github.com/d3/d3-force/blob/master/README.md#simulation_find) or [*delaunay*.find](https://github.com/d3/d3-delaunay/blob/master/README.md#delaunay_find).)

The returned subject should be an object that exposes `x` and `y` properties, so that the relative position of the subject and the pointer can be preserved during the drag gesture. If the subject is null or undefined, no drag gesture is started for this pointer; however, other starting touches may yet start drag gestures. See also [*drag*.filter](#drag_filter).

The subject of a drag gesture may not be changed after the gesture starts. The subject accessor is invoked with the same context and arguments as [*selection*.on](https://github.com/d3/d3-selection#selection_on) listeners: the current event (`event`) and datum `d`, with the `this` context as the current DOM element. During the evaluation of the subject accessor, `event` is a beforestart [drag event](#drag-events). Use *event*.sourceEvent to access the initiating input event and *event*.identifier to access the touch identifier. The *event*.x and *event*.y are relative to the [container](#drag_container), and are computed using [d3.pointer](https://github.com/d3/d3-selection#pointer).

<a href="#drag_clickDistance" name="drag_clickDistance">#</a> <i>drag</i>.<b>clickDistance</b>([<i>distance</i>]) · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js)

If *distance* is specified, sets the maximum distance that the mouse can move between mousedown and mouseup that will trigger a subsequent click event. If at any point between mousedown and mouseup the mouse is greater than or equal to *distance* from its position on mousedown, the click event following mouseup will be suppressed. If *distance* is not specified, returns the current distance threshold, which defaults to zero. The distance threshold is measured in client coordinates ([*event*.clientX](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX) and [*event*.clientY](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientY)).

<a href="#drag_on" name="drag_on">#</a> <i>drag</i>.<b>on</b>(<i>typenames</i>, [<i>listener</i>]) · [Source](https://github.com/d3/d3-drag/blob/master/src/drag.js)

If *listener* is specified, sets the event *listener* for the specified *typenames* and returns the drag behavior. If an event listener was already registered for the same type and name, the existing listener is removed before the new listener is added. If *listener* is null, removes the current event listeners for the specified *typenames*, if any. If *listener* is not specified, returns the first currently-assigned listener matching the specified *typenames*, if any. When a specified event is dispatched, each *listener* will be invoked with the same context and arguments as [*selection*.on](https://github.com/d3/d3-selection#selection_on) listeners: the current event (`event`) and datum `d`, with the `this` context as the current DOM element.

The *typenames* is a string containing one or more *typename* separated by whitespace. Each *typename* is a *type*, optionally followed by a period (`.`) and a *name*, such as `drag.foo` and `drag.bar`; the name allows multiple listeners to be registered for the same *type*. The *type* must be one of the following:

* `start` - after a new pointer becomes active (on mousedown or touchstart).
* `drag` - after an active pointer moves (on mousemove or touchmove).
* `end` - after an active pointer becomes inactive (on mouseup, touchend or touchcancel).

See [*dispatch*.on](https://github.com/d3/d3-dispatch#dispatch_on) for more.

Changes to registered listeners via *drag*.on during a drag gesture *do not affect* the current drag gesture. Instead, you must use [*event*.on](#event_on), which also allows you to register temporary event listeners for the current drag gesture. **Separate events are dispatched for each active pointer** during a drag gesture. For example, if simultaneously dragging multiple subjects with multiple fingers, a start event is dispatched for each finger, even if both fingers start touching simultaneously. See [Drag Events](#drag-events) for more.

<a href="#dragDisable" name="dragDisable">#</a> d3.<b>dragDisable</b>(<i>window</i>) · [Source](https://github.com/d3/d3-drag/blob/master/src/nodrag.js)

Prevents native drag-and-drop and text selection on the specified *window*. As an alternative to preventing the default action of mousedown events (see [#9](https://github.com/d3/d3-drag/issues/9)), this method prevents undesirable default actions following mousedown. In supported browsers, this means capturing dragstart and selectstart events, preventing the associated default actions, and immediately stopping their propagation. In browsers that do not support selection events, the user-select CSS property is set to none on the document element. This method is intended to be called on mousedown, followed by [d3.dragEnable](#dragEnable) on mouseup.

<a href="#dragEnable" name="dragEnable">#</a> d3.<b>dragEnable</b>(<i>window</i>[, <i>noclick</i>]) · [Source](https://github.com/d3/d3-drag/blob/master/src/nodrag.js)

Allows native drag-and-drop and text selection on the specified *window*; undoes the effect of [d3.dragDisable](#dragDisable). This method is intended to be called on mouseup, preceded by [d3.dragDisable](#dragDisable) on mousedown. If *noclick* is true, this method also temporarily suppresses click events. The suppression of click events expires after a zero-millisecond timeout, such that it only suppress the click event that would immediately follow the current mouseup event, if any.

### Drag Events

When a [drag event listener](#drag_on) is invoked, it receives the current drag event as its first argument. The *event* object exposes several fields:

* `target` - the associated [drag behavior](#drag).
* `type` - the string “start”, “drag” or “end”; see [*drag*.on](#drag_on).
* `subject` - the drag subject, defined by [*drag*.subject](#drag_subject).
* `x` - the new *x*-coordinate of the subject; see [*drag*.container](#drag_container).
* `y` - the new *y*-coordinate of the subject; see [*drag*.container](#drag_container).
* `dx` - the change in *x*-coordinate since the previous drag event.
* `dy` - the change in *y*-coordinate since the previous drag event.
* `identifier` - the string “mouse”, or a numeric [touch identifier](https://www.w3.org/TR/touch-events/#widl-Touch-identifier).
* `active` - the number of currently active drag gestures (on start and end, not including this one).
* `sourceEvent` - the underlying input event, such as mousemove or touchmove.

The *event*.active field is useful for detecting the first start event and the last end event in a sequence of concurrent drag gestures: it is zero when the first drag gesture starts, and zero when the last drag gesture ends.

The *event* object also exposes the [*event*.on](#event_on) method.

<a href="#event_on" name="event_on">#</a> <i>event</i>.<b>on</b>(<i>typenames</i>, [<i>listener</i>]) · [Source](https://github.com/d3/d3-drag/blob/master/src/event.js)

Equivalent to [*drag*.on](#drag_on), but only applies to the current drag gesture. Before the drag gesture starts, a [copy](https://github.com/d3/d3-dispatch#dispatch_copy) of the current drag [event listeners](#drag_on) is made. This copy is bound to the current drag gesture and modified by *event*.on. This is useful for temporary listeners that only receive events for the current drag gesture. For example, this start event listener registers temporary drag and end event listeners as closures:

```js
function started(event) {
  const circle = d3.select(this).classed("dragging", true);

  event.on("drag", dragged).on("end", ended);

  function dragged(event, d) {
    circle.raise().attr("cx", d.x = event.x).attr("cy", d.y = event.y);
  }

  function ended() {
    circle.classed("dragging", false);
  }
}
```
