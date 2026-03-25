var GenerateSchema = require('../src/index')
var simple = require('./fixtures/simple')
var advanced = require('./fixtures/advanced')

describe('JSON', function () {
  describe('Schema Checks', function () {
    var schema

    beforeEach(function () {
      schema = GenerateSchema.json(simple)
    })

    it('.$schema should exist', function () {
      schema.should.have.property('$schema')
    })

    it('.type should exist', function () {
      schema.should.have.property('type')
    })
  })

  describe('Item Checks', function () {
    var schema

    beforeEach(function () {
      schema = GenerateSchema.json(advanced)
    })

    it('.items should be an object', function () {
      schema.items.should.be.type('object')
    })

    it('.items.required should be an array', function () {
      schema.items.required.should.be.an.Array
      schema.items.required.should.eql([ 'id', 'name', 'price', 'dimensions', 'warehouseLocation' ])
    })

    it('.items.properties.tags should be an object', function () {
      schema.items.properties.tags.should.be.type('object')
    })
  })

  describe('Property Checks', function () {
    var schema

    beforeEach(function () {
      schema = GenerateSchema.json(simple)
    })

    it('.properties should exist', function () {
      schema.should.have.property('properties')
    })

    it('.properties should be an object', function () {
      schema.properties.should.be.type('object')
    })

    it('.properties.id should be of type [number]', function () {
      schema.properties.id.type.should.equal('number')
    })

    it('.properties.slug should be of type [string]', function () {
      schema.properties.slug.type.should.equal('string')
    })

    it('.properties.admin should be of type [boolean]', function () {
      schema.properties.admin.type.should.equal('boolean')
    })

    it('.properties.avatar should be of type [null]', function () {
      schema.properties.avatar.type.should.equal('null')
    })

    it('.properties.date should be of type [string]', function () {
      schema.properties.date.type.should.equal('string')
      schema.properties.date.format.should.equal('date-time')
    })

    it('.properties.article should be of type [object]', function () {
      schema.properties.article.type.should.equal('object')
    })

    it('.properties.article.properties should be of type [object]', function () {
      schema.properties.article.properties.should.be.type('object')
    })

    it('.properties.article.properties.title should be of type [string]', function () {
      schema.properties.article.properties.title.type.should.equal('string')
    })

    it('.properties.article.properties.description should be of type [string]', function () {
      schema.properties.article.properties.description.type.should.equal('string')
    })

    it('.properties.article.properties.body should be of type [string]', function () {
      schema.properties.article.properties.body.type.should.equal('string')
    })

    it('.properties.comments should be of type [array]', function () {
      schema.properties.comments.type.should.equal('array')
    })

    it('.properties.comments.items should be of type [object]', function () {
      schema.properties.comments.items.should.be.type('object')
    })

    it('.properties.comments.items.properties.body should be of type [string, null]', function () {
      schema.properties.comments.items.properties.body.type[0].should.equal('string')
      schema.properties.comments.items.properties.body.type[1].should.equal('null')
    })
  })
})