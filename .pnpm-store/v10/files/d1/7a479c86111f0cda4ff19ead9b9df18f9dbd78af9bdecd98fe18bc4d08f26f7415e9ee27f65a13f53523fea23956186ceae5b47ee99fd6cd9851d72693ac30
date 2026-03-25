
/**
 * Module dependencies.
 */

var fs = require('fs');
var parallel = require('array-parallel');

/**
 * Extend proto.
 */

module.exports = function (proto) {

  /**
   * Do nothing.
   */

  function noop () {}

  // http://www.graphicsmagick.org/GraphicsMagick.html#details-morph
  proto.morph = function morph (other, outname, callback) {
    if (!outname) {
      throw new Error("an output filename is required");
    }

    callback = (callback || noop).bind(this)

    var self = this;

    if (Array.isArray(other)) {
      other.forEach(function (img) {
        self.out(img);
      });
      self.out("-morph", other.length);
    } else {
      self.out(other, "-morph", 1);
    }

    self.write(outname, function (err, stdout, stderr, cmd) {
      if (err) return callback(err, stdout, stderr, cmd);

      // Apparently some platforms create the following temporary files.
      // Check if the output file exists, if it doesn't, then
      // work with temporary files.
      fs.exists(outname, function (exists) {
        if (exists) return callback(null, stdout, stderr, cmd);

        parallel([
          fs.unlink.bind(fs, outname + '.0'),
          fs.unlink.bind(fs, outname + '.2'),
          fs.rename.bind(fs, outname + '.1', outname)
        ], function (err) {
          callback(err, stdout, stderr, cmd);
        })
      })
    });

    return self;
  }
}
