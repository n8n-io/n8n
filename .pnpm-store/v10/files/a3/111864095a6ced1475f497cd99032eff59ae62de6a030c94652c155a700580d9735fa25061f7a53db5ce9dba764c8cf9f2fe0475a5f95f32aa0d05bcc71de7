var assert = require('assert');
var OffsetBuffer = require('../');

describe('OffsetBuffer', function() {
  var o;
  beforeEach(function() {
    o = new OffsetBuffer();
  });

  describe('.take()', function() {
    it('should return empty buffer', function() {
      var b = new Buffer('hello world');
      o.push(b);
      var r = o.take(0);
      assert.equal(r.length, 0);
      assert.equal(o.size, b.length);
    });

    it('should return the first buffer itself', function() {
      var b = new Buffer('hello world');
      o.push(b);
      var r = o.take(b.length);
      assert(r === b);
      assert(o.isEmpty());
    });

    it('should return the slice of the buffer ', function() {
      var b = new Buffer('hello world');
      o.push(b);
      assert.equal(o.take(5).toString(), 'hello');
      assert.equal(o.take(1).toString(), ' ');
      assert.equal(o.take(5).toString(), 'world');
      assert(o.isEmpty());
    });

    it('should concat buffers', function() {
      o.push(new Buffer('hello'));
      o.push(new Buffer(' '));
      o.push(new Buffer('world!'));
      assert.equal(o.take(11).toString(), 'hello world');
      assert.equal(o.take(1).toString(), '!');
      assert(o.isEmpty());
    });
  });

  describe('.skip', function() {
    it('should skip bytes', function() {
      o.push(new Buffer('hello '));
      o.push(new Buffer('world'));
      o.push(new Buffer(' oh gosh'));

      assert.equal(o.take(2).toString(), 'he');
      o.skip(1);
      assert.equal(o.take(2).toString(), 'lo');
      o.skip(1);
      assert.equal(o.take(2).toString(), 'wo');
      o.skip(4);
      assert.equal(o.take(7).toString(), 'oh gosh');

      assert(o.isEmpty());
    });
  });

  describe('.peekUInt8', function() {
    it('should return and not move by one byte', function() {
      o.push(new Buffer([ 0x1, 0x2 ]));
      assert.equal(o.peekUInt8(), 1);
      assert.equal(o.readUInt8(), 1);
      assert.equal(o.peekUInt8(), 2);
      assert.equal(o.readUInt8(), 2);
      assert(o.isEmpty());
    });
  });

  describe('.peekInt8', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0x80 ]));
      assert.equal(o.peekInt8(), -128);
      assert.equal(o.readInt8(), -128);
      assert(o.isEmpty());
    });
  });

  describe('.readUInt8', function() {
    it('should return and move by one byte', function() {
      o.push(new Buffer([ 0x1, 0x2 ]));
      o.push(new Buffer([ 0x3, 0x4 ]));
      assert.equal(o.readUInt8(), 1);
      assert.equal(o.readUInt8(), 2);
      assert.equal(o.readUInt8(), 3);
      assert.equal(o.readUInt8(), 4);
      assert(o.isEmpty());
    });
  });

  describe('.readInt8', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0x8f, 0x7f ]));
      assert.equal(o.readInt8(), -113);
      assert.equal(o.readInt8(), 127);
      assert(o.isEmpty());
    });
  });

  describe('.readUInt16LE', function() {
    it('should return and move by two bytes', function() {
      o.push(new Buffer([ 0x1, 0x2, 0x3 ]));
      o.push(new Buffer([ 0x4, 0x5, 0x6 ]));
      assert.equal(o.readUInt16LE(), 0x0201);
      assert.equal(o.readUInt16LE(), 0x0403);
      assert.equal(o.readUInt16LE(), 0x0605);
      assert(o.isEmpty());
    });

    it('should return and move by two bytes (regression #1)', function() {
      o.push(new Buffer([ 0x1 ]));
      o.push(new Buffer([ 0x2, 0x3, 0x4 ]));
      assert.equal(o.readUInt16LE(), 0x0201);
      assert.equal(o.readUInt16LE(), 0x0403);
      assert(o.isEmpty());
    });
  });

  describe('.readInt16LE', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0x23, 0x81 ]));
      assert.equal(o.readInt16LE(), -32477);
      assert(o.isEmpty());
    });
  });

  describe('.readUInt24LE', function() {
    it('should return and move by three bytes', function() {
      o.push(new Buffer([ 0x1, 0x2, 0x3, 0x4, 0x5 ]));
      o.push(new Buffer([ 0x6, 0x7 ]));
      o.push(new Buffer([ 0x8, 0x9 ]));
      assert.equal(o.readUInt24LE(), 0x030201);
      assert.equal(o.readUInt24LE(), 0x060504);
      assert.equal(o.readUInt24LE(), 0x090807);
      assert(o.isEmpty());
    });

    it('should return and move by three bytes (regression #1)', function() {
      o.push(new Buffer([ 0x1, 0x2 ]));
      o.push(new Buffer([ 0x3 ]));
      assert.equal(o.readUInt24LE(), 0x030201);
      assert.equal(o.buffers.length, 0);
      assert(o.isEmpty());
    });
  });

  describe('.readInt24LE', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0x23, 0x45, 0x81 ]));
      assert.equal(o.readInt24LE(), -8305373);
      assert(o.isEmpty());
    });
  });

  describe('.readUInt32LE', function() {
    it('should return and move by four bytes', function() {
      o.push(new Buffer([ 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7 ]));
      o.push(new Buffer([ 0x8, 0x9, 0xa ]));
      o.push(new Buffer([ 0xb, 0xc, 0xd ]));
      o.push(new Buffer([ 0xe, 0xf, 0x10 ]));
      assert.equal(o.readUInt32LE(), 0x04030201);
      assert.equal(o.readUInt32LE(), 0x08070605);
      assert.equal(o.readUInt32LE(), 0x0c0b0a09);
      assert.equal(o.readUInt32LE(), 0x100f0e0d);
      assert(o.isEmpty());
    });

    it('should return and move by four bytes (regression #1)', function() {
      o.push(new Buffer([ 0x1, 0x2, 0x3 ]));
      o.push(new Buffer([ 0x4 ]));
      assert.equal(o.readUInt32LE(), 0x04030201);
      assert.equal(o.buffers.length, 0);
      assert(o.isEmpty());
    });
  });

  describe('.readInt32LE', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0xff, 0xff, 0xff, 0xff ]));
      assert.equal(o.readInt32LE(), -1);
      assert(o.isEmpty());
    });
  });

  describe('.readUInt16BE', function() {
    it('should return and move by two bytes', function() {
      o.push(new Buffer([ 0x1, 0x2, 0x3 ]));
      o.push(new Buffer([ 0x4, 0x5, 0x6 ]));
      assert.equal(o.readUInt16BE(), 0x0102);
      assert.equal(o.readUInt16BE(), 0x0304);
      assert.equal(o.readUInt16BE(), 0x0506);
      assert(o.isEmpty());
    });
  });

  describe('.readInt16BE', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0x81, 0x23 ]));
      assert.equal(o.readInt16BE(), -32477);
      assert(o.isEmpty());
    });
  });

  describe('.readUInt24BE', function() {
    it('should return and move by three bytes', function() {
      o.push(new Buffer([ 0x1, 0x2, 0x3, 0x4, 0x5 ]));
      o.push(new Buffer([ 0x6, 0x7 ]));
      o.push(new Buffer([ 0x8, 0x9 ]));
      assert.equal(o.readUInt24BE(), 0x010203);
      assert.equal(o.readUInt24BE(), 0x040506);
      assert.equal(o.readUInt24BE(), 0x070809);
      assert(o.isEmpty());
    });
  });

  describe('.readInt24BE', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0x81, 0x45, 0x23 ]));
      assert.equal(o.readInt24BE(), -8305373);
      assert(o.isEmpty());
    });
  });

  describe('.readUInt32BE', function() {
    it('should return and move by four bytes', function() {
      o.push(new Buffer([ 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7 ]));
      o.push(new Buffer([ 0x8, 0x9, 0xa ]));
      o.push(new Buffer([ 0xb, 0xc, 0xd ]));
      o.push(new Buffer([ 0xe, 0xf, 0x10 ]));
      assert.equal(o.readUInt32BE(), 0x01020304);
      assert.equal(o.readUInt32BE(), 0x05060708);
      assert.equal(o.readUInt32BE(), 0x090a0b0c);
      assert.equal(o.readUInt32BE(), 0x0d0e0f10);
      assert(o.isEmpty());
    });

    it('should return positive values', function() {
      o.push(new Buffer([ 0xff, 0xff, 0xff, 0xff ]));
      assert.equal(o.readUInt32BE(), 0xffffffff);
      assert(o.isEmpty());
    });
  });

  describe('.readInt32BE', function() {
    it('should return signed number', function() {
      o.push(new Buffer([ 0xff, 0xff, 0xff, 0xff ]));
      assert.equal(o.readInt32BE(), -1);
      assert(o.isEmpty());
    });
  });

  describe('.has', function() {
    it('should properly check the amount of the remaining bytes', function() {
      o.push(new Buffer([ 1, 2, 3 ]));
      assert(o.has(3));
      assert.equal(o.readUInt8(), 0x01);
      assert(!o.has(3));
      assert(o.has(2));
      assert.equal(o.readUInt16BE(), 0x0203);
      assert(!o.has(1));
    });
  });
});
