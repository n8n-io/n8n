var fs = require('fs');
var crypto = require('crypto');
var exec = require('child_process').exec;

var uuencode = require('../');

describe('uuencode', function() {

	// encode
	it('should encode a string and match', function(done) {
		uuencode.encode('Cat').should.equal('#0V%T\n');
		done();
	});

	it('should encoded a buffer and match', function(done) {
		uuencode.encode(new Buffer('Cat')).should.equal('#0V%T\n');
		done();
	});

	// decode
	it('should decode a string and match', function(done) {
		uuencode.decode('#0V%T\n').toString().should.equal('Cat');
		done();
	});

	it('should decode a buffer and match', function(done) {
		uuencode.decode(new Buffer('#0V%T\n')).toString().should.equal('Cat');
		done();
	});

	// uuencode/uudecode utility
	it('should encode and match the uuencode utility', function(done) {
		var buf = crypto.randomBytes(512);
		var data = buf.toString();

		fs.writeFileSync('/tmp/uu-rand', data);
		var node = uuencode.encode(data);

		exec('uuencode /tmp/uu-rand test', function(err, stdout, stderr) {
			// http://en.wikipedia.org/wiki/Uuencoding#Uuencode_table
			// Note that 96 ("`" grave accent) is a character that is seen in
			// uuencoded files but is typically only used to signify a 0-length
			// line, usually at the end of a file. It will never naturally occur
			// in the actual converted data since it is outside the range of 32
			// to 95. The sole exception to this is that some uuencoding
			// programs use the grave accent to signify padding bytes instead of
			// a space. However, the character used for the padding byte is not
			// standardized, so either is a possibility.
			stdout = stdout.replace(/`/g, ' ');

			stdout.should.containEql(node);
			done();
		});
	});

	it('should decode and match the uudecode utility', function(done) {
		var buf = crypto.randomBytes(512);
		var data = buf.toString();

		fs.writeFileSync('/tmp/uu-random', data);

		exec('uuencode /tmp/uu-rand /tmp/uu-res', function(err, stdout, stderr) {
			fs.writeFileSync('/tmp/uu-res', stdout);

			exec('uudecode /tmp/uu-res', function(err2, stdout2, stderr2) {
				var uudecode = fs.readFileSync('/tmp/uu-res').toString();

				// remove the header and footer as this module doesnt produce
				// them
				var cleaned = stdout.split('\n');
				cleaned.shift();
				cleaned.pop();
				cleaned.pop();

				var node = uuencode.decode(cleaned.join('\n')).toString();

				uudecode.should.containEql(node);
				done();
			});
		});
	});

});
