'use strict'

const test = require('tap').test
const validateOpts = require('../lib/validate')
const helper = require('./helper')
const { hasWorkerSupport } = require('../lib/util')

test('validateOpts should not return an error with only an url passed in', (t) => {
  t.plan(1)

  const result = validateOpts({ url: 'http://localhost' })
  t.ok(!(result instanceof Error))
})

test('validateOpts should return an error when workers option is present and hasWorkerSupport is false', (t) => {
  const validateOpts = t.mock('../lib/validate', {
    '../lib/util': { hasWorkerSupport: false }
  })
  t.plan(2)

  const result = validateOpts({ workers: 1 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'Please use node >= 11.7.0 for workers support')
})

test('validateOpts should return an error when bailout is less than 1', (t) => {
  const validateOpts = t.mock('../lib/validate', {
    '../lib/util': { hasWorkerSupport: false }
  })
  t.plan(2)

  const result = validateOpts({ bailout: 0 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'bailout threshold can not be less than 1')
})

test('validateOpts should return an error when connectionRate is less than 1', (t) => {
  t.plan(2)

  const result = validateOpts({ connectionRate: 0 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'connectionRate can not be less than 1')
})

test('validateOpts should return an error when overallRate is less than 1', (t) => {
  t.plan(2)

  const result = validateOpts({ overallRate: 0 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'bailout overallRate can not be less than 1')
})

test('validateOpts should return an error when amount is less than 1', (t) => {
  t.plan(2)

  const result = validateOpts({ amount: 0 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'amount can not be less than 1')
})

test('validateOpts should return an error when maxConnectionRequests is less than 1', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', maxConnectionRequests: 0 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'maxConnectionRequests can not be less than 1')
})

test('validateOpts should return an error when maxOverallRequests is less than 1', (t) => {
  t.plan(2)

  const result = validateOpts({ maxOverallRequests: 0 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'maxOverallRequests can not be less than 1')
})

test('validateOpts should return an error when requests does not contain a valid setupRequest function', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', requests: [{ setupRequest: 123 }] })
  t.ok(result instanceof Error)
  t.equal(result.message, 'Invalid option setupRequest, please provide a function (or file path when in workers mode)')
})

test('validateOpts should return an error when requests does not contain a valid onResponse function', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', requests: [{ onResponse: 123 }] })
  t.ok(result instanceof Error)
  t.equal(result.message, 'Invalid option onResponse, please provide a function (or file path when in workers mode)')
})

test('validateOpts should return an error when setupClient is not a valid function', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', setupClient: 123 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'Invalid option setupClient, please provide a function (or file path when in workers mode)')
})

test('validateOpts should return an error if neither url or socket path are provided', (t) => {
  t.plan(2)

  const result = validateOpts({ })
  t.ok(result instanceof Error)
  t.equal(result.message, 'url or socketPath option required')
})

test('validateOpts should convert a duration that is a string representation of a number into a number', (t) => {
  t.plan(1)

  const result = validateOpts({ url: 'http://localhost', duration: '100' })
  t.equal(result.duration, 100)
})

test('validateOpts should convert a duration that is a timestring into a number', (t) => {
  t.plan(1)

  const result = validateOpts({ url: 'http://localhost', duration: '2 weeks' })
  t.equal(result.duration, 1209600)
})

test('validateOpts should return an error if duration is in an invalid format', (t) => {
  t.plan(1)

  const result = validateOpts({ url: 'http://localhost', duration: '2 dsweeks' })
  t.ok(result instanceof Error)
})

test('validateOpts should return an error if duration less than 0', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', duration: -1 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'duration can not be less than 0')
})

test('validateOpts should return an error if expectBody is used in conjunction with requests', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', expectBody: 'foo', requests: [] })
  t.ok(result instanceof Error)
  t.equal(result.message, 'expectBody cannot be used in conjunction with requests')
})

test('validateOpts should parse a multipart form correctly', (t) => {
  t.plan(1)

  const result = validateOpts({ url: 'http://localhost', form: '{ "field 1": { "type": "text", "value": "a text value"} }' })
  t.ok(result.form)
})

test('validateOpts should return an error if a multipart form is incorrectly formatted', (t) => {
  t.plan(1)

  const result = validateOpts({ url: 'http://localhost', form: 'invalid form' })
  t.ok(result instanceof Error)
})

test('validateOpts should parse a HAR request successfully', (t) => {
  t.plan(1)

  const har = helper.customizeHAR('./fixtures/httpbin-get.json', 'https://httpbin.org', 'http://localhost')
  const result = validateOpts({ url: 'http://localhost', har })
  t.ok(result.har)
})

test('validateOpts should return an error if a HAR request is unsuccessful', (t) => {
  t.plan(1)

  const result = validateOpts({ url: 'http://localhost', har: 'invalid har' })
  t.ok(result instanceof Error)
})

test('validateOpts should return an error when connections is less than 1', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', connections: 0 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'connections can not be less than 1')
})

test('validateOpts should return an error when ignoreCoordinatedOmission used without connectionRate or overallRate', (t) => {
  t.plan(2)

  const result = validateOpts({
    url: 'http://localhost',
    ignoreCoordinatedOmission: true
  })
  t.ok(result instanceof Error)
  t.equal(result.message, 'ignoreCoordinatedOmission makes no sense without connectionRate or overallRate')
})

test('validateOpts is successful when ignoreCoordinatedOmission is used with connectionRate', (t) => {
  t.plan(1)

  const result = validateOpts({
    url: 'http://localhost',
    ignoreCoordinatedOmission: true,
    connectionRate: 1
  })
  t.ok(result.ignoreCoordinatedOmission)
})

test('validateOpts is successful when ignoreCoordinatedOmission is used with overallRate', (t) => {
  t.plan(1)

  const result = validateOpts({
    url: 'http://localhost',
    ignoreCoordinatedOmission: true,
    overallRate: 1
  })
  t.ok(result.ignoreCoordinatedOmission)
})

test('validateOpts should return an error when forever is used with cbPassedIn', (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', forever: true }, () => {})
  t.ok(result instanceof Error)
  t.equal(result.message, 'should not use the callback parameter when the `forever` option is set to true. Use the `done` event on this event emitter')
})

test('validateOpts should return an error when forever is used with workers', { skip: !hasWorkerSupport }, (t) => {
  t.plan(2)

  const result = validateOpts({ url: 'http://localhost', forever: true, workers: 2 })
  t.ok(result instanceof Error)
  t.equal(result.message, 'Using `forever` option isn\'t currently supported with workers')
})

test('validateOpts should not set render options by default', (t) => {
  t.plan(3)

  const result = validateOpts({ url: 'http://localhost' })
  t.equal(result.renderProgressBar, undefined)
  t.equal(result.renderResultsTable, undefined)
  t.equal(result.renderLatencyTable, undefined)
})

test('validateOpts should disable render options when json is true', (t) => {
  t.plan(3)

  const result = validateOpts({ url: 'http://localhost', json: true })
  t.equal(result.renderProgressBar, false)
  t.equal(result.renderResultsTable, false)
  t.equal(result.renderLatencyTable, false)
})
