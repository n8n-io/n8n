// @ts-check
'use strict'

const tape = require('tape')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const os = require('os')
const BufferListStream = require('../')
const { Buffer } = require('buffer')

/**
 * This typedef allows us to add _bufs to the API without declaring it publicly on types.
 * @typedef { BufferListStream & { _bufs?: Buffer[] }} BufferListStreamWithPrivate
 */

/**
 * Just for typechecking in js
 * @type { NodeJS.Process & { browser?: boolean }}
 */

const process = globalThis.process

/** @type {BufferEncoding[]} */
const encodings = ['ascii', 'utf8', 'utf-8', 'hex', 'binary', 'base64']

if (process.browser) {
  encodings.push(
    'ucs2',
    'ucs-2',
    'utf16le',
    /**
     * This alias is not in typescript typings for BufferEncoding. Still have to fix
     * @see https://nodejs.org/api/buffer.html#buffers-and-character-encodings
     */
    // @ts-ignore
    'utf-16le'
  )
}

require('./indexOf')
require('./isBufferList')
require('./convert')

tape('single bytes from single buffer', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abcd'))

  t.equal(bl.length, 4)
  t.equal(bl.get(-1), undefined)
  t.equal(bl.get(0), 97)
  t.equal(bl.get(1), 98)
  t.equal(bl.get(2), 99)
  t.equal(bl.get(3), 100)
  t.equal(bl.get(4), undefined)

  t.end()
})

tape('single bytes from multiple buffers', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abcd'))
  bl.append(Buffer.from('efg'))
  bl.append(Buffer.from('hi'))
  bl.append(Buffer.from('j'))

  t.equal(bl.length, 10)

  t.equal(bl.get(0), 97)
  t.equal(bl.get(1), 98)
  t.equal(bl.get(2), 99)
  t.equal(bl.get(3), 100)
  t.equal(bl.get(4), 101)
  t.equal(bl.get(5), 102)
  t.equal(bl.get(6), 103)
  t.equal(bl.get(7), 104)
  t.equal(bl.get(8), 105)
  t.equal(bl.get(9), 106)

  t.end()
})

tape('multi bytes from single buffer', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abcd'))

  t.equal(bl.length, 4)

  t.equal(bl.slice(0, 4).toString('ascii'), 'abcd')
  t.equal(bl.slice(0, 3).toString('ascii'), 'abc')
  t.equal(bl.slice(1, 4).toString('ascii'), 'bcd')
  t.equal(bl.slice(-4, -1).toString('ascii'), 'abc')

  t.end()
})

tape('multi bytes from single buffer (negative indexes)', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('buffer'))

  t.equal(bl.length, 6)

  t.equal(bl.slice(-6, -1).toString('ascii'), 'buffe')
  t.equal(bl.slice(-6, -2).toString('ascii'), 'buff')
  t.equal(bl.slice(-5, -2).toString('ascii'), 'uff')

  t.end()
})

tape('multiple bytes from multiple buffers', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abcd'))
  bl.append(Buffer.from('efg'))
  bl.append(Buffer.from('hi'))
  bl.append(Buffer.from('j'))

  t.equal(bl.length, 10)

  t.equal(bl.slice(0, 10).toString('ascii'), 'abcdefghij')
  t.equal(bl.slice(3, 10).toString('ascii'), 'defghij')
  t.equal(bl.slice(3, 6).toString('ascii'), 'def')
  t.equal(bl.slice(3, 8).toString('ascii'), 'defgh')
  t.equal(bl.slice(5, 10).toString('ascii'), 'fghij')
  t.equal(bl.slice(-7, -4).toString('ascii'), 'def')

  t.end()
})

tape('multiple bytes from multiple buffer lists', function (t) {
  const bl = new BufferListStream()

  bl.append(new BufferListStream([Buffer.from('abcd'), Buffer.from('efg')]))
  bl.append(new BufferListStream([Buffer.from('hi'), Buffer.from('j')]))

  t.equal(bl.length, 10)

  t.equal(bl.slice(0, 10).toString('ascii'), 'abcdefghij')

  t.equal(bl.slice(3, 10).toString('ascii'), 'defghij')
  t.equal(bl.slice(3, 6).toString('ascii'), 'def')
  t.equal(bl.slice(3, 8).toString('ascii'), 'defgh')
  t.equal(bl.slice(5, 10).toString('ascii'), 'fghij')

  t.end()
})

