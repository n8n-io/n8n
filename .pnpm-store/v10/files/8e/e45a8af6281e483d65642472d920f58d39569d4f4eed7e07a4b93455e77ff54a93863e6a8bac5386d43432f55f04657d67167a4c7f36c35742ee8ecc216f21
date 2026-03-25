
var stream = require('../lib/lazystream');
var helper = require('./helper');

exports.pipe = {
  readwrite: function(test) {
    var expected = [ 'line1\n', 'line2\n' ];
    var actual = [];
    var readableInstantiated = false;
    var writableInstantiated = false;

    test.expect(3);

    var readable = new stream.Readable(function() {
      readableInstantiated = true;
      return new helper.DummyReadable([].concat(expected));
    });

    var writable = new stream.Writable(function() {
      writableInstantiated = true;
      return new helper.DummyWritable(actual);
    });

    test.equal(readableInstantiated, false, 'DummyReadable should only be instantiated when it is needed');
    test.equal(writableInstantiated, false, 'DummyWritable should only be instantiated when it is needed');

    writable.on('end', function() {
      test.equal(actual.join(''), expected.join(''), 'Piping on demand streams should keep data intact');
      test.done();
    });
    
    readable.pipe(writable);
  }
};


