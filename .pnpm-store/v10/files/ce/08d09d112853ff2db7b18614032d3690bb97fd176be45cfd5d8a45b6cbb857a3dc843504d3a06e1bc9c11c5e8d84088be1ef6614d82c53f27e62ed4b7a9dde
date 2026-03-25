/**
 * Dependencies
 */

var argsToArray = require('./utils').argsToArray;
var isUtil = require('./utils').isUtil;
/**
 * Extend proto
 */

module.exports = function (proto) {
  // change the specified frame.
  // See #202.
  proto.selectFrame = function (frame) {
    if (typeof frame === 'number')
      this.sourceFrames = '[' + frame + ']';
    return this;
  }

  // define the sub-command to use, http://www.graphicsmagick.org/utilities.html
  proto.command = proto.subCommand = function subCommand (name){
    this._subCommand = name;
    return this;
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-adjoin
  proto.adjoin = function adjoin () {
    return this.out("-adjoin");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-affine
  proto.affine = function affine (matrix) {
    return this.out("-affine", matrix);
  }

  proto.alpha = function alpha (type) {
    if (!this._options.imageMagick) return new Error('Method -alpha is not supported by GraphicsMagick');
    return this.out('-alpha', type);
  }

  /**
   * Appends images to the list of "source" images.
   *
   * We may also specify either top-to-bottom or left-to-right
   * behavior of the appending by passing a boolean argument.
   *
   * Examples:
   *
   *    img = gm(src);
   *
   *    // +append means left-to-right
   *    img.append(img1, img2)       gm convert src img1 img2 -append
   *    img.append(img, true)        gm convert src img +append
   *    img.append(img, false)       gm convert src img -append
   *    img.append(img)              gm convert src img -append
   *    img.append(img).append()     gm convert src img -append
   *    img.append(img).append(true) gm convert src img +append
   *    img.append(img).append(true) gm convert src img +append
   *    img.append(img).background('#222) gm convert src img -background #222 +append
   *    img.append([img1,img2...],true)

   * @param {String} or {Array} [img]
   * @param {Boolean} [ltr]
   * @see http://www.graphicsmagick.org/GraphicsMagick.html#details-append
   */

  proto.append = function append (img, ltr) {
    if (!this._append) {
      this._append = [];
      this.addSrcFormatter(function (src) {
        this.out(this._append.ltr ? '+append' : '-append');
        src.push.apply(src, this._append);
      });
    }

    if (0 === arguments.length) {
      this._append.ltr = false;
      return this;
    }

    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      switch (isUtil(arg)) {
        case 'Boolean':
          this._append.ltr = arg;
          break;
        case 'String':
          this._append.push(arg);
          break;
        case 'Array':
          for(var j=0,len=arg.length;j<len;j++){
            if(isUtil(arg[j]) == 'String'){
              this._append.push(arg[j]);
            }
          }
          break;
      }
    }

    return this;
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-authenticate
  proto.authenticate = function authenticate (string) {
    return this.out("-authenticate", string);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-average
  proto.average = function average () {
    return this.out("-average");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-backdrop
  proto.backdrop = function backdrop () {
    return this.out("-backdrop");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-black-threshold
  proto.blackThreshold = function blackThreshold (red, green, blue, opacity) {
    return this.out("-black-threshold", argsToArray(red, green, blue, opacity).join(','));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-blue-primary
  proto.bluePrimary = function bluePrimary (x, y) {
    return this.out("-blue-primary", argsToArray(x, y).join(','));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-border
  proto.border = function border (width, height) {
    return this.out("-border", width+"x"+height);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-bordercolor
  proto.borderColor = function borderColor (color) {
    return this.out("-bordercolor", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-box
  proto.box = function box (color) {
    return this.out("-box", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-channel
  proto.channel = function channel (type) {
    return this.out("-channel", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-chop
  proto.chop = function chop (w, h, x, y) {
    return this.in("-chop", w+"x"+h + "+"+(x||0)+"+"+(y||0));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-clip
  proto.clip = function clip () {
    return this.out("-clip");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-coalesce
  proto.coalesce = function coalesce () {
    return this.out("-coalesce");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-colorize
  proto.colorize = function colorize (r, g, b) {
    return this.out("-colorize", [r,g,b].join(","));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-colormap
  proto.colorMap = function colorMap (type) {
    return this.out("-colormap", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-compose
  proto.compose = function compose (operator) {
    return this.out("-compose", operator);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-compress
  proto.compress = function compress (type) {
    return this.out("-compress", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-kernel
  proto.convolve = function convolve (kernel) {
    return this.out("-convolve", kernel);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-create-directories
  proto.createDirectories = function createDirectories () {
    return this.out("-create-directories");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-deconstruct
  proto.deconstruct = function deconstruct () {
    return this.out("-deconstruct");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-define
  proto.define = function define (value) {
    return this.out("-define", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-delay
  proto.delay = function delay (value) {
    return this.out("-delay", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-displace
  proto.displace = function displace (horizontalScale, verticalScale) {
    return this.out("-displace", horizontalScale+'x'+verticalScale);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-display
  proto.display = function display (value) {
    return this.out("-display", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-dispose
  proto.dispose = function dispose (method) {
    return this.out("-dispose", method);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-dissolve
  proto.dissolve = function dissolve (percent) {
    return this.out("-dissolve", percent+'%');
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-encoding
  proto.encoding = function encoding (type) {
    return this.out("-encoding", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-endian
  proto.endian = function endian (type) {
    return this.out("-endian", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-file
  proto.file = function file (filename) {
    return this.out("-file", filename);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-flatten
  proto.flatten = function flatten () {
    return this.out("-flatten");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-foreground
  proto.foreground = function foreground (color) {
    return this.out("-foreground", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-frame
  proto.frame = function frame (width, height, outerBevelWidth, innerBevelWidth) {
    if(arguments.length==0) return this.out("-frame");
    return this.out("-frame", width+'x'+height+'+'+outerBevelWidth+'+'+innerBevelWidth);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-fuzz
  proto.fuzz = function fuzz (distance, percent) {
    return this.out("-fuzz", distance+(percent?'%':''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-gaussian
  proto.gaussian = function gaussian (radius, sigma) {
    return this.out("-gaussian", argsToArray(radius, sigma).join('x'));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-geometry
  proto.geometry = function geometry (width, height, arg) {
    // If the first argument is a string, and there is only one argument, this is a custom geometry command.
    if(arguments.length == 1 && typeof arguments[0] === "string")
      return this.out("-geometry", arguments[0]);

    // Otherwise, return a resizing geometry command with an option alrgument.
    return this.out("-geometry", width+'x'+height+(arg||''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-green-primary
  proto.greenPrimary = function greenPrimary (x, y) {
    return this.out("-green-primary", x+','+y);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-highlight-color
  proto.highlightColor = function highlightColor (color) {
    return this.out("-highlight-color", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-highlight-style
  proto.highlightStyle = function highlightStyle (style) {
    return this.out("-highlight-style", style);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-iconGeometry
  proto.iconGeometry = function iconGeometry (geometry) {
    return this.out("-iconGeometry", geometry);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-intent
  proto.intent = function intent (type) {
    return this.out("-intent", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-lat
  proto.lat = function lat (width, height, offset, percent) {
    return this.out("-lat", width+'x'+height+offset+(percent?'%':''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-level
  proto.level = function level (blackPoint, gamma, whitePoint, percent) {
    return this.out("-level", argsToArray(blackPoint, gamma, whitePoint).join(',')+(percent?'%':''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-list
  proto.list = function list (type) {
    return this.out("-list", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-log
  proto.log = function log (string) {
    return this.out("-log", string);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-loop
  proto.loop = function loop (iterations) {
    return this.out("-loop", iterations);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-map
  proto.map = function map (filename) {
    return this.out("-map", filename);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-mask
  proto.mask = function mask (filename) {
    return this.out("-mask", filename);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-matte
  proto.matte = function matte () {
    return this.out("-matte");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-mattecolor
  proto.matteColor = function matteColor (color) {
    return this.out("-mattecolor", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-maximum-error
  proto.maximumError = function maximumError (limit) {
    return this.out("-maximum-error", limit);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-mode
  proto.mode = function mode (value) {
    return this.out("-mode", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-monitor
  proto.monitor = function monitor () {
    return this.out("-monitor");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-mosaic
  proto.mosaic = function mosaic () {
    return this.out("-mosaic");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-motion-blur
  proto.motionBlur = function motionBlur (radius, sigma, angle) {
    var arg=radius;
    if (typeof sigma!='undefined') arg+='x'+sigma;
    if (typeof angle!='undefined') arg+='+'+angle;
    return this.out("-motion-blur", arg);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-name
  proto.name = function name () {
    return this.out("-name");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-noop
  proto.noop = function noop () {
    return this.out("-noop");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-normalize
  proto.normalize = function normalize () {
    return this.out("-normalize");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-opaque
  proto.opaque = function opaque (color) {
    return this.out("-opaque", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-operator
  proto.operator = function operator (channel, operator, rvalue, percent) {
    return this.out("-operator", channel, operator, rvalue+(percent?'%':''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-ordered-dither
  proto.orderedDither = function orderedDither (channeltype, NxN) {
    return this.out("-ordered-dither", channeltype, NxN);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-output-directory
  proto.outputDirectory = function outputDirectory (directory) {
    return this.out("-output-directory", directory);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-page
  proto.page = function page (width, height, arg) {
    return this.out("-page", width+'x'+height+(arg||''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-pause
  proto.pause = function pause (seconds) {
    return this.out("-pause", seconds);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-pen
  proto.pen = function pen (color) {
    return this.out("-pen", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-ping
  proto.ping = function ping () {
    return this.out("-ping");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-pointsize
  proto.pointSize = function pointSize (value) {
    return this.out("-pointsize", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-preview
  proto.preview = function preview (type) {
    return this.out("-preview", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-process
  proto.process = function process (command) {
    return this.out("-process", command);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-profile
  proto.profile = function profile (filename) {
    return this.out("-profile", filename);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-progress
  proto.progress = function progress () {
    return this.out("+progress");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-random-threshold
  proto.randomThreshold = function randomThreshold (channeltype, LOWxHIGH) {
    return this.out("-random-threshold", channeltype, LOWxHIGH);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-recolor
  proto.recolor = function recolor (matrix) {
    return this.out("-recolor", matrix);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-red-primary
  proto.redPrimary = function redPrimary (x, y) {
    return this.out("-red-primary", x, y);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-remote
  proto.remote = function remote () {
    return this.out("-remote");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-render
  proto.render = function render () {
    return this.out("-render");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-repage
  proto.repage = function repage (width, height, xoff, yoff, arg) {
    if (arguments[0] === "+") return this.out("+repage");
    return this.out("-repage", width+'x'+height+'+'+xoff+'+'+yoff+(arg||''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-sample
  proto.sample = function sample (geometry) {
    return this.out("-sample", geometry);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-sampling-factor
  proto.samplingFactor = function samplingFactor (horizontalFactor, verticalFactor) {
    return this.out("-sampling-factor", horizontalFactor+'x'+verticalFactor);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-scene
  proto.scene = function scene (value) {
    return this.out("-scene", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-scenes
  proto.scenes = function scenes (start, end) {
    return this.out("-scenes", start+'-'+end);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-screen
  proto.screen = function screen () {
    return this.out("-screen");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-set
  proto.set = function set (attribute, value) {
    return this.out("-set", attribute, value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-segment
  proto.segment = function segment (clusterThreshold, smoothingThreshold) {
    return this.out("-segment", clusterThreshold+'x'+smoothingThreshold);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-shade
  proto.shade = function shade (azimuth, elevation) {
    return this.out("-shade", azimuth+'x'+elevation);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-shadow
  proto.shadow = function shadow (radius, sigma) {
    return this.out("-shadow", argsToArray(radius, sigma).join('x'));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-shared-memory
  proto.sharedMemory = function sharedMemory () {
    return this.out("-shared-memory");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-shave
  proto.shave = function shave (width, height, percent) {
    return this.out("-shave", width+'x'+height+(percent?'%':''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-shear
  proto.shear = function shear (xDegrees, yDegreees) {
    return this.out("-shear", xDegrees+'x'+yDegreees);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-silent
  proto.silent = function silent (color) {
    return this.out("-silent");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-size
  proto.rawSize = function rawSize (width, height, offset) {
    var off = 'undefined' != typeof offset
      ? '+' + offset
      : '';
    return this.out("-size", width +'x'+ height + off);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-snaps
  proto.snaps = function snaps (value) {
    return this.out("-snaps", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-stegano
  proto.stegano = function stegano (offset) {
    return this.out("-stegano", offset);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-stereo
  proto.stereo = function stereo () {
    return this.out("-stereo");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-text-font
  proto.textFont = function textFont (name) {
    return this.out("-text-font", name);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-texture
  proto.texture = function texture (filename) {
    return this.out("-texture", filename);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-threshold
  proto.threshold = function threshold (value, percent) {
    return this.out("-threshold", value+(percent?'%':''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-thumbnail
  proto.thumbnail = function thumbnail (w, h, options) {
    options = options || "";
    var geometry,
      wIsValid = Boolean(w || w === 0),
      hIsValid = Boolean(h || h === 0);

    if (wIsValid && hIsValid) {
      geometry = w + "x" + h + options
    } else if (wIsValid) {
      // GraphicsMagick requires <width>x<options>, ImageMagick requires <width><options>
      geometry = (this._options.imageMagick) ? w + options : w +
        'x' + options;
    } else if (hIsValid) {
      geometry = 'x' + h + options
    } else {
      return this
    }

    return this.out("-thumbnail", geometry);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-tile
  proto.tile = function tile (filename) {
    return this.out("-tile", filename);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-title
  proto.title = function title (string) {
    return this.out("-title", string);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-transform
  proto.transform = function transform (color) {
    return this.out("-transform", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-transparent
  proto.transparent = function transparent (color) {
    return this.out("-transparent", color);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-treedepth
  proto.treeDepth = function treeDepth (value) {
    return this.out("-treedepth", value);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-update
  proto.update = function update (seconds) {
    return this.out("-update", seconds);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-units
  proto.units = function units (type) {
    return this.out("-units", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-unsharp
  proto.unsharp = function unsharp (radius, sigma, amount, threshold) {
    var arg=radius;
    if (typeof sigma != 'undefined') arg+='x'+sigma;
    if (typeof amount != 'undefined') arg+='+'+amount;
    if (typeof threshold != 'undefined') arg+='+'+threshold;
    return this.out("-unsharp", arg);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-use-pixmap
  proto.usePixmap = function usePixmap () {
    return this.out("-use-pixmap");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-view
  proto.view = function view (string) {
    return this.out("-view", string);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-virtual-pixel
  proto.virtualPixel = function virtualPixel (method) {
    return this.out("-virtual-pixel", method);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-visual
  proto.visual = function visual (type) {
    return this.out("-visual", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-watermark
  proto.watermark = function watermark (brightness, saturation) {
    return this.out("-watermark", brightness+'x'+saturation);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-wave
  proto.wave = function wave (amplitude, wavelength) {
    return this.out("-wave", amplitude+'x'+wavelength);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-white-point
  proto.whitePoint = function whitePoint (x, y) {
    return this.out("-white-point", x+'x'+y);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-white-threshold
  proto.whiteThreshold = function whiteThreshold (red, green, blue, opacity) {
    return this.out("-white-threshold", argsToArray(red, green, blue, opacity).join(','));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-window
  proto.window = function window (id) {
    return this.out("-window", id);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-window-group
  proto.windowGroup = function windowGroup () {
    return this.out("-window-group");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-strip (graphicsMagick >= 1.3.15)
  proto.strip = function strip () {
    if (this._options.imageMagick) return this.out("-strip");
    return this.noProfile().out("+comment");//Equivalent to "-strip" for all versions of graphicsMagick
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-interlace
  proto.interlace = function interlace (type) {
    return this.out("-interlace", type || "None");
  }

  // force output format
  proto.setFormat = function setFormat (format) {
    if (format) this._outputFormat = format;
    return this;
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-resize
  proto.resize = function resize (w, h, options) {
    options = options || "";
    var geometry,
      wIsValid = Boolean(w || w === 0),
      hIsValid = Boolean(h || h === 0);

    if (wIsValid && hIsValid) {
      geometry = w + "x" + h + options
    } else if (wIsValid) {
      // GraphicsMagick requires <width>x<options>, ImageMagick requires <width><options>
      geometry = (this._options.imageMagick) ? w + options : w +
        'x' + options;
    } else if (hIsValid) {
      geometry = 'x' + h + options
    } else {
      return this
    }

    return this.out("-resize", geometry);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-resize with '!' option
  proto.resizeExact = function resize (w, h) {
    var options = "!";
    return proto.resize.apply(this, [w, h, options]);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-scale
  proto.scale = function scale (w, h, options) {
    options = options || "";
    var geometry;
    if (w && h) {
      geometry = w + "x" + h + options
    } else if (w && !h) {
      geometry = (this._options.imageMagick) ? w + options : w + 'x' + options;
    } else if (!w && h) {
      geometry = 'x' + h + options
    }

    return this.out("-scale", geometry);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-filter
  proto.filter = function filter (val) {
    return this.out("-filter", val);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-density
  proto.density = function density (w, h) {
    if (w && !h && this._options.imageMagick) {
      // GraphicsMagick requires <width>x<height>y, ImageMagick may take dpi<resolution>
      // recommended 300dpi for higher quality
      return this.in("-density", w);
    }
    return this.in("-density", w +"x"+ h);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-profile
  proto.noProfile = function noProfile () {
    this.out('+profile', '"*"');
    return this;
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-resample
  proto.resample = function resample (w, h) {
    return this.out("-resample", w+"x"+h);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-rotate
  proto.rotate = function rotate (color, deg) {
    return this.out("-background", color, "-rotate", String(deg || 0));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-flip
  proto.flip = function flip () {
    return this.out("-flip");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-flop
  proto.flop = function flop () {
    return this.out("-flop");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-crop
  proto.crop = function crop (w, h, x, y, percent) {
    if (this.inputIs('jpg')) {
      // avoid error "geometry does not contain image (unable to crop image)" - gh-17
      var index = this._in.indexOf('-size');
      if (~index) {
        this._in.splice(index, 2);
      }
    }

    return this.out("-crop", w + "x" + h + "+" + (x || 0) + "+" + (y || 0) + (percent ? '%' : ''));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-magnify
  proto.magnify = function magnify (factor) {
    return this.in("-magnify");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.minify = function minify () {
    return this.in("-minify")
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-quality
  proto.quality = function quality (val) {
    return this.in("-quality", val || 75);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-blur
  proto.blur = function blur (radius, sigma) {
    return this.out("-blur", radius + (sigma ? "x"+sigma : ""));
  }

  // http://www.graphicsmagick.org/convert.html
  proto.charcoal = function charcoal (factor) {
    return this.out("-charcoal", factor || 2);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-modulate
  proto.modulate = function modulate (b, s, h) {
    return this.out("-modulate", [b,s,h].join(","));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-antialias
  // note: antialiasing is enabled by default
  proto.antialias = function antialias (disable) {
    return false === disable
      ? this.out("+antialias")
      : this;
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-depth
  proto.bitdepth = function bitdepth (val) {
    return this.out("-depth", val);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-colors
  proto.colors = function colors (val) {
    return this.out("-colors", val || 128);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-colorspace
  proto.colorspace = function colorspace (val) {
    return this.out("-colorspace", val);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-comment
  proto.comment = comment("-comment");

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-contrast
  proto.contrast = function contrast (mult) {
    var arg = (parseInt(mult, 10) || 0) > 0
      ? "+contrast"
      : "-contrast";

    mult = Math.abs(mult) || 1;

    while (mult--) {
      this.out(arg);
    }

    return this;
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-cycle
  proto.cycle = function cycle (amount) {
    return this.out("-cycle", amount || 2);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.despeckle = function despeckle () {
    return this.out("-despeckle");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-dither
  // note: either colors() or monochrome() must be used for this
  // to take effect.
  proto.dither = function dither (on) {
    var sign = false === on
      ? "+"
      : "-";

    return this.out(sign + "dither");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.monochrome = function monochrome () {
    return this.out("-monochrome");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.edge = function edge (radius) {
    return this.out("-edge", radius || 1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.emboss = function emboss (radius) {
    return this.out("-emboss", radius || 1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.enhance = function enhance () {
    return this.out("-enhance");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.equalize = function equalize () {
    return this.out("-equalize");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-gamma
  proto.gamma = function gamma (r, g, b) {
    return this.out("-gamma", [r,g,b].join());
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.implode = function implode (factor) {
    return this.out("-implode", factor || 1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-comment
  proto.label = comment("-label");

  var limits = [ "disk", "file", "map", "memory", "pixels", "threads"];

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-limit
  proto.limit = function limit (type, val) {
    type = type.toLowerCase();

    if (!~limits.indexOf(type)) {
      return this;
    }

    return this.out("-limit", type, val);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.median = function median (radius) {
    return this.out("-median", radius || 1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-negate
  proto.negative = function negative (grayscale) {
    var sign = grayscale ? "+" : "-";
    return this.out(sign + "negate");
  }

  var noises = [
      "uniform"
    , "gaussian"
    , "multiplicative"
    , "impulse"
    , "laplacian"
    , "poisson"
  ];

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-noise
  proto.noise = function noise (radius) {
    radius = (String(radius)).toLowerCase();

    var sign = ~noises.indexOf(radius)
      ? "+"
      : "-";

    return this.out(sign + "noise", radius);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-paint
  proto.paint = function paint (radius) {
    return this.out("-paint", radius);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-raise
  proto.raise = function raise (w, h) {
    return this.out("-raise", (w||0)+"x"+(h||0));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-raise
  proto.lower = function lower (w, h) {
    return this.out("+raise", (w||0)+"x"+(h||0));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-region
  proto.region = function region (w, h, x, y) {
    w = w || 0;
    h = h || 0;
    x = x || 0;
    y = y || 0;
    return this.out("-region", w + "x" + h + "+" + x + "+" + y);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-roll
  proto.roll = function roll (x, y) {
    x = ((x = parseInt(x, 10) || 0) >= 0 ? "+" : "") + x;
    y = ((y = parseInt(y, 10) || 0) >= 0 ? "+" : "") + y;
    return this.out("-roll", x+y);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-sharpen
  proto.sharpen = function sharpen (radius, sigma) {
    sigma = sigma
      ? "x" + sigma
      : "";

    return this.out("-sharpen", radius + sigma);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-solarize
  proto.solarize = function solarize (factor) {
    return this.out("-solarize", (factor || 1)+"%");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-spread
  proto.spread = function spread (amount) {
    return this.out("-spread", amount || 5);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-swirl
  proto.swirl = function swirl (degrees) {
    return this.out("-swirl", degrees || 180);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-type
  proto.type = function type (type) {
    return this.in("-type", type);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-trim
  proto.trim = function trim () {
    return this.out("-trim");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-extent
  proto.extent = function extent (w, h, options) {
    options = options || "";
    var geometry;
    if (w && h) {
      geometry = w + "x" + h + options
    } else if (w && !h) {
      geometry = (this._options.imageMagick) ? w + options : w + 'x' + options;
    } else if (!w && h) {
      geometry = 'x' + h + options
    }

    return this.out("-extent", geometry);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-gravity
  // Be sure to use gravity BEFORE extent
  proto.gravity = function gravity (type) {
    if (!type || !~gravity.types.indexOf(type)) {
      type = "NorthWest"; // Documented default.
    }

    return this.out("-gravity", type);
  }

  proto.gravity.types = [
      "NorthWest"
    , "North"
    , "NorthEast"
    , "West"
    , "Center"
    , "East"
    , "SouthWest"
    , "South"
    , "SouthEast"
  ];

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-flatten
  proto.flatten = function flatten () {
    return this.out("-flatten");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-background
  proto.background = function background (color) {
    return this.in("-background", color);
  }
};

/**
 * Generates a handler for comments/labels.
 */

function comment (arg) {
  return function (format) {
    format = String(format);

    format = "@" == format.charAt(0)
      ? format.substring(1)
      : format;

    return this.out(arg, '"' + format + '"');
  }
}
