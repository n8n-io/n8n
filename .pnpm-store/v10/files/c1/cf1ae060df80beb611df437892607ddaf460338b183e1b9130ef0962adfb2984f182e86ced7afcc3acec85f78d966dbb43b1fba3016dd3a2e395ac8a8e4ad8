Heap = require '..'
{random} = Math

describe 'Heap#push, Heap#pop', ->
  it 'should sort an array using push and pop', ->
    heap = new Heap
    heap.push(random()) for i in [1..10]
    sorted = (heap.pop() until heap.empty())
    sorted.slice().sort().should.eql(sorted)

  it 'should work with custom comparison function', ->
    cmp = (a, b) ->
      return -1 if a > b
      return 1 if a < b
      0
    heap = new Heap(cmp)
    heap.push(random()) for i in [1..10]
    sorted = (heap.pop() until heap.empty())
    sorted.slice().sort().reverse().should.eql(sorted)

describe 'Heap#replace', ->
  it 'should behave like pop() followed by push()', ->
    heap = new Heap
    heap.push(v) for v in [1..5]
    heap.replace(3).should.eql(1)
    heap.toArray().sort().should.eql([2,3,3,4,5])

describe 'Heap#pushpop', ->
  it 'should behave like push() followed by pop()', ->
    heap = new Heap
    heap.push(v) for v in [1..5]
    heap.pushpop(6).should.eql(1)
    heap.toArray().sort().should.eql([2..6])

describe 'Heap#contains', ->
  it 'should return whether it contains the value', ->
    heap = new Heap
    heap.push(v) for v in [1..5]
    heap.contains(v).should.be.true for v in [1..5]
    heap.contains(0).should.be.false
    heap.contains(6).should.be.false

describe 'Heap#peek', ->
  it 'should return the top value', ->
    heap = new Heap
    heap.push(1)
    heap.peek().should.eql(1)
    heap.push(2)
    heap.peek().should.eql(1)
    heap.pop()
    heap.peek().should.eql(2)

describe 'Heap#clone', ->
  it 'should return a cloned heap', ->
    a = new Heap
    a.push(v) for v in [1..5]
    b = a.clone()
    a.toArray().should.eql(b.toArray())

describe 'Heap.nsmallest', ->
  it 'should return exactly n elements when size() >= n', ->
    Heap.nsmallest([1..10], 3).should.eql([1..3])

    array = [1,3,2,1,3,4,4,2,3,4,5,1,2,3,4,5,2,1,3,4,5,6,7,2]
    Heap.nsmallest(array, 2).should.eql([1, 1])

  it 'should return size() elements when size() <= n', ->
    Heap.nsmallest([3..1], 10).should.eql([1..3])

describe 'Heap.nlargest', ->
  it 'should return exactly n elements when size() >= n', ->
    Heap.nlargest([1..10], 3).should.eql([10..8])

  it 'should return size() elements when size() <= n', ->
    Heap.nlargest([3..1], 10).should.eql([3..1])

describe 'Heap#updateItem', ->
  it 'should return correct order', ->
    a = x: 1
    b = x: 2
    c = x: 3
    h = new Heap (m, n) -> m.x - n.x
    h.push(a)
    h.push(b)
    h.push(c)
    c.x = 0
    h.updateItem(c)
    h.pop().should.eql(c)
  it 'should return correct order when used statically', ->
    a = x: 1
    b = x: 2
    c = x: 3
    h = []
    cmp = (m, n) -> m.x - n.x
    Heap.push(h, a, cmp)
    Heap.push(h, b, cmp)
    Heap.push(h, c, cmp)
    c.x = 0
    Heap.updateItem(h, c, cmp)
    Heap.pop(h, cmp).should.eql(c)
