var GenerateSchema = require('../src/index')
var simple = require('./fixtures/simple')

describe('Generic', function () {
  describe('Type Checks', function () {
    var schema

    beforeEach(function () {
      schema = GenerateSchema.generic(simple)
    })

    it('.id should be of type [number]', function () {
      schema.id.type.should.equal('number')
    })

    it('.slug should be of type [string]', function () {
      schema.slug.type.should.equal('string')
    })

    it('.admin should be of type [boolean]', function () {
      schema.admin.type.should.equal('boolean')
    })

    it('.avatar should be of type [null]', function () {
      schema.avatar.type.should.equal('null')
    })

    it('.date should be of type [date]', function () {
      schema.date.type.should.equal('date')
    })

    it('.article should be of type [object]', function () {
      schema.article.type.should.equal('object')
    })

    it('.article.title should be of type [string]', function () {
      schema.article.title.type.should.equal('string')
    })

    it('.article.description should be of type [string]', function () {
      schema.article.description.type.should.equal('string')
    })

    it('.article.body should be of type [string]', function () {
      schema.article.body.type.should.equal('string')
    })

    it('.comments should be of type [array]', function () {
      schema.comments.type.should.equal('array')
    })
  })
})
