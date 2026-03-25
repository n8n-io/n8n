1.25.0 / 2022-09-21

* fixed: windows support #846, #774, #594, #524, #528, #559, #652, #682 [piotr-cz](https://github.com/piotr-cz)
* docs; improvements from #821 [agokhale](https://github.com/agokhale)
* docs; improvements #801 [aarongarciah](https://github.com/aarongarciah)

1.24.0 / 2022-09-18

* fixed: infering format of buffered or streamed ico files #429 freund17
* fixed; preserve color info duing autoOrient() #714, #844 reco
* tests; switch to Github Actions
* docs; fix links #834 delesseps
* docs; clarify install directions #689 PatrykMiszczak
* refactor; clean up compare.js #788 LongTengDao

1.23.1 / 2017-12-27

 * fixed: use debug > 2.6.9 because of security issue #685 danez
 * tests; add nsp check
 * tests; get tests passing on OSX

1.23.0 / 2016-08-03

 * fixed; webpack support #547 sean-shirazi
 * fixed; windows support - use cross-spawn to spawn processes #537 bdukes
 * added; allow thumbnail to accept the same options as resize #527 Sebmaster
 * added; dispose support #487 dlwr
 * docs; add example of loading image from URL #544 wahengchang
 * docs; Fix a link in README.md #532 clbn
 * travis; update travis versions #551 amilajack

1.22.0 / 2016-04-07

 * fixed; identity parser: support multi-value keys by creating an array #508 #509 [emaniacs](https://github.com/emaniacs)
 * fixed; error handling if gm is not installed #499 [aeo3](https://github.com/aeo3)
 * fixed; highlightColor typo in compare #504 [DanielHudson](https://github.com/DanielHudson)
 * docs; Fix typo #475 [rodrigoalviani](https://github.com/rodrigoalviani)

1.21.1 / 2015-10-26

* fixed: Fixed #465 hard coded gm binary, also fixed issues with compare and fixed tests so they will fail on subsequent runs when they should do [rwky](https://github.com/rwky)

1.21.0 / 2015-10-26 **contains security fix**

