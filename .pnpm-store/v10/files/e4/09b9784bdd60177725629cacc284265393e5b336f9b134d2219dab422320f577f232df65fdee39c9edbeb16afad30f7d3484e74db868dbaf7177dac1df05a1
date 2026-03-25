var GenerateSchema = require('../src/index')
var review = require('./fixtures/review')

describe('Mongoose', function () {
  describe('Type Checks', function () {
    var schema

    beforeEach(function () {
      schema = GenerateSchema.mongoose(review)
    })

    it('._id should be of type [ObjectId]', function () {
      schema._id.type.should.equal('ObjectId')
    })

    it('.approved_by should be of type [Mixed]', function () {
      schema.approved_by.type.should.equal('Mixed')
    })
  })
})
