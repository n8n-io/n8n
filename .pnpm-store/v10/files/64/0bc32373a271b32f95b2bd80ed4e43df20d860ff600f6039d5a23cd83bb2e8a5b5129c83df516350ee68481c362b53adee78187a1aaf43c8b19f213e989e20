'sue strict'
var t = require('tap')
var uniqueFilename = require('../index.js')

t.plan(6)

var randomTmpfile = uniqueFilename('tmp')
t.like(randomTmpfile, /^tmp.[a-f0-9]{8}$/, 'random tmp file')

var randomAgain = uniqueFilename('tmp')
t.notEqual(randomAgain, randomTmpfile, 'random tmp files are not the same')

var randomPrefixedTmpfile = uniqueFilename('tmp', 'my-test')
t.like(randomPrefixedTmpfile, /^tmp.my-test-[a-f0-9]{8}$/, 'random prefixed tmp file')

var randomPrefixedAgain = uniqueFilename('tmp', 'my-test')
t.notEqual(randomPrefixedAgain, randomPrefixedTmpfile, 'random prefixed tmp files are not the same')

var uniqueTmpfile = uniqueFilename('tmp', 'testing', '/my/thing/to/uniq/on')
t.like(uniqueTmpfile, /^tmp.testing-7ddd44c0$/, 'unique filename')

var uniqueAgain = uniqueFilename('tmp', 'testing', '/my/thing/to/uniq/on')
t.is(uniqueTmpfile, uniqueAgain, 'same unique string component produces same filename')
