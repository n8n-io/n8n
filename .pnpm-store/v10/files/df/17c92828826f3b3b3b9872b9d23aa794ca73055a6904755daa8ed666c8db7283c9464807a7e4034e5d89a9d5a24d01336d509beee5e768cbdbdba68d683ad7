
/**
 * Module dependencies.
 */

var escape = require('./utils').escape;

/**
 * Extend proto.
 */

module.exports = function (proto) {

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-fill
  proto.fill = function fill (color) {
    return this.out("-fill", color || "none");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-stroke
  proto.stroke = function stroke (color, width) {
    if (width) {
      this.strokeWidth(width);
    }

    return this.out("-stroke", color || "none");
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-strokewidth
  proto.strokeWidth = function strokeWidth (width) {
    return this.out("-strokewidth", width);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-font
  proto.font = function font (font, size) {
    if (size) {
      this.fontSize(size);
    }

    return this.out("-font", font);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html
  proto.fontSize = function fontSize (size) {
    return this.out("-pointsize", size);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.draw = function draw (args) {
    return this.out("-draw", [].slice.call(arguments).join(" "));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawPoint = function drawPoint (x, y) {
    return this.draw("point", x +","+ y);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawLine = function drawLine (x0, y0, x1, y1) {
    return this.draw("line", x0+","+y0, x1+","+y1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawRectangle = function drawRectangle (x0, y0, x1, y1, wc, hc) {
    var shape = "rectangle"
      , lastarg;

    if ("undefined" !== typeof wc) {
      shape = "roundRectangle";

      if ("undefined" === typeof hc) {
        hc = wc;
      }

      lastarg = wc+","+hc;
    }

    return this.draw(shape, x0+","+y0, x1+","+y1, lastarg);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawArc = function drawArc (x0, y0, x1, y1, a0, a1) {
    return this.draw("arc", x0+","+y0, x1+","+y1, a0+","+a1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawEllipse = function drawEllipse (x0, y0, rx, ry, a0, a1) {
    if (a0 == undefined) a0 = 0;
    if (a1 == undefined) a1 = 360;
    return this.draw("ellipse", x0+","+y0, rx+","+ry, a0+","+a1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawCircle = function drawCircle (x0, y0, x1, y1) {
    return this.draw("circle", x0+","+y0, x1+","+y1);
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawPolyline = function drawPolyline () {
    return this.draw("polyline", formatPoints(arguments));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawPolygon = function drawPolygon () {
    return this.draw("polygon", formatPoints(arguments));
  }

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawBezier = function drawBezier () {
    return this.draw("bezier", formatPoints(arguments));
  }

  proto._gravities = [
      "northwest"
	  , "north"
    , "northeast"
	  , "west"
    , "center"
	  , "east"
    , "southwest"
    , "south"
    , "southeast"];

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.drawText = function drawText (x0, y0, text, gravity) {
    var gravity = String(gravity || "").toLowerCase()
      , arg = ["text " + x0 + "," + y0 + " " + escape(text)];

    if (~this._gravities.indexOf(gravity)) {
      arg.unshift("gravity", gravity);
    }

    return this.draw.apply(this, arg);
  }

  proto._drawProps = ["color", "matte"];

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-draw
  proto.setDraw = function setDraw (prop, x, y, method) {
    prop = String(prop || "").toLowerCase();

    if (!~this._drawProps.indexOf(prop)) {
      return this;
    }

    return this.draw(prop, x+","+y, method);
  }

}

function formatPoints (points) {
  var len = points.length
    , result = []
    , i = 0;

  for (; i < len; ++i) {
    result.push(points[i].join(","));
  }

  return result;
}