// same data as previous test, just using nested constructors
tape('multiple bytes from crazy nested buffer lists', function (t) {
  const bl = new BufferListStream()

  bl.append(
    new BufferListStream([
      new BufferListStream([
        new BufferListStream(Buffer.from('abc')),
        Buffer.from('d'),
        new BufferListStream(Buffer.from('efg'))
      ]),
      new BufferListStream([Buffer.from('hi')]),
      new BufferListStream(Buffer.from('j'))
    ])
  )

  t.equal(bl.length, 10)

  t.equal(bl.slice(0, 10).toString('ascii'), 'abcdefghij')

  t.equal(bl.slice(3, 10).toString('ascii'), 'defghij')
  t.equal(bl.slice(3, 6).toString('ascii'), 'def')
  t.equal(bl.slice(3, 8).toString('ascii'), 'defgh')
  t.equal(bl.slice(5, 10).toString('ascii'), 'fghij')

  t.end()
})

tape('append accepts arrays of Buffers', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abc'))
  bl.append([Buffer.from('def')])
  bl.append([Buffer.from('ghi'), Buffer.from('jkl')])
  bl.append([Buffer.from('mnop'), Buffer.from('qrstu'), Buffer.from('vwxyz')])
  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'abcdefghijklmnopqrstuvwxyz')

  t.end()
})

tape('append accepts arrays of Uint8Arrays', function (t) {
  const bl = new BufferListStream()

  bl.append(new Uint8Array([97, 98, 99]))
  bl.append([Uint8Array.from([100, 101, 102])])
  bl.append([new Uint8Array([103, 104, 105]), new Uint8Array([106, 107, 108])])
  bl.append([new Uint8Array([109, 110, 111, 112]), new Uint8Array([113, 114, 115, 116, 117]), new Uint8Array([118, 119, 120, 121, 122])])
  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'abcdefghijklmnopqrstuvwxyz')

  t.end()
})

tape('append accepts arrays of BufferLists', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abc'))
  bl.append([new BufferListStream('def')])
  bl.append(
    new BufferListStream([Buffer.from('ghi'), new BufferListStream('jkl')])
  )
  bl.append([
    Buffer.from('mnop'),
    new BufferListStream([Buffer.from('qrstu'), Buffer.from('vwxyz')])
  ])
  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'abcdefghijklmnopqrstuvwxyz')

  t.end()
})

tape('append chainable', function (t) {
  const bl = new BufferListStream()

  t.ok(bl.append(Buffer.from('abcd')) === bl)
  t.ok(bl.append([Buffer.from('abcd')]) === bl)
  t.ok(bl.append(new BufferListStream(Buffer.from('abcd'))) === bl)
  t.ok(bl.append([new BufferListStream(Buffer.from('abcd'))]) === bl)

  t.end()
})

tape('append chainable (test results)', function (t) {
  const bl = new BufferListStream('abc')
    .append([new BufferListStream('def')])
    .append(
      new BufferListStream([Buffer.from('ghi'), new BufferListStream('jkl')])
    )
    .append([
      Buffer.from('mnop'),
      new BufferListStream([Buffer.from('qrstu'), Buffer.from('vwxyz')])
    ])

  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'abcdefghijklmnopqrstuvwxyz')

  t.end()
})

tape('prepend accepts arrays of Buffers', function (t) {
  const bl = new BufferListStream()

  bl.prepend(Buffer.from('abc'))
  bl.prepend([Buffer.from('def')])
  bl.prepend([Buffer.from('ghi'), Buffer.from('jkl')])
  bl.prepend([Buffer.from('mnop'), Buffer.from('qrstu'), Buffer.from('vwxyz')])
  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'mnopqrstuvwxyzghijkldefabc')

  t.end()
})

