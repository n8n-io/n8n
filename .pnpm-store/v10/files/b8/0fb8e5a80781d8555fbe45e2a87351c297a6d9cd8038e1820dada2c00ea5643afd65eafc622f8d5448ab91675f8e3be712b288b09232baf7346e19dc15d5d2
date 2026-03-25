var cc = require('./index');
var assert = require('assert');

assert(cc.code('EUR').countries.length === 35);
assert(cc.code('IDR').digits === 2);
assert(cc.number('967').currency === 'Zambian Kwacha');
assert(cc.number(967).currency === 'Zambian Kwacha');
assert(cc.country('Colombia').length === 2);
assert(cc.country('colombia').length === 2);
assert(cc.codes().length === 178);
assert(cc.countries().length === 250);
assert(cc.numbers().length === 178);
assert(cc.numbers()[0] === '784');
assert(cc.data.length == 178);
