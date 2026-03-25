# d3-zoom

Panning and zooming are popular interaction techniques which let the user focus on a region of interest by restricting the view. It is easy to learn due to direct manipulation: click-and-drag to pan (translate), spin the wheel to zoom (scale), or use touch. Panning and zooming are widely used in web-based mapping, but can also be used with visualizations such as time-series and scatterplots.

The zoom behavior implemented by d3-zoom is a convenient but flexible abstraction for enabling pan-and-zoom on [selections](https://github.com/d3/d3-selection). It handles a surprising variety of [input events](#api-reference) and browser quirks. The zoom behavior is agnostic about the DOM, so you can use it with SVG, HTML or Canvas.

[<img alt="Canvas Zooming" src="https://raw.githubusercontent.com/d3/d3-zoom/master/img/dots.png" width="420" height="219">](https://observablehq.com/@d3/zoom-canvas)[<img alt="SVG Zooming" src="https://raw.githubusercontent.com/d3/d3-zoom/master/img/dots.png" width="420" height="219">](https://observablehq.com/@d3/zoom)

The zoom behavior is also designed to work with [d3-scale](https://github.com/d3/d3-scale) and [d3-axis](https://github.com/d3/d3-axis); see [*transform*.rescaleX](#transform_rescaleX) and [*transform*.rescaleY](#transform_rescaleY). You can also restrict zooming using [*zoom*.scaleExtent](#zoom_scaleExtent) and panning using [*zoom*.translateExtent](#zoom_translateExtent).

[<img alt="Axis Zooming" src="https://raw.githubusercontent.com/d3/d3-zoom/master/img/axis.png" width="420" height="219">](https://observablehq.com/@d3/zoomable-scatterplot)

The zoom behavior can be combined with other behaviors, such as [d3-drag](https://github.com/d3/d3-drag) for dragging, and [d3-brush](https://github.com/d3/d3-brush) for focus + context.

[<img alt="Drag & Zoom II" src="https://raw.githubusercontent.com/d3/d3-zoom/master/img/dots.png" width="420" height="219">](https://observablehq.com/@d3/drag-zoom)[<img alt="Brush & Zoom" src="https://raw.githubusercontent.com/d3/d3-zoom/master/img/brush.png" width="420" height="219">](https://observablehq.com/@d3/focus-context)

The zoom behavior can be controlled programmatically using [*zoom*.transform](#zoom_transform), allowing you to implement user interface controls which drive the display or to stage animated tours through your data. Smooth zoom transitions are based on [“Smooth and efficient zooming and panning”](http://www.win.tue.nl/~vanwijk/zoompan.pdf) by Jarke J. van Wijk and Wim A.A. Nuij.

[<img alt="Zoom Transitions" src="https://raw.githubusercontent.com/d3/d3-zoom/master/img/transition.png" width="420" height="219">](https://observablehq.com/@d3/programmatic-zoom)

See also [d3-tile](https://github.com/d3/d3-tile) for examples panning and zooming maps.

## Installing

If you use npm, `npm install d3-zoom`. You can also download the [latest release on GitHub](https://github.com/d3/d3-zoom/releases/latest). For vanilla HTML in modern browsers, import d3-zoom from Skypack:

```html
<script type="module">

import {zoom} from "https://cdn.skypack.dev/d3-zoom@3";

const handler = zoom();

</script>
```

For legacy environments, you can load d3-zoom’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-color@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-dispatch@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-ease@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-interpolate@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-selection@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-timer@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-transition@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-drag@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-zoom@3"></script>
<script>

const zoom = d3.zoom();

</script>
```

[Try d3-zoom in your browser.](https://observablehq.com/collection/@d3/d3-zoom)

## API Reference

This table describes how the zoom behavior interprets native events:

| Event        | Listening Element | Zoom Event  | Default Prevented? |
| ------------ | ----------------- | ----------- | ------------------ |
| mousedown⁵   | selection         | start       | no¹                |
| mousemove²   | window¹           | zoom        | yes                |
| mouseup²     | window¹           | end         | yes                |
| dragstart²   | window            | -           | yes                |
| selectstart² | window            | -           | yes                |
| click³       | window            | -           | yes                |
| dblclick     | selection         | *multiple*⁶ | yes                |
| wheel⁸       | selection         | zoom⁷       | yes                |
| touchstart   | selection         | *multiple*⁶ | no⁴                |
| touchmove    | selection         | zoom        | yes                |
| touchend     | selection         | end         | no⁴                |
| touchcancel  | selection         | end         | no⁴                |

The propagation of all consumed events is [immediately stopped](https://dom.spec.whatwg.org/#dom-event-stopimmediatepropagation).

¹ Necessary to capture events outside an iframe; see [d3-drag#9](https://github.com/d3/d3-drag/issues/9).
<br>² Only applies during an active, mouse-based gesture; see [d3-drag#9](https://github.com/d3/d3-drag/issues/9).
<br>³ Only applies immediately after some mouse-based gestures; see [*zoom*.clickDistance](#zoom_clickDistance).
<br>⁴ Necessary to allow [click emulation](https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW7) on touch input; see [d3-drag#9](https://github.com/d3/d3-drag/issues/9).
<br>⁵ Ignored if within 500ms of a touch gesture ending; assumes [click emulation](https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW7).
<br>⁶ Double-click and double-tap initiate a transition that emits start, zoom and end events; see [*zoom*.tapDistance](#zoom_tapDistance)..
<br>⁷ The first wheel event emits a start event; an end event is emitted when no wheel events are received for 150ms.
<br>⁸ Ignored if already at the corresponding limit of the [scale extent](#zoom_scaleExtent).

<a href="#zoom" name="zoom">#</a> d3.<b>zoom</b>() · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js), [Examples](https://observablehq.com/collection/@d3/d3-zoom)

Creates a new zoom behavior. The returned behavior, [*zoom*](#_drag), is both an object and a function, and is typically applied to selected elements via [*selection*.call](https://github.com/d3/d3-selection#selection_call).

<a href="#_zoom" name="_zoom">#</a> <i>zoom</i>(<i>selection</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js), [Examples](https://observablehq.com/collection/@d3/d3-zoom)

Applies this zoom behavior to the specified [*selection*](https://github.com/d3/d3-selection), binding the necessary event listeners to allow panning and zooming, and initializing the [zoom transform](#zoom-transforms) on each selected element to the identity transform if not already defined. This function is typically not invoked directly, and is instead invoked via [*selection*.call](https://github.com/d3/d3-selection#selection_call). For example, to instantiate a zoom behavior and apply it to a selection:

```js
selection.call(d3.zoom().on("zoom", zoomed));
```

Internally, the zoom behavior uses [*selection*.on](https://github.com/d3/d3-selection#selection_on) to bind the necessary event listeners for zooming. The listeners use the name `.zoom`, so you can subsequently unbind the zoom behavior as follows:

```js
selection.on(".zoom", null);
```

To disable just wheel-driven zooming (say to not interfere with native scrolling), you can remove the zoom behavior’s wheel event listener after applying the zoom behavior to the selection:

```js
selection
    .call(zoom)
    .on("wheel.zoom", null);
```

Alternatively, use [*zoom*.filter](#zoom_filter) for greater control over which events can initiate zoom gestures.

Applying the zoom behavior also sets the [-webkit-tap-highlight-color](https://developer.apple.com/library/mac/documentation/AppleApplications/Reference/SafariWebContent/AdjustingtheTextSize/AdjustingtheTextSize.html#//apple_ref/doc/uid/TP40006510-SW5) style to transparent, disabling the tap highlight on iOS. If you want a different tap highlight color, remove or re-apply this style after applying the drag behavior.

<a href="#zoom_transform" name="zoom_transform">#</a> <i>zoom</i>.<b>transform</b>(<i>selection</i>, <i>transform</i>[, <i>point</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js), [Examples](https://observablehq.com/collection/@d3/d3-zoom)

If *selection* is a selection, sets the [current zoom transform](#zoomTransform) of the selected elements to the specified *transform*, instantaneously emitting start, zoom and end [events](#zoom-events). If *selection* is a transition, defines a “zoom” tween to the specified *transform* using [d3.interpolateZoom](https://github.com/d3/d3-interpolate/blob/master/README.md#interpolateZoom), emitting a start event when the transition starts, zoom events for each tick of the transition, and then an end event when the transition ends (or is interrupted). The transition will attempt to minimize the visual movement around the specified *point*; if the *point* is not specified, it defaults to the center of the viewport [extent](#zoom_extent). The *transform* may be specified either as a [zoom transform](#zoom-transforms) or as a function that returns a zoom transform; similarly, the *point* may be specified either as a two-element array [*x*, *y*] or a function that returns such an array. If a function, it is invoked for each selected element, being passed the current event (`event`) and datum `d`, with the `this` context as the current DOM element.

This function is typically not invoked directly, and is instead invoked via [*selection*.call](https://github.com/d3/d3-selection#selection_call) or [*transition*.call](https://github.com/d3/d3-transition#transition_call). For example, to reset the zoom transform to the [identity transform](#zoomIdentity) instantaneously:

```js
selection.call(zoom.transform, d3.zoomIdentity);
```

To smoothly reset the zoom transform to the identity transform over 750 milliseconds:

```js
selection.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
```

This method requires that you specify the new zoom transform completely, and does not enforce the defined [scale extent](#zoom_scaleExtent) and [translate extent](#zoom_translateExtent), if any. To derive a new transform from the existing transform, and to enforce the scale and translate extents, see the convenience methods [*zoom*.translateBy](#zoom_translateBy), [*zoom*.scaleBy](#zoom_scaleBy) and [*zoom*.scaleTo](#zoom_scaleTo).

<a href="#zoom_translateBy" name="zoom_translateBy">#</a> <i>zoom</i>.<b>translateBy</b>(<i>selection</i>, <i>x</i>, <i>y</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *selection* is a selection, [translates](#transform_translate) the [current zoom transform](#zoomTransform) of the selected elements by *x* and *y*, such that the new *t<sub>x1</sub>* = *t<sub>x0</sub>* + *kx* and *t<sub>y1</sub>* = *t<sub>y0</sub>* + *ky*. If *selection* is a transition, defines a “zoom” tween translating the current transform. This method is a convenience method for [*zoom*.transform](#zoom_transform). The *x* and *y* translation amounts may be specified either as numbers or as functions that return numbers. If a function, it is invoked for each selected element, being passed the current datum `d` and index `i`, with the `this` context as the current DOM element.

<a href="#zoom_translateTo" name="zoom_translateTo">#</a> <i>zoom</i>.<b>translateTo</b>(<i>selection</i>, <i>x</i>, <i>y</i>[, <i>p</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *selection* is a selection, [translates](#transform_translate) the [current zoom transform](#zoomTransform) of the selected elements such that the given position ⟨*x*,*y*⟩ appears at given point *p*. The new *t<sub>x</sub>* = *p<sub>x</sub>* - *kx* and *t<sub>y</sub>* = *p<sub>y</sub>* - *ky*. If *p* is not specified, it defaults to the center of the viewport [extent](#zoom_extent). If *selection* is a transition, defines a “zoom” tween translating the current transform. This method is a convenience method for [*zoom*.transform](#zoom_transform). The *x* and *y* coordinates may be specified either as numbers or as functions that returns numbers; similarly the *p* point may be specified either as a two-element array [*p<sub>x</sub>*,*p<sub>y</sub>*] or a function. If a function, it is invoked for each selected element, being passed the current datum `d` and index `i`, with the `this` context as the current DOM element.

<a href="#zoom_scaleBy" name="zoom_scaleBy">#</a> <i>zoom</i>.<b>scaleBy</b>(<i>selection</i>, <i>k</i>[, <i>p</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *selection* is a selection, [scales](#transform_scale) the [current zoom transform](#zoomTransform) of the selected elements by *k*, such that the new *k₁* = *k₀k*. The reference point *p* does move. If *p* is not specified, it defaults to the center of the viewport [extent](#zoom_extent). If *selection* is a transition, defines a “zoom” tween translating the current transform. This method is a convenience method for [*zoom*.transform](#zoom_transform). The *k* scale factor may be specified either as a number or a function that returns a number; similarly the *p* point may be specified either as a two-element array [*p<sub>x</sub>*,*p<sub>y</sub>*] or a function. If a function, it is invoked for each selected element, being passed the current datum `d` and index `i`, with the `this` context as the current DOM element.

<a href="#zoom_scaleTo" name="zoom_scaleTo">#</a> <i>zoom</i>.<b>scaleTo</b>(<i>selection</i>, <i>k</i>[, <i>p</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *selection* is a selection, [scales](#transform_scale) the [current zoom transform](#zoomTransform) of the selected elements to *k*, such that the new *k₁* = *k*. The reference point *p* does move. If *p* is not specified, it defaults to the center of the viewport [extent](#zoom_extent). If *selection* is a transition, defines a “zoom” tween translating the current transform. This method is a convenience method for [*zoom*.transform](#zoom_transform). The *k* scale factor may be specified either as a number or a function that returns a number; similarly the *p* point may be specified either as a two-element array [*p<sub>x</sub>*,*p<sub>y</sub>*] or a function. If a function, it is invoked for each selected element, being passed the current datum `d` and index `i`, with the `this` context as the current DOM element.

<a href="#zoom_constrain" name="zoom_constrain">#</a> <i>zoom</i>.<b>constrain</b>([<i>constrain</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *constrain* is specified, sets the transform constraint function to the specified function and returns the zoom behavior. If *constrain* is not specified, returns the current constraint function, which defaults to:

```js
function constrain(transform, extent, translateExtent) {
  var dx0 = transform.invertX(extent[0][0]) - translateExtent[0][0],
      dx1 = transform.invertX(extent[1][0]) - translateExtent[1][0],
      dy0 = transform.invertY(extent[0][1]) - translateExtent[0][1],
      dy1 = transform.invertY(extent[1][1]) - translateExtent[1][1];
  return transform.translate(
    dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
    dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
  );
}
```

The constraint function must return a [*transform*](#zoom-transforms) given the current *transform*, [viewport extent](#zoom_extent) and [translate extent](#zoom_translateExtent). The default implementation attempts to ensure that the viewport extent does not go outside the translate extent.

<a href="#zoom_filter" name="zoom_filter">#</a> <i>zoom</i>.<b>filter</b>([<i>filter</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *filter* is specified, sets the filter to the specified function and returns the zoom behavior. If *filter* is not specified, returns the current filter, which defaults to:

```js
function filter(event) {
  return (!event.ctrlKey || event.type === 'wheel') && !event.button;
}
```

The filter is passed the current event (`event`) and datum `d`, with the `this` context as the current DOM element. If the filter returns falsey, the initiating event is ignored and no zoom gestures are started. Thus, the filter determines which input events are ignored. The default filter ignores mousedown events on secondary buttons, since those buttons are typically intended for other purposes, such as the context menu.

<a href="#zoom_touchable" name="zoom_touchable">#</a> <i>zoom</i>.<b>touchable</b>([<i>touchable</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *touchable* is specified, sets the touch support detector to the specified function and returns the zoom behavior. If *touchable* is not specified, returns the current touch support detector, which defaults to:

```js
function touchable() {
  return navigator.maxTouchPoints || ("ontouchstart" in this);
}
```

Touch event listeners are only registered if the detector returns truthy for the corresponding element when the zoom behavior is [applied](#_zoom). The default detector works well for most browsers that are capable of touch input, but not all; Chrome’s mobile device emulator, for example, fails detection.

<a href="#zoom_wheelDelta" name="zoom_wheelDelta">#</a> <i>zoom</i>.<b>wheelDelta</b>([<i>delta</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *delta* is specified, sets the wheel delta function to the specified function and returns the zoom behavior. If *delta* is not specified, returns the current wheel delta function, which defaults to:

```js
function wheelDelta(event) {
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002);
}
```

The value *Δ* returned by the wheel delta function determines the amount of scaling applied in response to a [WheelEvent](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent). The scale factor [*transform*.k](#zoomTransform) is multiplied by 2<sup>*Δ*</sup>; for example, a *Δ* of +1 doubles the scale factor, *Δ* of -1 halves the scale factor.

<a href="#zoom_extent" name="zoom_extent">#</a> <i>zoom</i>.<b>extent</b>([<i>extent</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *extent* is specified, sets the viewport extent to the specified array of points [[*x0*, *y0*], [*x1*, *y1*]], where [*x0*, *y0*] is the top-left corner of the viewport and [*x1*, *y1*] is the bottom-right corner of the viewport, and returns this zoom behavior. The *extent* may also be specified as a function which returns such an array; if a function, it is invoked for each selected element, being passed the current datum `d`, with the `this` context as the current DOM element.

If *extent* is not specified, returns the current extent accessor, which defaults to [[0, 0], [*width*, *height*]] where *width* is the [client width](https://developer.mozilla.org/en-US/docs/Web/API/Element/clientWidth) of the element and *height* is its [client height](https://developer.mozilla.org/en-US/docs/Web/API/Element/clientHeight); for SVG elements, the nearest ancestor SVG element’s viewBox, or [width](https://www.w3.org/TR/SVG/struct.html#SVGElementWidthAttribute) and [height](https://www.w3.org/TR/SVG/struct.html#SVGElementHeightAttribute) attributes, are used. Alternatively, consider using [*element*.getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect).

The viewport extent affects several functions: the center of the viewport remains fixed during changes by [*zoom*.scaleBy](#zoom_scaleBy) and [*zoom*.scaleTo](#zoom_scaleTo); the viewport center and dimensions affect the path chosen by [d3.interpolateZoom](https://github.com/d3/d3-interpolate#interpolateZoom); and the viewport extent is needed to enforce the optional [translate extent](#zoom_translateExtent).

<a href="#zoom_scaleExtent" name="zoom_scaleExtent">#</a> <i>zoom</i>.<b>scaleExtent</b>([<i>extent</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *extent* is specified, sets the scale extent to the specified array of numbers [*k0*, *k1*] where *k0* is the minimum allowed scale factor and *k1* is the maximum allowed scale factor, and returns this zoom behavior. If *extent* is not specified, returns the current scale extent, which defaults to [0, ∞]. The scale extent restricts zooming in and out. It is enforced on interaction and when using [*zoom*.scaleBy](#zoom_scaleBy), [*zoom*.scaleTo](#zoom_scaleTo) and [*zoom*.translateBy](#zoom_translateBy); however, it is not enforced when using [*zoom*.transform](#zoom_transform) to set the transform explicitly.

If the user tries to zoom by wheeling when already at the corresponding limit of the scale extent, the wheel events will be ignored and not initiate a zoom gesture. This allows the user to scroll down past a zoomable area after zooming in, or to scroll up after zooming out. If you would prefer to always prevent scrolling on wheel input regardless of the scale extent, register a wheel event listener to prevent the browser default behavior:

```js
selection
    .call(zoom)
    .on("wheel", event => event.preventDefault());
```

<a href="#zoom_translateExtent" name="zoom_translateExtent">#</a> <i>zoom</i>.<b>translateExtent</b>([<i>extent</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *extent* is specified, sets the translate extent to the specified array of points [[*x0*, *y0*], [*x1*, *y1*]], where [*x0*, *y0*] is the top-left corner of the world and [*x1*, *y1*] is the bottom-right corner of the world, and returns this zoom behavior. If *extent* is not specified, returns the current translate extent, which defaults to [[-∞, -∞], [+∞, +∞]]. The translate extent restricts panning, and may cause translation on zoom out. It is enforced on interaction and when using [*zoom*.scaleBy](#zoom_scaleBy), [*zoom*.scaleTo](#zoom_scaleTo) and [*zoom*.translateBy](#zoom_translateBy); however, it is not enforced when using [*zoom*.transform](#zoom_transform) to set the transform explicitly.

<a href="#zoom_clickDistance" name="zoom_clickDistance">#</a> <i>zoom</i>.<b>clickDistance</b>([<i>distance</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *distance* is specified, sets the maximum distance that the mouse can move between mousedown and mouseup that will trigger a subsequent click event. If at any point between mousedown and mouseup the mouse is greater than or equal to *distance* from its position on mousedown, the click event following mouseup will be suppressed. If *distance* is not specified, returns the current distance threshold, which defaults to zero. The distance threshold is measured in client coordinates ([*event*.clientX](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX) and [*event*.clientY](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientY)).

<a href="#zoom_tapDistance" name="zoom_tapDistance">#</a> <i>zoom</i>.<b>tapDistance</b>([<i>distance</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *distance* is specified, sets the maximum distance that a double-tap gesture can move between first touchstart and second touchend that will trigger a subsequent double-click event. If *distance* is not specified, returns the current distance threshold, which defaults to 10. The distance threshold is measured in client coordinates ([*event*.clientX](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientX) and [*event*.clientY](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/clientY)).

<a href="#zoom_duration" name="zoom_duration">#</a> <i>zoom</i>.<b>duration</b>([<i>duration</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *duration* is specified, sets the duration for zoom transitions on double-click and double-tap to the specified number of milliseconds and returns the zoom behavior. If *duration* is not specified, returns the current duration, which defaults to 250 milliseconds. If the duration is not greater than zero, double-click and -tap trigger instantaneous changes to the zoom transform rather than initiating smooth transitions.

To disable double-click and double-tap transitions, you can remove the zoom behavior’s dblclick event listener after applying the zoom behavior to the selection:

```js
selection
    .call(zoom)
    .on("dblclick.zoom", null);
```

<a href="#zoom_interpolate" name="zoom_interpolate">#</a> <i>zoom</i>.<b>interpolate</b>([<i>interpolate</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *interpolate* is specified, sets the interpolation factory for zoom transitions to the specified function. If *interpolate* is not specified, returns the current interpolation factory, which defaults to [d3.interpolateZoom](https://github.com/d3/d3-interpolate#interpolateZoom) to implement smooth zooming. To apply direct interpolation between two views, try [d3.interpolate](https://github.com/d3/d3-interpolate#interpolate) instead.

<a href="#zoom_on" name="zoom_on">#</a> <i>zoom</i>.<b>on</b>(<i>typenames</i>[, <i>listener</i>]) · [Source](https://github.com/d3/d3-zoom/blob/master/src/zoom.js)

If *listener* is specified, sets the event *listener* for the specified *typenames* and returns the zoom behavior. If an event listener was already registered for the same type and name, the existing listener is removed before the new listener is added. If *listener* is null, removes the current event listeners for the specified *typenames*, if any. If *listener* is not specified, returns the first currently-assigned listener matching the specified *typenames*, if any. When a specified event is dispatched, each *listener* will be invoked with the same context and arguments as [*selection*.on](https://github.com/d3/d3-selection#selection_on) listeners: the current event (`event`) and datum `d`, with the `this` context as the current DOM element.

The *typenames* is a string containing one or more *typename* separated by whitespace. Each *typename* is a *type*, optionally followed by a period (`.`) and a *name*, such as `zoom.foo` and `zoom.bar`; the name allows multiple listeners to be registered for the same *type*. The *type* must be one of the following:

* `start` - after zooming begins (such as on mousedown).
* `zoom` - after a change to the zoom transform (such as on mousemove).
* `end` - after zooming ends (such as on mouseup ).

See [*dispatch*.on](https://github.com/d3/d3-dispatch#dispatch_on) for more.

### Zoom Events

When a [zoom event listener](#zoom_on) is invoked, it receives the current zoom event as a first argument. The *event* object exposes several fields:

* *event*.target - the associated [zoom behavior](#zoom).
* *event*.type - the string “start”, “zoom” or “end”; see [*zoom*.on](#zoom_on).
* *event*.transform - the current [zoom transform](#zoom-transforms).
* *event*.sourceEvent - the underlying input event, such as mousemove or touchmove.

### Zoom Transforms

The zoom behavior stores the zoom state on the element to which the zoom behavior was [applied](#_zoom), not on the zoom behavior itself. This is because the zoom behavior can be applied to many elements simultaneously, and each element can be zoomed independently. The zoom state can change either on user interaction or programmatically via [*zoom*.transform](#zoom_transform).

To retrieve the zoom state, use *event*.transform on the current [zoom event](#zoom-events) within a zoom event listener (see [*zoom*.on](#zoom_on)), or use [d3.zoomTransform](#zoomTransform) for a given node. The latter is particularly useful for modifying the zoom state programmatically, say to implement buttons for zooming in and out.

<a href="#zoomTransform" name="zoomTransform">#</a> d3.<b>zoomTransform</b>(<i>node</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns the current transform for the specified *node*. Note that *node* should typically be a DOM element, not a *selection*. (A selection may consist of multiple nodes, in different states, and this function only returns a single transform.) If you have a selection, call [*selection*.node](https://github.com/d3/d3-selection#selection_node) first:

```js
var transform = d3.zoomTransform(selection.node());
```

In the context of an [event listener](https://github.com/d3/d3-selection#selection_on), the *node* is typically the element that received the input event (which should be equal to [*event*.transform](#zoom-events)), *this*:

```js
var transform = d3.zoomTransform(this);
```

Internally, an element’s transform is stored as *element*.\_\_zoom; however, you should use this method rather than accessing it directly. If the given *node* has no defined transform, returns the transform of the closest ancestor, or if none exists, the [identity transformation](#zoomIdentity). The returned transform represents a two-dimensional [transformation matrix](https://en.wikipedia.org/wiki/Transformation_matrix#Affine_transformations) of the form:

*k* 0 *t<sub>x</sub>*
<br>0 *k* *t<sub>y</sub>*
<br>0 0 1

(This matrix is capable of representing only scale and translation; a future release may also allow rotation, though this would probably not be a backwards-compatible change.) The position ⟨*x*,*y*⟩ is transformed to ⟨*xk* + *t<sub>x</sub>*,*yk* + *t<sub>y</sub>*⟩. The transform object exposes the following properties:

* *transform*.x - the translation amount *t<sub>x</sub>* along the *x*-axis.
* *transform*.y - the translation amount *t<sub>y</sub>* along the *y*-axis.
* *transform*.k - the scale factor *k*.

These properties should be considered read-only; instead of mutating a transform, use [*transform*.scale](#transform_scale) and [*transform*.translate](#transform_translate) to derive a new transform. Also see [*zoom*.scaleBy](#zoom_scaleBy), [*zoom*.scaleTo](#zoom_scaleTo) and [*zoom*.translateBy](#zoom_translateBy) for convenience methods on the zoom behavior. To create a transform with a given *k*, *t<sub>x</sub>*, and *t<sub>y</sub>*:

```js
var t = d3.zoomIdentity.translate(x, y).scale(k);
```

To apply the transformation to a [Canvas 2D context](https://www.w3.org/TR/2dcontext/), use [*context*.translate](https://www.w3.org/TR/2dcontext/#dom-context-2d-translate) followed by [*context*.scale](https://www.w3.org/TR/2dcontext/#dom-context-2d-scale):

```js
context.translate(transform.x, transform.y);
context.scale(transform.k, transform.k);
```

Similarly, to apply the transformation to HTML elements via [CSS](https://www.w3.org/TR/css-transforms-1/):

```js
div.style("transform", "translate(" + transform.x + "px," + transform.y + "px) scale(" + transform.k + ")");
div.style("transform-origin", "0 0");
```

To apply the transformation to [SVG](https://www.w3.org/TR/SVG/coords.html#TransformAttribute):

```js
g.attr("transform", "translate(" + transform.x + "," + transform.y + ") scale(" + transform.k + ")");
```

Or more simply, taking advantage of [*transform*.toString](#transform_toString):

```js
g.attr("transform", transform);
```

Note that the order of transformations matters! The translate must be applied before the scale.

<a href="#transform_scale" name="transform_scale">#</a> <i>transform</i>.<b>scale</b>(<i>k</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns a transform whose scale *k₁* is equal to *k₀k*, where *k₀* is this transform’s scale.

<a href="#transform_translate" name="transform_translate">#</a> <i>transform</i>.<b>translate</b>(<i>x</i>, <i>y</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns a transform whose translation *t<sub>x1</sub>* and *t<sub>y1</sub>* is equal to *t<sub>x0</sub>* + *t<sub>k</sub> x* and *t<sub>y0</sub>* + *t<sub>k</sub> y*, where *t<sub>x0</sub>* and *t<sub>y0</sub>* is this transform’s translation and *t<sub>k</sub>* is this transform’s scale.

<a href="#transform_apply" name="transform_apply">#</a> <i>transform</i>.<b>apply</b>(<i>point</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns the transformation of the specified *point* which is a two-element array of numbers [*x*, *y*]. The returned point is equal to [*xk* + *t<sub>x</sub>*, *yk* + *t<sub>y</sub>*].

<a href="#transform_applyX" name="transform_applyX">#</a> <i>transform</i>.<b>applyX</b>(<i>x</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns the transformation of the specified *x*-coordinate, *xk* + *t<sub>x</sub>*.

<a href="#transform_applyY" name="transform_applyY">#</a> <i>transform</i>.<b>applyY</b>(<i>y</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns the transformation of the specified *y*-coordinate, *yk* + *t<sub>y</sub>*.

<a href="#transform_invert" name="transform_invert">#</a> <i>transform</i>.<b>invert</b>(<i>point</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns the inverse transformation of the specified *point* which is a two-element array of numbers [*x*, *y*]. The returned point is equal to [(*x* - *t<sub>x</sub>*) / *k*, (*y* - *t<sub>y</sub>*) / *k*].

<a href="#transform_invertX" name="transform_invertX">#</a> <i>transform</i>.<b>invertX</b>(<i>x</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns the inverse transformation of the specified *x*-coordinate, (*x* - *t<sub>x</sub>*) / *k*.

<a href="#transform_invertY" name="transform_invertY">#</a> <i>transform</i>.<b>invertY</b>(<i>y</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns the inverse transformation of the specified *y*-coordinate, (*y* - *t<sub>y</sub>*) / *k*.

<a href="#transform_rescaleX" name="transform_rescaleX">#</a> <i>transform</i>.<b>rescaleX</b>(<i>x</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns a [copy](https://github.com/d3/d3-scale#continuous_copy) of the [continuous scale](https://github.com/d3/d3-scale#continuous-scales) *x* whose [domain](https://github.com/d3/d3-scale#continuous_domain) is transformed. This is implemented by first applying the [inverse *x*-transform](#transform_invertX) on the scale’s [range](https://github.com/d3/d3-scale#continuous_range), and then applying the [inverse scale](https://github.com/d3/d3-scale#continuous_invert) to compute the corresponding domain:

```js
function rescaleX(x) {
  var range = x.range().map(transform.invertX, transform),
      domain = range.map(x.invert, x);
  return x.copy().domain(domain);
}
```

The scale *x* must use [d3.interpolateNumber](https://github.com/d3/d3-interpolate#interpolateNumber); do not use [*continuous*.rangeRound](https://github.com/d3/d3-scale#continuous_rangeRound) as this reduces the accuracy of [*continuous*.invert](https://github.com/d3/d3-scale#continuous_invert) and can lead to an inaccurate rescaled domain. This method does not modify the input scale *x*; *x* thus represents the untransformed scale, while the returned scale represents its transformed view.

<a href="#transform_rescaleY" name="transform_rescaleY">#</a> <i>transform</i>.<b>rescaleY</b>(<i>y</i>) · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns a [copy](https://github.com/d3/d3-scale#continuous_copy) of the [continuous scale](https://github.com/d3/d3-scale#continuous-scales) *y* whose [domain](https://github.com/d3/d3-scale#continuous_domain) is transformed. This is implemented by first applying the [inverse *y*-transform](#transform_invertY) on the scale’s [range](https://github.com/d3/d3-scale#continuous_range), and then applying the [inverse scale](https://github.com/d3/d3-scale#continuous_invert) to compute the corresponding domain:

```js
function rescaleY(y) {
  var range = y.range().map(transform.invertY, transform),
      domain = range.map(y.invert, y);
  return y.copy().domain(domain);
}
```

The scale *y* must use [d3.interpolateNumber](https://github.com/d3/d3-interpolate#interpolateNumber); do not use [*continuous*.rangeRound](https://github.com/d3/d3-scale#continuous_rangeRound) as this reduces the accuracy of [*continuous*.invert](https://github.com/d3/d3-scale#continuous_invert) and can lead to an inaccurate rescaled domain. This method does not modify the input scale *y*; *y* thus represents the untransformed scale, while the returned scale represents its transformed view.

<a href="#transform_toString" name="transform_toString">#</a> <i>transform</i>.<b>toString</b>() · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

Returns a string representing the [SVG transform](https://www.w3.org/TR/SVG/coords.html#TransformAttribute) corresponding to this transform. Implemented as:

```js
function toString() {
  return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
}
```

<a href="#zoomIdentity" name="zoomIdentity">#</a> d3.<b>zoomIdentity</b> · [Source](https://github.com/d3/d3-zoom/blob/master/src/transform.js)

The identity transform, where *k* = 1, *t<sub>x</sub>* = *t<sub>y</sub>* = 0.
