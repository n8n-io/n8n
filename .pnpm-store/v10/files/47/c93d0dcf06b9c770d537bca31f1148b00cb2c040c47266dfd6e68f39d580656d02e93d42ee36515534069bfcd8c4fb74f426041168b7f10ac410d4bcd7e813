'use strict'

const test = require('tap').test
// const { ofUrl, checkUrl } = require('../lib/url')
const { ofURL, checkURL } = require('../lib/url')

test('checkURL should return true if a populated string is passed', (t) => {
  t.plan(1)

  const result = checkURL('foo')
  t.ok(result)
})

test('checkURL should return false if an empty string is passed', (t) => {
  t.plan(1)

  const result = checkURL('')
  t.notOk(result)
})

test('checkURL should return true if a populated array is passed', (t) => {
  t.plan(1)

  const result = checkURL(['foo'])
  t.ok(result)
})

test('checkURL should return false if an empty array is passed', (t) => {
  t.plan(1)

  const result = checkURL([])
  t.notOk(result)
})

test('ofUrl should return the array if the passed in url is an array', (t) => {
  t.plan(1)

  const result = ofURL(['foo', 'bar'])
  t.same(result, ['foo', 'bar'])
})

test('When ofUrl is passed a string ofUrl should return an object containing a map function that accepts an url', (t) => {
  t.plan(1)

  const result = ofURL('foo', false)
  const mappedResult = result.map((url) => url)
  t.same(mappedResult, 'foo')
})

test('When ofUrl is passed a string and asArray=true ofUrl should return an object containing a map function that returns an array', (t) => {
  t.plan(1)

  const result = ofURL('foo', true)
  const mappedResult = result.map((url) => url)
  t.same(mappedResult, ['foo'])
})

test('ofUrl Should throw an error when passed an invalid url type', (t) => {
  t.plan(1)

  t.throws(() => ofURL(123), 'url should only be a string or an array of string')
})
