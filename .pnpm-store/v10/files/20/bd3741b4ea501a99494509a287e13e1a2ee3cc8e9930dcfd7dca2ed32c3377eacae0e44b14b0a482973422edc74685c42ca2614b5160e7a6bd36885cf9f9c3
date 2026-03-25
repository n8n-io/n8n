var assert = require('assert')
var GenerateSchema = require('../src/index')
var fixtureObj = require('./fixtures/simple')
var fixtureName = 'simple'

describe('CLICKHOUSE', function () {
  describe('Checks', function () {
    var schema = GenerateSchema.clickhouse(fixtureName, fixtureObj, 'date')

    it('should create table with the name ' + fixtureName, function () {
      assert.ok(schema.indexOf('CREATE TABLE ' + fixtureName) > -1)
    })

    it('should create table with the name ' + fixtureName + '_article', function () {
      assert.ok(schema.indexOf('CREATE TABLE ' + fixtureName + '_article') > -1)
    })

    it('should create table with the name ' + fixtureName + '_comments', function () {
      assert.ok(schema.indexOf('CREATE TABLE ' + fixtureName + '_comments') > -1)
    })

    it('should create table with the name ' + fixtureName + '_comments_tags', function () {
      assert.ok(schema.indexOf('CREATE TABLE ' + fixtureName + '_comments_tags') > -1)
    })

    it(fixtureName + '_id should be of type [Int32]', function () {
      assert.ok(schema.indexOf(fixtureName + '_id Int32') > -1)
    })

    it('slug should be of type [String]', function () {
      assert.ok(schema.indexOf('slug String') > -1)
    })

    it('admin should be of type [String]', function () {
      assert.ok(schema.indexOf('admin String') > -1)
    })

    it('avatar should be of type [String]', function () {
      assert.ok(schema.indexOf('avatar String') > -1)
    })

    it('date should be of type [Date]', function () {
      assert.ok(schema.indexOf('date Date') > -1)
    })

    it('should have ENGINE date, id', function () {
      assert.ok(schema.indexOf('ENGINE = MergeTree(date') > -1)
    })
  })
})
