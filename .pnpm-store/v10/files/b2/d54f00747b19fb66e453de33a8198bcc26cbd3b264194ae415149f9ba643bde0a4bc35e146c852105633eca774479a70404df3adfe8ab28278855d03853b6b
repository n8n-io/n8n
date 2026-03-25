var assert = require('assert')
var GenerateSchema = require('../src/index')
var fixtureObj = require('./fixtures/simple')
var fixtureName = 'simple'

describe('MYSQL', function () {
  describe('Checks', function () {
    var schema = GenerateSchema.mysql(fixtureName, fixtureObj)

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

    it(fixtureName + '_id should be of type [INT]', function () {
      assert.ok(schema.indexOf(fixtureName + '_id INT') > -1)
    })

    it('slug should be of type [TEXT]', function () {
      assert.ok(schema.indexOf('slug TEXT') > -1)
    })

    it('admin should be of type [BOOLEAN]', function () {
      assert.ok(schema.indexOf('admin BOOLEAN') > -1)
    })

    it('avatar should be of type [TEXT]', function () {
      assert.ok(schema.indexOf('avatar TEXT') > -1)
    })

    it('date should be of type [DATE]', function () {
      assert.ok(schema.indexOf('date DATE') > -1)
    })

    it('should have primary key id', function () {
      assert.ok(schema.indexOf('PRIMARY KEY (id)') > -1)
    })

    it('should have table with foreign key ' + fixtureName + '_comments_id', function () {
      assert.ok(schema.indexOf('FOREIGN KEY (' + fixtureName + '_comments_id)') > -1)
    })
  })
})