tape('prepend accepts arrays of Uint8Arrays', function (t) {
  const bl = new BufferListStream()

  bl.prepend(new Uint8Array([97, 98, 99]))
  bl.prepend([Uint8Array.from([100, 101, 102])])
  bl.prepend([new Uint8Array([103, 104, 105]), new Uint8Array([106, 107, 108])])
  bl.prepend([new Uint8Array([109, 110, 111, 112]), new Uint8Array([113, 114, 115, 116, 117]), new Uint8Array([118, 119, 120, 121, 122])])
  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'mnopqrstuvwxyzghijkldefabc')

  t.end()
})

tape('prepend accepts arrays of BufferLists', function (t) {
  const bl = new BufferListStream()

  bl.prepend(Buffer.from('abc'))
  bl.prepend([new BufferListStream('def')])
  bl.prepend(
    new BufferListStream([Buffer.from('ghi'), new BufferListStream('jkl')])
  )
  bl.prepend([
    Buffer.from('mnop'),
    new BufferListStream([Buffer.from('qrstu'), Buffer.from('vwxyz')])
  ])
  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'mnopqrstuvwxyzghijkldefabc')

  t.end()
})

tape('prepend chainable', function (t) {
  const bl = new BufferListStream()

  t.ok(bl.prepend(Buffer.from('abcd')) === bl)
  t.ok(bl.prepend([Buffer.from('abcd')]) === bl)
  t.ok(bl.prepend(new BufferListStream(Buffer.from('abcd'))) === bl)
  t.ok(bl.prepend([new BufferListStream(Buffer.from('abcd'))]) === bl)

  t.end()
})

tape('prepend chainable (test results)', function (t) {
  const bl = new BufferListStream('abc')
    .prepend([new BufferListStream('def')])
    .prepend(
      new BufferListStream([Buffer.from('ghi'), new BufferListStream('jkl')])
    )
    .prepend([
      Buffer.from('mnop'),
      new BufferListStream([Buffer.from('qrstu'), Buffer.from('vwxyz')])
    ])

  t.equal(bl.length, 26)
  t.equal(bl.slice().toString('ascii'), 'mnopqrstuvwxyzghijkldefabc')

  t.end()
})

tape('consuming from multiple buffers', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abcd'))
  bl.append(Buffer.from('efg'))
  bl.append(Buffer.from('hi'))
  bl.append(Buffer.from('j'))

  t.equal(bl.length, 10)

  t.equal(bl.slice(0, 10).toString('ascii'), 'abcdefghij')

  bl.consume(3)
  t.equal(bl.length, 7)
  t.equal(bl.slice(0, 7).toString('ascii'), 'defghij')

  bl.consume(2)
  t.equal(bl.length, 5)
  t.equal(bl.slice(0, 5).toString('ascii'), 'fghij')

  bl.consume(1)
  t.equal(bl.length, 4)
  t.equal(bl.slice(0, 4).toString('ascii'), 'ghij')

  bl.consume(1)
  t.equal(bl.length, 3)
  t.equal(bl.slice(0, 3).toString('ascii'), 'hij')

  bl.consume(2)
  t.equal(bl.length, 1)
  t.equal(bl.slice(0, 1).toString('ascii'), 'j')

  t.end()
})

tape('complete consumption', function (t) {
  /** @type {BufferListStreamWithPrivate} */
  const bl = new BufferListStream()

  bl.append(Buffer.from('a'))
  bl.append(Buffer.from('b'))

  bl.consume(2)

  t.equal(bl.length, 0)
  t.equal(bl._bufs.length, 0)

  t.end()
})

tape('test readUInt8 / readInt8', function (t) {
  const buf1 = Buffer.alloc(1)
  const buf2 = Buffer.alloc(3)
  const buf3 = Buffer.alloc(3)
  const bl = new BufferListStream()

  buf1[0] = 0x1
  buf2[1] = 0x3
  buf2[2] = 0x4
  buf3[0] = 0x23
  buf3[1] = 0x42

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)

  t.equal(bl.readUInt8(), 0x1)
  t.equal(bl.readUInt8(2), 0x3)
  t.equal(bl.readInt8(2), 0x3)
  t.equal(bl.readUInt8(3), 0x4)
  t.equal(bl.readInt8(3), 0x4)
  t.equal(bl.readUInt8(4), 0x23)
  t.equal(bl.readInt8(4), 0x23)
  t.equal(bl.readUInt8(5), 0x42)
  t.equal(bl.readInt8(5), 0x42)

  t.end()
})

