'use strict'

const test = require('tap').test
const { tmpdir } = require('os')
const { join } = require('path')
const { writeFile } = require('fs')
const { promisify } = require('util')
const initJob = require('../lib/init')
const helper = require('./helper')
const writef = promisify(writeFile)
const { hasWorkerSupport } = require('../lib/util')

test('run should return an error with invalid form options', async t => {
  const cases = [
    {
      name: 'invalid JSON',
      value: 'u',
      message: 'Invalid JSON or file where to get form data'
    },
    {
      name: 'non existing JSON file',
      value: 'nonexisting.json',
      message: 'Invalid JSON or file where to get form data'
    },
    {
      name: 'JSON options missing path key in file type',
      value: '{ "image": { "type": "file" }}',
      message: 'Missing key \'path\' in form object for key \'image\''
    },
    {
      name: 'JS Object missing path key in file type',
      value: { image: { type: 'file' } },
      message: 'Missing key \'path\' in form object for key \'image\''
    },
    {
      name: 'JSON options missing value in text type',
      value: '{ "image": { "type": "text" }}',
      message: 'Missing key \'value\' in form object for key \'image\''
    },
    {
      name: 'JS Object missing value in text type',
      value: { image: { type: 'text' } },
      message: 'Missing key \'value\' in form object for key \'image\''
    },
    {
      name: 'JSON options with not supported type',
      value: '{ "image": { "type": "random" }}',
      message: 'A \'type\' key with value \'text\' or \'file\' should be specified'
    },
    {
      name: 'JS Object with not supported type',
      value: { image: { type: 'random' } },
      message: 'A \'type\' key with value \'text\' or \'file\' should be specified'
    }
  ]

  const server = helper.startMultipartServer()
  t.teardown(() => server.close())

  for (const c of cases) {
    t.test(c.name, async t => {
      const [err] = await new Promise((resolve) => {
        initJob({
          url: 'http://localhost:' + server.address().port,
          connections: 1,
          amount: 1,
          form: c.value
        }, (err, res) => {
          resolve([err, res])
        })
      })
      await t.test('error', t => {
        t.not(null, err)
        t.equal(c.message, err.message, `mismatching error message ${err.message}`)
        t.end()
      })
    })
  }
})

test('run should take form options as a JSON string or a JS Object', async t => {
  const form = {
    image: {
      type: 'file',
      path: require.resolve('./j5.jpeg')
    },
    name: {
      type: 'text',
      value: 'j5'
    }
  }
  const string = JSON.stringify(form)
  const temp = tmpdir()
  const jsonFile = join(temp, 'multipart.json')

  await writef(jsonFile, string, 'utf8')

  const cases = [
    {
      name: 'from string',
      value: string
    },
    {
      name: 'from json file',
      value: jsonFile
    },
    {
      name: 'from JS Object',
      value: form
    }
  ]
  const allCases = [...cases, ...cases.map(c => ({ ...c, workers: true }))]

  for (const c of allCases) {
    t.test(c.name, { skip: c.workers && !hasWorkerSupport }, async t => {
      const server = helper.startMultipartServer(null, payload => {
        t.equal('j5', payload.name)
        t.equal('j5.jpeg', payload.image.filename)
      })
      t.teardown(() => server.close())
      const [err, res] = await new Promise((resolve) => {
        initJob({
          url: 'http://localhost:' + server.address().port,
          connections: 1,
          amount: 1,
          form: c.value,
          workers: c.workers ? 1 : undefined // use only one worker coz we're checking for 1 req
        }, (err, res) => {
          resolve([err, res])
        })
      })
      await t.test('result', t => {
        t.equal(null, err)
        t.equal(0, res.errors, 'result should not have errors')
        t.equal(1, res['2xx'], 'result status code should be 2xx')
        t.equal(0, res.non2xx, 'result status code should be 2xx')
        t.end()
      })
    })
  }
})

test('run should use a custom method if `options.method` is passed', t => {
  const server = helper.startMultipartServer(null, payload => {
    t.equal('j5', payload.name)
    t.equal('j5.jpeg', payload.image.filename)
  })
  t.teardown(() => server.close())

  const form = {
    image: {
      type: 'file',
      path: require.resolve('./j5.jpeg')
    },
    name: {
      type: 'text',
      value: 'j5'
    }
  }
  initJob({
    url: 'http://localhost:' + server.address().port,
    method: 'PUT',
    connections: 1,
    amount: 1,
    form
  }, (err, res) => {
    t.equal(null, err)
    t.equal(0, res.errors, 'result should not have errors')
    t.equal(1, res['2xx'], 'result status code should be 2xx')
    t.equal(0, res.non2xx, 'result status code should be 2xx')
    t.end()
  })
})

test('run should set filename', t => {
  const server = helper.startMultipartServer(null, payload => {
    t.equal('j5', payload.name)
    t.equal('j5.jpeg', payload.image.filename)
  })
  t.teardown(() => server.close())

  const form = {
    image: {
      type: 'file',
      path: require.resolve('./j5.jpeg')
    },
    name: {
      type: 'text',
      value: 'j5'
    }
  }
  initJob({
    url: 'http://localhost:' + server.address().port,
    method: 'POST',
    connections: 1,
    amount: 1,
    form
  }, (err, res) => {
    t.equal(null, err)
    t.equal(0, res.errors, 'result should not have errors')
    t.equal(1, res['2xx'], 'result status code should be 2xx')
    t.equal(0, res.non2xx, 'result status code should be 2xx')
    t.end()
  })
})

test('run should allow overriding filename', t => {
  const server = helper.startMultipartServer(null, payload => {
    t.equal('j5', payload.name)
    t.equal('testfilename.jpeg', payload.image.filename)
  })
  t.teardown(() => server.close())

  const form = {
    image: {
      type: 'file',
      path: require.resolve('./j5.jpeg'),
      options: {
        filename: 'testfilename.jpeg'
      }
    },
    name: {
      type: 'text',
      value: 'j5'
    }
  }
  initJob({
    url: 'http://localhost:' + server.address().port,
    method: 'POST',
    connections: 1,
    amount: 1,
    form
  }, (err, res) => {
    t.equal(null, err)
    t.equal(0, res.errors, 'result should not have errors')
    t.equal(1, res['2xx'], 'result status code should be 2xx')
    t.equal(0, res.non2xx, 'result status code should be 2xx')
    t.end()
  })
})

test('run should allow overriding filename with file path', t => {
  const server = helper.startMultipartServer({ preservePath: true }, payload => {
    t.equal('j5', payload.name)
    t.equal('some/path/testfilename.jpeg', payload.image.filename)
  })
  t.teardown(() => server.close())

  const form = {
    image: {
      type: 'file',
      path: require.resolve('./j5.jpeg'),
      options: {
        filepath: 'some/path/testfilename.jpeg'
      }
    },
    name: {
      type: 'text',
      value: 'j5'
    }
  }
  initJob({
    url: 'http://localhost:' + server.address().port,
    method: 'POST',
    connections: 1,
    amount: 1,
    form
  }, (err, res) => {
    t.equal(null, err)
    t.equal(0, res.errors, 'result should not have errors')
    t.equal(1, res['2xx'], 'result status code should be 2xx')
    t.equal(0, res.non2xx, 'result status code should be 2xx')
    t.end()
  })
})
