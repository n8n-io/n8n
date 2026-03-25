const normalize = require('../')
const t = require('tap')

t.test('benign object', async t => {
  // just clean up the ./ in the targets and remove anything weird
  const pkg = { name: 'hello', version: 'world', bin: {
    y: './x/y',
    z: './y/z',
    a: './a',
  } }
  const expect = { name: 'hello', version: 'world', bin: {
    y: 'x/y',
    z: 'y/z',
    a: 'a',
  } }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('empty and non-string targets', async t => {
  // just clean up the ./ in the targets and remove anything weird
  const pkg = { name: 'hello', version: 'world', bin: {
    z: './././',
    y: '',
    './x': 'x.js',
    re: /asdf/,
    foo: { bar: 'baz' },
    false: false,
    null: null,
    array: [1,2,3],
    func: function () {},
  } }
  const expect = { name: 'hello', version: 'world', bin: {
    x: 'x.js',
  } }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('slashy object', async t => {
  const pkg = { name: 'hello', version: 'world', bin: {
    '/path/foo': '/etc/passwd',
    'bar': '/etc/passwd',
    '/etc/glorb/baz': '/etc/passwd',
    '/etc/passwd:/bin/usr/exec': '/etc/passwd',
  } }
  const expect = {
    name: 'hello',
    version: 'world',
    bin: {
      foo: 'etc/passwd',
      bar: 'etc/passwd',
      baz: 'etc/passwd',
      exec: 'etc/passwd',
    }
  }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('dotty object', async t => {
  const pkg = {
    name: 'hello',
    version: 'world',
    bin: {
      'nodots': '../../../../etc/passwd',
      '../../../../../../dots': '../../../../etc/passwd',
      '.././../\\./..//C:\\./': 'this is removed',
      '.././../\\./..//C:\\/': 'super safe programming language',
      '.././../\\./..//C:\\x\\y\\z/': 'xyz',
    } }
  const expect = { name: 'hello', version: 'world', bin: {
    nodots: 'etc/passwd',
    dots: 'etc/passwd',
    C: 'super safe programming language',
    z: 'xyz',
  } }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('weird object', async t => {
  const pkg = { name: 'hello', version: 'world', bin: /asdf/ }
  const expect = { name: 'hello', version: 'world' }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('oddball keys', async t => {
  const pkg = {
    bin: {
      '~': 'target',
      '£': 'target',
      'ζ': 'target',
      'ぎ': 'target',
      '操': 'target',
      '🎱': 'target',
      '💎': 'target',
      '💸': 'target',
      '🦉': 'target',
      'сheck-dom': 'target',
      'Ωpm': 'target',
      'ζλ': 'target',
      'мга': 'target',
      'пше': 'target',
      'тзч': 'target',
      'тзь': 'target',
      'нфкт': 'target',
      'ссср': 'target',
      '君の名は': 'target',
      '君の名は': 'target',
    }
  }

  const expect = {
    bin: {
      '~': 'target',
      '£': 'target',
      'ζ': 'target',
      'ぎ': 'target',
      '操': 'target',
      '🎱': 'target',
      '💎': 'target',
      '💸': 'target',
      '🦉': 'target',
      'сheck-dom': 'target',
      'Ωpm': 'target',
      'ζλ': 'target',
      'мга': 'target',
      'пше': 'target',
      'тзч': 'target',
      'тзь': 'target',
      'нфкт': 'target',
      'ссср': 'target',
      '君の名は': 'target',
    },
  }

  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})