tape('test readUInt16LE / readUInt16BE / readInt16LE / readInt16BE', function (t) {
  const buf1 = Buffer.alloc(1)
  const buf2 = Buffer.alloc(3)
  const buf3 = Buffer.alloc(3)
  const bl = new BufferListStream()

  buf1[0] = 0x1
  buf2[1] = 0x3
  buf2[2] = 0x4
  buf3[0] = 0x23
  buf3[1] = 0x42

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)

  t.equal(bl.readUInt16BE(), 0x0100)
  t.equal(bl.readUInt16LE(), 0x0001)
  t.equal(bl.readUInt16BE(2), 0x0304)
  t.equal(bl.readUInt16LE(2), 0x0403)
  t.equal(bl.readInt16BE(2), 0x0304)
  t.equal(bl.readInt16LE(2), 0x0403)
  t.equal(bl.readUInt16BE(3), 0x0423)
  t.equal(bl.readUInt16LE(3), 0x2304)
  t.equal(bl.readInt16BE(3), 0x0423)
  t.equal(bl.readInt16LE(3), 0x2304)
  t.equal(bl.readUInt16BE(4), 0x2342)
  t.equal(bl.readUInt16LE(4), 0x4223)
  t.equal(bl.readInt16BE(4), 0x2342)
  t.equal(bl.readInt16LE(4), 0x4223)

  t.end()
})

tape('test readUInt32LE / readUInt32BE / readInt32LE / readInt32BE', function (t) {
  const buf1 = Buffer.alloc(1)
  const buf2 = Buffer.alloc(3)
  const buf3 = Buffer.alloc(3)
  const bl = new BufferListStream()

  buf1[0] = 0x1
  buf2[1] = 0x3
  buf2[2] = 0x4
  buf3[0] = 0x23
  buf3[1] = 0x42

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)

  t.equal(bl.readUInt32BE(), 0x01000304)
  t.equal(bl.readUInt32LE(), 0x04030001)
  t.equal(bl.readUInt32BE(2), 0x03042342)
  t.equal(bl.readUInt32LE(2), 0x42230403)
  t.equal(bl.readInt32BE(2), 0x03042342)
  t.equal(bl.readInt32LE(2), 0x42230403)

  t.end()
})

tape('test readBigUInt64LE / readBigUInt64BE / readBigInt64LE / readBigInt64BE', function (t) {
  const buf1 = Buffer.alloc(1)
  const buf2 = Buffer.alloc(3)
  const buf3 = Buffer.alloc(2)
  const buf4 = Buffer.alloc(5)
  const bl = new BufferListStream()

  buf1[0] = 0x05
  buf2[0] = 0x07

  buf2[1] = 0x03
  buf2[2] = 0x04
  buf3[0] = 0x23
  buf3[1] = 0x42
  buf4[0] = 0x00
  buf4[1] = 0x01
  buf4[2] = 0x02
  buf4[3] = 0x03

  buf4[4] = 0x04

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)
  bl.append(buf4)

  t.equal(bl.readBigUInt64BE(2), 0x0304234200010203n)
  t.equal(bl.readBigUInt64LE(2), 0x0302010042230403n)
  t.equal(bl.readBigInt64BE(2), 0x0304234200010203n)
  t.equal(bl.readBigInt64LE(2), 0x0302010042230403n)

  t.end()
})

