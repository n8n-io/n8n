# d3-color

Even though your browser understands a lot about colors, it doesn’t offer much help in manipulating colors through JavaScript. The d3-color module therefore provides representations for various color spaces, allowing specification, conversion and manipulation. (Also see [d3-interpolate](https://github.com/d3/d3-interpolate) for color interpolation.)

For example, take the color named “steelblue”:

```js
const c = d3.color("steelblue"); // {r: 70, g: 130, b: 180, opacity: 1}
```

Let’s try converting it to HSL:

```js
const c = d3.hsl("steelblue"); // {h: 207.27…, s: 0.44, l: 0.4902…, opacity: 1}
```

Now rotate the hue by 90°, bump up the saturation, and format as a string for CSS:

```js
c.h += 90;
c.s += 0.2;
c + ""; // rgb(198, 45, 205)
```

To fade the color slightly:

```js
c.opacity = 0.8;
c + ""; // rgba(198, 45, 205, 0.8)
```

In addition to the ubiquitous and machine-friendly [RGB](#rgb) and [HSL](#hsl) color space, d3-color supports color spaces that are designed for humans:

* [CIELAB](#lab) (*a.k.a.* “Lab”)
* [CIELCh<sub>ab</sub>](#lch) (*a.k.a.* “LCh” or “HCL”)
* Dave Green’s [Cubehelix](#cubehelix)

Cubehelix features monotonic lightness, while CIELAB and its polar form CIELCh<sub>ab</sub> are perceptually uniform.

## Extensions

For additional color spaces, see:

* [d3-cam16](https://github.com/d3/d3-cam16)
* [d3-cam02](https://github.com/connorgr/d3-cam02)
* [d3-hsv](https://github.com/d3/d3-hsv)
* [d3-hcg](https://github.com/d3/d3-hcg)
* [d3-hsluv](https://github.com/petulla/d3-hsluv)

To measure color differences, see:

* [d3-color-difference](https://github.com/Evercoder/d3-color-difference)

## Installing

If you use npm, `npm install d3-color`. You can also download the [latest release on GitHub](https://github.com/d3/d3-color/releases/latest). For vanilla HTML in modern browsers, import d3-color from Skypack:

```html
<script type="module">

import {rgb} from "https://cdn.skypack.dev/d3-color@3";

const steelblue = d3.rgb("steelblue");

</script>
```

For legacy environments, you can load d3-color’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-color@3"></script>
<script>

const steelblue = d3.rgb("steelblue");

</script>
```

[Try d3-color in your browser.](https://observablehq.com/collection/@d3/d3-color)

## API Reference

<a name="color" href="#color">#</a> d3.<b>color</b>(<i>specifier</i>) [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Parses the specified [CSS Color Module Level 3](http://www.w3.org/TR/css3-color/#colorunits) *specifier* string, returning an [RGB](#rgb) or [HSL](#hsl) color, along with [CSS Color Module Level 4 hex](https://www.w3.org/TR/css-color-4/#hex-notation) *specifier* strings. If the specifier was not valid, null is returned. Some examples:

* `rgb(255, 255, 255)`
* `rgb(10%, 20%, 30%)`
* `rgba(255, 255, 255, 0.4)`
* `rgba(10%, 20%, 30%, 0.4)`
* `hsl(120, 50%, 20%)`
* `hsla(120, 50%, 20%, 0.4)`
* `#ffeeaa`
* `#fea`
* `#ffeeaa22`
* `#fea2`
* `steelblue`

The list of supported [named colors](http://www.w3.org/TR/SVG/types.html#ColorKeywords) is specified by CSS.

Note: this function may also be used with `instanceof` to test if an object is a color instance. The same is true of color subclasses, allowing you to test whether a color is in a particular color space.

<a name="color_opacity" href="#color_opacity">#</a> *color*.<b>opacity</b>

This color’s opacity, typically in the range [0, 1].

<a name="color_rgb" href="#color_rgb">#</a> *color*.<b>rgb</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns the [RGB equivalent](#rgb) of this color. For RGB colors, that’s `this`.

<a name="color_copy" href="#color_copy">#</a> <i>color</i>.<b>copy</b>([<i>values</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a copy of this color. If *values* is specified, any enumerable own properties of *values* are assigned to the new returned color. For example, to derive a copy of a *color* with opacity 0.5, say

```js
color.copy({opacity: 0.5})
```

<a name="color_brighter" href="#color_brighter">#</a> *color*.<b>brighter</b>([<i>k</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a brighter copy of this color. If *k* is specified, it controls how much brighter the returned color should be. If *k* is not specified, it defaults to 1. The behavior of this method is dependent on the implementing color space.

<a name="color_darker" href="#color_darker">#</a> *color*.<b>darker</b>([<i>k</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a darker copy of this color. If *k* is specified, it controls how much darker the returned color should be. If *k* is not specified, it defaults to 1. The behavior of this method is dependent on the implementing color space.

<a name="color_displayable" href="#color_displayable">#</a> *color*.<b>displayable</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns true if and only if the color is displayable on standard hardware. For example, this returns false for an RGB color if any channel value is less than zero or greater than 255 when rounded, or if the opacity is not in the range [0, 1].

<a name="color_formatHex" href="#color_formatHex">#</a> *color*.<b>formatHex</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a hexadecimal string representing this color in RGB space, such as `#f7eaba`. If this color is not displayable, a suitable displayable color is returned instead. For example, RGB channel values greater than 255 are clamped to 255.

<a name="color_formatHsl" href="#color_formatHsl">#</a> *color*.<b>formatHsl</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a string representing this color according to the [CSS Color Module Level 3 specification](https://www.w3.org/TR/css-color-3/#hsl-color), such as `hsl(257, 50%, 80%)` or `hsla(257, 50%, 80%, 0.2)`. If this color is not displayable, a suitable displayable color is returned instead by clamping S and L channel values to the interval [0, 100].

<a name="color_formatRgb" href="#color_formatRgb">#</a> *color*.<b>formatRgb</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a string representing this color according to the [CSS Object Model specification](https://drafts.csswg.org/cssom/#serialize-a-css-component-value), such as `rgb(247, 234, 186)` or `rgba(247, 234, 186, 0.2)`. If this color is not displayable, a suitable displayable color is returned instead by clamping RGB channel values to the interval [0, 255].

<a name="color_toString" href="#color_toString">#</a> *color*.<b>toString</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

An alias for [*color*.formatRgb](#color_formatRgb).

<a name="rgb" href="#rgb">#</a> d3.<b>rgb</b>(<i>r</i>, <i>g</i>, <i>b</i>[, <i>opacity</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")<br>
<a href="#rgb">#</a> d3.<b>rgb</b>(<i>specifier</i>)<br>
<a href="#rgb">#</a> d3.<b>rgb</b>(<i>color</i>)<br>

Constructs a new [RGB](https://en.wikipedia.org/wiki/RGB_color_model) color. The channel values are exposed as `r`, `g` and `b` properties on the returned instance. Use the [RGB color picker](http://bl.ocks.org/mbostock/78d64ca7ef013b4dcf8f) to explore this color space.

If *r*, *g* and *b* are specified, these represent the channel values of the returned color; an *opacity* may also be specified. If a CSS Color Module Level 3 *specifier* string is specified, it is parsed and then converted to the RGB color space. See [color](#color) for examples. If a [*color*](#color) instance is specified, it is converted to the RGB color space using [*color*.rgb](#color_rgb). Note that unlike [*color*.rgb](#color_rgb) this method *always* returns a new instance, even if *color* is already an RGB color.

<a name="rgb_clamp" href="#rgb_clamp">#</a> *rgb*.<b>clamp</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a new RGB color where the `r`, `g`, and `b` channels are clamped to the range [0, 255] and rounded to the nearest integer value, and the `opacity` is clamped to the range [0, 1].

<a name="hsl" href="#hsl">#</a> d3.<b>hsl</b>(<i>h</i>, <i>s</i>, <i>l</i>[, <i>opacity</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")<br>
<a href="#hsl">#</a> d3.<b>hsl</b>(<i>specifier</i>)<br>
<a href="#hsl">#</a> d3.<b>hsl</b>(<i>color</i>)<br>

Constructs a new [HSL](https://en.wikipedia.org/wiki/HSL_and_HSV) color. The channel values are exposed as `h`, `s` and `l` properties on the returned instance. Use the [HSL color picker](http://bl.ocks.org/mbostock/debaad4fcce9bcee14cf) to explore this color space.

If *h*, *s* and *l* are specified, these represent the channel values of the returned color; an *opacity* may also be specified. If a CSS Color Module Level 3 *specifier* string is specified, it is parsed and then converted to the HSL color space. See [color](#color) for examples. If a [*color*](#color) instance is specified, it is converted to the RGB color space using [*color*.rgb](#color_rgb) and then converted to HSL. (Colors already in the HSL color space skip the conversion to RGB.)

<a name="hsl_clamp" href="#hsl_clamp">#</a> *hsl*.<b>clamp</b>() [<>](https://github.com/d3/d3-color/blob/master/src/color.js "Source")

Returns a new HSL color where the `h` channel is clamped to the range [0, 360), and the `s`, `l`, and `opacity` channels are clamped to the range [0, 1].

<a name="lab" href="#lab">#</a> d3.<b>lab</b>(<i>l</i>, <i>a</i>, <i>b</i>[, <i>opacity</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/lab.js "Source")<br>
<a href="#lab">#</a> d3.<b>lab</b>(<i>specifier</i>)<br>
<a href="#lab">#</a> d3.<b>lab</b>(<i>color</i>)<br>

Constructs a new [CIELAB](https://en.wikipedia.org/wiki/Lab_color_space#CIELAB) color. The channel values are exposed as `l`, `a` and `b` properties on the returned instance. Use the [CIELAB color picker](http://bl.ocks.org/mbostock/9f37cc207c0cb166921b) to explore this color space. The value of *l* is typically in the range [0, 100], while *a* and *b* are typically in [-160, +160].

If *l*, *a* and *b* are specified, these represent the channel values of the returned color; an *opacity* may also be specified. If a CSS Color Module Level 3 *specifier* string is specified, it is parsed and then converted to the CIELAB color space. See [color](#color) for examples. If a [*color*](#color) instance is specified, it is converted to the RGB color space using [*color*.rgb](#color_rgb) and then converted to CIELAB. (Colors already in the CIELAB color space skip the conversion to RGB, and colors in the HCL color space are converted directly to CIELAB.)

<a name="gray" href="#gray">#</a> d3.<b>gray</b>(<i>l</i>[, <i>opacity</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/lab.js "Source")<br>

Constructs a new [CIELAB](#lab) color with the specified *l* value and *a* = *b* = 0.

<a name="hcl" href="#hcl">#</a> d3.<b>hcl</b>(<i>h</i>, <i>c</i>, <i>l</i>[, <i>opacity</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/lab.js "Source")<br>
<a href="#hcl">#</a> d3.<b>hcl</b>(<i>specifier</i>)<br>
<a href="#hcl">#</a> d3.<b>hcl</b>(<i>color</i>)<br>

Equivalent to [d3.lch](#lch), but with reversed argument order.

<a name="lch" href="#lch">#</a> d3.<b>lch</b>(<i>l</i>, <i>c</i>, <i>h</i>[, <i>opacity</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/lab.js "Source")<br>
<a href="#lch">#</a> d3.<b>lch</b>(<i>specifier</i>)<br>
<a href="#lch">#</a> d3.<b>lch</b>(<i>color</i>)<br>

Constructs a new [CIELCh<sub>ab</sub>](https://en.wikipedia.org/wiki/CIELAB_color_space#Cylindrical_representation:_CIELCh_or_CIEHLC) color. The channel values are exposed as `l`, `c` and `h` properties on the returned instance. Use the [CIELCh<sub>ab</sub> color picker](http://bl.ocks.org/mbostock/3e115519a1b495e0bd95) to explore this color space. The value of *l* is typically in the range [0, 100], *c* is typically in [0, 230], and *h* is typically in [0, 360).

If *l*, *c*, and *h* are specified, these represent the channel values of the returned color; an *opacity* may also be specified. If a CSS Color Module Level 3 *specifier* string is specified, it is parsed and then converted to CIELCh<sub>ab</sub> color space. See [color](#color) for examples. If a [*color*](#color) instance is specified, it is converted to the RGB color space using [*color*.rgb](#color_rgb) and then converted to CIELCh<sub>ab</sub>. (Colors already in CIELCh<sub>ab</sub> color space skip the conversion to RGB, and colors in CIELAB color space are converted directly to CIELCh<sub>ab</sub>.)

<a name="cubehelix" href="#cubehelix">#</a> d3.<b>cubehelix</b>(<i>h</i>, <i>s</i>, <i>l</i>[, <i>opacity</i>]) [<>](https://github.com/d3/d3-color/blob/master/src/cubehelix.js "Source")<br>
<a href="#cubehelix">#</a> d3.<b>cubehelix</b>(<i>specifier</i>)<br>
<a href="#cubehelix">#</a> d3.<b>cubehelix</b>(<i>color</i>)<br>

Constructs a new [Cubehelix](http://www.mrao.cam.ac.uk/~dag/CUBEHELIX/) color. The channel values are exposed as `h`, `s` and `l` properties on the returned instance. Use the [Cubehelix color picker](http://bl.ocks.org/mbostock/ba8d75e45794c27168b5) to explore this color space.

If *h*, *s* and *l* are specified, these represent the channel values of the returned color; an *opacity* may also be specified. If a CSS Color Module Level 3 *specifier* string is specified, it is parsed and then converted to the Cubehelix color space. See [color](#color) for examples. If a [*color*](#color) instance is specified, it is converted to the RGB color space using [*color*.rgb](#color_rgb) and then converted to Cubehelix. (Colors already in the Cubehelix color space skip the conversion to RGB.)
