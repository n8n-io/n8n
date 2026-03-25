// Copyright Takatoshi Kondo 2021
//
// Distributed under the MIT License

'use strict'

const NumberAllocator = require('..').NumberAllocator
const assert = require('chai').assert

describe('number-allocator', function () {
  it('should create without number', function (done) {
    const a = NumberAllocator(0, 0)
    assert.equal(a.intervalCount(), 1)
    done()
  })
  it('should work with one number', function (done) {
    const a = new NumberAllocator(0, 0)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.firstVacant(), 0)

    assert.equal(a.alloc(), 0)
    assert.equal(a.intervalCount(), 0)

    assert.equal(a.alloc(), null)
    assert.equal(a.firstVacant(), null)

    a.free(0)

    assert.equal(a.intervalCount(), 1)
    assert.equal(a.alloc(), 0)
    assert.equal(a.intervalCount(), 0)

    assert.equal(a.alloc(), null)

    assert.equal(a.use(0), false)
    assert.equal(a.use(1), false)
    assert.equal(a.use(-1), false)
    a.free(0)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(0), true)
    assert.equal(a.intervalCount(), 0)
    assert.equal(a.use(1), false)

    assert.equal(a.alloc(), null)

    a.free(0)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 0)
    assert.equal(a.intervalCount(), 0)

    done()
  })
  it('should work with one number (offset)', function (done) {
    const a = new NumberAllocator(5, 5)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.firstVacant(), 5)

    assert.equal(a.alloc(), 5)
    assert.equal(a.intervalCount(), 0)

    assert.equal(a.alloc(), null)
    assert.equal(a.firstVacant(), null)

    a.free(5)

    assert.equal(a.intervalCount(), 1)
    assert.equal(a.alloc(), 5)
    assert.equal(a.intervalCount(), 0)

    assert.equal(a.alloc(), null)

    assert.equal(a.use(5), false)
    assert.equal(a.use(1), false)
    a.free(5)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(5), true)
    assert.equal(a.intervalCount(), 0)
    assert.equal(a.use(1), false)

    assert.equal(a.alloc(), null)

    a.free(5)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 5)
    assert.equal(a.intervalCount(), 0)

    done()
  })
  it('should alloc/free work well on interval', function (done) {
    const a = new NumberAllocator(0, 4)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.alloc(), 0)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 1)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 2)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 3)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 4)
    assert.equal(a.intervalCount(), 0)

    assert.equal(a.alloc(), null)

    a.free(2)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 2)
    assert.equal(a.intervalCount(), 0)

    done()
  })
  it('should use/free work well on interval', function (done) {
    const a = new NumberAllocator(0, 4)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(0), true)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(4), true)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(2), true)
    assert.equal(a.intervalCount(), 2)
    assert.equal(a.use(1), true)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(3), true)
    assert.equal(a.intervalCount(), 0)
    assert.equal(a.use(0), false)
    assert.equal(a.use(1), false)
    assert.equal(a.use(2), false)
    assert.equal(a.use(3), false)
    assert.equal(a.use(4), false)
    a.free(2)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(2), true)
    assert.equal(a.intervalCount(), 0)
    done()
  })
  it('should clear work well and interval be updated well', function (done) {
    const a = new NumberAllocator(0, 4)

    assert.equal(a.alloc(), 0)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.use(1), true)

    assert.equal(a.alloc(), 2)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.use(3), true)

    assert.equal(a.alloc(), 4)
    assert.equal(a.intervalCount(), 0)

    a.clear()
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.alloc(), 0)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.use(1), true)

    assert.equal(a.alloc(), 2)
    assert.equal(a.intervalCount(), 1)

    assert.equal(a.use(3), true)

    assert.equal(a.alloc(), 4)
    assert.equal(a.intervalCount(), 0)

    done()
  })
  it('should interval be concatinated well', function (done) {
    const prepare = function () {
      const a = new NumberAllocator(0, 4)
      assert.equal(a.use(0), true)
      assert.equal(a.use(1), true)
      assert.equal(a.use(2), true)
      assert.equal(a.use(3), true)
      assert.equal(a.use(4), true)
      return a
    }

    let a = prepare()
    a.free(0)
    assert.equal(a.intervalCount(), 1)
    a.free(4)
    assert.equal(a.intervalCount(), 2)
    a.free(2)
    assert.equal(a.intervalCount(), 3)
    a.free(1)
    assert.equal(a.intervalCount(), 2)
    // concat left and right
    a.free(3)
    assert.equal(a.intervalCount(), 1)

    a = prepare()
    a.free(3)
    assert.equal(a.intervalCount(), 1)
    // ....v
    // end concat right
    a.free(4)
    assert.equal(a.intervalCount(), 1)

    a = prepare()
    a.free(1)
    assert.equal(a.intervalCount(), 1)
    // begin concat left
    a.free(0)
    assert.equal(a.intervalCount(), 1)

    a = prepare()
    a.free(2)
    assert.equal(a.intervalCount(), 1)
    // begin no concat
    a.free(0)
    assert.equal(a.intervalCount(), 2)

    a = prepare()
    a.free(1)
    assert.equal(a.intervalCount(), 1)
    a.free(4)
    assert.equal(a.intervalCount(), 2)
    // concat left
    a.free(2)
    assert.equal(a.intervalCount(), 2)

    a = prepare()
    a.free(4)
    assert.equal(a.intervalCount(), 1)
    a.free(1)
    assert.equal(a.intervalCount(), 2)
    // concat right
    a.free(3)
    assert.equal(a.intervalCount(), 2)

    done()
  })
  it('should work well with negative numbers', function (done) {
    const a = new NumberAllocator(-2, 3)
    assert.equal(a.intervalCount(), 1)
    assert.equal(a.use(2), true)
    assert.equal(a.intervalCount(), 2)

    const value = a.alloc()
    assert.notEqual(value, null)
    assert.equal(value, -2)
    assert.equal(a.intervalCount(), 2)

    assert.equal(a.use(0), true)
    assert.equal(a.intervalCount(), 3)

    done()
  })
  it('should dump', function (done) {
    const a = new NumberAllocator(0, 4)
    a.dump()
    assert.equal(a.use(0), true)
    a.dump()
    assert.equal(a.use(1), true)
    a.dump()
    assert.equal(a.use(2), true)
    a.dump()
    a.free(0)
    a.dump()
    a.free(2)
    a.dump()
    a.free(1)
    a.dump()
    done()
  })
  it('should fail use the same number twice in the middle of interval', function (done) {
    const a = new NumberAllocator(0, 4)
    assert.equal(a.use(1), true)
    assert.equal(a.use(1), false)
    done()
  })
  it('should do nothing non allocated free', function (done) {
    const a = NumberAllocator(0, 1)
    // if DEBUG="nuber-allocator:error" then output error log
    a.free(0)
    a.free(1)
    a.free(5)
    done()
  })
  it('should concat to right on free', function (done) {
    const a = NumberAllocator(0, 3)
    assert.equal(a.alloc(), 0)
    assert.equal(a.alloc(), 1)
    a.free(1)
    assert.equal(a.alloc(), 1)
    done()
  })
  it('should concat to left on free', function (done) {
    const a = NumberAllocator(0, 3)
    assert.equal(a.alloc(), 0)
    assert.equal(a.alloc(), 1)
    assert.equal(a.alloc(), 2)
    a.free(0)
    a.free(1)
    assert.equal(a.alloc(), 0)
    assert.equal(a.alloc(), 1)
    done()
  })
  it('should concat to left and right on free', function (done) {
    const a = NumberAllocator(0, 3)
    assert.equal(a.alloc(), 0)
    assert.equal(a.alloc(), 1)
    assert.equal(a.alloc(), 2)
    a.free(0)
    a.free(2)
    a.free(1)
    assert.equal(a.alloc(), 0)
    assert.equal(a.alloc(), 1)
    assert.equal(a.alloc(), 2)
    done()
  })
  it('should insert new interval on free', function (done) {
    const a = NumberAllocator(0, 4)
    assert.equal(a.alloc(), 0)
    assert.equal(a.alloc(), 1)
    assert.equal(a.alloc(), 2)
    assert.equal(a.alloc(), 3)
    assert.equal(a.alloc(), 4)
    a.free(0)
    a.free(4)
    a.free(2)
    assert.equal(a.alloc(), 0)
    assert.equal(a.alloc(), 2)
    assert.equal(a.alloc(), 4)
    done()
  })
})
