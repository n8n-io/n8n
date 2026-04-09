# color-convert

Color-convert is a color conversion library for JavaScript and node.
It converts all ways between `rgb`, `hsl`, `hsv`, `hwb`, `cmyk`, `ansi`, `ansi16`, `hex` strings, and CSS `keyword`s (will round to closest):

```js
import convert from 'color-convert';

convert.rgb.hsl(140, 200, 100);             // [96, 48, 59]
convert.keyword.rgb('blue');                // [0, 0, 255]

const rgbChannels = convert.rgb.channels;     // 3
const cmykChannels = convert.cmyk.channels;   // 4
const ansiChannels = convert.ansi16.channels; // 1
```

# Install

```sh
npm install color-convert
```

# API

Simply get the property of the _from_ and _to_ conversion that you're looking for.

All functions have a rounded and unrounded variant. By default, return values are rounded. To get the unrounded (raw) results, simply tack on `.raw` to the function.

All 'from' functions have a hidden property called `.channels` that indicates the number of channels the function expects (not including alpha).

```js
import convert from 'color-convert';

// Hex to LAB
convert.hex.lab('DEADBF');         // [ 76, 21, -2 ]
convert.hex.lab.raw('DEADBF');     // [ 75.56213190997677, 20.653827952644754, -2.290532499330533 ]

// RGB to CMYK
convert.rgb.cmyk(167, 255, 4);     // [ 35, 0, 98, 0 ]
convert.rgb.cmyk.raw(167, 255, 4); // [ 34.509803921568626, 0, 98.43137254901961, 0 ]
```

### Arrays
All functions that accept multiple arguments also support passing an array.

Note that this does **not** apply to functions that convert from a color that only requires one value (e.g. `keyword`, `ansi256`, `hex`, etc.)

```js
import convert from 'color-convert';

convert.rgb.hex(123, 45, 67);      // '7B2D43'
convert.rgb.hex([123, 45, 67]);    // '7B2D43'
```

## Routing

Conversions that don't have an _explicitly_ defined conversion (in [conversions.js](conversions.js)), but can be converted by means of sub-conversions (e.g. XYZ -> **RGB** -> CMYK), are automatically routed together. This allows just about any color model supported by `color-convert` to be converted to any other model, so long as a sub-conversion path exists. This is also true for conversions requiring more than one step in between (e.g. LCH -> **LAB** -> **XYZ** -> **RGB** -> Hex).

Keep in mind that extensive conversions _may_ result in a loss of precision, and exist only to be complete. For a list of "direct" (single-step) conversions, see [conversions.js](conversions.js).

## Color Space Scales
Conversions rely on an agreed upon 'full-scale' value for each of the channels. Listed here are those values for the most common color spaces

### rgb
channel | full-scale value
---|---
r | 255
g | 255
b | 255

### hsl
channel | full-scale value
---|---
h | 360
s | 100
l | 100

### hsv
channel | full-scale value
---|---
h | 360
s | 100
v | 100

### hwb
channel | full-scale value
---|---
h | 360
w | 100
b | 100

### xyz
channel | full-scale value
---|---
x | 94
y | 99
z | 108

### lab
channel | full-scale value
---|---
l | 100
a | -86, 98
b | -108, 94

### lch
channel | full-scale value
---|---
l | 100
c | 133
h | 360

### oklab
channel | full-scale value
---|---
l | 100
a | -23, 28
b | -31, 20

### oklch
channel | full-scale value
---|---
l | 100
c | 32
h | 360

### cmyk
channel | full-scale value
---|---
c | 100
m | 100
y | 100
k | 100

### hex
channel | full-scale value
---|---
hex | ```0xffffff```

### keyword
channel | value
---|---
name | any key from [color-name](https://github.com/colorjs/color-name/blob/master/index.js)

### apple
channel | full-scale value
---|---
0 | 65535
1 | 65535
2 | 65535

### gray
channel | full-scale value
---|---
gray | 100

# Contribute

If there is a new model you would like to support, or want to add a direct conversion between two existing models, please send us a pull request.

# License
Copyright &copy; 2011-2016, Heather Arthur.
Copyright &copy; 2016-2021, Josh Junon.

Licensed under the [MIT License](LICENSE).
