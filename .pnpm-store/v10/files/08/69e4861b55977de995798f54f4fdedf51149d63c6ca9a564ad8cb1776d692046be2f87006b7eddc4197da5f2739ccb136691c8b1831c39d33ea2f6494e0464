# d3-interpolate

This module provides a variety of interpolation methods for blending between two values. Values may be numbers, colors, strings, arrays, or even deeply-nested objects. For example:

```js
const i = d3.interpolateNumber(10, 20);
i(0.0); // 10
i(0.2); // 12
i(0.5); // 15
i(1.0); // 20
```

The returned function `i` is called an *interpolator*. Given a starting value *a* and an ending value *b*, it takes a parameter *t* in the domain [0, 1] and returns the corresponding interpolated value between *a* and *b*. An interpolator typically returns a value equivalent to *a* at *t* = 0 and a value equivalent to *b* at *t* = 1.

You can interpolate more than just numbers. To find the perceptual midpoint between steelblue and brown:

```js
d3.interpolateLab("steelblue", "brown")(0.5); // "rgb(142, 92, 109)"
```

Here’s a more elaborate example demonstrating type inference used by [interpolate](#interpolate):

```js
const i = d3.interpolate({colors: ["red", "blue"]}, {colors: ["white", "black"]});
i(0.0); // {colors: ["rgb(255, 0, 0)", "rgb(0, 0, 255)"]}
i(0.5); // {colors: ["rgb(255, 128, 128)", "rgb(0, 0, 128)"]}
i(1.0); // {colors: ["rgb(255, 255, 255)", "rgb(0, 0, 0)"]}
```

Note that the generic value interpolator detects not only nested objects and arrays, but also color strings and numbers embedded in strings!

## Installing

If you use npm, `npm install d3-interpolate`. You can also download the [latest release on GitHub](https://github.com/d3/d3-interpolate/releases/latest). For vanilla HTML in modern browsers, import d3-interpolate from Skypack:

```html
<script type="module">

import {interpolateRgb} from "https://cdn.skypack.dev/d3-interpolate@3";

const interpolate = interpolateRgb("steelblue", "brown");

</script>
```

For legacy environments, you can load d3-interpolate’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported. (If using [color interpolation](#color-spaces), also load [d3-color](https://github.com/d3/d3-color).)

```html
<script src="https://cdn.jsdelivr.net/npm/d3-color@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-interpolate@3"></script>
<script>

const interpolate = d3.interpolateRgb("steelblue", "brown");

</script>
```

## API Reference

<a name="interpolate" href="#interpolate">#</a> d3.<b>interpolate</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/value.js), [Examples](https://observablehq.com/@d3/d3-interpolate)

Returns an interpolator between the two arbitrary values *a* and *b*. The interpolator implementation is based on the type of the end value *b*, using the following algorithm:

1. If *b* is null, undefined or a boolean, use the constant *b*.
2. If *b* is a number, use [interpolateNumber](#interpolateNumber).
3. If *b* is a [color](https://github.com/d3/d3-color/blob/master/README.md#color) or a string coercible to a color, use [interpolateRgb](#interpolateRgb).
4. If *b* is a [date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date), use [interpolateDate](#interpolateDate).
5. If *b* is a string, use [interpolateString](#interpolateString).
6. If *b* is a [typed array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray) of numbers, use [interpolateNumberArray](#interpolateNumberArray).
7. If *b* is a generic [array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray), use [interpolateArray](#interpolateArray).
8. If *b* is coercible to a number, use [interpolateNumber](#interpolateNumber).
9. Use [interpolateObject](#interpolateObject).

Based on the chosen interpolator, *a* is coerced to the suitable corresponding type.

<a name="interpolateNumber" href="#interpolateNumber">#</a> d3.<b>interpolateNumber</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/number.js), [Examples](https://observablehq.com/@d3/d3-interpolatenumber)

Returns an interpolator between the two numbers *a* and *b*. The returned interpolator is equivalent to:

```js
function interpolator(t) {
  return a * (1 - t) + b * t;
}
```

Caution: avoid interpolating to or from the number zero when the interpolator is used to generate a string. When very small values are stringified, they may be converted to scientific notation, which is an invalid attribute or style property value in older browsers. For example, the number `0.0000001` is converted to the string `"1e-7"`. This is particularly noticeable with interpolating opacity. To avoid scientific notation, start or end the transition at 1e-6: the smallest value that is not stringified in scientific notation.

<a name="interpolateRound" href="#interpolateRound">#</a> d3.<b>interpolateRound</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/round.js), [Examples](https://observablehq.com/@d3/d3-interpolatenumber)

Returns an interpolator between the two numbers *a* and *b*; the interpolator is similar to [interpolateNumber](#interpolateNumber), except it will round the resulting value to the nearest integer.

<a name="interpolateString" href="#interpolateString">#</a> d3.<b>interpolateString</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/string.js), [Examples](https://observablehq.com/@d3/d3-interpolatestring)

Returns an interpolator between the two strings *a* and *b*. The string interpolator finds numbers embedded in *a* and *b*, where each number is of the form understood by JavaScript. A few examples of numbers that will be detected within a string: `-1`, `42`, `3.14159`, and `6.0221413e+23`.

For each number embedded in *b*, the interpolator will attempt to find a corresponding number in *a*. If a corresponding number is found, a numeric interpolator is created using [interpolateNumber](#interpolateNumber). The remaining parts of the string *b* are used as a template: the static parts of the string *b* remain constant for the interpolation, with the interpolated numeric values embedded in the template.

For example, if *a* is `"300 12px sans-serif"`, and *b* is `"500 36px Comic-Sans"`, two embedded numbers are found. The remaining static parts (of string *b*) are a space between the two numbers (`" "`), and the suffix (`"px Comic-Sans"`). The result of the interpolator at *t* = 0.5 is `"400 24px Comic-Sans"`.

<a name="interpolateDate" href="#interpolateDate">#</a> d3.<b>interpolateDate</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/date.js), [Examples](https://observablehq.com/@d3/d3-interpolatedate)

Returns an interpolator between the two [dates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) *a* and *b*.

Note: **no defensive copy** of the returned date is created; the same Date instance is returned for every evaluation of the interpolator. No copy is made for performance reasons; interpolators are often part of the inner loop of [animated transitions](https://github.com/d3/d3-transition).

<a name="interpolateArray" href="#interpolateArray">#</a> d3.<b>interpolateArray</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/array.js), [Examples](https://observablehq.com/@d3/d3-interpolateobject)

Returns an interpolator between the two arrays *a* and *b*. If *b* is a typed array (e.g., Float64Array), [interpolateNumberArray](#interpolateNumberArray) is called instead.

Internally, an array template is created that is the same length as *b*. For each element in *b*, if there exists a corresponding element in *a*, a generic interpolator is created for the two elements using [interpolate](#interpolate). If there is no such element, the static value from *b* is used in the template. Then, for the given parameter *t*, the template’s embedded interpolators are evaluated. The updated array template is then returned.

For example, if *a* is the array `[0, 1]` and *b* is the array `[1, 10, 100]`, then the result of the interpolator for *t* = 0.5 is the array `[0.5, 5.5, 100]`.

Note: **no defensive copy** of the template array is created; modifications of the returned array may adversely affect subsequent evaluation of the interpolator. No copy is made for performance reasons; interpolators are often part of the inner loop of [animated transitions](https://github.com/d3/d3-transition).

<a name="interpolateNumberArray" href="#interpolateNumberArray">#</a> d3.<b>interpolateNumberArray</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/numberArray.js), [Examples](https://observablehq.com/@d3/d3-interpolatenumberarray)

Returns an interpolator between the two arrays of numbers *a* and *b*. Internally, an array template is created that is the same type and length as *b*. For each element in *b*, if there exists a corresponding element in *a*, the values are directly interpolated in the array template. If there is no such element, the static value from *b* is copied. The updated array template is then returned.

Note: For performance reasons, **no defensive copy** is made of the template array and the arguments *a* and *b*; modifications of these arrays may affect subsequent evaluation of the interpolator.

<a name="interpolateObject" href="#interpolateObject">#</a> d3.<b>interpolateObject</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/object.js), [Examples](https://observablehq.com/@d3/d3-interpolateobject)

Returns an interpolator between the two objects *a* and *b*. Internally, an object template is created that has the same properties as *b*. For each property in *b*, if there exists a corresponding property in *a*, a generic interpolator is created for the two elements using [interpolate](#interpolate). If there is no such property, the static value from *b* is used in the template. Then, for the given parameter *t*, the template's embedded interpolators are evaluated and the updated object template is then returned.

For example, if *a* is the object `{x: 0, y: 1}` and *b* is the object `{x: 1, y: 10, z: 100}`, the result of the interpolator for *t* = 0.5 is the object `{x: 0.5, y: 5.5, z: 100}`.

Object interpolation is particularly useful for *dataspace interpolation*, where data is interpolated rather than attribute values. For example, you can interpolate an object which describes an arc in a pie chart, and then use [d3.arc](https://github.com/d3/d3-shape/blob/master/README.md#arc) to compute the new SVG path data.

Note: **no defensive copy** of the template object is created; modifications of the returned object may adversely affect subsequent evaluation of the interpolator. No copy is made for performance reasons; interpolators are often part of the inner loop of [animated transitions](https://github.com/d3/d3-transition).

<a name="interpolateTransformCss" href="#interpolateTransformCss">#</a> d3.<b>interpolateTransformCss</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/transform/index.js#L62), [Examples](https://observablehq.com/@d3/d3-interpolatetransformcss)

Returns an interpolator between the two 2D CSS transforms represented by *a* and *b*. Each transform is decomposed to a standard representation of translate, rotate, *x*-skew and scale; these component transformations are then interpolated. This behavior is standardized by CSS: see [matrix decomposition for animation](http://www.w3.org/TR/css3-2d-transforms/#matrix-decomposition).

<a name="interpolateTransformSvg" href="#interpolateTransformSvg">#</a> d3.<b>interpolateTransformSvg</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/transform/index.js#L63), [Examples](https://observablehq.com/@d3/d3-interpolatetransformcss)

Returns an interpolator between the two 2D SVG transforms represented by *a* and *b*. Each transform is decomposed to a standard representation of translate, rotate, *x*-skew and scale; these component transformations are then interpolated. This behavior is standardized by CSS: see [matrix decomposition for animation](http://www.w3.org/TR/css3-2d-transforms/#matrix-decomposition).

<a name="interpolateZoom" href="#interpolateZoom">#</a> d3.<b>interpolateZoom</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/zoom.js), [Examples](https://observablehq.com/@d3/d3-interpolatezoom)

Returns an interpolator between the two views *a* and *b* of a two-dimensional plane, based on [“Smooth and efficient zooming and panning”](http://www.win.tue.nl/~vanwijk/zoompan.pdf) by Jarke J. van Wijk and Wim A.A. Nuij. Each view is defined as an array of three numbers: *cx*, *cy* and *width*. The first two coordinates *cx*, *cy* represent the center of the viewport; the last coordinate *width* represents the size of the viewport.

The returned interpolator exposes a *duration* property which encodes the recommended transition duration in milliseconds. This duration is based on the path length of the curved trajectory through *x,y* space. If you want a slower or faster transition, multiply this by an arbitrary scale factor (<i>V</i> as described in the original paper).

<a name="interpolateZoom_rho" href="#interpolateZoom_rho">#</a> *interpolateZoom*.<b>rho</b>(<i>rho</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/zoom.js)<!-- , [Examples](https://observablehq.com/@d3/interpolatezoom-rho) -->

Given a [zoom interpolator](#interpolateZoom), returns a new zoom interpolator using the specified curvature *rho*. When *rho* is close to 0, the interpolator is almost linear. The default curvature is sqrt(2).

<a name="interpolateDiscrete" href="#interpolateDiscrete">#</a> d3.<b>interpolateDiscrete</b>(<i>values</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/discrete.js), [Examples](https://observablehq.com/@d3/d3-interpolatediscrete)

Returns a discrete interpolator for the given array of *values*. The returned interpolator maps *t* in [0, 1 / *n*) to *values*[0], *t* in [1 / *n*, 2 / *n*) to *values*[1], and so on, where *n* = *values*.length. In effect, this is a lightweight [quantize scale](https://github.com/d3/d3-scale/blob/master/README.md#quantize-scales) with a fixed domain of [0, 1].

### Sampling

<a name="quantize" href="#quantize">#</a> d3.<b>quantize</b>(<i>interpolator</i>, <i>n</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/quantize.js), [Examples](https://observablehq.com/@d3/d3-quantize)

Returns *n* uniformly-spaced samples from the specified *interpolator*, where *n* is an integer greater than one. The first sample is always at *t* = 0, and the last sample is always at *t* = 1. This can be useful in generating a fixed number of samples from a given interpolator, such as to derive the range of a [quantize scale](https://github.com/d3/d3-scale/blob/master/README.md#quantize-scales) from a [continuous interpolator](https://github.com/d3/d3-scale-chromatic/blob/master/README.md#interpolateWarm).

Caution: this method will not work with interpolators that do not return defensive copies of their output, such as [d3.interpolateArray](#interpolateArray), [d3.interpolateDate](#interpolateDate) and [d3.interpolateObject](#interpolateObject). For those interpolators, you must wrap the interpolator and create a copy for each returned value.

### Color Spaces

<a name="interpolateRgb" href="#interpolateRgb">#</a> d3.<b>interpolateRgb</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/rgb.js), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/rgb.png" width="100%" height="40" alt="rgb">

Or, with a corrected [gamma](#interpolate_gamma) of 2.2:

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/rgbGamma.png" width="100%" height="40" alt="rgbGamma">

Returns an RGB color space interpolator between the two colors *a* and *b* with a configurable [gamma](#interpolate_gamma). If the gamma is not specified, it defaults to 1.0. The colors *a* and *b* need not be in RGB; they will be converted to RGB using [d3.rgb](https://github.com/d3/d3-color/blob/master/README.md#rgb). The return value of the interpolator is an RGB string.

<a href="#interpolateRgbBasis" name="interpolateRgbBasis">#</a> d3.<b>interpolateRgbBasis</b>(<i>colors</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/rgb.js#L54), [Examples](https://observablehq.com/@d3/working-with-color)

Returns a uniform nonrational B-spline interpolator through the specified array of *colors*, which are converted to [RGB color space](https://github.com/d3/d3-color/blob/master/README.md#rgb). Implicit control points are generated such that the interpolator returns *colors*[0] at *t* = 0 and *colors*[*colors*.length - 1] at *t* = 1. Opacity interpolation is not currently supported. See also [d3.interpolateBasis](#interpolateBasis), and see [d3-scale-chromatic](https://github.com/d3/d3-scale-chromatic) for examples.

<a href="#interpolateRgbBasisClosed" name="interpolateRgbBasisClosed">#</a> d3.<b>interpolateRgbBasisClosed</b>(<i>colors</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/rgb.js#L55), [Examples](https://observablehq.com/@d3/working-with-color)

Returns a uniform nonrational B-spline interpolator through the specified array of *colors*, which are converted to [RGB color space](https://github.com/d3/d3-color/blob/master/README.md#rgb). The control points are implicitly repeated such that the resulting spline has cyclical C² continuity when repeated around *t* in [0,1]; this is useful, for example, to create cyclical color scales. Opacity interpolation is not currently supported. See also [d3.interpolateBasisClosed](#interpolateBasisClosed), and see [d3-scale-chromatic](https://github.com/d3/d3-scale-chromatic) for examples.

<a name="interpolateHsl" href="#interpolateHsl">#</a> d3.<b>interpolateHsl</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/hsl.js), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/hsl.png" width="100%" height="40" alt="hsl">

Returns an HSL color space interpolator between the two colors *a* and *b*. The colors *a* and *b* need not be in HSL; they will be converted to HSL using [d3.hsl](https://github.com/d3/d3-color/blob/master/README.md#hsl). If either color’s hue or saturation is NaN, the opposing color’s channel value is used. The shortest path between hues is used. The return value of the interpolator is an RGB string.

<a name="interpolateHslLong" href="#interpolateHslLong">#</a> d3.<b>interpolateHslLong</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/hsl.js#L21), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/hslLong.png" width="100%" height="40" alt="hslLong">

Like [interpolateHsl](#interpolateHsl), but does not use the shortest path between hues.

<a name="interpolateLab" href="#interpolateLab">#</a> d3.<b>interpolateLab</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/lab.js), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/lab.png" width="100%" height="40" alt="lab">

Returns a [CIELAB color space](https://en.wikipedia.org/wiki/Lab_color_space#CIELAB) interpolator between the two colors *a* and *b*. The colors *a* and *b* need not be in CIELAB; they will be converted to CIELAB using [d3.lab](https://github.com/d3/d3-color/blob/master/README.md#lab). The return value of the interpolator is an RGB string.

<a name="interpolateHcl" href="#interpolateHcl">#</a> d3.<b>interpolateHcl</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/hcl.js), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/hcl.png" width="100%" height="40" alt="hcl">

Returns a [CIELCh<sub>ab</sub> color space](https://en.wikipedia.org/wiki/CIELAB_color_space#Cylindrical_representation:_CIELCh_or_CIEHLC) interpolator between the two colors *a* and *b*. The colors *a* and *b* need not be in CIELCh<sub>ab</sub>; they will be converted to CIELCh<sub>ab</sub> using [d3.hcl](https://github.com/d3/d3-color/blob/master/README.md#hcl). If either color’s hue or chroma is NaN, the opposing color’s channel value is used. The shortest path between hues is used. The return value of the interpolator is an RGB string.

<a name="interpolateHclLong" href="#interpolateHclLong">#</a> d3.<b>interpolateHclLong</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/hcl.js#L21), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/hclLong.png" width="100%" height="40" alt="hclLong">

Like [interpolateHcl](#interpolateHcl), but does not use the shortest path between hues.

<a name="interpolateCubehelix" href="#interpolateCubehelix">#</a> d3.<b>interpolateCubehelix</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/cubehelix.js), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/cubehelix.png" width="100%" height="40" alt="cubehelix">

Or, with a [gamma](#interpolate_gamma) of 3.0 to emphasize high-intensity values:

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/cubehelixGamma.png" width="100%" height="40" alt="cubehelixGamma">

Returns a Cubehelix color space interpolator between the two colors *a* and *b* using a configurable [gamma](#interpolate_gamma). If the gamma is not specified, it defaults to 1.0. The colors *a* and *b* need not be in Cubehelix; they will be converted to Cubehelix using [d3.cubehelix](https://github.com/d3/d3-color/blob/master/README.md#cubehelix). If either color’s hue or saturation is NaN, the opposing color’s channel value is used. The shortest path between hues is used. The return value of the interpolator is an RGB string.

<a name="interpolateCubehelixLong" href="#interpolateCubehelixLong">#</a> d3.<b>interpolateCubehelixLong</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/cubehelix.js#L29), [Examples](https://observablehq.com/@d3/working-with-color)

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/cubehelixLong.png" width="100%" height="40" alt="cubehelixLong">

Or, with a [gamma](#interpolate_gamma) of 3.0 to emphasize high-intensity values:

<img src="https://raw.githubusercontent.com/d3/d3-interpolate/master/img/cubehelixGammaLong.png" width="100%" height="40" alt="cubehelixGammaLong">

Like [interpolateCubehelix](#interpolateCubehelix), but does not use the shortest path between hues.

<a name="interpolate_gamma" href="#interpolate_gamma">#</a> <i>interpolate</i>.<b>gamma</b>(<i>gamma</i>)

Given that *interpolate* is one of [interpolateRgb](#interpolateRgb), [interpolateCubehelix](#interpolateCubehelix) or [interpolateCubehelixLong](#interpolateCubehelixLong), returns a new interpolator factory of the same type using the specified *gamma*. For example, to interpolate from purple to orange with a gamma of 2.2 in RGB space:

```js
const interpolator = d3.interpolateRgb.gamma(2.2)("purple", "orange");
```

See Eric Brasseur’s article, [Gamma error in picture scaling](http://www.ericbrasseur.org/gamma.html), for more on gamma correction.

<a name="interpolateHue" href="#interpolateHue">#</a> d3.<b>interpolateHue</b>(<i>a</i>, <i>b</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/hue.js), [Examples](https://observablehq.com/@d3/working-with-color)

Returns an interpolator between the two hue angles *a* and *b*. If either hue is NaN, the opposing value is used. The shortest path between hues is used. The return value of the interpolator is a number in [0, 360).

### Splines

Whereas standard interpolators blend from a starting value *a* at *t* = 0 to an ending value *b* at *t* = 1, spline interpolators smoothly blend multiple input values for *t* in [0,1] using piecewise polynomial functions. Only cubic uniform nonrational [B-splines](https://en.wikipedia.org/wiki/B-spline) are currently supported, also known as basis splines.

<a href="#interpolateBasis" name="interpolateBasis">#</a> d3.<b>interpolateBasis</b>(<i>values</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/basis.js), [Examples](https://observablehq.com/@d3/d3-interpolatebasis)

Returns a uniform nonrational B-spline interpolator through the specified array of *values*, which must be numbers. Implicit control points are generated such that the interpolator returns *values*[0] at *t* = 0 and *values*[*values*.length - 1] at *t* = 1. See also [d3.curveBasis](https://github.com/d3/d3-shape/blob/master/README.md#curveBasis).

<a href="#interpolateBasisClosed" name="interpolateBasisClosed">#</a> d3.<b>interpolateBasisClosed</b>(<i>values</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/basisClosed.js), [Examples](https://observablehq.com/@d3/d3-interpolatebasis)

Returns a uniform nonrational B-spline interpolator through the specified array of *values*, which must be numbers. The control points are implicitly repeated such that the resulting one-dimensional spline has cyclical C² continuity when repeated around *t* in [0,1]. See also [d3.curveBasisClosed](https://github.com/d3/d3-shape/blob/master/README.md#curveBasisClosed).

### Piecewise

<a name="piecewise" href="#piecewise">#</a> d3.<b>piecewise</b>([<i>interpolate</i>, ]<i>values</i>) · [Source](https://github.com/d3/d3-interpolate/blob/master/src/piecewise.js), [Examples](https://observablehq.com/@d3/d3-piecewise)

Returns a piecewise interpolator, composing interpolators for each adjacent pair of *values*. The returned interpolator maps *t* in [0, 1 / (*n* - 1)] to *interpolate*(*values*[0], *values*[1]), *t* in [1 / (*n* - 1), 2 / (*n* - 1)] to *interpolate*(*values*[1], *values*[2]), and so on, where *n* = *values*.length. In effect, this is a lightweight [linear scale](https://github.com/d3/d3-scale/blob/master/README.md#linear-scales). For example, to blend through red, green and blue:

```js
const interpolate = d3.piecewise(d3.interpolateRgb.gamma(2.2), ["red", "green", "blue"]);
```

If  *interpolate* is not specified, defaults to [d3.interpolate](#interpolate).