tape('test readUIntLE / readUIntBE / readIntLE / readIntBE', function (t) {
  const buf1 = Buffer.alloc(1)
  const buf2 = Buffer.alloc(3)
  const buf3 = Buffer.alloc(3)
  const bl = new BufferListStream()

  buf2[0] = 0x2
  buf2[1] = 0x3
  buf2[2] = 0x4
  buf3[0] = 0x23
  buf3[1] = 0x42
  buf3[2] = 0x61

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)

  t.equal(bl.readUIntBE(1, 1), 0x02)
  t.equal(bl.readUIntBE(1, 2), 0x0203)
  t.equal(bl.readUIntBE(1, 3), 0x020304)
  t.equal(bl.readUIntBE(1, 4), 0x02030423)
  t.equal(bl.readUIntBE(1, 5), 0x0203042342)
  t.equal(bl.readUIntBE(1, 6), 0x020304234261)
  t.equal(bl.readUIntLE(1, 1), 0x02)
  t.equal(bl.readUIntLE(1, 2), 0x0302)
  t.equal(bl.readUIntLE(1, 3), 0x040302)
  t.equal(bl.readUIntLE(1, 4), 0x23040302)
  t.equal(bl.readUIntLE(1, 5), 0x4223040302)
  t.equal(bl.readUIntLE(1, 6), 0x614223040302)
  t.equal(bl.readIntBE(1, 1), 0x02)
  t.equal(bl.readIntBE(1, 2), 0x0203)
  t.equal(bl.readIntBE(1, 3), 0x020304)
  t.equal(bl.readIntBE(1, 4), 0x02030423)
  t.equal(bl.readIntBE(1, 5), 0x0203042342)
  t.equal(bl.readIntBE(1, 6), 0x020304234261)
  t.equal(bl.readIntLE(1, 1), 0x02)
  t.equal(bl.readIntLE(1, 2), 0x0302)
  t.equal(bl.readIntLE(1, 3), 0x040302)
  t.equal(bl.readIntLE(1, 4), 0x23040302)
  t.equal(bl.readIntLE(1, 5), 0x4223040302)
  t.equal(bl.readIntLE(1, 6), 0x614223040302)

  t.end()
})

tape('test readFloatLE / readFloatBE', function (t) {
  const buf1 = Buffer.alloc(1)
  const buf2 = Buffer.alloc(3)
  const buf3 = Buffer.alloc(3)
  const bl = new BufferListStream()

  buf1[0] = 0x01
  buf2[1] = 0x00
  buf2[2] = 0x00
  buf3[0] = 0x80
  buf3[1] = 0x3f

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)

  const canonical = Buffer.concat([buf1, buf2, buf3])
  t.equal(bl.readFloatLE(), canonical.readFloatLE())
  t.equal(bl.readFloatBE(), canonical.readFloatBE())
  t.equal(bl.readFloatLE(2), canonical.readFloatLE(2))
  t.equal(bl.readFloatBE(2), canonical.readFloatBE(2))

  t.end()
})

tape('test readDoubleLE / readDoubleBE', function (t) {
  const buf1 = Buffer.alloc(1)
  const buf2 = Buffer.alloc(3)
  const buf3 = Buffer.alloc(10)
  const bl = new BufferListStream()

  buf1[0] = 0x01
  buf2[1] = 0x55
  buf2[2] = 0x55
  buf3[0] = 0x55
  buf3[1] = 0x55
  buf3[2] = 0x55
  buf3[3] = 0x55
  buf3[4] = 0xd5
  buf3[5] = 0x3f

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)

  const canonical = Buffer.concat([buf1, buf2, buf3])
  t.equal(bl.readDoubleBE(), canonical.readDoubleBE())
  t.equal(bl.readDoubleLE(), canonical.readDoubleLE())
  t.equal(bl.readDoubleBE(2), canonical.readDoubleBE(2))
  t.equal(bl.readDoubleLE(2), canonical.readDoubleLE(2))

  t.end()
})

tape('test toString', function (t) {
  const bl = new BufferListStream()

  bl.append(Buffer.from('abcd'))
  bl.append(Buffer.from('efg'))
  bl.append(Buffer.from('hi'))
  bl.append(Buffer.from('j'))

  t.equal(bl.toString('ascii', 0, 10), 'abcdefghij')
  t.equal(bl.toString('ascii', 3, 10), 'defghij')
  t.equal(bl.toString('ascii', 3, 6), 'def')
  t.equal(bl.toString('ascii', 3, 8), 'defgh')
  t.equal(bl.toString('ascii', 5, 10), 'fghij')

  t.end()
})

