'use strict'

/* global describe, it */

const should = require('should')
const sizeof = require('../indexv2.js')

describe('sizeof node.js tests', () => {
  it('should handle null in object keys', () => {
    const badData = { 1: { depot_id: null, hierarchy_node_id: null } }
    sizeof(badData).should.be.instanceOf(Number)
  })

  it('should handle null in object keys', () => {
    const badData = { 1: { depot_id: null, hierarchy_node_id: null } }
    sizeof(badData).should.be.instanceOf(Number)
  })

  it('null is 0', () => {
    sizeof(null).should.be.equal(0)
  })

  it('number size shall be 8', () => {
    sizeof(5).should.be.equal(8)
  })

  it('undefined is 0', () => {
    sizeof().should.be.equal(0)
  })

  it('of 3 chars string is 16 in node.js', () => {
    sizeof('abc').should.be.equal(16)
  })

  it('sizeof of empty string', () => {
    sizeof('').should.be.equal(12)
  })

  it('boolean size shall be 4', () => {
    sizeof(true).should.be.equal(4)
  })

  it('report an error for circular dependency objects', () => {
    const firstLevel = { a: 1 }
    const secondLevel = { b: 2, c: firstLevel }
    firstLevel.second = secondLevel
    should.exist(sizeof(firstLevel))
  })

  it('handle hasOwnProperty key', () => {
    sizeof({ hasOwnProperty: undefined }).should.be.instanceOf(Number)
    sizeof({ hasOwnProperty: 'Hello World' }).should.be.instanceOf(Number)
    sizeof({ hasOwnProperty: 1234 }).should.be.instanceOf(Number)
  })

  it('supports symbol', () => {
    const descriptor = 'abcd'
    sizeof(Symbol(descriptor)).should.equal(2 * descriptor.length)
  })

  it('supports global symbols', () => {
    const globalSymbol = Symbol.for('a')
    const obj = { [globalSymbol]: 'b' }
    sizeof(obj).should.equal(2)
  })

  it('array support for strings - longer array should have sizeof above the shorter one', () => {
    sizeof(['a', 'b', 'c', 'd']).should.be.above(sizeof(['a', 'b']))
  })

  it('array support for numbers - longer array should have sizeof above the shorter one', () => {
    sizeof([1, 2, 3]).should.be.above(sizeof([1, 2]))
  })

  it('array support for NaN - longer array should have sizeof above the shorter one', () => {
    sizeof([NaN, NaN]).should.be.above(sizeof([NaN]))
  })

  it('map support', () => {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    const mapSmaller = new Map()
    mapSmaller.set('a', 1)
    const mapBigger = new Map()
    mapBigger.set('a', 1)
    mapBigger.set('b', 2)
    sizeof(mapBigger).should.be.above(sizeof(mapSmaller))
  })

  it('set support', () => {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
    const smallerSet = new Set()
    smallerSet.add(1) // Set(1) { 1 }

    const biggerSet = new Set()
    biggerSet.add(1) // Set(1) { 1 }
    biggerSet.add('some text') // Set(3) { 1, 5, 'some text' }
    sizeof(biggerSet).should.be.above(sizeof(smallerSet))
  })

  it('typed array support', () => {
    const arrayInt8Array = new Int8Array([1, 2, 3, 4, 5])
    sizeof(arrayInt8Array).should.equal(5)

    const arrayUint8Array = new Uint8Array([1, 2, 3, 4, 5])
    sizeof(arrayUint8Array).should.equal(5)

    const arrayUint16Array = new Uint16Array([1, 2, 3, 4, 5])
    sizeof(arrayUint16Array).should.equal(10)

    const arrayInt16Array = new Int16Array([1, 2, 3, 4, 5])
    sizeof(arrayInt16Array).should.equal(10)

    const arrayUint32Array = new Uint32Array([1, 2, 3, 4, 5])
    sizeof(arrayUint32Array).should.equal(20)

    const arrayInt32Array = new Int32Array([1, 2, 3, 4, 5])
    sizeof(arrayInt32Array).should.equal(20)

    const arrayFloat32Array = new Float32Array([1, 2, 3, 4, 5])
    sizeof(arrayFloat32Array).should.equal(20)

    const arrayFloat64 = new Float64Array([1, 2, 3, 4, 5])
    sizeof(arrayFloat64).should.equal(40)
  })

  it('BigInt support', () => {
    sizeof(BigInt(21474836480)).should.equal(11)
  })

  it('BigInt support in objects', () => {
    const nestedBigInt = {
      num: BigInt(123123123123123123n)
    }
    sizeof(nestedBigInt).should.equal(28)
  })

  it('function support in objects', () => {
    const nestedFunction = {
      func: x => {
        return x + x
      }
    }
    sizeof(nestedFunction).should.equal(48)
  })

  it('nested support in objects', () => {
    const nestedUndefined = {
      undef: undefined
    }
    sizeof(nestedUndefined).should.equal(21)
  })

  it('should handle nested symbols', () => {
    sizeof({ symbol: Symbol('test') }).should.equal(25)
  })

  it('should handle nested regex', () => {
    sizeof({ regex: /test/g }).should.equal(19)
  })

  it('nested objects', () => {
    const obj = { a: 1, b: 2, c: 3 }
    sizeof(obj).should.be.equal(19)
    const nested = { d: obj }
    sizeof(nested).should.be.equal(25)
  })

  it('Function support', () => {
    const func = (one, two) => {
      return one + two
    }
    sizeof(func).should.equal(44)
  })

  it('should calculate size for global symbols', () => {
    sizeof(Symbol.for('testKey')).should.equal(14)
  })
})

describe('sizeof browser tests', () => {
  beforeEach(function () {
    global.window = {}
    global.document = {}
  })

  it('each caracter is two bytes in a browser environent', () => {
    sizeof('abc').should.be.equal(6)
  })

  afterEach(function () {
    delete global.window
    delete global.document
  })
})
