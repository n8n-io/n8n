
var stream = require('../lib/lazystream');
var fs = require('fs');
var tmpDir = 'test/tmp/';
var readFile = 'test/data.md';
var writeFile = tmpDir + 'data.md';

exports.fs = {
  readwrite: function(test) {
    var readfd, writefd;

    var readable = new stream.Readable(function() {
       return fs.createReadStream(readFile)
        .on('open', function(fd) {
          readfd = fd;
        })
        .on('close', function() {
           readfd = undefined;
           step();
        });
    });

    var writable = new stream.Writable(function() {
      return fs.createWriteStream(writeFile)
        .on('open', function(fd) {
          writefd = fd;
        })
        .on('close', function() {
          writefd = undefined;
           step();
        });
    });

    test.expect(3);

    test.equal(readfd, undefined, 'Input file should not be opened until read');
    test.equal(writefd, undefined, 'Output file should not be opened until write');

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    if (fs.existsSync(writeFile)) {
      fs.unlinkSync(writeFile);
    }

    readable.on('end', function() { step(); });
    writable.on('end', function() { step(); });

    var steps = 0;
    function step() {
      steps += 1;
      if (steps == 4) {
        var input = fs.readFileSync(readFile);
        var output = fs.readFileSync(writeFile);

        test.ok(input >= output && input <= output, 'Should be equal');

        fs.unlinkSync(writeFile);
        fs.rmdirSync(tmpDir);

        test.done();
      }
    };

    readable.pipe(writable);
  }
};


