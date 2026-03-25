
# gm [![Build Status](https://travis-ci.org/aheckmann/gm.png?branch=master)](https://travis-ci.org/aheckmann/gm)  [![NPM Version](https://img.shields.io/npm/v/gm.svg?style=flat)](https://www.npmjs.org/package/gm)

GraphicsMagick and ImageMagick for node

## Bug Reports

When reporting bugs please include the version of graphicsmagick/imagemagick you're using (gm -version/convert -version) as well as the version of this module and copies of any images you're having problems with.

## Getting started
First download and install [GraphicsMagick](http://www.graphicsmagick.org/) or [ImageMagick](http://www.imagemagick.org/). In Mac OS X, you can simply use [Homebrew](http://mxcl.github.io/homebrew/) and do:

    brew install imagemagick
    brew install graphicsmagick

then either use npm:

    npm install gm

or clone the repo:

    git clone git://github.com/aheckmann/gm.git


## Use ImageMagick instead of gm

Subclass `gm` to enable [ImageMagick 7+](https://imagemagick.org/script/porting.php)

```js
const fs = require('fs')
const gm = require('gm').subClass({ imageMagick: '7+' });
```

Or, to enable ImageMagick legacy mode (for ImageMagick version < 7)

```js
const fs = require('fs')
const gm = require('gm').subClass({ imageMagick: true });
```

## Specify the executable path

Optionally specify the path to the executable.

```js
const fs = require('fs')
const gm = require('gm').subClass({
  appPath: String.raw`C:\Program Files\ImageMagick-7.1.0-Q16-HDRI\magick.exe`
});
```

## Basic Usage

```js
var fs = require('fs')
  , gm = require('gm');

// resize and remove EXIF profile data
gm('/path/to/my/img.jpg')
.resize(240, 240)
.noProfile()
.write('/path/to/resize.png', function (err) {
  if (!err) console.log('done');
});

// some files would not be resized appropriately
// http://stackoverflow.com/questions/5870466/imagemagick-incorrect-dimensions
// you have two options:
// use the '!' flag to ignore aspect ratio
gm('/path/to/my/img.jpg')
.resize(240, 240, '!')
.write('/path/to/resize.png', function (err) {
  if (!err) console.log('done');
});

// use the .resizeExact with only width and/or height arguments
gm('/path/to/my/img.jpg')
.resizeExact(240, 240)
.write('/path/to/resize.png', function (err) {
  if (!err) console.log('done');
});

// obtain the size of an image
gm('/path/to/my/img.jpg')
.size(function (err, size) {
  if (!err)
    console.log(size.width > size.height ? 'wider' : 'taller than you');
});

// output all available image properties
gm('/path/to/img.png')
.identify(function (err, data) {
  if (!err) console.log(data)
});

// pull out the first frame of an animated gif and save as png
gm('/path/to/animated.gif[0]')
.write('/path/to/firstframe.png', function (err) {
  if (err) console.log('aaw, shucks');
});

// auto-orient an image
gm('/path/to/img.jpg')
.autoOrient()
.write('/path/to/oriented.jpg', function (err) {
  if (err) ...
})

// crazytown
gm('/path/to/my/img.jpg')
.flip()
.magnify()
.rotate('green', 45)
.blur(7, 3)
.crop(300, 300, 150, 130)
.edge(3)
.write('/path/to/crazy.jpg', function (err) {
  if (!err) console.log('crazytown has arrived');
})

// annotate an image
gm('/path/to/my/img.jpg')
.stroke("#ffffff")
.drawCircle(10, 10, 20, 10)
.font("Helvetica.ttf", 12)
.drawText(30, 20, "GMagick!")
.write("/path/to/drawing.png", function (err) {
  if (!err) console.log('done');
});

// creating an image
gm(200, 400, "#ddff99f3")
.drawText(10, 50, "from scratch")
.write("/path/to/brandNewImg.jpg", function (err) {
  // ...
});
```

## Streams

```js
// passing a stream
var readStream = fs.createReadStream('/path/to/my/img.jpg');
gm(readStream, 'img.jpg')
.write('/path/to/reformat.png', function (err) {
  if (!err) console.log('done');
});


// passing a downloadable image by url

var request = require('request');
var url = "www.abc.com/pic.jpg"

gm(request(url))
.write('/path/to/reformat.png', function (err) {
  if (!err) console.log('done');
});


// can also stream output to a ReadableStream
// (can be piped to a local file or remote server)
gm('/path/to/my/img.jpg')
.resize('200', '200')
.stream(function (err, stdout, stderr) {
  var writeStream = fs.createWriteStream('/path/to/my/resized.jpg');
  stdout.pipe(writeStream);
});

// without a callback, .stream() returns a stream
// this is just a convenience wrapper for above.
var writeStream = fs.createWriteStream('/path/to/my/resized.jpg');
gm('/path/to/my/img.jpg')
.resize('200', '200')
.stream()
.pipe(writeStream);

// pass a format or filename to stream() and
// gm will provide image data in that format
gm('/path/to/my/img.jpg')
.stream('png', function (err, stdout, stderr) {
  var writeStream = fs.createWriteStream('/path/to/my/reformatted.png');
  stdout.pipe(writeStream);
});

// or without the callback
var writeStream = fs.createWriteStream('/path/to/my/reformatted.png');
gm('/path/to/my/img.jpg')
.stream('png')
.pipe(writeStream);

// combine the two for true streaming image processing
var readStream = fs.createReadStream('/path/to/my/img.jpg');
gm(readStream)
.resize('200', '200')
.stream(function (err, stdout, stderr) {
  var writeStream = fs.createWriteStream('/path/to/my/resized.jpg');
  stdout.pipe(writeStream);
});

// GOTCHA:
// when working with input streams and any 'identify'
// operation (size, format, etc), you must pass "{bufferStream: true}" if
// you also need to convert (write() or stream()) the image afterwards
// NOTE: this buffers the readStream in memory!
var readStream = fs.createReadStream('/path/to/my/img.jpg');
gm(readStream)
.size({bufferStream: true}, function(err, size) {
  this.resize(size.width / 2, size.height / 2)
  this.write('/path/to/resized.jpg', function (err) {
    if (!err) console.log('done');
  });
});

```

## Buffers

```js
// A buffer can be passed instead of a filepath as well
var buf = require('fs').readFileSync('/path/to/image.jpg');

gm(buf, 'image.jpg')
.noise('laplacian')
.write('/path/to/out.jpg', function (err) {
  if (err) return handle(err);
  console.log('Created an image from a Buffer!');
});

/*
A buffer can also be returned instead of a stream
The first argument to toBuffer is optional, it specifies the image format
*/
gm('img.jpg')
.resize(100, 100)
.toBuffer('PNG',function (err, buffer) {
  if (err) return handle(err);
  console.log('done!');
})
```

## Custom Arguments

If `gm` does not supply you with a method you need or does not work as you'd like, you can simply use `gm().in()` or `gm().out()` to set your own arguments.

- `gm().command()` - Custom command such as `identify` or `convert`
- `gm().in()` - Custom input arguments
- `gm().out()` - Custom output arguments

The command will be formatted in the following order:

1. `command` - ie `convert`
2. `in` - the input arguments
3. `source` - stdin or an image file
4. `out` - the output arguments
5. `output` - stdout or the image file to write to

For example, suppose you want the following command:

```bash
gm "convert" "label:Offline" "PNG:-"
```

However, using `gm().label()` may not work as intended for you:

```js
gm()
.label('Offline')
.stream();
```

would yield:

```bash
gm "convert" "-label" "\"Offline\"" "PNG:-"
```

Instead, you can use `gm().out()`:

```js
gm()
.out('label:Offline')
.stream();
```

which correctly yields:

```bash
gm "convert" "label:Offline" "PNG:-"
```

### Custom Identify Format String

When identifying an image, you may want to use a custom formatting string instead of using `-verbose`, which is quite slow.
You can use your own [formatting string](http://www.imagemagick.org/script/escape.php) when using `gm().identify(format, callback)`.
For example,

```js
gm('img.png').format(function (err, format) {

})

// is equivalent to

gm('img.png').identify('%m', function (err, format) {

})
```

since `%m` is the format option for getting the image file format.

## Platform differences

Please document and refer to any [platform or ImageMagick/GraphicsMagick issues/differences here](https://github.com/aheckmann/gm/wiki/GraphicsMagick-and-ImageMagick-versions).

## Examples:

  Check out the [examples](http://github.com/aheckmann/gm/tree/master/examples/) directory to play around.
  Also take a look at the [extending gm](http://wiki.github.com/aheckmann/gm/extending-gm)
  page to see how to customize gm to your own needs.

## Constructor:

  There are a few ways you can use the `gm` image constructor.

  - 1) `gm(path)` When you pass a string as the first argument it is interpreted as the path to an image you intend to manipulate.
  - 2) `gm(stream || buffer, [filename])` You may also pass a ReadableStream or Buffer as the first argument, with an optional file name for format inference.
  - 3) `gm(width, height, [color])` When you pass two integer arguments, gm will create a new image on the fly with the provided dimensions and an optional background color. And you can still chain just like you do with pre-existing images too. See [here](http://github.com/aheckmann/gm/blob/master/examples/new.js) for an example.

The links below refer to an older version of gm but everything should still work, if anyone feels like updating them please make a PR

## Methods

  - getters
    - [size](http://aheckmann.github.io/gm/docs.html#getters) - returns the size (WxH) of the image
    - [orientation](http://aheckmann.github.io/gm/docs.html#getters) - returns the EXIF orientation of the image
    - [format](http://aheckmann.github.io/gm/docs.html#getters) - returns the image format (gif, jpeg, png, etc)
    - [depth](http://aheckmann.github.io/gm/docs.html#getters) - returns the image color depth
    - [color](http://aheckmann.github.io/gm/docs.html#getters) - returns the number of colors
    - [res](http://aheckmann.github.io/gm/docs.html#getters)   - returns the image resolution
    - [filesize](http://aheckmann.github.io/gm/docs.html#getters) - returns image filesize
    - [identify](http://aheckmann.github.io/gm/docs.html#getters) - returns all image data available. Takes an optional format string.

  - manipulation
    - [adjoin](http://aheckmann.github.io/gm/docs.html#adjoin)
    - [affine](http://aheckmann.github.io/gm/docs.html#affine)
    - [antialias](http://aheckmann.github.io/gm/docs.html#antialias)
    - [append](http://aheckmann.github.io/gm/docs.html#append)
    - [authenticate](http://aheckmann.github.io/gm/docs.html#authenticate)
    - [autoOrient](http://aheckmann.github.io/gm/docs.html#autoOrient)
    - [average](http://aheckmann.github.io/gm/docs.html#average)
    - [backdrop](http://aheckmann.github.io/gm/docs.html#backdrop)
    - [bitdepth](http://aheckmann.github.io/gm/docs.html#bitdepth)
    - [blackThreshold](http://aheckmann.github.io/gm/docs.html#blackThreshold)
    - [bluePrimary](http://aheckmann.github.io/gm/docs.html#bluePrimary)
    - [blur](http://aheckmann.github.io/gm/docs.html#blur)
    - [border](http://aheckmann.github.io/gm/docs.html#border)
    - [borderColor](http://aheckmann.github.io/gm/docs.html#borderColor)
    - [box](http://aheckmann.github.io/gm/docs.html#box)
    - [channel](http://aheckmann.github.io/gm/docs.html#channel)
    - [charcoal](http://aheckmann.github.io/gm/docs.html#charcoal)
    - [chop](http://aheckmann.github.io/gm/docs.html#chop)
    - [clip](http://aheckmann.github.io/gm/docs.html#clip)
    - [coalesce](http://aheckmann.github.io/gm/docs.html#coalesce)
    - [colors](http://aheckmann.github.io/gm/docs.html#colors)
    - [colorize](http://aheckmann.github.io/gm/docs.html#colorize)
    - [colorMap](http://aheckmann.github.io/gm/docs.html#colorMap)
    - [colorspace](http://aheckmann.github.io/gm/docs.html#colorspace)
    - [comment](http://aheckmann.github.io/gm/docs.html#comment)
    - [compose](http://aheckmann.github.io/gm/docs.html#compose)
    - [compress](http://aheckmann.github.io/gm/docs.html#compress)
    - [contrast](http://aheckmann.github.io/gm/docs.html#contrast)
    - [convolve](http://aheckmann.github.io/gm/docs.html#convolve)
    - [createDirectories](http://aheckmann.github.io/gm/docs.html#createDirectories)
    - [crop](http://aheckmann.github.io/gm/docs.html#crop)
    - [cycle](http://aheckmann.github.io/gm/docs.html#cycle)
    - [deconstruct](http://aheckmann.github.io/gm/docs.html#deconstruct)
    - [delay](http://aheckmann.github.io/gm/docs.html#delay)
    - [define](http://aheckmann.github.io/gm/docs.html#define)
    - [density](http://aheckmann.github.io/gm/docs.html#density)
    - [despeckle](http://aheckmann.github.io/gm/docs.html#despeckle)
    - [dither](http://aheckmann.github.io/gm/docs.html#dither)
    - [displace](http://aheckmann.github.io/gm/docs.html#dither)
    - [display](http://aheckmann.github.io/gm/docs.html#display)
    - [dispose](http://aheckmann.github.io/gm/docs.html#dispose)
    - [dissolve](http://aheckmann.github.io/gm/docs.html#dissolve)
    - [edge](http://aheckmann.github.io/gm/docs.html#edge)
    - [emboss](http://aheckmann.github.io/gm/docs.html#emboss)
    - [encoding](http://aheckmann.github.io/gm/docs.html#encoding)
    - [enhance](http://aheckmann.github.io/gm/docs.html#enhance)
    - [endian](http://aheckmann.github.io/gm/docs.html#endian)
    - [equalize](http://aheckmann.github.io/gm/docs.html#equalize)
    - [extent](http://aheckmann.github.io/gm/docs.html#extent)
    - [file](http://aheckmann.github.io/gm/docs.html#file)
    - [filter](http://aheckmann.github.io/gm/docs.html#filter)
    - [flatten](http://aheckmann.github.io/gm/docs.html#flatten)
    - [flip](http://aheckmann.github.io/gm/docs.html#flip)
    - [flop](http://aheckmann.github.io/gm/docs.html#flop)
    - [foreground](http://aheckmann.github.io/gm/docs.html#foreground)
    - [frame](http://aheckmann.github.io/gm/docs.html#frame)
    - [fuzz](http://aheckmann.github.io/gm/docs.html#fuzz)
    - [gamma](http://aheckmann.github.io/gm/docs.html#gamma)
    - [gaussian](http://aheckmann.github.io/gm/docs.html#gaussian)
    - [geometry](http://aheckmann.github.io/gm/docs.html#geometry)
    - [gravity](http://aheckmann.github.io/gm/docs.html#gravity)
    - [greenPrimary](http://aheckmann.github.io/gm/docs.html#greenPrimary)
    - [highlightColor](http://aheckmann.github.io/gm/docs.html#highlightColor)
    - [highlightStyle](http://aheckmann.github.io/gm/docs.html#highlightStyle)
    - [iconGeometry](http://aheckmann.github.io/gm/docs.html#iconGeometry)
    - [implode](http://aheckmann.github.io/gm/docs.html#implode)
    - [intent](http://aheckmann.github.io/gm/docs.html#intent)
    - [interlace](http://aheckmann.github.io/gm/docs.html#interlace)
    - [label](http://aheckmann.github.io/gm/docs.html#label)
    - [lat](http://aheckmann.github.io/gm/docs.html#lat)
    - [level](http://aheckmann.github.io/gm/docs.html#level)
    - [list](http://aheckmann.github.io/gm/docs.html#list)
    - [limit](http://aheckmann.github.io/gm/docs.html#limit)
    - [log](http://aheckmann.github.io/gm/docs.html#log)
    - [loop](http://aheckmann.github.io/gm/docs.html#loop)
    - [lower](http://aheckmann.github.io/gm/docs.html#lower)
    - [magnify](http://aheckmann.github.io/gm/docs.html#magnify)
    - [map](http://aheckmann.github.io/gm/docs.html#map)
    - [matte](http://aheckmann.github.io/gm/docs.html#matte)
    - [matteColor](http://aheckmann.github.io/gm/docs.html#matteColor)
    - [mask](http://aheckmann.github.io/gm/docs.html#mask)
    - [maximumError](http://aheckmann.github.io/gm/docs.html#maximumError)
    - [median](http://aheckmann.github.io/gm/docs.html#median)
    - [minify](http://aheckmann.github.io/gm/docs.html#minify)
    - [mode](http://aheckmann.github.io/gm/docs.html#mode)
    - [modulate](http://aheckmann.github.io/gm/docs.html#modulate)
    - [monitor](http://aheckmann.github.io/gm/docs.html#monitor)
    - [monochrome](http://aheckmann.github.io/gm/docs.html#monochrome)
    - [morph](http://aheckmann.github.io/gm/docs.html#morph)
    - [mosaic](http://aheckmann.github.io/gm/docs.html#mosaic)
    - [motionBlur](http://aheckmann.github.io/gm/docs.html#motionBlur)
    - [name](http://aheckmann.github.io/gm/docs.html#name)
    - [negative](http://aheckmann.github.io/gm/docs.html#negative)
    - [noise](http://aheckmann.github.io/gm/docs.html#noise)
    - [noop](http://aheckmann.github.io/gm/docs.html#noop)
    - [normalize](http://aheckmann.github.io/gm/docs.html#normalize)
    - [noProfile](http://aheckmann.github.io/gm/docs.html#profile)
    - [opaque](http://aheckmann.github.io/gm/docs.html#opaque)
    - [operator](http://aheckmann.github.io/gm/docs.html#operator)
    - [orderedDither](http://aheckmann.github.io/gm/docs.html#orderedDither)
    - [outputDirectory](http://aheckmann.github.io/gm/docs.html#outputDirectory)
    - [paint](http://aheckmann.github.io/gm/docs.html#paint)
    - [page](http://aheckmann.github.io/gm/docs.html#page)
    - [pause](http://aheckmann.github.io/gm/docs.html#pause)
    - [pen](http://aheckmann.github.io/gm/docs.html#pen)
    - [ping](http://aheckmann.github.io/gm/docs.html#ping)
    - [pointSize](http://aheckmann.github.io/gm/docs.html#pointSize)
    - [preview](http://aheckmann.github.io/gm/docs.html#preview)
    - [process](http://aheckmann.github.io/gm/docs.html#process)
    - [profile](http://aheckmann.github.io/gm/docs.html#profile)
    - [progress](http://aheckmann.github.io/gm/docs.html#progress)
    - [quality](http://aheckmann.github.io/gm/docs.html#quality)
    - [raise](http://aheckmann.github.io/gm/docs.html#raise)
    - [rawSize](http://aheckmann.github.io/gm/docs.html#rawSize)
    - [randomThreshold](http://aheckmann.github.io/gm/docs.html#randomThreshold)
    - [recolor](http://aheckmann.github.io/gm/docs.html#recolor)
    - [redPrimary](http://aheckmann.github.io/gm/docs.html#redPrimary)
    - [region](http://aheckmann.github.io/gm/docs.html#region)
    - [remote](http://aheckmann.github.io/gm/docs.html#remote)
    - [render](http://aheckmann.github.io/gm/docs.html#render)
    - [repage](http://aheckmann.github.io/gm/docs.html#repage)
    - [resample](http://aheckmann.github.io/gm/docs.html#resample)
    - [resize](http://aheckmann.github.io/gm/docs.html#resize)
    - [roll](http://aheckmann.github.io/gm/docs.html#roll)
    - [rotate](http://aheckmann.github.io/gm/docs.html#rotate)
    - [sample](http://aheckmann.github.io/gm/docs.html#sample)
    - [samplingFactor](http://aheckmann.github.io/gm/docs.html#samplingFactor)
    - [scale](http://aheckmann.github.io/gm/docs.html#scale)
    - [scene](http://aheckmann.github.io/gm/docs.html#scene)
    - [scenes](http://aheckmann.github.io/gm/docs.html#scenes)
    - [screen](http://aheckmann.github.io/gm/docs.html#screen)
    - [segment](http://aheckmann.github.io/gm/docs.html#segment)
    - [sepia](http://aheckmann.github.io/gm/docs.html#sepia)
    - [set](http://aheckmann.github.io/gm/docs.html#set)
    - [setFormat](http://aheckmann.github.io/gm/docs.html#setformat)
    - [shade](http://aheckmann.github.io/gm/docs.html#shade)
    - [shadow](http://aheckmann.github.io/gm/docs.html#shadow)
    - [sharedMemory](http://aheckmann.github.io/gm/docs.html#sharedMemory)
    - [sharpen](http://aheckmann.github.io/gm/docs.html#sharpen)
    - [shave](http://aheckmann.github.io/gm/docs.html#shave)
    - [shear](http://aheckmann.github.io/gm/docs.html#shear)
    - [silent](http://aheckmann.github.io/gm/docs.html#silent)
    - [solarize](http://aheckmann.github.io/gm/docs.html#solarize)
    - [snaps](http://aheckmann.github.io/gm/docs.html#snaps)
    - [stegano](http://aheckmann.github.io/gm/docs.html#stegano)
    - [stereo](http://aheckmann.github.io/gm/docs.html#stereo)
    - [strip](http://aheckmann.github.io/gm/docs.html#strip) _imagemagick only_
    - [spread](http://aheckmann.github.io/gm/docs.html#spread)
    - [swirl](http://aheckmann.github.io/gm/docs.html#swirl)
    - [textFont](http://aheckmann.github.io/gm/docs.html#textFont)
    - [texture](http://aheckmann.github.io/gm/docs.html#texture)
    - [threshold](http://aheckmann.github.io/gm/docs.html#threshold)
    - [thumb](http://aheckmann.github.io/gm/docs.html#thumb)
    - [tile](http://aheckmann.github.io/gm/docs.html#tile)
    - [transform](http://aheckmann.github.io/gm/docs.html#transform)
    - [transparent](http://aheckmann.github.io/gm/docs.html#transparent)
    - [treeDepth](http://aheckmann.github.io/gm/docs.html#treeDepth)
    - [trim](http://aheckmann.github.io/gm/docs.html#trim)
    - [type](http://aheckmann.github.io/gm/docs.html#type)
    - [update](http://aheckmann.github.io/gm/docs.html#update)
    - [units](http://aheckmann.github.io/gm/docs.html#units)
    - [unsharp](http://aheckmann.github.io/gm/docs.html#unsharp)
    - [usePixmap](http://aheckmann.github.io/gm/docs.html#usePixmap)
    - [view](http://aheckmann.github.io/gm/docs.html#view)
    - [virtualPixel](http://aheckmann.github.io/gm/docs.html#virtualPixel)
    - [visual](http://aheckmann.github.io/gm/docs.html#visual)
    - [watermark](http://aheckmann.github.io/gm/docs.html#watermark)
    - [wave](http://aheckmann.github.io/gm/docs.html#wave)
    - [whitePoint](http://aheckmann.github.io/gm/docs.html#whitePoint)
    - [whiteThreshold](http://aheckmann.github.io/gm/docs.html#whiteThreshold)
    - [window](http://aheckmann.github.io/gm/docs.html#window)
    - [windowGroup](http://aheckmann.github.io/gm/docs.html#windowGroup)

  - drawing primitives
    - [draw](http://aheckmann.github.io/gm/docs.html#draw)
    - [drawArc](http://aheckmann.github.io/gm/docs.html#drawArc)
    - [drawBezier](http://aheckmann.github.io/gm/docs.html#drawBezier)
    - [drawCircle](http://aheckmann.github.io/gm/docs.html#drawCircle)
    - [drawEllipse](http://aheckmann.github.io/gm/docs.html#drawEllipse)
    - [drawLine](http://aheckmann.github.io/gm/docs.html#drawLine)
    - [drawPoint](http://aheckmann.github.io/gm/docs.html#drawPoint)
    - [drawPolygon](http://aheckmann.github.io/gm/docs.html#drawPolygon)
    - [drawPolyline](http://aheckmann.github.io/gm/docs.html#drawPolyline)
    - [drawRectangle](http://aheckmann.github.io/gm/docs.html#drawRectangle)
    - [drawText](http://aheckmann.github.io/gm/docs.html#drawText)
    - [fill](http://aheckmann.github.io/gm/docs.html#fill)
    - [font](http://aheckmann.github.io/gm/docs.html#font)
    - [fontSize](http://aheckmann.github.io/gm/docs.html#fontSize)
    - [stroke](http://aheckmann.github.io/gm/docs.html#stroke)
    - [strokeWidth](http://aheckmann.github.io/gm/docs.html#strokeWidth)
    - [setDraw](http://aheckmann.github.io/gm/docs.html#setDraw)

  - image output
    - **write** - writes the processed image data to the specified filename
    - **stream** - provides a `ReadableStream` with the processed image data
    - **toBuffer** - returns the image as a `Buffer` instead of a stream

## compare

Graphicsmagicks `compare` command is exposed through `gm.compare()`. This allows us to determine if two images can be considered "equal".

Currently `gm.compare` only accepts file paths.

    gm.compare(path1, path2 [, options], callback)

```js
gm.compare('/path/to/image1.jpg', '/path/to/another.png', function (err, isEqual, equality, raw, path1, path2) {
  if (err) return handle(err);

  // if the images were considered equal, `isEqual` will be true, otherwise, false.
  console.log('The images were equal: %s', isEqual);

  // to see the total equality returned by graphicsmagick we can inspect the `equality` argument.
  console.log('Actual equality: %d', equality);

  // inspect the raw output
  console.log(raw);

  // print file paths
  console.log(path1, path2);
})
```

You may wish to pass a custom tolerance threshold to increase or decrease the default level of `0.4`.


```js
gm.compare('/path/to/image1.jpg', '/path/to/another.png', 1.2, function (err, isEqual) {
  ...
})
```

To output a diff image, pass a configuration object to define the diff options and tolerance.


```js
var options = {
  file: '/path/to/diff.png',
  highlightColor: 'yellow',
  tolerance: 0.02
}
gm.compare('/path/to/image1.jpg', '/path/to/another.png', options, function (err, isEqual, equality, raw) {
  ...
})
```

## composite

GraphicsMagick supports compositing one image on top of another. This is exposed through `gm.composite()`. Its first argument is an image path with the changes to the base image, and an optional mask image.

Currently, `gm.composite()` only accepts file paths.

    gm.composite(other [, mask])

```js
gm('/path/to/image.jpg')
.composite('/path/to/second_image.jpg')
.geometry('+100+150')
.write('/path/to/composite.png', function(err) {
    if(!err) console.log("Written composite image.");
});
```

## montage

GraphicsMagick supports montage for combining images side by side. This is exposed through `gm.montage()`. Its only argument is an image path with the changes to the base image.

Currently, `gm.montage()` only accepts file paths.

    gm.montage(other)

```js
gm('/path/to/image.jpg')
.montage('/path/to/second_image.jpg')
.geometry('+100+150')
.write('/path/to/montage.png', function(err) {
    if(!err) console.log("Written montage image.");
});
```

## Contributors
[https://github.com/aheckmann/gm/contributors](https://github.com/aheckmann/gm/contributors)

## Inspiration
http://github.com/quiiver/magickal-node

## Plugins
[https://github.com/aheckmann/gm/wiki](https://github.com/aheckmann/gm/wiki)

## Tests
`npm test`

To run a single test:

```
npm test -- alpha.js
```

## License

(The MIT License)

Copyright (c) 2010 [Aaron Heckmann](aaron.heckmann+github@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
