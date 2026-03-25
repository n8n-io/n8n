var GenerateSchema = require('../src/index')
var simple = require('./fixtures/simple')

describe('BigQuery', function () {
  describe('Type Checks', function () {
    var schema

    beforeEach(function () {
      schema = GenerateSchema.bigquery(simple)
    })

    it('id should be of type [INTEGER]', function () {
      var item = schema[0]

      item.name.should.equal('id')
      item.type.should.equal('INTEGER')
      item.mode.should.equal('NULLABLE')
    })

    it('slug should be of type [STRING]', function () {
      var item = schema[1]

      item.name.should.equal('slug')
      item.type.should.equal('STRING')
    })

    it('admin should be of type [BOOLEAN]', function () {
      var item = schema[2]

      item.name.should.equal('admin')
      item.type.should.equal('BOOLEAN')
      item.mode.should.equal('NULLABLE')
    })

    it('avatar should be of type [STRING]', function () {
      var item = schema[3]

      item.name.should.equal('avatar')
      item.type.should.equal('STRING')
      item.mode.should.equal('NULLABLE')
    })

    it('date should be of type [TIMESTAMP]', function () {
      var item = schema[4]

      item.name.should.equal('date')
      item.type.should.equal('TIMESTAMP')
      item.mode.should.equal('NULLABLE')
    })

    it('article should be of type [RECORD] with [NULLABLE] mode and should contain [FIELDS]', function () {
      var item = schema[5]

      item.name.should.equal('article')
      item.type.should.equal('RECORD')
      item.mode.should.equal('NULLABLE')
      item.should.have.property('fields')
    })

    it('article.title should be of type [STRING]', function () {
      var item = schema[5].fields[0]

      item.name.should.equal('title')
      item.type.should.equal('STRING')
      item.mode.should.equal('NULLABLE')
    })

    it('article.description should be of type [STRING]', function () {
      var item = schema[5].fields[1]

      item.name.should.equal('description')
      item.type.should.equal('STRING')
      item.mode.should.equal('NULLABLE')
    })

    it('article.body should be of type [STRING]', function () {
      var item = schema[5].fields[2]

      item.name.should.equal('body')
      item.type.should.equal('STRING')
      item.mode.should.equal('NULLABLE')
    })

    it('comments should be of type [RECORD] with [REPEATED] mode and should contain [FIELDS]', function () {
      var item = schema[6]

      item.name.should.equal('comments')
      item.type.should.equal('RECORD')
      item.mode.should.equal('REPEATED')
      item.should.have.property('fields')
    })
  })
})
