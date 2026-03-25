
var join = require('..');

describe('join(arr)', function(){
  it('should default to "and"', function(){
     join(['foo', 'bar']).should.equal('foo and bar');
  })
})

describe('join(arr, str)', function(){
  it('should join', function(){
     join([], 'and').should.equal('');
     join(['foo'], 'and').should.equal('foo');
     join(['foo', 'bar'], 'and').should.equal('foo and bar');
     join(['foo', 'bar', 'baz'], 'or').should.equal('foo, bar or baz');
  })
})

describe('join(arr, str) with Oxford comma', function() {
  it('should remove comma with less than 3 items', function() {
    join([], ', or').should.equal('');
    join(['foo'], ', or').should.equal('foo');
    join(['foo', 'bar'], ', or').should.equal('foo or bar');
  })

  it('should join with 3 or more items', function() {
    join(['foo', 'bar', 'baz'], ', and').should.equal('foo, bar, and baz');
  })
})