tape('test toString encoding', function (t) {
  const bl = new BufferListStream()
  const b = Buffer.from('abcdefghij\xff\x00')

  bl.append(Buffer.from('abcd'))
  bl.append(Buffer.from('efg'))
  bl.append(Buffer.from('hi'))
  bl.append(Buffer.from('j'))
  bl.append(Buffer.from('\xff\x00'))

  encodings.forEach(function (enc) {
    t.equal(bl.toString(enc), b.toString(enc), enc)
  })

  t.end()
})

tape('getBuffers', function (t) {
  const bl = new BufferListStream([Buffer.from('First'), Buffer.from('Second'), Buffer.from('Third')])

  t.deepEquals(
    bl.getBuffers(),
    // @ts-ignore
    bl._bufs
  )

  t.end()
})

tape('uninitialized memory', function (t) {
  const secret = crypto.randomBytes(256)
  for (let i = 0; i < 1e6; i++) {
    const clone = Buffer.from(secret)
    const bl = new BufferListStream()
    bl.append(Buffer.from('a'))
    bl.consume(-1024)
    const buf = bl.slice(1)
    if (buf.indexOf(clone) !== -1) {
      t.fail(`Match (at ${i})`)
      break
    }
  }
  t.end()
})

!process.browser && tape('test stream', function (t) {
  const random = crypto.randomBytes(65534)

  const bl = new BufferListStream((err, buf) => {
    t.ok(Buffer.isBuffer(buf))
    t.ok(err === null)
    t.ok(random.equals(bl.slice()))
    t.ok(random.equals(buf.slice()))

    bl.pipe(fs.createWriteStream(path.join(os.tmpdir(), 'bl_test_rnd_out.dat')))
      .on('close', function () {
        const rndhash = crypto.createHash('md5').update(random).digest('hex')
        const md5sum = crypto.createHash('md5')
        const s = fs.createReadStream(path.join(os.tmpdir(), 'bl_test_rnd_out.dat'))

        s.on('data', md5sum.update.bind(md5sum))
        s.on('end', function () {
          t.equal(rndhash, md5sum.digest('hex'), 'woohoo! correct hash!')
          t.end()
        })
      })
  })

  fs.writeFileSync(path.join(os.tmpdir(), 'bl_test_rnd.dat'), random)
  fs.createReadStream(path.join(os.tmpdir(), 'bl_test_rnd.dat')).pipe(bl)
})

tape('instantiation with Buffer', function (t) {
  const buf = crypto.randomBytes(1024)
  const buf2 = crypto.randomBytes(1024)
  let b = BufferListStream(buf)

  t.equal(buf.toString('hex'), b.slice().toString('hex'), 'same buffer')
  b = BufferListStream([buf, buf2])
  t.equal(b.slice().toString('hex'), Buffer.concat([buf, buf2]).toString('hex'), 'same buffer')

  t.end()
})

tape('test String appendage', function (t) {
  const bl = new BufferListStream()
  const b = Buffer.from('abcdefghij\xff\x00')

  bl.append('abcd')
  bl.append('efg')
  bl.append('hi')
  bl.append('j')
  bl.append('\xff\x00')

  encodings.forEach(function (enc) {
    t.equal(bl.toString(enc), b.toString(enc))
  })

  t.end()
})

tape('test Number appendage', function (t) {
  const bl = new BufferListStream()
  const b = Buffer.from('1234567890')

  bl.append(1234)
  bl.append(567)
  bl.append(89)
  bl.append(0)

  encodings.forEach(function (enc) {
    t.equal(bl.toString(enc), b.toString(enc))
  })

  t.end()
})

tape('write nothing, should get empty buffer', function (t) {
  t.plan(3)
  BufferListStream(function (err, data) {
    t.notOk(err, 'no error')
    t.ok(Buffer.isBuffer(data), 'got a buffer')
    t.equal(0, data.length, 'got a zero-length buffer')
    t.end()
  }).end()
})

tape('unicode string', function (t) {
  t.plan(2)

  const inp1 = '\u2600'
  const inp2 = '\u2603'
  const exp = inp1 + ' and ' + inp2
  const bl = BufferListStream()

  bl.write(inp1)
  bl.write(' and ')
  bl.write(inp2)
  t.equal(exp, bl.toString())
  t.equal(Buffer.from(exp).toString('hex'), bl.toString('hex'))
})

