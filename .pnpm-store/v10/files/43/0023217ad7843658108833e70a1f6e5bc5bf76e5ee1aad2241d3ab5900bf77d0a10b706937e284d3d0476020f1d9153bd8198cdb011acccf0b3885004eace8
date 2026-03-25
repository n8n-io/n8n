const t = require('tap')
const MPS = require('../')

t.test('ok if size checks out', t => {
  const mps = new MPS({ size: 4 })

  mps.write(Buffer.from('a').toString('hex'), 'hex')
  mps.write(Buffer.from('sd'))
  mps.end('f')
  return mps.concat().then(data => t.equal(data.toString(), 'asdf'))
})

t.test('error if size exceeded', t => {
  const mps = new MPS({ size: 1 })
  mps.on('error', er => {
    t.match(er, {
      message: 'Bad data size: expected 1 bytes, but got 4',
      found: 4,
      expect: 1,
      code: 'EBADSIZE',
      name: 'SizeError',
    })
    t.end()
  })
  mps.write('asdf')
})

t.test('error if size is not met', t => {
  const mps = new MPS({ size: 999 })
  t.throws(() => mps.end(), {
    message: 'Bad data size: expected 999 bytes, but got 0',
    found: 0,
    name: 'SizeError',
    expect: 999,
    code: 'EBADSIZE',
  })
  t.end()
})

t.test('error if non-string/buffer is written', t => {
  const mps = new MPS({size:1})
  mps.on('error', er => {
    t.match(er, {
      message: 'MinipassSized streams only work with string and buffer data'
    })
    t.end()
  })
  mps.write({some:'object'})
})

t.test('projectiles', t => {
  t.throws(() => new MPS(), {
    message: 'invalid expected size: undefined'
  }, 'size is required')
  t.throws(() => new MPS({size: true}), {
    message: 'invalid expected size: true'
  }, 'size must be number')
  t.throws(() => new MPS({size: NaN}), {
    message: 'invalid expected size: NaN'
  }, 'size must not be NaN')
  t.throws(() => new MPS({size:1.2}), {
    message: 'invalid expected size: 1.2'
  }, 'size must be integer')
  t.throws(() => new MPS({size: Infinity}), {
    message: 'invalid expected size: Infinity'
  }, 'size must be finite')
  t.throws(() => new MPS({size: -1}), {
    message: 'invalid expected size: -1'
  }, 'size must be positive')
  t.throws(() => new MPS({objectMode: true}), {
    message: 'MinipassSized streams only work with string and buffer data'
  }, 'no objectMode')
  t.throws(() => new MPS({size: Number.MAX_SAFE_INTEGER + 1000000}), {
    message: 'invalid expected size: 9007199255740992'
  })
  t.end()
})

t.test('exports SizeError class', t => {
  t.isa(MPS.SizeError, 'function')
  t.isa(MPS.SizeError.prototype, Error)
  t.end()
})
