'use strict';

/**
 * Kuler: Color text using CSS colors
 *
 * @constructor
 * @param {String} text The text that needs to be styled
 * @param {String} color Optional color for alternate API.
 * @api public
 */
function Kuler(text, color) {
  if (color) return (new Kuler(text)).style(color);
  if (!(this instanceof Kuler)) return new Kuler(text);

  this.text = text;
}

/**
 * ANSI color codes.
 *
 * @type {String}
 * @private
 */
Kuler.prototype.prefix = '\x1b[';
Kuler.prototype.suffix = 'm';

/**
 * Parse a hex color string and parse it to it's RGB equiv.
 *
 * @param {String} color
 * @returns {Array}
 * @api private
 */
Kuler.prototype.hex = function hex(color) {
  color = color[0] === '#' ? color.substring(1) : color;

  //
  // Pre-parse for shorthand hex colors.
  //
  if (color.length === 3) {
    color = color.split('');

    color[5] = color[2]; // F60##0
    color[4] = color[2]; // F60#00
    color[3] = color[1]; // F60600
    color[2] = color[1]; // F66600
    color[1] = color[0]; // FF6600

    color = color.join('');
  }

  var r = color.substring(0, 2)
    , g = color.substring(2, 4)
    , b = color.substring(4, 6);

  return [ parseInt(r, 16), parseInt(g, 16), parseInt(b, 16) ];
};

/**
 * Transform a 255 RGB value to an RGV code.
 *
 * @param {Number} r Red color channel.
 * @param {Number} g Green color channel.
 * @param {Number} b Blue color channel.
 * @returns {String}
 * @api public
 */
Kuler.prototype.rgb = function rgb(r, g, b) {
  var red = r / 255 * 5
    , green = g / 255 * 5
    , blue = b / 255 * 5;

  return this.ansi(red, green, blue);
};

/**
 * Turns RGB 0-5 values into a single ANSI code.
 *
 * @param {Number} r Red color channel.
 * @param {Number} g Green color channel.
 * @param {Number} b Blue color channel.
 * @returns {String}
 * @api public
 */
Kuler.prototype.ansi = function ansi(r, g, b) {
  var red = Math.round(r)
    , green = Math.round(g)
    , blue = Math.round(b);

  return 16 + (red * 36) + (green * 6) + blue;
};

/**
 * Marks an end of color sequence.
 *
 * @returns {String} Reset sequence.
 * @api public
 */
Kuler.prototype.reset = function reset() {
  return this.prefix +'39;49'+ this.suffix;
};

/**
 * Colour the terminal using CSS.
 *
 * @param {String} color The HEX color code.
 * @returns {String} the escape code.
 * @api public
 */
Kuler.prototype.style = function style(color) {
  return this.prefix +'38;5;'+ this.rgb.apply(this, this.hex(color)) + this.suffix + this.text + this.reset();
};


//
// Expose the actual interface.
//
module.exports = Kuler;
