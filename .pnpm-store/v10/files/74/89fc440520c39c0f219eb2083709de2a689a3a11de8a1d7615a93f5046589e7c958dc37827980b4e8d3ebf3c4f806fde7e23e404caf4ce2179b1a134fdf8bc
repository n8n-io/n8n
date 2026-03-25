# tinycolor 

[![npm](https://badgen.net/npm/v/@ctrl/tinycolor)](https://www.npmjs.com/package/@ctrl/tinycolor)
[![CircleCI](https://badgen.net/circleci/github/scttcper/tinycolor)](https://circleci.com/gh/scttcper/tinycolor)
[![coverage](https://badgen.net/codecov/c/github/scttcper/tinycolor)](https://codecov.io/gh/scttcper/tinycolor)
[![bundlesize](https://badgen.net/bundlephobia/min/@ctrl/tinycolor)](https://bundlephobia.com/result?p=@ctrl/tinycolor)

> TinyColor is a small library for color manipulation and conversion

A fork of [tinycolor2](https://github.com/bgrins/TinyColor) by [Brian Grinstead](https://github.com/bgrins)

__DEMO__: https://tinycolor.vercel.app  

### Changes from tinycolor2

* reformatted into TypeScript / es2015 and requires node >= 8
  * tree shakeable "module" export and no package `sideEffects`
* `tinycolor` is now exported as a class called `TinyColor`
* new `random`, an implementation of [randomColor](https://github.com/davidmerfield/randomColor/) by David Merfield that returns a TinyColor object
* several functions moved out of the tinycolor class and are no longer `TinyColor.<function>`
  * `readability`, `fromRatio` moved out
  * `random` moved out and renamed to `legacyRandom`
  * `toFilter` has been moved out and renamed to `toMsFilter`
* `mix`, `equals` use the current TinyColor object as the first parameter
* added polyad colors tinycolor PR [126](https://github.com/bgrins/TinyColor/pull/126)
* color wheel values (360) are allowed to over or under-spin and still return valid colors tinycolor PR [108](https://github.com/bgrins/TinyColor/pull/108)
* added `tint()` and `shade()` tinycolor PR [159](https://github.com/bgrins/TinyColor/pull/159)
* `isValid`, `format` are now propertys instead of a function

## Install

```sh
npm install @ctrl/tinycolor
```

## Use

```ts
import { TinyColor } from '@ctrl/tinycolor';
const color = new TinyColor('red').toHexString(); // '#ff0000'
```

## Accepted String Input

The string parsing is very permissive. It is meant to make typing a color as input as easy as possible. All commas, percentages, parenthesis are optional, and most input allow either 0-1, 0%-100%, or 0-n (where n is either 100, 255, or 360 depending on the value).

HSL and HSV both require either 0%-100% or 0-1 for the `S`/`L`/`V` properties. The `H` (hue) can have values between 0%-100% or 0-360.

RGB input requires either 0-255 or 0%-100%.

If you call `tinycolor.fromRatio`, RGB and Hue input can also accept 0-1.

Here are some examples of string input:

### Hex, 8-digit (RGBA) Hex

```ts
new TinyColor('#000');
new TinyColor('000');
new TinyColor('#369C');
new TinyColor('369C');
new TinyColor('#f0f0f6');
new TinyColor('f0f0f6');
new TinyColor('#f0f0f688');
new TinyColor('f0f0f688');
```

### RGB, RGBA

```ts
new TinyColor('rgb (255, 0, 0)');
new TinyColor('rgb 255 0 0');
new TinyColor('rgba (255, 0, 0, .5)');
new TinyColor({ r: 255, g: 0, b: 0 });

import { fromRatio } from '@ctrl/tinycolor';
fromRatio({ r: 1, g: 0, b: 0 });
fromRatio({ r: 0.5, g: 0.5, b: 0.5 });
```

### HSL, HSLA

```ts
new TinyColor('hsl(0, 100%, 50%)');
new TinyColor('hsla(0, 100%, 50%, .5)');
new TinyColor('hsl(0, 100%, 50%)');
new TinyColor('hsl 0 1.0 0.5');
new TinyColor({ h: 0, s: 1, l: 0.5 });
```

### HSV, HSVA

```ts
new TinyColor('hsv(0, 100%, 100%)');
new TinyColor('hsva(0, 100%, 100%, .5)');
new TinyColor('hsv (0 100% 100%)');
new TinyColor('hsv 0 1 1');
new TinyColor({ h: 0, s: 100, v: 100 });
```

### Named

```ts
new TinyColor('RED');
new TinyColor('blanchedalmond');
new TinyColor('darkblue');
```

### Number
```ts
new TinyColor(0x0);
new TinyColor(0xaabbcc);
```

### Accepted Object Input

If you are calling this from code, you may want to use object input. Here are some examples of the different types of accepted object inputs:

```ts
{ r: 255, g: 0, b: 0 }
{ r: 255, g: 0, b: 0, a: .5 }
{ h: 0, s: 100, l: 50 }
{ h: 0, s: 100, v: 100 }
```

## Properties

### originalInput

The original input passed into the constructer used to create the tinycolor instance

```ts
const color = new TinyColor('red');
color.originalInput; // "red"
color = new TinyColor({ r: 255, g: 255, b: 255 });
color.originalInput; // "{r: 255, g: 255, b: 255}"
```

### format

Returns the format used to create the tinycolor instance

```ts
const color = new TinyColor('red');
color.format; // "name"
color = new TinyColor({ r: 255, g: 255, b: 255 });
color.format; // "rgb"
```

### isValid

A boolean indicating whether the color was successfully parsed. Note: if the color is not valid then it will act like `black` when being used with other methods.

```ts
const color1 = new TinyColor('red');
color1.isValid; // true
color1.toHexString(); // "#ff0000"

const color2 = new TinyColor('not a color');
color2.isValid; // false
color2.toString(); // "#000000"
```

## Methods

### getBrightness

Returns the perceived brightness of a color, from `0-255`, as defined by [Web Content Accessibility Guidelines (Version 1.0)](http://www.w3.org/TR/AERT#color-contrast).

```ts
const color1 = new TinyColor('#fff');
color1.getBrightness(); // 255

const color2 = new TinyColor('#000');
color2.getBrightness(); // 0
```

### isLight

Return a boolean indicating whether the color's perceived brightness is light.

```ts
const color1 = new TinyColor('#fff');
color1.isLight(); // true

const color2 = new TinyColor('#000');
color2.isLight(); // false
```

### isDark

Return a boolean indicating whether the color's perceived brightness is dark.

```ts
const color1 = new TinyColor('#fff');
color1.isDark(); // false

const color2 = new TinyColor('#000');
color2.isDark(); // true
```

### getLuminance

Returns the perceived luminance of a color, from `0-1` as defined by [Web Content Accessibility Guidelines (Version 2.0).](http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef)

```ts
const color1 = new TinyColor('#fff');
color1.getLuminance(); // 1

const color2 = new TinyColor('#000');
color2.getLuminance(); // 0
```

### getAlpha

Returns the alpha value of a color, from `0-1`.

```ts
const color1 = new TinyColor('rgba(255, 0, 0, .5)');
color1.getAlpha(); // 0.5

const color2 = new TinyColor('rgb(255, 0, 0)');
color2.getAlpha(); // 1

const color3 = new TinyColor('transparent');
color3.getAlpha(); // 0
```

### setAlpha

Sets the alpha value on a current color. Accepted range is in between `0-1`.

```ts
const color = new TinyColor('red');
color.getAlpha(); // 1
color.setAlpha(0.5);
color.getAlpha(); // .5
color.toRgbString(); // "rgba(255, 0, 0, .5)"
```

### onBackground

Compute how the color would appear on a background. When the color is fully transparent (i.e. `getAlpha() == 0`), the result will be the background color. When the color is not transparent at all (i.e. `getAlpha() == 1`), the result will be the color itself. Otherwise you will get a computed result.

```ts
const color = new TinyColor('rgba(255, 0, 0, .5)');
const computedColor = color.onBackground('rgb(0, 0, 255)');
computedColor.toRgbString(); // "rgb(128, 0, 128)"
```

### String Representations

The following methods will return a property for the `alpha` value, which can be ignored: `toHsv`, `toHsl`, `toRgb`

### toHsv

```ts
const color = new TinyColor('red');
color.toHsv(); // { h: 0, s: 1, v: 1, a: 1 }
```

### toHsvString

```ts
const color = new TinyColor('red');
color.toHsvString(); // "hsv(0, 100%, 100%)"
color.setAlpha(0.5);
color.toHsvString(); // "hsva(0, 100%, 100%, 0.5)"
```

### toHsl

```ts
const color = new TinyColor('red');
color.toHsl(); // { h: 0, s: 1, l: 0.5, a: 1 }
```

### toHslString

```ts
const color = new TinyColor('red');
color.toHslString(); // "hsl(0, 100%, 50%)"
color.setAlpha(0.5);
color.toHslString(); // "hsla(0, 100%, 50%, 0.5)"
```

### toNumber
```ts
new TinyColor('#aabbcc').toNumber() === 0xaabbcc // true
new TinyColor('rgb(1, 1, 1)').toNumber() === (1 << 16) + (1 << 8) + 1 // true
```

### toHex

```ts
const color = new TinyColor('red');
color.toHex(); // "ff0000"
```

### toHexString

```ts
const color = new TinyColor('red');
color.toHexString(); // "#ff0000"
```

### toHex8

```ts
const color = new TinyColor('red');
color.toHex8(); // "ff0000ff"
```

### toHex8String

```ts
const color = new TinyColor('red');
color.toHex8String(); // "#ff0000ff"
```

### toHexShortString

```ts
const color1 = new TinyColor('#ff000000');
color1.toHexShortString(); // "#ff000000"
color1.toHexShortString(true); // "#f000"

const color2 = new TinyColor('#ff0000ff');
color2.toHexShortString(); // "#ff0000"
color2.toHexShortString(true); // "#f00"
```

### toRgb

```ts
const color = new TinyColor('red');
color.toRgb(); // { r: 255, g: 0, b: 0, a: 1 }
```

### toRgbString

```ts
const color = new TinyColor('red');
color.toRgbString(); // "rgb(255, 0, 0)"
color.setAlpha(0.5);
color.toRgbString(); // "rgba(255, 0, 0, 0.5)"
```

### toPercentageRgb

```ts
const color = new TinyColor('red');
color.toPercentageRgb(); // { r: "100%", g: "0%", b: "0%", a: 1 }
```

### toPercentageRgbString

```ts
const color = new TinyColor('red');
color.toPercentageRgbString(); // "rgb(100%, 0%, 0%)"
color.setAlpha(0.5);
color.toPercentageRgbString(); // "rgba(100%, 0%, 0%, 0.5)"
```

### toName

```ts
const color = new TinyColor('red');
color.toName(); // "red"
```

### toFilter

```ts
import { toMsFilter } from '@ctrl/tinycolor';
toMsFilter('red', 'blue'); // 'progid:DXImageTransform.Microsoft.gradient(startColorstr=#ffff0000,endColorstr=#ff0000ff)'
```

### toString

Print to a string, depending on the input format. You can also override this by passing one of `"rgb", "prgb", "hex6", "hex3", "hex8", "name", "hsl", "hsv"` into the function.

```ts
const color1 = new TinyColor('red');
color1.toString(); // "red"
color1.toString('hsv'); // "hsv(0, 100%, 100%)"

const color2 = new TinyColor('rgb(255, 0, 0)');
color2.toString(); // "rgb(255, 0, 0)"
color2.setAlpha(0.5);
color2.toString(); // "rgba(255, 0, 0, 0.5)"
```

### Color Modification

These methods manipulate the current color, and return it for chaining. For instance:

```ts
new TinyColor('red')
  .lighten()
  .desaturate()
  .toHexString(); // '#f53d3d'
```

### lighten

`lighten: function(amount = 10) -> TinyColor`. Lighten the color a given amount, from 0 to 100. Providing 100 will always return white.

```ts
new TinyColor('#f00').lighten().toString(); // '#ff3333'
new TinyColor('#f00').lighten(100).toString(); // '#ffffff'
```

### brighten

`brighten: function(amount = 10) -> TinyColor`. Brighten the color a given amount, from 0 to 100.

```ts
new TinyColor('#f00').brighten().toString(); // '#ff1919'
```

### darken

`darken: function(amount = 10) -> TinyColor`. Darken the color a given amount, from 0 to 100. Providing 100 will always return black.

```ts
new TinyColor('#f00').darken().toString(); // '#cc0000'
new TinyColor('#f00').darken(100).toString(); // '#000000'
```

### tint

Mix the color with pure white, from 0 to 100. Providing 0 will do nothing, providing 100 will always return white.

```ts
new TinyColor('#f00').tint().toString(); // "#ff1a1a"
new TinyColor('#f00').tint(100).toString(); // "#ffffff"
```

### shade

Mix the color with pure black, from 0 to 100. Providing 0 will do nothing, providing 100 will always return black.

```ts
new TinyColor('#f00').shade().toString(); // "#e60000"
new TinyColor('#f00').shade(100).toString(); // "#000000"
```

### desaturate

`desaturate: function(amount = 10) -> TinyColor`. Desaturate the color a given amount, from 0 to 100. Providing 100 will is the same as calling `greyscale`.

```ts
new TinyColor('#f00').desaturate().toString(); // "#f20d0d"
new TinyColor('#f00').desaturate(100).toString(); // "#808080"
```

### saturate

`saturate: function(amount = 10) -> TinyColor`. Saturate the color a given amount, from 0 to 100.

```ts
new TinyColor('hsl(0, 10%, 50%)').saturate().toString(); // "hsl(0, 20%, 50%)"
```

### greyscale

`greyscale: function() -> TinyColor`. Completely desaturates a color into greyscale. Same as calling `desaturate(100)`.

```ts
new TinyColor('#f00').greyscale().toString(); // "#808080"
```

### spin

`spin: function(amount = 0) -> TinyColor`. Spin the hue a given amount, from -360 to 360. Calling with 0, 360, or -360 will do nothing (since it sets the hue back to what it was before).

```ts
new TinyColor('#f00').spin(180).toString(); // "#00ffff"
new TinyColor('#f00').spin(-90).toString(); // "#7f00ff"
new TinyColor('#f00').spin(90).toString(); // "#80ff00"

// spin(0) and spin(360) do nothing
new TinyColor('#f00').spin(0).toString(); // "#ff0000"
new TinyColor('#f00').spin(360).toString(); // "#ff0000"
```

### mix

`mix: function(amount = 50) => TinyColor`. Mix the current color a given amount with another color, from 0 to 100. 0 means no mixing (return current color).

```ts
let color1 = new TinyColor('#f0f');
let color2 = new TinyColor('#0f0');

color1.mix(color2).toHexString(); // #808080
```

### Color Combinations

Combination functions return an array of TinyColor objects unless otherwise noted.

### analogous

`analogous: function(results = 6, slices = 30) -> array<TinyColor>`.

```ts
const colors = new TinyColor('#f00').analogous();
colors.map(t => t.toHexString()); // [ "#ff0000", "#ff0066", "#ff0033", "#ff0000", "#ff3300", "#ff6600" ]
```

### monochromatic

`monochromatic: function(, results = 6) -> array<TinyColor>`.

```ts
const colors = new TinyColor('#f00').monochromatic();
colors.map(t => t.toHexString()); // [ "#ff0000", "#2a0000", "#550000", "#800000", "#aa0000", "#d40000" ]
```

### splitcomplement

`splitcomplement: function() -> array<TinyColor>`.

```ts
const colors = new TinyColor('#f00').splitcomplement();
colors.map(t => t.toHexString()); // [ "#ff0000", "#ccff00", "#0066ff" ]
```

### triad

`triad: function() -> array<TinyColor>`. Alias for `polyad(3)`.

```ts
const colors = new TinyColor('#f00').triad();
colors.map(t => t.toHexString()); // [ "#ff0000", "#00ff00", "#0000ff" ]
```

### tetrad

`tetrad: function() -> array<TinyColor>`. Alias for `polyad(4)`.

```ts
const colors = new TinyColor('#f00').tetrad();
colors.map(t => t.toHexString()); // [ "#ff0000", "#80ff00", "#00ffff", "#7f00ff" ]
```

### polyad

`polyad: function(number) -> array<TinyColor>`.

```ts
const colors = new TinyColor('#f00').polyad(4);
colors.map(t => t.toHexString()); // [ "#ff0000", "#80ff00", "#00ffff", "#7f00ff" ]
```

### complement

`complement: function() -> TinyColor`.

```ts
new TinyColor('#f00').complement().toHexString(); // "#00ffff"
```

## Color Utilities

### equals

```ts
let color1 = new TinyColor('red');
let color2 = new TinyColor('#f00');

color1.equals(color2); // true
```

### random

Returns a random TinyColor object. This is an implementation of [randomColor](https://github.com/davidmerfield/randomColor/) by David Merfield.
The difference input parsing and output formatting are handled by TinyColor.

You can pass an options object to influence the type of color it produces. The options object accepts the following properties:

* `hue` – Controls the hue of the generated color. You can pass a string representing a color name: `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink` and `monochrome` are currently supported. If you pass a hexidecimal color string such as #00FFFF, its hue value will be extracted and used to generate colors.
* `luminosity` – Controls the luminosity of the generated color. You can specify a string containing bright, light or dark.
* `count` – An integer which specifies the number of colors to generate.
* `seed` – An integer which when passed will cause randomColor to return the same color each time.
* `alpha` – A decimal between 0 and 1. Only relevant when using a format with an alpha channel (rgba and hsla). Defaults to a random value.

```ts
import { random } from '@ctrl/tinycolor';
// Returns a TinyColor for an attractive color
random();

// Returns an array of ten green colors
random({
  count: 10,
  hue: 'green',
});

// Returns a TinyColor object in a light blue
random({
  luminosity: 'light',
  hue: 'blue',
});

// Returns a TinyColor object in a 'truly random' color
random({
  luminosity: 'random',
  hue: 'random',
});

// Returns a dark RGB color with specified alpha
random({
  luminosity: 'dark',
  alpha: 0.5,
});
```

### Readability

TinyColor assesses readability based on the [Web Content Accessibility Guidelines (Version 2.0)](http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef).

#### readability

`readability: function(TinyColor, TinyColor) -> number`.
Returns the contrast ratio between two colors.

```ts
import { readability } from '@ctrl/tinycolor';
readability('#000', '#000'); // 1
readability('#000', '#111'); // 1.1121078324840545
readability('#000', '#fff'); // 21
```

Use the values in your own calculations, or use one of the convenience functions below.

#### isReadable

`isReadable: function(TinyColor, TinyColor, Object) -> Boolean`. Ensure that foreground and background color combinations meet WCAG guidelines. `Object` is optional, defaulting to `{level: "AA",size: "small"}`. `level` can be `"AA"` or "AAA" and `size` can be `"small"` or `"large"`.

Here are links to read more about the [AA](http://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html) and [AAA](http://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast7.html) requirements.

```ts
import { isReadable } from '@ctrl/tinycolor';
isReadable("#000", "#111"); // false
isReadable("#ff0088", "#5c1a72", { level: "AA", size: "small" }); // false
isReadable("#ff0088", "#5c1a72", { level: "AA", size: "large" }), // true
```

#### mostReadable

`mostReadable: function(TinyColor, [TinyColor, TinyColor ...], Object) -> Boolean`.
Given a base color and a list of possible foreground or background colors for that base, returns the most readable color.
If none of the colors in the list is readable, `mostReadable` will return the better of black or white if `includeFallbackColors:true`.

```ts
import { mostReadable } from '@ctrl/tinycolor';
mostReadable('#000', ['#f00', '#0f0', '#00f']).toHexString(); // "#00ff00"
mostReadable('#123', ['#124', '#125'], { includeFallbackColors: false }).toHexString(); // "#112255"
mostReadable('#123', ['#124', '#125'], { includeFallbackColors: true }).toHexString(); // "#ffffff"
mostReadable('#ff0088', ['#2e0c3a'], {
  includeFallbackColors: true,
  level: 'AAA',
  size: 'large',
}).toHexString(); // "#2e0c3a",
mostReadable('#ff0088', ['#2e0c3a'], {
  includeFallbackColors: true,
  level: 'AAA',
  size: 'small',
}).toHexString(); // "#000000",
```

See [index.html](https://github.com/bgrins/TinyColor/blob/master/index.html) in the project for a demo.

## Common operations

### clone

`clone: function() -> TinyColor`.
Instantiate a new TinyColor object with the same color. Any changes to the new one won't affect the old one.

```ts
const color1 = new TinyColor('#F00');
const color2 = color1.clone();
color2.setAlpha(0.5);

color1.toString(); // "#ff0000"
color2.toString(); // "rgba(255, 0, 0, 0.5)"
```