* fixed: gm.compare fails to escape arguments properly (Reported by Brendan Scarvell) [rwky](https://github.com/rwky)

1.20.0 / 2015-09-23

* changed: Reverted "Add format inference from filename for buffers/streams" due to errors #448

1.19.0 / 2015-09-16

* changed: Added error to notify about image magick not supporting minify [encima](https://github.com/encima)
* changed: Refactored orientation getter to use faster identify call [lbeschastny](https://github.com/lbeschastny)
* added: resizeExact function [DanMMX](https://github.com/DanMMX)
* added: thumbExact function [DanMMX](https://github.com/DanMMX)
* added: Add format inference from filename for buffers/streams [adurrive](https://github.com/adurrive)
* fixed: Hex values when passed to compare aren't quoted automatically [DanMMX](https://github.com/DanMMX)
* fixed: identify returning last frame size instead of the larges on animated gifs [preynal](https://github.com/preynal)
* docs: Updated docs [laurilehmijoki](https://github.com/laurilehmijoki)

1.18.1 / 2015-05-18

* changed: Added io.js support [rwky](https://github.com/rwky)

1.18.0 / 2015-05-18

* changed: Removed support for node 0.8 and added support for 0.12 [rwky](https://github.com/rwky)
* changed: Listen to stdin error event for spawn errors [kapouer](https://github.com/kapouer)
* changed: Improved error handling when gm isn't installed [FreshXOpenSource](https://github.com/FreshXOpenSource)
* changed: Allow append method to use an array of arguments [emohacker](https://github.com/emohacker)
* changed: appPath option now specifies full path to gm binary John Borkowski
* changed: Ignore warning messages for identify [asrail](https://github.com/asrail)
* added: Montage method [donaldpcook](https://github.com/donaldpcook)
* added: Progressive option to thumb [mohebifar](https://github.com/mohebifar)
* added: Native gm auto-orient for use with gm >= 1.3.18 [bog](https://github.com/bog)
* added: Timeout support by passing the timeout option in milliseconds [marcbachmann](https://github.com/marcbachmann)
* fixed: density when using ImageMagick [syzer](https://github.com/syzer)
* fixed: resize behaviour for falsy values [adius](https://github.com/adius)


1.17.0 / 2014-10-28
==================

 * changed: extended compare callback also returns the file names #297 [mastix](https://github.com/mastix)
 * changed: pass spawn crash to callback #306 [medikoo](https://github.com/medikoo)
 * changed: geometry supports arbitary string as first argument #330 [jdiez17](https://github.com/jdiez17)
 * added: support for repage+ option #275 [desigens](https://github.com/desigens)
 * added: added the dissolve command #300 [microadm](https://github.com/microadam)
 * added: composite method #332 [jdiez17](https://github.com/jdiez17)
 * fixed: cannot set tolerance to 0 #302 [rwky](https://github.com/rwky)
 * fixed: handle empty buffers #330 [alcidesv](https://github.com/alcidesv)

1.16.0 / 2014-05-09
==================

 * fixed; dropped "+" when 0 passed as vertical roll amt #267 [dwtkns](https://github.com/dwtkns)
 * added; highlight-style support #272 [fdecampredon](https://github.com/fdecampredon)

1.15.0 / 2014-05-03
===================

 * changed; gm.compare logic to always run the mse comparison as expected #258 [Vokkim](https://github.com/Vokkim)
 * added; `tolerance` to gm.compare options object #258 [Vokkim](https://github.com/Vokkim)
 * added; option to set ImageMagick application path explicitly #250 (akreitals)
 * fixed; gm.compare: support values like 9.51582e-05 #260 [normanrz](https://github.com/normanrz)
 * README: add call for maintainers

1.14.2 / 2013-12-24
===================

* fixed; background is now a setting #246 (PEM--)

1.14.1 / 2013-12-09
===================

* fixed; identify -verbose colon behavior #240 ludow

1.14.0 / 2013-12-04
===================

* added; compare method for imagemagick (longlho)

1.13.3 / 2013-10-22
===================

* fixed; escape diffOptions.file in compare (dwabyick)

1.13.2 / 2013-10-18
===================

* fixed; density is a setting not an operator

1.13.1 / 2013-09-15
===================

* added; boolean for % crop

1.13.0 / 2013-09-07
===================

* added; morph more than two images (overra)

1.12.2 / 2013-08-29
===================

* fixed; fallback to through in node 0.8

1.12.1 / 2013-08-29 (unpublished)
===================

* refactor; replace through with stream.PassThrough

1.12.0 / 2013-08-27
===================

* added; diff image output file (chenglou)

1.11.1 / 2013-08-17
===================

* added; proto.selectFrame(#)
* fixed; getters should not ignore frame selection

1.11.0 / 2013-07-23
===================

* added; optional formatting string for gm().identify(format, callback) (tornillo)
* removed; error messages when gm/im binary is not installed

1.10.0 / 2013-06-27
===================

* refactor; use native `-auto-orient` for imagemagick

1.9.2 / 2013-06-12
==================

  * refactor; move `streamToBuffer` to a separate module
  * fixed; .stream(format) without a callback

1.9.1 / 2013-05-07
==================

  * fixed; gm().resize(width) always only resizes width
  * fixed; gm('img.gif').format() returns the format of the first frame

1.9.0 / 2013-04-21
==================

  * added; node v0.10 support
  * removed; node < v0.8 support - `Buffer.concat()`
  * tests; all tests now run on Travis
  * added; gm().stream() returns a stream when no callback is present
  * added; gm().toBuffer(callback)
  * fixed; gm().size() only returns the size of the first frame of a GIF

1.8.2 / 2013-03-07
==================

  * include source path in identify data #126 [soupdiver](https://github.com/soupdiver)

1.8.1 / 2012-12-21
==================

  * Avoid losing already set arguments on identify #105 #113 #109 [JNissi](https://github.com/JNissi)
  * tests; add autoOrient + thumb() test
  * tests; add test case for #113
  * tests; added test for #109
  * tests; add resize on buffer test

1.8.0 / 2012-12-14
==================

  * added; geometry support to scale() #98
  * removed; incorrect/broken dissolve() method (never worked)
  * fixed; handle child_proc error when using Buffer input #109
  * fixed; use of Buffers with identify() #109
  * fixed; no longer include -size arg with resize() #98
  * fixed; remove -size arg from extent() #103
  * fixed; magnify support
  * fixed; autoOrient to work with all types of exif orientations [dambalah](https://github.com/dambalah) #108
  * tests; npm test runs unit only (now compatible with travis)
  * tests; fix magnify test on imagemagick
  * tests; added for cmd line args

1.7.0 / 2012-12-06
==================

  * added; gm.compare support
  * added; passing Buffers directly [danmilon](https://github.com/danmilon)

1.6.1 / 2012-11-13
==================

  * fixed regression; only pass additional params on error #96

1.6.0 / 2012-11-10
==================

  * changed; rename internal buffer to _buffer #88 [kof](https://github.com/kof)
  * changed; optimized identify getters (format, depth, size, color, filesize). #83 please read this for details: https://github.com/aheckmann/gm/commit/8fcf3f8f84a02cc2001da874cbebb89bf7084409
  * added; visionmedia/debug support
  * added; `gm convert -thumbnail` support. _differs from thumb()._ [danmilon](https://github.com/danmilon)
  * fixed; -rotate 0 support #90
  * fixed; multi-execution of same gm instance arguments corruption
  * fixed; gracefully handle parser errors #94 [eldilibra](https://github.com/eldilibra)

1.5.1 / 2012-10-02
==================

  * fixed; passing multiple paths to append() #77

1.5.0 / 2012-09-15
==================

  * fixed; callback scope
  * fixed; append() usage #77

1.4.2 / 2012-08-17
==================

  * fixed; identify parsing for ImageMagick exif data (#58)
  * fixed; when in imageMagick mode, complain about missing imageMagick [bcherry](https://github.com/bcherry) (#73)
  * added; tests

1.4.1 / 2012-07-31
==================

  * fixed; scenes() args
  * fixed; accept the left-to-right arg of append()
  * added; _subCommand

## v1.4 - 07/28/2012

  * added; adjoin() [Math-]
  * added; affine() [Math-]
  * added; append() [Math-]
  * added; authenticate() [Math-]
  * added; average() [Math-]
  * added; backdrop() [Math-]
  * added; blackThreshold() [Math-]
  * added; bluePrimary() [Math-]
  * added; border() [Math-]
  * added; borderColor() [Math-]
  * added; box() [Math-]
  * added; channel() [Math-]
  * added; clip() [Math-]
  * added; coalesce() [Math-]
  * added; colorMap() [Math-]
  * added; compose() [Math-]
  * added; compress() [Math-]
  * added; convolve() [Math-]
  * added; createDirectories() [Math-]
  * added; deconstruct() [Math-]
  * added; delay() [Math-]
  * added; define() [Math-]
  * added; displace() [Math-]
  * added; display() [Math-]
  * added; dispose() [Math-]
  * added; disolve() [Math-]
  * added; encoding() [Math-]
  * added; endian() [Math-]
  * added; file() [Math-]
  * added; flatten() [Math-]
  * added; foreground() [Math-]
  * added; frame() [Math-]
  * added; fuzz() [Math-]
  * added; gaussian() [Math-]
  * added; geometry() [Math-]
  * added; greenPrimary() [Math-]
  * added; highlightColor() [Math-]
  * added; highlightStyle() [Math-]
  * added; iconGeometry() [Math-]
  * added; intent() [Math-]
  * added; lat() [Math-]
  * added; level() [Math-]
  * added; list() [Math-]
  * added; log() [Math-]
  * added; map() [Math-]
  * added; matte() [Math-]
  * added; matteColor() [Math-]
  * added; mask() [Math-]
  * added; maximumError() [Math-]
  * added; mode() [Math-]
  * added; monitor() [Math-]
  * added; mosaic() [Math-]
  * added; motionBlur() [Math-]
  * added; name() [Math-]
  * added; noop() [Math-]
  * added; normalize() [Math-]
  * added; opaque() [Math-]
  * added; operator() [Math-]
  * added; orderedDither() [Math-]
  * added; outputDirectory() [Math-]
  * added; page() [Math-]
  * added; pause() [Math-]
  * added; pen() [Math-]
  * added; ping() [Math-]
  * added; pointSize() [Math-]
  * added; preview() [Math-]
  * added; process() [Math-]
  * added; profile() [Math-]
  * added; progress() [Math-]
  * added; rawSize() [Math-]
  * added; randomThreshold() [Math-]
  * added; recolor() [Math-]
  * added; redPrimary() [Math-]
  * added; remote() [Math-]
  * added; render() [Math-]
  * added; repage() [Math-]
  * added; sample() [Math-]
  * added; samplingFactor() [Math-]
  * added; scene() [Math-]
  * added; scenes() [Math-]
  * added; screen() [Math-]
  * added; segment() [Math-]
  * added; set() [Math-]
  * added; shade() [Math-]
  * added; shadow() [Math-]
  * added; sharedMemory() [Math-]
  * added; shave() [Math-]
  * added; shear() [Math-]
  * added; silent() [Math-]
  * added; snaps() [Math-]
  * added; stagano() [Math-]
  * added; stereo() [Math-]
  * added; textFont() [Math-]
  * added; texture() [Math-]
  * added; threshold() [Math-]
  * added; tile() [Math-]
  * added; transform() [Math-]
  * added; transparent() [Math-]
  * added; treeDepth() [Math-]
  * added; update() [Math-]
  * added; units() [Math-]
  * added; unsharp() [Math-]
  * added; usePixmap() [Math-]
  * added; view() [Math-]
  * added; virtualPixel() [Math-]
  * added; visual() [Math-]
  * added; watermark() [Math-]
  * added; wave() [Math-]
  * added; whitePoint() [Math-]
  * added; whiteThreshold() [Math-]
  * added; window() [Math-]
  * added; windowGroup() [Math-]

## v1.3.2 - 06/22/2012

  * added; node >= 0.7/0.8 compat

## v1.3.1 - 06/06/2012

  * fixed; thumb() alignment and cropping [thomaschaaf]
  * added; hint when graphicsmagick is not installed (#62)
  * fixed; minify() (#59)

## v1.3.0 - 04/11/2012

  * added; flatten support [jwarchol]
  * added; background support [jwarchol]
  * fixed; identify parser error [chriso]

## v1.2.0 - 03/30/2012

  * added; extent and gravity support [jwarchol]

## v1.1.0 - 03/15/2012

  * added; filter() support [travisbeck]
  * added; density() [travisbeck]
  * fixed; permit either width or height in resize [dambalah]
  * updated; docs

## v1.0.5 - 02/15/2012

  * added; strip() support [Math-]
  * added; interlace() support [Math-]
  * added; setFormat() support [Math-]
  * fixed; regexps for image types [Math-]

## v1.0.4 - 02/09/2012

  * expose utils

## v1.0.3 - 01/27/2012

  * removed; console.log

## v1.0.2 - 01/24/2012

  * added; debugging info on parser errors
  * fixed; exports.version

## v1.0.1 - 01/12/2012

  * fixed; use of reserved keyword `super` for node v0.5+

## v1.0.0 - 01/12/2012

  * added; autoOrient support [kainosnoema] (#21)
  * added; orientation support [kainosnoema] (#21)
  * fixed; identify parser now properly JSON formats all data output by `gm identify` such as IPTC, GPS, Make, etc (#20)
  * added; support for running as imagemagick (#23, #29)
  * added; subclassing support; useful for setting default constructor options like one constructor for ImageMagick, the other for GM
  * added; more tests
  * changed; remove redundant `orientation`, `resolution`, and `filesize` from `this.data` in `indentify()`. Use their uppercase equivalents.

## v0.6.0 - 12/14/2011

  * added; stream support [kainosnoema] (#22)

## v0.5.0 - 07/07/2011

  * added; gm#trim() support [lepokle]
  * added; gm#inputIs() support
  * fixed; 'geometry does not contain image' error: gh-17

## v0.4.3 - 05/17/2011

  * added; bunch of tests
  * fixed; polygon, polyline, bezier drawing bug

## v0.4.2 - 05/10/2011

  * added; resize options support

## v0.4.1 - 04/28/2011

  * shell args are now escaped (thanks @visionmedia)
  * added; gm.in()
  * added; gm.out()
  * various refactoring

## v0.4.0 - 9/21/2010

  * removed deprecated `new` method
  * added drawing docs

## v0.3.2 - 9/06/2010

  * new images are now created using same gm() constructor

## v0.3.1 - 9/06/2010

  * can now create images from scratch
  * add type method

## v0.3.0 - 8/26/2010

  * add drawing api

## v0.2.2 - 8/22/2010

  * add quality option to thumb()
  * add teropa to contributors
  * added support for colorspace()

## v0.2.1 - 7/31/2010

  * fixed naming conflict. depth() manipulation method renamed bitdepth()
  * added better docs

## v0.2.0 - 7/29/2010

new methods

  - swirl
  - spread
  - solarize
  - sharpen
  - roll
  - sepia
  - region
  - raise
  - lower
  - paint
  - noise
  - negative
  - morph
  - median
  - antialias
  - limit
  - label
  - implode
  - gamma
  - enhance
  - equalize
  - emboss
  - edge
  - dither
  - monochrome
  - despeckle
  - depth
  - cycle
  - contrast
  - comment
  - colors

added more default args to several methods
added more examples


## v0.1.2 - 7/28/2010

  * refactor project into separate modules


## v0.1.1 - 7/27/2010

  * add modulate method
  * add colorize method
  * add charcoal method
  * add chop method
  * bug fix in write without a callback


## v0.1.0 - 6/27/2010

  * no longer supporting mogrify
  * add image data getter methods

    * size
    * format
    * color
    * res
    * depth
    * filesize
    * identify

  * add new convert methods

    * scale
    * resample
    * rotate
    * flip
    * flop
    * crop
    * magnify
    * minify
    * quality
    * blur
    * thumb


## v0.0.1 - 6/11/2010
Initial release