tape('should emit finish', function (t) {
  const source = BufferListStream()
  const dest = BufferListStream()

  source.write('hello')
  source.pipe(dest)

  dest.on('finish', function () {
    t.equal(dest.toString('utf8'), 'hello')
    t.end()
  })
})

tape('basic copy', function (t) {
  const buf = crypto.randomBytes(1024)
  const buf2 = Buffer.alloc(1024)
  const b = BufferListStream(buf)

  b.copy(buf2)
  t.equal(b.slice().toString('hex'), buf2.toString('hex'), 'same buffer')

  t.end()
})

tape('copy after many appends', function (t) {
  const buf = crypto.randomBytes(512)
  const buf2 = Buffer.alloc(1024)
  const b = BufferListStream(buf)

  b.append(buf)
  b.copy(buf2)
  t.equal(b.slice().toString('hex'), buf2.toString('hex'), 'same buffer')

  t.end()
})

tape('copy at a precise position', function (t) {
  const buf = crypto.randomBytes(1004)
  const buf2 = Buffer.alloc(1024)
  const b = BufferListStream(buf)

  b.copy(buf2, 20)
  t.equal(b.slice().toString('hex'), buf2.slice(20).toString('hex'), 'same buffer')

  t.end()
})

tape('copy starting from a precise location', function (t) {
  const buf = crypto.randomBytes(10)
  const buf2 = Buffer.alloc(5)
  const b = BufferListStream(buf)

  b.copy(buf2, 0, 5)
  t.equal(b.slice(5).toString('hex'), buf2.toString('hex'), 'same buffer')

  t.end()
})

tape('copy in an interval', function (t) {
  const rnd = crypto.randomBytes(10)
  const b = BufferListStream(rnd) // put the random bytes there
  const actual = Buffer.alloc(3)
  const expected = Buffer.alloc(3)

  rnd.copy(expected, 0, 5, 8)
  b.copy(actual, 0, 5, 8)

  t.equal(actual.toString('hex'), expected.toString('hex'), 'same buffer')

  t.end()
})

tape('copy an interval between two buffers', function (t) {
  const buf = crypto.randomBytes(10)
  const buf2 = Buffer.alloc(10)
  const b = BufferListStream(buf)

  b.append(buf)
  b.copy(buf2, 0, 5, 15)

  t.equal(b.slice(5, 15).toString('hex'), buf2.toString('hex'), 'same buffer')

  t.end()
})

tape('shallow slice across buffer boundaries', function (t) {
  const bl = new BufferListStream(['First', 'Second', 'Third'])

  t.equal(bl.shallowSlice(3, 13).toString(), 'stSecondTh')

  t.end()
})

tape('shallow slice within single buffer', function (t) {
  t.plan(2)

  const bl = new BufferListStream(['First', 'Second', 'Third'])

  t.equal(bl.shallowSlice(5, 10).toString(), 'Secon')
  t.equal(bl.shallowSlice(7, 10).toString(), 'con')

  t.end()
})

tape('shallow slice single buffer', function (t) {
  t.plan(3)

  const bl = new BufferListStream(['First', 'Second', 'Third'])

  t.equal(bl.shallowSlice(0, 5).toString(), 'First')
  t.equal(bl.shallowSlice(5, 11).toString(), 'Second')
  t.equal(bl.shallowSlice(11, 16).toString(), 'Third')
})

tape('shallow slice with negative or omitted indices', function (t) {
  t.plan(4)

  const bl = new BufferListStream(['First', 'Second', 'Third'])

  t.equal(bl.shallowSlice().toString(), 'FirstSecondThird')
  t.equal(bl.shallowSlice(5).toString(), 'SecondThird')
  t.equal(bl.shallowSlice(5, -3).toString(), 'SecondTh')
  t.equal(bl.shallowSlice(-8).toString(), 'ondThird')
})

