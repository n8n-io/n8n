# d3-ease

*Easing* is a method of distorting time to control apparent motion in animation. It is most commonly used for [slow-in, slow-out](https://en.wikipedia.org/wiki/12_basic_principles_of_animation#Slow_In_and_Slow_Out). By easing time, [animated transitions](https://github.com/d3/d3-transition) are smoother and exhibit more plausible motion.

The easing types in this module implement the [ease method](#ease_ease), which takes a normalized time *t* and returns the corresponding “eased” time *tʹ*. Both the normalized time and the eased time are typically in the range [0,1], where 0 represents the start of the animation and 1 represents the end; some easing types, such as [elastic](#easeElastic), may return eased times slightly outside this range. A good easing type should return 0 if *t* = 0 and 1 if *t* = 1. See the [easing explorer](https://observablehq.com/@d3/easing) for a visual demonstration.

These easing types are largely based on work by [Robert Penner](http://robertpenner.com/easing/).

## Installing

If you use npm, `npm install d3-ease`. You can also download the [latest release on GitHub](https://github.com/d3/d3-ease/releases/latest). For vanilla HTML in modern browsers, import d3-ease from Skypack:

```html
<script type="module">

import {easeCubic} from "https://cdn.skypack.dev/d3-ease@3";

const e = easeCubic(0.25);

</script>
```

For legacy environments, you can load d3-ease’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-ease@3"></script>
<script>

const e = d3.easeCubic(0.25);

</script>
```

[Try d3-ease in your browser.](https://observablehq.com/@d3/easing-animations)

## API Reference

<a name="_ease" href="#_ease">#</a> <i>ease</i>(<i>t</i>)

Given the specified normalized time *t*, typically in the range [0,1], returns the “eased” time *tʹ*, also typically in [0,1]. 0 represents the start of the animation and 1 represents the end. A good implementation returns 0 if *t* = 0 and 1 if *t* = 1. See the [easing explorer](https://observablehq.com/@d3/easing) for a visual demonstration. For example, to apply [cubic](#easeCubic) easing:

```js
const te = d3.easeCubic(t);
```

Similarly, to apply custom [elastic](#easeElastic) easing:

```js
// Before the animation starts, create your easing function.
const customElastic = d3.easeElastic.period(0.4);

// During the animation, apply the easing function.
const te = customElastic(t);
```

<a name="easeLinear" href="#easeLinear">#</a> d3.<b>easeLinear</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/linear.js "Source")

Linear easing; the identity function; *linear*(*t*) returns *t*.

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/linear.png" alt="linear">](https://observablehq.com/@d3/easing#linear)

<a name="easePolyIn" href="#easePolyIn">#</a> d3.<b>easePolyIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/poly.js#L3 "Source")

Polynomial easing; raises *t* to the specified [exponent](#poly_exponent). If the exponent is not specified, it defaults to 3, equivalent to [cubicIn](#easeCubicIn).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/polyIn.png" alt="polyIn">](https://observablehq.com/@d3/easing#polyIn)

<a name="easePolyOut" href="#easePolyOut">#</a> d3.<b>easePolyOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/poly.js#L15 "Source")

Reverse polynomial easing; equivalent to 1 - [polyIn](#easePolyIn)(1 - *t*). If the [exponent](#poly_exponent) is not specified, it defaults to 3, equivalent to [cubicOut](#easeCubicOut).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/polyOut.png" alt="polyOut">](https://observablehq.com/@d3/easing#polyOut)

<a name="easePoly" href="#easePoly">#</a> d3.<b>easePoly</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/poly.js "Source")
<br><a name="easePolyInOut" href="#easePolyInOut">#</a> d3.<b>easePolyInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/poly.js#L27 "Source")

Symmetric polynomial easing; scales [polyIn](#easePolyIn) for *t* in [0, 0.5] and [polyOut](#easePolyOut) for *t* in [0.5, 1]. If the [exponent](#poly_exponent) is not specified, it defaults to 3, equivalent to [cubic](#easeCubic).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/polyInOut.png" alt="polyInOut">](https://observablehq.com/@d3/easing#polyInOut)

<a name="poly_exponent" href="#poly_exponent">#</a> <i>poly</i>.<b>exponent</b>(<i>e</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/poly.js#L1 "Source")

Returns a new polynomial easing with the specified exponent *e*. For example, to create equivalents of [linear](#easeLinear), [quad](#easeQuad), and [cubic](#easeCubic):

```js
const linear = d3.easePoly.exponent(1);
const quad = d3.easePoly.exponent(2);
const cubic = d3.easePoly.exponent(3);
```

<a name="easeQuadIn" href="#easeQuadIn">#</a> d3.<b>easeQuadIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/quad.js#L1 "Source")

Quadratic easing; equivalent to [polyIn](#easePolyIn).[exponent](#poly_exponent)(2).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/quadIn.png" alt="quadIn">](https://observablehq.com/@d3/easing#quadIn)

<a name="easeQuadOut" href="#easeQuadOut">#</a> d3.<b>easeQuadOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/quad.js#L5 "Source")

Reverse quadratic easing; equivalent to 1 - [quadIn](#easeQuadIn)(1 - *t*). Also equivalent to [polyOut](#easePolyOut).[exponent](#poly_exponent)(2).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/quadOut.png" alt="quadOut">](https://observablehq.com/@d3/easing#quadOut)

<a name="easeQuad" href="#easeQuad">#</a> d3.<b>easeQuad</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/quad.js "Source")
<br><a name="easeQuadInOut" href="#easeQuadInOut">#</a> d3.<b>easeQuadInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/quad.js#L9 "Source")

Symmetric quadratic easing; scales [quadIn](#easeQuadIn) for *t* in [0, 0.5] and [quadOut](#easeQuadOut) for *t* in [0.5, 1]. Also equivalent to [poly](#easePoly).[exponent](#poly_exponent)(2).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/quadInOut.png" alt="quadInOut">](https://observablehq.com/@d3/easing#quadInOut)

<a name="easeCubicIn" href="#easeCubicIn">#</a> d3.<b>easeCubicIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/cubic.js#L1 "Source")

Cubic easing; equivalent to [polyIn](#easePolyIn).[exponent](#poly_exponent)(3).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/cubicIn.png" alt="cubicIn">](https://observablehq.com/@d3/easing#cubicIn)

<a name="easeCubicOut" href="#easeCubicOut">#</a> d3.<b>easeCubicOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/cubic.js#L5 "Source")

Reverse cubic easing; equivalent to 1 - [cubicIn](#easeCubicIn)(1 - *t*). Also equivalent to [polyOut](#easePolyOut).[exponent](#poly_exponent)(3).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/cubicOut.png" alt="cubicOut">](https://observablehq.com/@d3/easing#cubicOut)

<a name="easeCubic" href="#easeCubic">#</a> d3.<b>easeCubic</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/cubic.js "Source")
<br><a name="easeCubicInOut" href="#easeCubicInOut">#</a> d3.<b>easeCubicInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/cubic.js#L9 "Source")

Symmetric cubic easing; scales [cubicIn](#easeCubicIn) for *t* in [0, 0.5] and [cubicOut](#easeCubicOut) for *t* in [0.5, 1]. Also equivalent to [poly](#easePoly).[exponent](#poly_exponent)(3).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/cubicInOut.png" alt="cubicInOut">](https://observablehq.com/@d3/easing#cubicInOut)

<a name="easeSinIn" href="#easeSinIn">#</a> d3.<b>easeSinIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/sin.js#L4 "Source")

Sinusoidal easing; returns sin(*t*).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/sinIn.png" alt="sinIn">](https://observablehq.com/@d3/easing#sinIn)

<a name="easeSinOut" href="#easeSinOut">#</a> d3.<b>easeSinOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/sin.js#L8 "Source")

Reverse sinusoidal easing; equivalent to 1 - [sinIn](#easeSinIn)(1 - *t*).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/sinOut.png" alt="sinOut">](https://observablehq.com/@d3/easing#sinOut)

<a name="easeSin" href="#easeSin">#</a> d3.<b>easeSin</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/sin.js "Source")
<br><a name="easeSinInOut" href="#easeSinInOut">#</a> d3.<b>easeSinInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/sin.js#L12 "Source")

Symmetric sinusoidal easing; scales [sinIn](#easeSinIn) for *t* in [0, 0.5] and [sinOut](#easeSinOut) for *t* in [0.5, 1].

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/sinInOut.png" alt="sinInOut">](https://observablehq.com/@d3/easing#sinInOut)

<a name="easeExpIn" href="#easeExpIn">#</a> d3.<b>easeExpIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/exp.js#L1 "Source")

Exponential easing; raises 2 to the exponent 10 \* (*t* - 1).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/expIn.png" alt="expIn">](https://observablehq.com/@d3/easing#expIn)

<a name="easeExpOut" href="#easeExpOut">#</a> d3.<b>easeExpOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/exp.js#L5 "Source")

Reverse exponential easing; equivalent to 1 - [expIn](#easeExpIn)(1 - *t*).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/expOut.png" alt="expOut">](https://observablehq.com/@d3/easing#expOut)

<a name="easeExp" href="#easeExp">#</a> d3.<b>easeExp</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/exp.js "Source")
<br><a name="easeExpInOut" href="#easeExpInOut">#</a> d3.<b>easeExpInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/exp.js#L9 "Source")

Symmetric exponential easing; scales [expIn](#easeExpIn) for *t* in [0, 0.5] and [expOut](#easeExpOut) for *t* in [0.5, 1].

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/expInOut.png" alt="expInOut">](https://observablehq.com/@d3/easing#expInOut)

<a name="easeCircleIn" href="#easeCircleIn">#</a> d3.<b>easeCircleIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/circle.js#L1 "Source")

Circular easing.

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/circleIn.png" alt="circleIn">](https://observablehq.com/@d3/easing#circleIn)

<a name="easeCircleOut" href="#easeCircleOut">#</a> d3.<b>easeCircleOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/circle.js#L5 "Source")

Reverse circular easing; equivalent to 1 - [circleIn](#easeCircleIn)(1 - *t*).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/circleOut.png" alt="circleOut">](https://observablehq.com/@d3/easing#circleOut)

<a name="easeCircle" href="#easeCircle">#</a> d3.<b>easeCircle</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/circle.js "Source")
<br><a name="easeCircleInOut" href="#easeCircleInOut">#</a> d3.<b>easeCircleInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/circle.js#L9 "Source")

Symmetric circular easing; scales [circleIn](#easeCircleIn) for *t* in [0, 0.5] and [circleOut](#easeCircleOut) for *t* in [0.5, 1].

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/circleInOut.png" alt="circleInOut">](https://observablehq.com/@d3/easing#circleInOut)

<a name="easeElasticIn" href="#easeElasticIn">#</a> d3.<b>easeElasticIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/elastic.js#L5 "Source")

Elastic easing, like a rubber band. The [amplitude](#elastic_amplitude) and [period](#elastic_period) of the oscillation are configurable; if not specified, they default to 1 and 0.3, respectively.

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/elasticIn.png" alt="elasticIn">](https://observablehq.com/@d3/easing#elasticIn)

<a name="easeElastic" href="#easeElastic">#</a> d3.<b>easeElastic</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/elastic.js "Source")
<br><a name="easeElasticOut" href="#easeElasticOut">#</a> d3.<b>easeElasticOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/elastic.js#L18 "Source")

Reverse elastic easing; equivalent to 1 - [elasticIn](#easeElasticIn)(1 - *t*).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/elasticOut.png" alt="elasticOut">](https://observablehq.com/@d3/easing#elasticOut)

<a name="easeElasticInOut" href="#easeElasticInOut">#</a> d3.<b>easeElasticInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/elastic.js#L31 "Source")

Symmetric elastic easing; scales [elasticIn](#easeElasticIn) for *t* in [0, 0.5] and [elasticOut](#easeElasticOut) for *t* in [0.5, 1].

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/elasticInOut.png" alt="elasticInOut">](https://observablehq.com/@d3/easing#elasticInOut)

<a name="elastic_amplitude" href="#elastic_amplitude">#</a> <i>elastic</i>.<b>amplitude</b>(<i>a</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/elastic.js#L40 "Source")

Returns a new elastic easing with the specified amplitude *a*.

<a name="elastic_period" href="#elastic_period">#</a> <i>elastic</i>.<b>period</b>(<i>p</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/elastic.js#L41 "Source")

Returns a new elastic easing with the specified period *p*.

<a name="easeBackIn" href="#easeBackIn">#</a> d3.<b>easeBackIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/back.js#L3 "Source")

[Anticipatory](https://en.wikipedia.org/wiki/12_basic_principles_of_animation#Anticipation) easing, like a dancer bending his knees before jumping off the floor. The degree of [overshoot](#back_overshoot) is configurable; if not specified, it defaults to 1.70158.

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/backIn.png" alt="backIn">](https://observablehq.com/@d3/easing#backIn)

<a name="easeBackOut" href="#easeBackOut">#</a> d3.<b>easeBackOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/back.js#L15 "Source")

Reverse anticipatory easing; equivalent to 1 - [backIn](#easeBackIn)(1 - *t*).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/backOut.png" alt="backOut">](https://observablehq.com/@d3/easing#backOut)

<a name="easeBack" href="#easeBack">#</a> d3.<b>easeBack</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/back.js "Source")
<br><a name="easeBackInOut" href="#easeBackInOut">#</a> d3.<b>easeBackInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/back.js#L27 "Source")

Symmetric anticipatory easing; scales [backIn](#easeBackIn) for *t* in [0, 0.5] and [backOut](#easeBackOut) for *t* in [0.5, 1].

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/backInOut.png" alt="backInOut">](https://observablehq.com/@d3/easing#backInOut)

<a name="back_overshoot" href="#back_overshoot">#</a> <i>back</i>.<b>overshoot</b>(<i>s</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/back.js#L1 "Source")

Returns a new back easing with the specified overshoot *s*.

<a name="easeBounceIn" href="#easeBounceIn">#</a> d3.<b>easeBounceIn</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/bounce.js#L12 "Source")

Bounce easing, like a rubber ball.

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/bounceIn.png" alt="bounceIn">](https://observablehq.com/@d3/easing#bounceIn)

<a name="easeBounce" href="#easeBounce">#</a> d3.<b>easeBounce</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/bounce.js "Source")
<br><a name="easeBounceOut" href="#easeBounceOut">#</a> d3.<b>easeBounceOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/bounce.js#L16 "Source")

Reverse bounce easing; equivalent to 1 - [bounceIn](#easeBounceIn)(1 - *t*).

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/bounceOut.png" alt="bounceOut">](https://observablehq.com/@d3/easing#bounceOut)

<a name="easeBounceInOut" href="#easeBounceInOut">#</a> d3.<b>easeBounceInOut</b>(<i>t</i>) [<>](https://github.com/d3/d3-ease/blob/master/src/bounce.js#L20 "Source")

Symmetric bounce easing; scales [bounceIn](#easeBounceIn) for *t* in [0, 0.5] and [bounceOut](#easeBounceOut) for *t* in [0.5, 1].

[<img src="https://raw.githubusercontent.com/d3/d3-ease/master/img/bounceInOut.png" alt="bounceInOut">](https://observablehq.com/@d3/easing#bounceInOut)
