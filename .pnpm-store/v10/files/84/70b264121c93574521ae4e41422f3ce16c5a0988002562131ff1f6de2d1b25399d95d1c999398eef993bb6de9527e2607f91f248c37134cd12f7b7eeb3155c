# color

> JavaScript library for immutable color conversion and manipulation with support for CSS color strings.

```js
const color = Color('#7743CE').alpha(0.5).lighten(0.5);
console.log(color.hsl().string());  // 'hsla(262, 59%, 81%, 0.5)'

console.log(color.cmyk().round().array());  // [ 16, 25, 0, 8, 0.5 ]

console.log(color.ansi256().object());  // { ansi256: 183, alpha: 0.5 }
```

## Install
```shell
npm install color
```

## Usage
```js
import Color from 'color';
```

### Constructors
```js
// string constructor
const color = Color('rgb(255, 255, 255)')                       // { model: 'rgb', color: [ 255, 255, 255 ], valpha: 1 }
const color = Color('hsl(194, 53%, 79%)')                       // { model: 'hsl', color: [ 195, 53, 79 ], valpha: 1 }
const color = Color('hsl(194, 53%, 79%, 0.5)')                  // { model: 'hsl', color: [ 195, 53, 79 ], valpha: 0.5 }
const color = Color('#FF0000')                                  // { model: 'rgb', color: [ 255, 0, 0 ], valpha: 1 }
const color = Color('#FF000033')                                // { model: 'rgb', color: [ 255, 0, 0 ], valpha: 0.2 }
const color = Color('lightblue')                                // { model: 'rgb', color: [ 173, 216, 230 ], valpha: 1 }
const color = Color('purple')                                   // { model: 'rgb', color: [ 128, 0, 128 ], valpha: 1 }

// rgb
const color = Color({r: 255, g: 255, b: 255})                   // { model: 'rgb', color: [ 255, 255, 255 ], valpha: 1 }
const color = Color({r: 255, g: 255, b: 255, alpha: 0.5})       // { model: 'rgb', color: [ 255, 255, 255 ], valpha: 0.5 }
const color = Color.rgb(255, 255, 255)                          // { model: 'rgb', color: [ 255, 255, 255 ], valpha: 1 }
const color = Color.rgb(255, 255, 255, 0.5)                     // { model: 'rgb', color: [ 255, 255, 255 ], valpha: 0.5 }
const color = Color.rgb(0xFF, 0x00, 0x00, 0.5)                  // { model: 'rgb', color: [ 255, 0, 0 ], valpha: 0.5 }
const color = Color.rgb([255, 255, 255])                        // { model: 'rgb', color: [ 255, 255, 255 ], valpha: 1 }
const color = Color.rgb([0xFF, 0x00, 0x00, 0.5])                // { model: 'rgb', color: [ 255, 0, 0 ], valpha: 0.5 }

// hsl
const color = Color({h: 194, s: 53, l: 79})                     // { model: 'hsl', color: [ 195, 53, 79 ], valpha: 1 }
const color = Color({h: 194, s: 53, l: 79, alpha: 0.5})         // { model: 'hsl', color: [ 195, 53, 79 ], valpha: 0.5 }
const color = Color.hsl(194, 53, 79)                            // { model: 'hsl', color: [ 195, 53, 79 ], valpha: 1 }

// hsv
const color = Color({h: 195, s: 25, v: 99})                     // { model: 'hsv', color: [ 195, 25, 99 ], valpha: 1 }
const color = Color({h: 195, s: 25, v: 99, alpha: 0.5})         // { model: 'hsv', color: [ 195, 25, 99 ], valpha: 0.5 }
const color = Color.hsv(195, 25, 99)                            // { model: 'hsv', color: [ 195, 25, 99 ], valpha: 1 }
const color = Color.hsv([195, 25, 99])                          // { model: 'hsv', color: [ 195, 25, 99 ], valpha: 1 }

// cmyk
const color = Color({c: 0, m: 100, y: 100, k: 0})               // { model: 'cmyk', color: [ 0, 100, 100, 0 ], valpha: 1 }
const color = Color({c: 0, m: 100, y: 100, k: 0, alpha: 0.5})   // { model: 'cmyk', color: [ 0, 100, 100, 0 ], valpha: 0.5 }
const color = Color.cmyk(0, 100, 100, 0)                        // { model: 'cmyk', color: [ 0, 100, 100, 0 ], valpha: 1 }
const color = Color.cmyk(0, 100, 100, 0, 0.5)                   // { model: 'cmyk', color: [ 0, 100, 100, 0 ], valpha: 0.5 }

// hwb
const color = Color({h: 180, w: 0, b: 0})                       // { model: 'hwb', color: [ 180, 0, 0 ], valpha: 1 }
const color = Color.hwb(180, 0, 0)                              // { model: 'hwb', color: [ 180, 0, 0 ], valpha: 1 }

// lch
const color = Color({l: 53, c: 105, h: 40})                     // { model: 'lch', color: [ 53, 105, 40 ], valpha: 1 }
const color = Color.lch(53, 105, 40)                            // { model: 'lch', color: [ 53, 105, 40 ], valpha: 1 }

// lab
const color = Color({l: 53, a: 80, b: 67})                      // { model: 'lab', color: [ 53, 80, 67 ], valpha: 1 }
const color = Color.lab(53, 80, 67)                             // { model: 'lab', color: [ 53, 80, 67 ], valpha: 1 }

// hcg
const color = Color({h: 0, c: 100, g: 0})                       // { model: 'hcg', color: [ 0, 100, 0 ], valpha: 1 }
const color = Color.hcg(0, 100, 0)                              // { model: 'hcg', color: [ 0, 100, 0 ], valpha: 1 }

// ansi16
const color = Color.ansi16(91)                                  // { model: 'ansi16', color: [ 91 ], valpha: 1 }
const color = Color.ansi16(91, 0.5)                             // { model: 'ansi16', color: [ 91 ], valpha: 0.5 }

// ansi256
const color = Color.ansi256(196)                                // { model: 'ansi256', color: [ 196 ], valpha: 1 }
const color = Color.ansi256(196, 0.5)                           // { model: 'ansi256', color: [ 196 ], valpha: 0.5 }

// apple
const color = Color.apple(65535, 65535, 65535)                  // { model: 'apple', color: [ 65535, 65535, 65535 ], valpha: 1 }
const color = Color.apple([65535, 65535, 65535])                // { model: 'apple', color: [ 65535, 65535, 65535 ], valpha: 1 }


```

