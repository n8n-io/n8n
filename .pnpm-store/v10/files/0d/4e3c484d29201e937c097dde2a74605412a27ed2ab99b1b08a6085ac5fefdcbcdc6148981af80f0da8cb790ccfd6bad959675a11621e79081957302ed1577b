module.exports = HttpDuplex;

var util = require('util'),
  stream = require('readable-stream');

util.inherits(HttpDuplex, stream.Duplex);

function HttpDuplex(req, res, options) {
  var self = this;

  if (!(self instanceof HttpDuplex)) return new HttpDuplex(req, res, options);

  stream.Duplex.call(self, options);
  self._output = null;

  self.connect(req, res);
}

HttpDuplex.prototype.connect = function(req, res) {
  var self = this;
  self.req = req;
  self._output = res;
  self.emit('response', res);

  res.on('data', function(c) {
    if (!self.push(c)) self._output.pause();
  });
  res.on('end', function() {
    self.push(null);
  });
};

HttpDuplex.prototype._read = function(n) {
  if (this._output) this._output.resume();
};

HttpDuplex.prototype._write = function(chunk, encoding, cb) {
  this.req.write(chunk, encoding);
  cb();
};

HttpDuplex.prototype.end = function(chunk, encoding, cb) {
  this._output.socket.destroySoon();
  return this.req.end(chunk, encoding, cb);
};

HttpDuplex.prototype.destroy = function() {
  this.req.destroy();
  this._output.socket.destroy();
};

HttpDuplex.prototype.destroySoon = function() {
  this.req.destroy();
  this._output.socket.destroy();
};
