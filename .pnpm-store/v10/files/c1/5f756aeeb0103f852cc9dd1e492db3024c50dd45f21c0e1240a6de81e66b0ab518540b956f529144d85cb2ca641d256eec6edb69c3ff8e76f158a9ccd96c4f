import assert from 'assert'
import { serialize } from './serializer'
import BufferList from './testing/buffer-list'

describe('serializer', () => {
  it('builds startup message', function () {
    const actual = serialize.startup({
      user: 'brian',
      database: 'bang',
    })
    assert.deepEqual(
      actual,
      new BufferList()
        .addInt16(3)
        .addInt16(0)
        .addCString('user')
        .addCString('brian')
        .addCString('database')
        .addCString('bang')
        .addCString('client_encoding')
        .addCString('UTF8')
        .addCString('')
        .join(true)
    )
  })

  it('builds password message', function () {
    const actual = serialize.password('!')
    assert.deepEqual(actual, new BufferList().addCString('!').join(true, 'p'))
  })

  it('builds request ssl message', function () {
    const actual = serialize.requestSsl()
    const expected = new BufferList().addInt32(80877103).join(true)
    assert.deepEqual(actual, expected)
  })

  it('builds SASLInitialResponseMessage message', function () {
    const actual = serialize.sendSASLInitialResponseMessage('mech', 'data')
    assert.deepEqual(actual, new BufferList().addCString('mech').addInt32(4).addString('data').join(true, 'p'))
  })

  it('builds SCRAMClientFinalMessage message', function () {
    const actual = serialize.sendSCRAMClientFinalMessage('data')
    assert.deepEqual(actual, new BufferList().addString('data').join(true, 'p'))
  })

  it('builds query message', function () {
    var txt = 'select * from boom'
    const actual = serialize.query(txt)
    assert.deepEqual(actual, new BufferList().addCString(txt).join(true, 'Q'))
  })

  describe('parse message', () => {
    it('builds parse message', function () {
      const actual = serialize.parse({ text: '!' })
      var expected = new BufferList().addCString('').addCString('!').addInt16(0).join(true, 'P')
      assert.deepEqual(actual, expected)
    })

    it('builds parse message with named query', function () {
      const actual = serialize.parse({
        name: 'boom',
        text: 'select * from boom',
        types: [],
      })
      var expected = new BufferList().addCString('boom').addCString('select * from boom').addInt16(0).join(true, 'P')
      assert.deepEqual(actual, expected)
    })

    it('with multiple parameters', function () {
      const actual = serialize.parse({
        name: 'force',
        text: 'select * from bang where name = $1',
        types: [1, 2, 3, 4],
      })
      var expected = new BufferList()
        .addCString('force')
        .addCString('select * from bang where name = $1')
        .addInt16(4)
        .addInt32(1)
        .addInt32(2)
        .addInt32(3)
        .addInt32(4)
        .join(true, 'P')
      assert.deepEqual(actual, expected)
    })
  })

  describe('bind messages', function () {
    it('with no values', function () {
      const actual = serialize.bind()

      var expectedBuffer = new BufferList()
        .addCString('')
        .addCString('')
        .addInt16(0)
        .addInt16(0)
        .addInt16(0)
        .join(true, 'B')
      assert.deepEqual(actual, expectedBuffer)
    })

    it('with named statement, portal, and values', function () {
      const actual = serialize.bind({
        portal: 'bang',
        statement: 'woo',
        values: ['1', 'hi', null, 'zing'],
      })
      var expectedBuffer = new BufferList()
        .addCString('bang') // portal name
        .addCString('woo') // statement name
        .addInt16(4)
        .addInt16(0)
        .addInt16(0)
        .addInt16(0)
        .addInt16(0)
        .addInt16(4)
        .addInt32(1)
        .add(Buffer.from('1'))
        .addInt32(2)
        .add(Buffer.from('hi'))
        .addInt32(-1)
        .addInt32(4)
        .add(Buffer.from('zing'))
        .addInt16(0)
        .join(true, 'B')
      assert.deepEqual(actual, expectedBuffer)
    })
  })

  it('with custom valueMapper', function () {
    const actual = serialize.bind({
      portal: 'bang',
      statement: 'woo',
      values: ['1', 'hi', null, 'zing'],
      valueMapper: () => null,
    })
    var expectedBuffer = new BufferList()
      .addCString('bang') // portal name
      .addCString('woo') // statement name
      .addInt16(4)
      .addInt16(0)
      .addInt16(0)
      .addInt16(0)
      .addInt16(0)
      .addInt16(4)
      .addInt32(-1)
      .addInt32(-1)
      .addInt32(-1)
      .addInt32(-1)
      .addInt16(0)
      .join(true, 'B')
    assert.deepEqual(actual, expectedBuffer)
  })

  it('with named statement, portal, and buffer value', function () {
    const actual = serialize.bind({
      portal: 'bang',
      statement: 'woo',
      values: ['1', 'hi', null, Buffer.from('zing', 'utf8')],
    })
    var expectedBuffer = new BufferList()
      .addCString('bang') // portal name
      .addCString('woo') // statement name
      .addInt16(4) // value count
      .addInt16(0) // string
      .addInt16(0) // string
      .addInt16(0) // string
      .addInt16(1) // binary
      .addInt16(4)
      .addInt32(1)
      .add(Buffer.from('1'))
      .addInt32(2)
      .add(Buffer.from('hi'))
      .addInt32(-1)
      .addInt32(4)
      .add(Buffer.from('zing', 'utf-8'))
      .addInt16(0)
      .join(true, 'B')
    assert.deepEqual(actual, expectedBuffer)
  })

  describe('builds execute message', function () {
    it('for unamed portal with no row limit', function () {
      const actual = serialize.execute()
      var expectedBuffer = new BufferList().addCString('').addInt32(0).join(true, 'E')
      assert.deepEqual(actual, expectedBuffer)
    })

    it('for named portal with row limit', function () {
      const actual = serialize.execute({
        portal: 'my favorite portal',
        rows: 100,
      })
      var expectedBuffer = new BufferList().addCString('my favorite portal').addInt32(100).join(true, 'E')
      assert.deepEqual(actual, expectedBuffer)
    })
  })

  it('builds flush command', function () {
    const actual = serialize.flush()
    var expected = new BufferList().join(true, 'H')
    assert.deepEqual(actual, expected)
  })

  it('builds sync command', function () {
    const actual = serialize.sync()
    var expected = new BufferList().join(true, 'S')
    assert.deepEqual(actual, expected)
  })

  it('builds end command', function () {
    const actual = serialize.end()
    var expected = Buffer.from([0x58, 0, 0, 0, 4])
    assert.deepEqual(actual, expected)
  })

  describe('builds describe command', function () {
    it('describe statement', function () {
      const actual = serialize.describe({ type: 'S', name: 'bang' })
      var expected = new BufferList().addChar('S').addCString('bang').join(true, 'D')
      assert.deepEqual(actual, expected)
    })

    it('describe unnamed portal', function () {
      const actual = serialize.describe({ type: 'P' })
      var expected = new BufferList().addChar('P').addCString('').join(true, 'D')
      assert.deepEqual(actual, expected)
    })
  })

  describe('builds close command', function () {
    it('describe statement', function () {
      const actual = serialize.close({ type: 'S', name: 'bang' })
      var expected = new BufferList().addChar('S').addCString('bang').join(true, 'C')
      assert.deepEqual(actual, expected)
    })

    it('describe unnamed portal', function () {
      const actual = serialize.close({ type: 'P' })
      var expected = new BufferList().addChar('P').addCString('').join(true, 'C')
      assert.deepEqual(actual, expected)
    })
  })

  describe('copy messages', function () {
    it('builds copyFromChunk', () => {
      const actual = serialize.copyData(Buffer.from([1, 2, 3]))
      const expected = new BufferList().add(Buffer.from([1, 2, 3])).join(true, 'd')
      assert.deepEqual(actual, expected)
    })

    it('builds copy fail', () => {
      const actual = serialize.copyFail('err!')
      const expected = new BufferList().addCString('err!').join(true, 'f')
      assert.deepEqual(actual, expected)
    })

    it('builds copy done', () => {
      const actual = serialize.copyDone()
      const expected = new BufferList().join(true, 'c')
      assert.deepEqual(actual, expected)
    })
  })

  it('builds cancel message', () => {
    const actual = serialize.cancel(3, 4)
    const expected = new BufferList().addInt16(1234).addInt16(5678).addInt32(3).addInt32(4).join(true)
    assert.deepEqual(actual, expected)
  })
})
