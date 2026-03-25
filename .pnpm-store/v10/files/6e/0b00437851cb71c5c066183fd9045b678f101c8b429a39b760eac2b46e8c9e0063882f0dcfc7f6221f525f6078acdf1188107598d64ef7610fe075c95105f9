'use strict';

const fs = require('fs')
const assert = require('assert')
const { extname } = require('path')

const tmp = require('.')

async function checkFileResult(result) {
  assert.deepEqual(Object.keys(result).sort(), ['cleanup', 'fd', 'path'])

  const { path, fd, cleanup } = result
  assert.ok(typeof path === 'string')
  assert.ok(typeof fd === 'number')
  assert.ok(typeof cleanup === 'function')

  // Check that the path is a fille.
  assert.ok(fs.statSync(path).isFile())

  // Check that the fd is correct and points to the file.
  const message = 'hello there!'
  fs.writeSync(fd, message)
  fs.fdatasyncSync(fd)
  assert.equal(fs.readFileSync(path), message)

  // Check that the cleanup works.
  await cleanup()
  assert.throws(() => fs.statSync(path))
}

describe('file()', function()
{
  context('when called without options', function()
  {
    it('creates the file, returns the expected result, and the cleanup function works', async function()
    {
      const result = await tmp.file()
      await checkFileResult(result)
    })
  })

  context('when called with options', function()
  {
    it('creates the file, returns the expected result, and the cleanup function works', async function()
    {
      const prefix = 'myTmpDir_'
      const result = await tmp.file({ prefix })
      await checkFileResult(result)
      assert.ok(result.path.includes(prefix))
    })
  })

  it('propagates errors', async function() {
    try {
      await tmp.file({ dir: 'nonexistent-path' });
      throw Error('Expected to throw');
    } catch (e) {
      assert.ok(e.message.startsWith('ENOENT: no such file or directory'));
    }
  });
})

async function checkDirResult(result) {
  assert.deepEqual(Object.keys(result).sort(), ['cleanup', 'path'])

  const { path, cleanup } = result
  assert.ok(typeof path === 'string')
  assert.ok(typeof cleanup === 'function')

  assert.ok(fs.statSync(path).isDirectory())

  await cleanup()
  assert.throws(() => fs.statSync(path))
}

describe('dir()', function()
{
  context('when called without options', function()
  {
    it('creates the directory, returns the expected result, and the cleanup function works', async function()
    {
      const result = await tmp.dir()
      await checkDirResult(result)
    })
  })

  context('when called with options', function()
  {
    it('creates the directory, returns the expected result, and the cleanup function works', async function()
    {
      const prefix = 'myTmpDir_'
      const result = await tmp.dir({ prefix })
      await checkDirResult(result)
      assert.ok(result.path.includes(prefix))
    })
  })

  it('propagates errors', async function() {
    try {
      await tmp.dir({ dir: 'nonexistent-path' });
      throw Error('Expected to throw');
    } catch (e) {
      assert.ok(e.message.startsWith('ENOENT: no such file or directory'));
    }
  });
})

describe('withFile()', function()
{
  it("file doesn't exist after going out of scope", function()
  {
    var filepath

    return tmp.withFile(function(o)
    {
      filepath = o.path

      fs.accessSync(filepath)
      assert.strictEqual(extname(filepath), '.txt')
    }, {discardDescriptor: true, postfix: '.txt'})
    .then(function()
    {
      assert.throws(function()
      {
        fs.accessSync(filepath)
      }, filepath + ' still exists')
    })
  })
})


describe('withDir()', function()
{
  it("dir doesn't exist after going out of scope", function()
  {
    var filepath

    return tmp.withDir(function(o)
    {
      filepath = o.path

      fs.accessSync(filepath)
      assert.strictEqual(extname(filepath), '.dir')
    }, {postfix: '.dir'})
    .then(function()
    {
      assert.throws(function()
      {
        fs.accessSync(filepath)
      }, filepath + ' still exists')
    })
  })
})
