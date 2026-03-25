
/**
 * Extend proto.
 */

module.exports = function (proto) {

  proto.thumb = function thumb (w, h, name, quality, align, progressive, callback, opts) {
    var self = this,
      args = Array.prototype.slice.call(arguments);

    opts = args.pop();

    if (typeof opts === 'function') {
      callback = opts;
      opts = '';
    } else {
      callback = args.pop();
    }

    w = args.shift();
    h = args.shift();
    name = args.shift();
    quality = args.shift() || 63;
    align = args.shift() || 'topleft';
    var interlace = args.shift() ? 'Line' : 'None';

    self.size(function (err, size) {
      if (err) {
        return callback.apply(self, arguments);
      }

      w = parseInt(w, 10);
      h = parseInt(h, 10);

      var w1, h1;
      var xoffset = 0;
      var yoffset = 0;

      if (size.width < size.height) {
        w1 = w;
        h1 = Math.floor(size.height * (w/size.width));
        if (h1 < h) {
          w1 = Math.floor(w1 * (((h-h1)/h) + 1));
          h1 = h;
        }
      } else if (size.width > size.height) {
        h1 = h;
        w1 = Math.floor(size.width * (h/size.height));
        if (w1 < w) {
          h1 = Math.floor(h1 * (((w-w1)/w) + 1));
          w1 = w;
        }
      } else if (size.width == size.height) {
        var bigger = (w>h?w:h);
        w1 = bigger;
        h1 = bigger;
      }

      if (align == 'center') {
        if (w < w1) {
          xoffset = (w1-w)/2;
        }
        if (h < h1) {
          yoffset = (h1-h)/2;
        }
      }

      self
      .quality(quality)
      .in("-size", w1+"x"+h1)
      .scale(w1, h1, opts)
      .crop(w, h, xoffset, yoffset)
      .interlace(interlace)
      .noProfile()
      .write(name, function () {
        callback.apply(self, arguments);
      });
    });

    return self;
  };

  proto.thumbExact = function () {
    var self = this,
      args = Array.prototype.slice.call(arguments);

    args.push('!');

    self.thumb.apply(self, args);
  };
};
