'use strict'

const test = require('tap').test
const path = require('path')
const findNodeDirectory = require('../lib/find-node-directory')

const platforms = ['darwin', 'freebsd', 'linux', 'sunos', 'win32', 'aix']

// we should find the directory based on the directory
// the script is running in and it should match the layout
// in a build tree where npm is installed in
// .... /deps/npm
test('test find-node-directory - node install', function (t) {
  t.plan(platforms.length)
  for (var next = 0; next < platforms.length; next++) {
    var processObj = { execPath: '/x/y/bin/node', platform: platforms[next] }
    t.equal(
      findNodeDirectory('/x/deps/npm/node_modules/node-gyp/lib', processObj),
      path.join('/x'))
  }
})

// we should find the directory based on the directory
// the script is running in and it should match the layout
// in an installed tree where npm is installed in
// .... /lib/node_modules/npm or .../node_modules/npm
// depending on the patform
test('test find-node-directory - node build', function (t) {
  t.plan(platforms.length)
  for (var next = 0; next < platforms.length; next++) {
    var processObj = { execPath: '/x/y/bin/node', platform: platforms[next] }
    if (platforms[next] === 'win32') {
      t.equal(
        findNodeDirectory('/y/node_modules/npm/node_modules/node-gyp/lib',
          processObj), path.join('/y'))
    } else {
      t.equal(
        findNodeDirectory('/y/lib/node_modules/npm/node_modules/node-gyp/lib',
          processObj), path.join('/y'))
    }
  }
})

// we should find the directory based on the execPath
// for node and match because it was in the bin directory
test('test find-node-directory - node in bin directory', function (t) {
  t.plan(platforms.length)
  for (var next = 0; next < platforms.length; next++) {
    var processObj = { execPath: '/x/y/bin/node', platform: platforms[next] }
    t.equal(
      findNodeDirectory('/nothere/npm/node_modules/node-gyp/lib', processObj),
      path.join('/x/y'))
  }
})

// we should find the directory based on the execPath
// for node and match because it was in the Release directory
test('test find-node-directory - node in build release dir', function (t) {
  t.plan(platforms.length)
  for (var next = 0; next < platforms.length; next++) {
    var processObj
    if (platforms[next] === 'win32') {
      processObj = { execPath: '/x/y/Release/node', platform: platforms[next] }
    } else {
      processObj = {
        execPath: '/x/y/out/Release/node',
        platform: platforms[next]
      }
    }

    t.equal(
      findNodeDirectory('/nothere/npm/node_modules/node-gyp/lib', processObj),
      path.join('/x/y'))
  }
})

// we should find the directory based on the execPath
// for node and match because it was in the Debug directory
test('test find-node-directory - node in Debug release dir', function (t) {
  t.plan(platforms.length)
  for (var next = 0; next < platforms.length; next++) {
    var processObj
    if (platforms[next] === 'win32') {
      processObj = { execPath: '/a/b/Debug/node', platform: platforms[next] }
    } else {
      processObj = { execPath: '/a/b/out/Debug/node', platform: platforms[next] }
    }

    t.equal(
      findNodeDirectory('/nothere/npm/node_modules/node-gyp/lib', processObj),
      path.join('/a/b'))
  }
})

// we should not find it as it will not match based on the execPath nor
// the directory from which the script is running
test('test find-node-directory - not found', function (t) {
  t.plan(platforms.length)
  for (var next = 0; next < platforms.length; next++) {
    var processObj = { execPath: '/x/y/z/y', platform: next }
    t.equal(findNodeDirectory('/a/b/c/d', processObj), '')
  }
})

// we should find the directory based on the directory
// the script is running in and it should match the layout
// in a build tree where npm is installed in
// .... /deps/npm
// same test as above but make sure additional directory entries
// don't cause an issue
test('test find-node-directory - node install', function (t) {
  t.plan(platforms.length)
  for (var next = 0; next < platforms.length; next++) {
    var processObj = { execPath: '/x/y/bin/node', platform: platforms[next] }
    t.equal(
      findNodeDirectory('/x/y/z/a/b/c/deps/npm/node_modules/node-gyp/lib',
        processObj), path.join('/x/y/z/a/b/c'))
  }
})