tape('shallow slice does not make a copy', function (t) {
  t.plan(1)

  const buffers = [Buffer.from('First'), Buffer.from('Second'), Buffer.from('Third')]
  const bl = new BufferListStream(buffers).shallowSlice(5, -3)

  buffers[1].fill('h')
  buffers[2].fill('h')

  t.equal(bl.toString(), 'hhhhhhhh')
})

tape('shallow slice with 0 length', function (t) {
  t.plan(1)

  const buffers = [Buffer.from('First'), Buffer.from('Second'), Buffer.from('Third')]
  const bl = (new BufferListStream(buffers)).shallowSlice(0, 0)

  t.equal(bl.length, 0)
})

tape('shallow slice with 0 length from middle', function (t) {
  t.plan(1)

  const buffers = [Buffer.from('First'), Buffer.from('Second'), Buffer.from('Third')]
  const bl = (new BufferListStream(buffers)).shallowSlice(10, 10)

  t.equal(bl.length, 0)
})

tape('duplicate', function (t) {
  t.plan(2)

  const bl = new BufferListStream('abcdefghij\xff\x00')
  const dup = bl.duplicate()

  t.equal(bl.prototype, dup.prototype)
  t.equal(bl.toString('hex'), dup.toString('hex'))
})

tape('destroy no pipe', function (t) {
  t.plan(2)

  /** @type {BufferListStreamWithPrivate} */
  const bl = new BufferListStream('alsdkfja;lsdkfja;lsdk')

  bl.destroy()

  t.equal(bl._bufs.length, 0)
  t.equal(bl.length, 0)
})

tape('destroy with error', function (t) {
  t.plan(3)

  /** @type {BufferListStreamWithPrivate} */
  const bl = new BufferListStream('alsdkfja;lsdkfja;lsdk')
  const err = new Error('kaboom')

  bl.destroy(err)
  bl.on('error', function (_err) {
    t.equal(_err, err)
  })

  t.equal(bl._bufs.length, 0)
  t.equal(bl.length, 0)
})

!process.browser && tape('destroy with pipe before read end', function (t) {
  t.plan(2)

  /** @type {BufferListStreamWithPrivate} */
  const bl = new BufferListStream()
  fs.createReadStream(path.join(__dirname, '/test.js'))
    .pipe(bl)

  bl.destroy()

  t.equal(bl._bufs.length, 0)
  t.equal(bl.length, 0)
})

!process.browser && tape('destroy with pipe before read end with race', function (t) {
  t.plan(2)

  /** @type {BufferListStreamWithPrivate} */
  const bl = new BufferListStream()

  fs.createReadStream(path.join(__dirname, '/test.js'))
    .pipe(bl)

  setTimeout(function () {
    bl.destroy()
    setTimeout(function () {
      t.equal(bl._bufs.length, 0)
      t.equal(bl.length, 0)
    }, 500)
  }, 500)
})

!process.browser && tape('destroy with pipe after read end', function (t) {
  t.plan(2)

  /** @type {BufferListStreamWithPrivate} */
  const bl = new BufferListStream()
  fs.createReadStream(path.join(__dirname, '/test.js'))
    .on('end', onEnd)
    .pipe(bl)

  function onEnd () {
    bl.destroy()

    t.equal(bl._bufs.length, 0)
    t.equal(bl.length, 0)
  }
})

!process.browser && tape('destroy with pipe while writing to a destination', function (t) {
  t.plan(4)

  /** @type {BufferListStreamWithPrivate} */
  const bl = new BufferListStream()
  const ds = new BufferListStream()

  fs.createReadStream(path.join(__dirname, '/test.js'))
    .on('end', onEnd)
    .pipe(bl)

  function onEnd () {
    bl.pipe(ds)

    setTimeout(function () {
      bl.destroy()

      t.equals(bl._bufs.length, 0)
      t.equals(bl.length, 0)

      ds.destroy()

      t.equals(bl._bufs.length, 0)
      t.equals(bl.length, 0)
    }, 100)
  }
})

!process.browser && tape('handle error', function (t) {
  t.plan(2)

  fs.createReadStream('/does/not/exist').pipe(BufferListStream(function (err, data) {
    t.ok(err instanceof Error, 'has error')
    t.notOk(data, 'no data')
  }))
})