Set the values for individual channels with `alpha`, `red`, `green`, `blue`, `hue`, `saturationl` (hsl), `saturationv` (hsv), `lightness`, `whiteness`, `blackness`, `cyan`, `magenta`, `yellow`, `black`

String constructors are handled by [color-string](https://www.npmjs.com/package/color-string)

### Getters
```js
color.hsl()
```
Convert a color to a different space (`hsl()`, `cmyk()`, etc.).

```js
color.object() // {r: 255, g: 255, b: 255}
```
Get a hash of the color value. Reflects the color's current model (see above).

```js
color.rgb().array() // [255, 255, 255]
```
Get an array of the values with `array()`. Reflects the color's current model (see above).

```js
color.rgbNumber() // 16777215 (0xffffff)
```
Get the rgb number value.

```js
color.hex() // #ffffff
```
Get the hex value. (**NOTE:** `.hex()` does not return alpha values; use `.hexa()` for an RGBA representation)

```js
color.red() // 255
```
Get the value for an individual channel.

### CSS Strings
```js
color.hsl().string() // 'hsl(320, 50%, 100%)'
```

Calling `.string()` with a number rounds the numbers to that decimal place. It defaults to 1.

### Luminosity
```js
color.luminosity(); // 0.412
```
The [WCAG luminosity](http://www.w3.org/TR/WCAG20/#relativeluminancedef) of the color. 0 is black, 1 is white.

```js
color.contrast(Color("blue")) // 12
```
The [WCAG contrast ratio](http://www.w3.org/TR/WCAG20/#contrast-ratiodef) to another color, from 1 (same color) to 21 (contrast b/w white and black).

```js
color.isLight()  // true
color.isDark()   // false
```
Get whether the color is "light" or "dark", useful for deciding text color.

### Manipulation
```js
color.negate()         // rgb(0, 100, 255) -> rgb(255, 155, 0)

color.lighten(0.5)     // hsl(100, 50%, 50%) -> hsl(100, 50%, 75%)
color.lighten(0.5)     // hsl(100, 50%, 0)   -> hsl(100, 50%, 0)
color.darken(0.5)      // hsl(100, 50%, 50%) -> hsl(100, 50%, 25%)
color.darken(0.5)      // hsl(100, 50%, 0)   -> hsl(100, 50%, 0)

color.lightness(50)    // hsl(100, 50%, 10%) -> hsl(100, 50%, 50%)

color.saturate(0.5)    // hsl(100, 50%, 50%) -> hsl(100, 75%, 50%)
color.desaturate(0.5)  // hsl(100, 50%, 50%) -> hsl(100, 25%, 50%)
color.grayscale()      // #5CBF54 -> #969696

color.whiten(0.5)      // hwb(100, 50%, 50%) -> hwb(100, 75%, 50%)
color.blacken(0.5)     // hwb(100, 50%, 50%) -> hwb(100, 50%, 75%)

color.fade(0.5)        // rgba(10, 10, 10, 0.8) -> rgba(10, 10, 10, 0.4)
color.opaquer(0.5)     // rgba(10, 10, 10, 0.8) -> rgba(10, 10, 10, 1.0)

color.rotate(180)      // hsl(60, 20%, 20%) -> hsl(240, 20%, 20%)
color.rotate(-90)      // hsl(60, 20%, 20%) -> hsl(330, 20%, 20%)

color.mix(Color("yellow"))        // cyan -> rgb(128, 255, 128)
color.mix(Color("yellow"), 0.3)   // cyan -> rgb(77, 255, 179)

// chaining
color.green(100).grayscale().lighten(0.6)
```

## Propers
The API was inspired by [color-js](https://github.com/brehaut/color-js). Manipulation functions by CSS tools like Sass, LESS, and Stylus.
