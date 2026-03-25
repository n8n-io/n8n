var assert = require('assert');

var uuid = require('../');

test('parse/unparse', function() {
  var id = '00112233445566778899aabbccddeeff';
  assert(uuid.unparse(uuid.parse(id.substr(0,10))) ==
    '00112233-4400-0000-0000-000000000000', 'Short parse');
  assert(uuid.unparse(uuid.parse('(this is the uuid -> ' + id + id)) ==
    '00112233-4455-6677-8899-aabbccddeeff', 'Dirty parse');
});

