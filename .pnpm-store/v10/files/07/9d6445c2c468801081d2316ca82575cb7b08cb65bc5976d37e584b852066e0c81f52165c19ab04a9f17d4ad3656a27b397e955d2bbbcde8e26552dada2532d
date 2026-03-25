'use strict'
var expect = require('chai').expect,
  objectPath = require('./index.js')


function getTestObj () {
  return {
    a: 'b',
    b: {
      c: [],
      d: ['a', 'b'],
      e: [{}, {f: 'g'}],
      f: 'i'
    }
  }
}

describe('get', function () {
  it('should return the value using unicode key', function () {
    var obj = {
      '15\u00f8C': {
        '3\u0111': 1
      }
    }
    expect(objectPath.get(obj, '15\u00f8C.3\u0111')).to.be.equal(1)
    expect(objectPath.get(obj, ['15\u00f8C', '3\u0111'])).to.be.equal(1)
  })

  it('should return the value using dot in key', function () {
    var obj = {
      'a.b': {
        'looks.like': 1
      }
    }
    expect(objectPath.get(obj, 'a.b.looks.like')).to.be.equal(void 0)
    expect(objectPath.get(obj, ['a.b', 'looks.like'])).to.be.equal(1)
  })

  it('should return the value under shallow object', function () {
    var obj = getTestObj()
    expect(objectPath.get(obj, 'a')).to.be.equal('b')
    expect(objectPath.get(obj, ['a'])).to.be.equal('b')
  })

  it('should work with number path', function () {
    var obj = getTestObj()
    expect(objectPath.get(obj.b.d, 0)).to.be.equal('a')
    expect(objectPath.get(obj.b, 0)).to.be.equal(void 0)
  })

  it('should return the value under deep object', function () {
    var obj = getTestObj()
    expect(objectPath.get(obj, 'b.f')).to.be.equal('i')
    expect(objectPath.get(obj, ['b', 'f'])).to.be.equal('i')
  })

  it('should return the value under array', function () {
    var obj = getTestObj()
    expect(objectPath.get(obj, 'b.d.0')).to.be.equal('a')
    expect(objectPath.get(obj, ['b', 'd', 0])).to.be.equal('a')
  })

  it('should return the value under array deep', function () {
    var obj = getTestObj()
    expect(objectPath.get(obj, 'b.e.1.f')).to.be.equal('g')
    expect(objectPath.get(obj, ['b', 'e', 1, 'f'])).to.be.equal('g')
  })

  it('should return undefined for missing values under object', function () {
    var obj = getTestObj()
    expect(objectPath.get(obj, 'a.b')).to.not.exist
    expect(objectPath.get(obj, ['a', 'b'])).to.not.exist
  })

  it('should return undefined for missing values under array', function () {
    var obj = getTestObj()
    expect(objectPath.get(obj, 'b.d.5')).to.not.exist
    expect(objectPath.get(obj, ['b', 'd', '5'])).to.not.exist
  })

  it('should return the value under integer-like key', function () {
    var obj = {'1a': 'foo'}
    expect(objectPath.get(obj, '1a')).to.be.equal('foo')
    expect(objectPath.get(obj, ['1a'])).to.be.equal('foo')
  })

  it('should return the default value when the key doesnt exist', function () {
    var obj = {'1a': 'foo'}
    expect(objectPath.get(obj, '1b', null)).to.be.equal(null)
    expect(objectPath.get(obj, ['1b'], null)).to.be.equal(null)
  })

  it('should return the default value when path is empty', function () {
    var obj = {'1a': 'foo'}
    expect(objectPath.get(obj, '', null)).to.be.deep.equal({'1a': 'foo'})
    expect(objectPath.get(obj, [])).to.be.deep.equal({'1a': 'foo'})
    expect(objectPath.get({}, ['1'])).to.be.equal(undefined)
  })

  it('should return the default value when object is null or undefined', function () {
    expect(objectPath.get(null, 'test', 'a')).to.be.deep.equal('a')
    expect(objectPath.get(undefined, 'test', 'a')).to.be.deep.equal('a')
  })

  it(
    'should not fail on an object with a null prototype',
    function assertSuccessForObjWithNullProto () {
      var foo = 'FOO'
      var objWithNullProto = Object.create(null)
      objWithNullProto.foo = foo
      expect(objectPath.get(objWithNullProto, 'foo')).to.equal(foo)
    }
  )

  it('should skip non own properties', function () {
    var Base = function (enabled) {
    }
    Base.prototype = {
      one: {
        two: true
      }
    }
    var Extended = function () {
      Base.call(this, true)
    }
    Extended.prototype = Object.create(Base.prototype)

    var extended = new Extended()

    expect(objectPath.get(extended, ['one', 'two'])).to.be.equal(undefined)
    extended.enabled = true

    expect(objectPath.get(extended, 'enabled')).to.be.equal(true)
    expect(objectPath.get(extended, 'one')).to.be.equal(undefined)
  })

  it('[security] should not get magic properties in default mode', function () {
    expect(objectPath.get({}, '__proto__')).to.be.undefined
    expect(objectPath.get({}, [['__proto__']])).to.be.undefined

    function Clazz() {}
    Clazz.prototype.test = []

    expect(objectPath.get(new Clazz(), '__proto__')).to.be.undefined
    expect(objectPath.get(new Clazz(), [['__proto__']])).to.be.undefined
    expect(objectPath.get(new Clazz(), ['constructor', 'prototype'])).to.be.undefined
  })

  it('[security] should not get magic properties in inheritedProps mode', function () {
    expect(function() {
      objectPath.withInheritedProps.get({}, '__proto__')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.get({}, [['__proto__']])
    }).to.throw('For security reasons')

    function Clazz() {}
    Clazz.prototype.test = 'original'

    expect(function() {
      objectPath.withInheritedProps.get(new Clazz(), '__proto__')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.get(new Clazz(), [['__proto__']])
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.get(new Clazz(), ['constructor', 'prototype'])
    }).to.throw('For security reasons')
  })
})


describe('set', function () {
  it('should set the value using unicode key', function () {
    var obj = {
      '15\u00f8C': {
        '3\u0111': 1
      }
    }
    objectPath.set(obj, '15\u00f8C.3\u0111', 2)
    expect(objectPath.get(obj, '15\u00f8C.3\u0111')).to.be.equal(2)
    objectPath.set(obj, '15\u00f8C.3\u0111', 3)
    expect(objectPath.get(obj, ['15\u00f8C', '3\u0111'])).to.be.equal(3)
  })

  it('should set the value using dot in key', function () {
    var obj = {
      'a.b': {
        'looks.like': 1
      }
    }
    objectPath.set(obj, ['a.b', 'looks.like'], 2)
    expect(objectPath.get(obj, ['a.b', 'looks.like'])).to.be.equal(2)
  })

  it('should set value under shallow object', function () {
    var obj = getTestObj()
    objectPath.set(obj, 'c', {m: 'o'})
    expect(obj).to.include.nested.property('c.m', 'o')
    obj = getTestObj()
    objectPath.set(obj, ['c'], {m: 'o'})
    expect(obj).to.include.nested.property('c.m', 'o')
  })

  it('should set value using number path', function () {
    var obj = getTestObj()
    objectPath.set(obj.b.d, 0, 'o')
    expect(obj).to.have.nested.property('b.d.0', 'o')
  })

  it('should set value under deep object', function () {
    var obj = getTestObj()
    objectPath.set(obj, 'b.c', 'o')
    expect(obj).to.have.nested.property('b.c', 'o')
    obj = getTestObj()
    objectPath.set(obj, ['b', 'c'], 'o')
    expect(obj).to.have.nested.property('b.c', 'o')
  })

  it('should set value under array', function () {
    var obj = getTestObj()
    objectPath.set(obj, 'b.e.1.g', 'f')
    expect(obj).to.have.nested.property('b.e.1.g', 'f')
    obj = getTestObj()
    objectPath.set(obj, ['b', 'e', 1, 'g'], 'f')
    expect(obj).to.have.nested.property('b.e.1.g', 'f')

    obj = {}
    objectPath.set(obj, 'b.0', 'a')
    objectPath.set(obj, 'b.1', 'b')
    expect(obj.b).to.be.deep.equal(['a', 'b'])
  })

  it('should create intermediate objects', function () {
    var obj = getTestObj()
    objectPath.set(obj, 'c.d.e.f', 'l')
    expect(obj).to.have.nested.property('c.d.e.f', 'l')
    obj = getTestObj()
    objectPath.set(obj, ['c', 'd', 'e', 'f'], 'l')
    expect(obj).to.have.nested.property('c.d.e.f', 'l')
  })

  it('should create intermediate arrays', function () {
    var obj = getTestObj()
    objectPath.set(obj, 'c.0.1.m', 'l')
    expect(obj.c).to.be.an('array')
    expect(obj.c[0]).to.be.an('array')
    expect(obj).to.have.nested.property('c.0.1.m', 'l')
    obj = getTestObj()
    objectPath.set(obj, ['c', '0', 1, 'm'], 'l')
    expect(obj.c).to.be.an('object')
    expect(obj.c[0]).to.be.an('array')
    expect(obj).to.have.nested.property('c.0.1.m', 'l')
  })

  it('should set value under integer-like key', function () {
    var obj = getTestObj()
    objectPath.set(obj, '1a', 'foo')
    expect(obj).to.have.nested.property('1a', 'foo')
    obj = getTestObj()
    objectPath.set(obj, ['1a'], 'foo')
    expect(obj).to.have.nested.property('1a', 'foo')
  })

  it('should set value under empty array', function () {
    var obj = []
    objectPath.set(obj, [0], 'foo')
    expect(obj[0]).to.be.equal('foo')
    obj = []
    objectPath.set(obj, '0', 'foo')
    expect(obj[0]).to.be.equal('foo')
  })

  it('[security] should not set magic properties in default mode', function () {
    objectPath.set({}, '__proto__.injected', 'this is bad')
    expect(Object.prototype.injected).to.be.undefined

    objectPath.set({}, [['__proto__'], 'injected'], 'this is bad')
    expect(Object.prototype.injected).to.be.undefined

    objectPath.set({}, ['__proto__'], {})
    expect(Object.prototype.toString).to.be.a('function')

    function Clazz() {}
    Clazz.prototype.test = 'original'

    objectPath.set({}, ['__proto__'], {test: 'this is bad'})
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.set(new Clazz(), '__proto__.test', 'this is bad')
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.set(new Clazz(), [['__proto__'], 'test'], 'this is bad')
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.set(new Clazz(), 'constructor.prototype.test', 'this is bad')
    expect(Clazz.prototype.test).to.be.equal('original')
  })

  it('[security] should throw an exception if trying to set magic properties in inheritedProps mode', function () {
    expect(function() {
      objectPath.withInheritedProps.set({}, '__proto__.injected', 'this is bad')
      expect(Object.prototype.injected).to.be.undefined
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.set({}, [['__proto__'], 'injected'], 'this is bad')
      expect(Object.prototype.injected).to.be.undefined
    }).to.throw('For security reasons')

    function Clazz() {}
    Clazz.prototype.test = 'original'

    expect(function() {
      objectPath.withInheritedProps.set(new Clazz(), '__proto__.test', 'this is bad')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.set(new Clazz(), 'constructor.prototype.test', 'this is bad')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.set({}, 'constructor.prototype.injected', 'this is OK')
      expect(Object.prototype.injected).to.be.undefined
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.set({}, [['constructor'], 'prototype', 'injected'], 'this is bad')
      expect(Object.prototype.injected).to.be.undefined
    }).to.throw('For security reasons')
  })
})


describe('push', function () {
  it('should push value to existing array using unicode key', function () {
    var obj = getTestObj()
    objectPath.push(obj, 'b.\u1290c', 'l')
    expect(obj).to.have.nested.property('b.\u1290c.0', 'l')
    objectPath.push(obj, ['b', '\u1290c'], 'l')
    expect(obj).to.have.nested.property('b.\u1290c.1', 'l')
  })

  it('should push value to existing array using dot key', function () {
    var obj = getTestObj()
    objectPath.push(obj, ['b', 'z.d'], 'l')
    expect(objectPath.get(obj, ['b', 'z.d', 0])).to.be.equal('l')
  })

  it('should push value to existing array', function () {
    var obj = getTestObj()
    objectPath.push(obj, 'b.c', 'l')
    expect(obj).to.have.nested.property('b.c.0', 'l')
    obj = getTestObj()
    objectPath.push(obj, ['b', 'c'], 'l')
    expect(obj).to.have.nested.property('b.c.0', 'l')
  })

  it('should push value to new array', function () {
    var obj = getTestObj()
    objectPath.push(obj, 'b.h', 'l')
    expect(obj).to.have.nested.property('b.h.0', 'l')
    obj = getTestObj()
    objectPath.push(obj, ['b', 'h'], 'l')
    expect(obj).to.have.nested.property('b.h.0', 'l')
  })

  it('should push value to existing array using number path', function () {
    var obj = getTestObj()
    objectPath.push(obj.b.e, 0, 'l')
    expect(obj).to.have.nested.property('b.e.0.0', 'l')
  })

  it('[security] should not push within prototype properties in default mode', function () {
    function Clazz() {}
    Clazz.prototype.test = []

    objectPath.push(new Clazz(), '__proto__.test', 'pushed')
    expect(Clazz.prototype.test).to.be.deep.equal([])

    objectPath.push(new Clazz(), [['__proto__'], 'test'], 'pushed')
    expect(Clazz.prototype.test).to.be.deep.equal([])

    objectPath.push(new Clazz(), 'constructor.prototype.test', 'pushed')
    expect(Clazz.prototype.test).to.be.deep.equal([])
  })

  it('[security] should not push within prototype properties in inheritedProps mode', function () {
    function Clazz() {}
    Clazz.prototype.test = []

    expect(function() {
      objectPath.withInheritedProps.push(new Clazz(), '__proto__.test', 'pushed')
      expect(Clazz.prototype.test).to.be.deep.equal([])
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.push(new Clazz(), [['__proto__'], 'test'], 'pushed')
      expect(Clazz.prototype.test).to.be.deep.equal([])
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.push(new Clazz(), 'constructor.prototype.test', 'pushed')
      expect(Clazz.prototype.test).to.be.deep.equal([])
    }).to.throw('For security reasons')
  })
})


describe('ensureExists', function () {
  it('should create the path if it does not exists', function () {
    var obj = getTestObj()
    var oldVal = objectPath.ensureExists(obj, 'b.g.1.l', 'test')
    expect(oldVal).to.not.exist
    expect(obj).to.have.nested.property('b.g.1.l', 'test')
    oldVal = objectPath.ensureExists(obj, 'b.g.1.l', 'test1')
    expect(oldVal).to.be.equal('test')
    expect(obj).to.have.nested.property('b.g.1.l', 'test')
    oldVal = objectPath.ensureExists(obj, 'b.\u8210', 'ok')
    expect(oldVal).to.not.exist
    expect(obj).to.have.nested.property('b.\u8210', 'ok')
    oldVal = objectPath.ensureExists(obj, ['b', 'dot.dot'], 'ok')
    expect(oldVal).to.not.exist
    expect(objectPath.get(obj, ['b', 'dot.dot'])).to.be.equal('ok')
  })


  it('should return the object if path is empty', function () {
    var obj = getTestObj()
    expect(objectPath.ensureExists(obj, [], 'test')).to.have.property('a', 'b')
  })

  it('Issue #26', function () {
    var any = {}
    objectPath.ensureExists(any, ['1', '1'], {})
    expect(any).to.be.an('object')
    expect(any[1]).to.be.an('object')
    expect(any[1][1]).to.be.an('object')
  })

  it('[security] should not set magic properties in default mode', function () {
    objectPath.ensureExists({}, '__proto__.injected', 'this is bad')
    expect(Object.prototype.injected).to.be.undefined

    objectPath.ensureExists({}, [['__proto__'], 'injected'], 'this is bad')
    expect(Object.prototype.injected).to.be.undefined

    objectPath.ensureExists({}, ['__proto__'], {})
    expect(Object.prototype.toString).to.be.a('function')

    function Clazz() {}
    Clazz.prototype.test = 'original'

    objectPath.ensureExists({}, ['__proto__'], {test: 'this is bad'})
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.ensureExists(new Clazz(), '__proto__.test', 'this is bad')
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.ensureExists(new Clazz(), [['__proto__'], 'test'], 'this is bad')
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.ensureExists(new Clazz(), 'constructor.prototype.test', 'this is bad')
    expect(Clazz.prototype.test).to.be.equal('original')
  })

  it('[security] should throw an exception if trying to set magic properties in inheritedProps mode', function () {
    expect(function() {objectPath.withInheritedProps.ensureExists({}, '__proto__.injected', 'this is bad')})
      .to.throw('For security reasons')
    expect(Object.prototype.injected).to.be.undefined

    expect(function() {
      objectPath.withInheritedProps.ensureExists({}, [['__proto__'], 'injected'], 'this is bad')
      expect(Object.prototype.injected).to.be.undefined
    }).to.throw('For security reasons')

    function Clazz() {}
    Clazz.prototype.test = 'original'

    expect(function() {
      objectPath.withInheritedProps.ensureExists(new Clazz(), '__proto__.test', 'this is bad')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')


    expect(function() {
      objectPath.withInheritedProps.ensureExists(new Clazz(), 'constructor.prototype.test', 'this is bad')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.ensureExists({}, 'constructor.prototype.injected', 'this is OK')
      expect(Object.prototype.injected).to.be.undefined
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.ensureExists({}, [['constructor'], 'prototype', 'injected'], 'this is bad')
      expect(Object.prototype.injected).to.be.undefined
    }).to.throw('For security reasons')
  })
})

describe('coalesce', function () {
  it('should return the first non-undefined value', function () {
    var obj = {
      should: {have: 'prop'}
    }

    expect(objectPath.coalesce(obj, [
      'doesnt.exist',
      ['might', 'not', 'exist'],
      'should.have'
    ])).to.equal('prop')
  })

  it('should work with falsy values (null, 0, \'\', false)', function () {
    var obj = {
      is: {
        false: false,
        null: null,
        empty: '',
        zero: 0
      }
    }

    expect(objectPath.coalesce(obj, [
      'doesnt.exist',
      'is.zero'
    ])).to.equal(0)

    expect(objectPath.coalesce(obj, [
      'doesnt.exist',
      'is.false'
    ])).to.equal(false)

    expect(objectPath.coalesce(obj, [
      'doesnt.exist',
      'is.null'
    ])).to.equal(null)

    expect(objectPath.coalesce(obj, [
      'doesnt.exist',
      'is.empty'
    ])).to.equal('')
  })

  it('returns defaultValue if no paths found', function () {
    var obj = {
      doesnt: 'matter'
    }

    expect(objectPath.coalesce(obj, ['some.inexistant', 'path', ['on', 'object']], 'false')).to.equal('false')
  })

  it('works with unicode and dot keys', function () {
    var obj = {
      '\u7591': true,
      'dot.dot': false
    }

    expect(objectPath.coalesce(obj, ['1', '\u7591', 'a.b'])).to.equal(true)
    expect(objectPath.coalesce(obj, ['1', ['dot.dot'], '\u7591'])).to.equal(false)
  })
})

describe('empty', function () {
  it('should ignore invalid arguments safely', function () {
    var obj = {}
    expect(objectPath.empty()).to.equal(void 0)
    expect(objectPath.empty(obj, 'path')).to.equal(void 0)
    expect(objectPath.empty(obj, '')).to.equal(void 0)

    obj.path = true

    expect(objectPath.empty(obj, 'inexistant')).to.equal(void 0)

    expect(objectPath.empty(null, 'path')).to.equal(void 0)
    expect(objectPath.empty(void 0, 'path')).to.equal(void 0)
  })

  it('should empty each path according to their types', function () {
    function Instance () {
      this.notOwn = true
    }

    /*istanbul ignore next: not part of code */
    Instance.prototype.test = function () {
    }
    /*istanbul ignore next: not part of code */
    Instance.prototype.arr = []

    var
      obj = {
        string: 'some string',
        array: ['some', 'array', [1, 2, 3]],
        number: 21,
        boolean: true,
        object: {
          some: 'property',
          sub: {
            'property': true
          },
          nullProp: null,
          undefinedProp: void 0
        },
        instance: new Instance()
      }

    /*istanbul ignore next: not part of code */
    obj['function'] = function () {
    }

    objectPath.empty(obj, ['array', '2'])
    expect(obj.array[2]).to.deep.equal([])

    objectPath.empty(obj, 'object.sub')
    expect(obj.object.sub).to.deep.equal({})

    objectPath.empty(obj, 'object.nullProp')
    expect(obj.object.nullProp).to.equal(null)

    objectPath.empty(obj, 'object.undefinedProp')
    expect(obj.object.undefinedProp).to.equal(void 0)
    expect(obj.object).to.have.property('undefinedProp')

    objectPath.empty(obj, 'object.notAProp')
    expect(obj.object.notAProp).to.equal(void 0)
    expect(obj.object).to.not.have.property('notAProp')

    objectPath.empty(obj, 'instance.test')
    //instance.test is not own property, so it shouldn't be emptied
    expect(obj.instance.test).to.be.a('function')
    expect(Instance.prototype.test).to.be.a('function')

    objectPath.empty(obj, 'string')
    objectPath.empty(obj, 'number')
    objectPath.empty(obj, 'boolean')
    objectPath.empty(obj, 'function')
    objectPath.empty(obj, 'array')
    objectPath.empty(obj, 'object')
    objectPath.empty(obj, 'instance')

    expect(obj.string).to.equal('')
    expect(obj.array).to.deep.equal([])
    expect(obj.number).to.equal(0)
    expect(obj.boolean).to.equal(false)
    expect(obj.object).to.deep.equal({})
    expect(obj.instance.notOwn).to.be.an('undefined')
    expect(obj.instance.arr).to.be.an('array')
    expect(obj['function']).to.equal(null)
  })

  it('[security] should not empty prototype properties in default mode', function () {
    function Clazz() {}
    Clazz.prototype.test = 'original'

    objectPath.empty(new Clazz(), '__proto__')
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.empty(new Clazz(), [['__proto__']])
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.empty(new Clazz(), 'constructor.prototype')
    expect(Clazz.prototype.test).to.be.equal('original')
  })

  it('[security] should throw an exception if trying to delete prototype properties in inheritedProps mode', function () {
    function Clazz() {}
    Clazz.prototype.test = 'original'

    expect(function() {
      objectPath.withInheritedProps.empty(new Clazz(), '__proto__')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.empty(new Clazz(), 'constructor.prototype')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.empty({}, [['constructor'], 'prototype'])
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')
  })
})

describe('del', function () {
  it('should work with number path', function () {
    var obj = getTestObj()
    objectPath.del(obj.b.d, 1)
    expect(obj.b.d).to.deep.equal(['a'])
  })

  it('should remove null and undefined props (but not explode on nested)', function () {
    var obj = {nullProp: null, undefinedProp: void 0}
    expect(obj).to.have.property('nullProp')
    expect(obj).to.have.property('undefinedProp')

    objectPath.del(obj, 'nullProp.foo')
    objectPath.del(obj, 'undefinedProp.bar')
    expect(obj).to.have.property('nullProp')
    expect(obj).to.have.property('undefinedProp')
    expect(obj).to.deep.equal({nullProp: null, undefinedProp: void 0})

    objectPath.del(obj, 'nullProp')
    objectPath.del(obj, 'undefinedProp')
    expect(obj).to.not.have.property('nullProp')
    expect(obj).to.not.have.property('undefinedProp')
    expect(obj).to.deep.equal({})
  })

  it('should delete deep paths', function () {
    var obj = getTestObj()

    expect(objectPath.del(obj)).to.be.equal(obj)

    objectPath.set(obj, 'b.g.1.0', 'test')
    objectPath.set(obj, 'b.g.1.1', 'test')
    objectPath.set(obj, 'b.h.az', 'test')
    objectPath.set(obj, 'b.\ubeef', 'test')
    objectPath.set(obj, ['b', 'dot.dot'], 'test')

    expect(obj).to.have.nested.property('b.g.1.0', 'test')
    expect(obj).to.have.nested.property('b.g.1.1', 'test')
    expect(obj).to.have.nested.property('b.h.az', 'test')
    expect(obj).to.have.nested.property('b.\ubeef', 'test')

    objectPath.del(obj, 'b.h.az')
    expect(obj).to.not.have.nested.property('b.h.az')
    expect(obj).to.have.nested.property('b.h')

    objectPath.del(obj, 'b.g.1.1')
    expect(obj).to.not.have.nested.property('b.g.1.1')
    expect(obj).to.have.nested.property('b.g.1.0', 'test')

    objectPath.del(obj, 'b.\ubeef')
    expect(obj).to.not.have.nested.property('b.\ubeef')

    objectPath.del(obj, ['b', 'dot.dot'])
    expect(objectPath.get(obj, ['b', 'dot.dot'])).to.be.equal(void 0)

    objectPath.del(obj, ['b', 'g', '1', '0'])
    expect(obj).to.not.have.nested.property('b.g.1.0')
    expect(obj).to.have.nested.property('b.g.1')

    expect(objectPath.del(obj, ['b'])).to.not.have.nested.property('b.g')
    expect(obj).to.be.deep.equal({'a': 'b'})
  })

  it('should remove items from existing array', function () {
    var obj = getTestObj()

    objectPath.del(obj, 'b.d.0')
    expect(obj.b.d).to.have.length(1)
    expect(obj.b.d).to.be.deep.equal(['b'])

    objectPath.del(obj, 'b.d.0')
    expect(obj.b.d).to.have.length(0)
    expect(obj.b.d).to.be.deep.equal([])
  })

  it('[security] should not delete prototype properties in default mode', function () {
    objectPath.del({}, '__proto__.valueOf')
    expect(Object.prototype.valueOf).to.be.a('function')

    objectPath.del({}, [['__proto__'], 'valueOf'])
    expect(Object.prototype.valueOf).to.be.a('function')

    function Clazz() {}
    Clazz.prototype.test = 'original'

    objectPath.del(new Clazz(), '__proto__.test')
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.del(new Clazz(), [['__proto__'], 'test'])
    expect(Clazz.prototype.test).to.be.equal('original')

    objectPath.del(new Clazz(), 'constructor.prototype.test')
    expect(Clazz.prototype.test).to.be.equal('original')
  })

  it('[security] should throw an exception if trying to delete prototype properties in inheritedProps mode', function () {
    expect(function() {
      objectPath.withInheritedProps.del({}, '__proto__.valueOf')
      expect(Object.prototype.valueOf).to.be.a('function')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.del({}, [['__proto__'], 'valueOf'])
      expect(Object.prototype.valueOf).to.be.a('function')
    }).to.throw('For security reasons')

    function Clazz() {}
    Clazz.prototype.test = 'original'

    expect(function() {
      objectPath.withInheritedProps.del(new Clazz(), '__proto__.test')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.del(new Clazz(), 'constructor.prototype.test', 'this is bad')
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.del({}, [['constructor'], 'prototype', 'test'])
      expect(Clazz.prototype.test).to.be.equal('original')
    }).to.throw('For security reasons')
  })
})

describe('insert', function () {
  it('should insert value into existing array', function () {
    var obj = getTestObj()

    objectPath.insert(obj, 'b.c', 'asdf')
    expect(obj).to.have.nested.property('b.c.0', 'asdf')
    expect(obj).to.not.have.nested.property('b.c.1')
  })

  it('should create intermediary array', function () {
    var obj = getTestObj()

    objectPath.insert(obj, 'b.c.0', 'asdf')
    expect(obj).to.have.nested.property('b.c.0.0', 'asdf')
  })

  it('should insert in another index', function () {
    var obj = getTestObj()

    objectPath.insert(obj, 'b.d', 'asdf', 1)
    expect(obj).to.have.nested.property('b.d.1', 'asdf')
    expect(obj).to.have.nested.property('b.d.0', 'a')
    expect(obj).to.have.nested.property('b.d.2', 'b')
  })

  it('should handle sparse array', function () {
    var obj = getTestObj()
    obj.b.d = new Array(4)
    obj.b.d[0] = 'a'
    obj.b.d[1] = 'b'

    objectPath.insert(obj, 'b.d', 'asdf', 3)
    expect(obj.b.d).to.have.members([
      'a',
      'b',
      ,
      ,
      'asdf'
    ])
  })

  it('[security] should not insert within prototype properties in default mode', function () {
    function Clazz() {}
    Clazz.prototype.test = []

    objectPath.insert(new Clazz(), '__proto__.test', 'inserted', 0)
    expect(Clazz.prototype.test).to.be.deep.equal([])

    objectPath.insert(new Clazz(), [['__proto__'], 'test'], 'inserted', 0)
    expect(Clazz.prototype.test).to.be.deep.equal([])

    objectPath.insert(new Clazz(), 'constructor.prototype.test', 'inserted', 0)
    expect(Clazz.prototype.test).to.be.deep.equal([])
  })

  it('[security] should not insert within prototype properties in inheritedProps mode', function () {
    function Clazz() {}
    Clazz.prototype.test = []

    expect(function() {
      objectPath.withInheritedProps.insert(new Clazz(), '__proto__.test', 'inserted', 0)
      expect(Clazz.prototype.test).to.be.deep.equal([])
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.insert(new Clazz(), [['__proto__'], 'test'], 'inserted', 0)
      expect(Clazz.prototype.test).to.be.deep.equal([])
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.insert(new Clazz(), 'constructor.prototype.test', 'inserted', 0)
      expect(Clazz.prototype.test).to.be.deep.equal([])
    }).to.throw('For security reasons')

    expect(function() {
      objectPath.withInheritedProps.insert(new Clazz().constructor, 'prototype.test', 'inserted', 0)
      expect(Clazz.prototype.test).to.be.deep.equal([])
    }).to.throw('For security reasons')
  })
})

describe('has', function () {
  it('should return false for empty object', function () {
    expect(objectPath.has({}, 'a')).to.be.equal(false)
  })

  it('should handle empty paths properly', function () {
    var obj = getTestObj()
    expect(objectPath.has(obj, '')).to.be.equal(false)
    expect(objectPath.has(obj, [''])).to.be.equal(false)
    obj[''] = 1
    expect(objectPath.has(obj, '')).to.be.equal(true)
    expect(objectPath.has(obj, [''])).to.be.equal(true)

    expect(objectPath.has(obj, [])).to.be.equal(true)
    expect(objectPath.has(null, [])).to.be.equal(false)
  })

  it('should test under shallow object', function () {
    var obj = getTestObj()
    expect(objectPath.has(obj, 'a')).to.be.equal(true)
    expect(objectPath.has(obj, ['a'])).to.be.equal(true)
    expect(objectPath.has(obj, 'z')).to.be.equal(false)
    expect(objectPath.has(obj, ['z'])).to.be.equal(false)
  })

  it('should work with number path', function () {
    var obj = getTestObj()
    expect(objectPath.has(obj.b.d, 0)).to.be.equal(true)
    expect(objectPath.has(obj.b, 0)).to.be.equal(false)
    expect(objectPath.has(obj.b.d, 10)).to.be.equal(false)
    expect(objectPath.has(obj.b, 10)).to.be.equal(false)
  })

  it('should test under deep object', function () {
    var obj = getTestObj()
    expect(objectPath.has(obj, 'b.f')).to.be.equal(true)
    expect(objectPath.has(obj, ['b', 'f'])).to.be.equal(true)
    expect(objectPath.has(obj, 'b.g')).to.be.equal(false)
    expect(objectPath.has(obj, ['b', 'g'])).to.be.equal(false)
  })

  it('should test value under array', function () {
    var obj = {
      b: ['a']
    }
    obj.b[3] = {o: 'a'}
    expect(objectPath.has(obj, 'b.0')).to.be.equal(true)
    expect(objectPath.has(obj, 'b.1')).to.be.equal(true)
    expect(objectPath.has(obj, 'b.3.o')).to.be.equal(true)
    expect(objectPath.has(obj, 'b.3.qwe')).to.be.equal(false)
    expect(objectPath.has(obj, 'b.4')).to.be.equal(false)
  })

  it('should test the value under array deep', function () {
    var obj = getTestObj()
    expect(objectPath.has(obj, 'b.e.1.f')).to.be.equal(true)
    expect(objectPath.has(obj, ['b', 'e', 1, 'f'])).to.be.equal(true)
    expect(objectPath.has(obj, 'b.e.1.f.g.h.i')).to.be.equal(false)
    expect(objectPath.has(obj, ['b', 'e', 1, 'f', 'g', 'h', 'i'])).to.be.equal(false)
  })

  it('should test the value under integer-like key', function () {
    var obj = {'1a': 'foo'}
    expect(objectPath.has(obj, '1a')).to.be.equal(true)
    expect(objectPath.has(obj, ['1a'])).to.be.equal(true)
  })

  it('should distinct nonexistent key and key = undefined', function () {
    var obj = {}
    expect(objectPath.has(obj, 'key')).to.be.equal(false)

    obj.key = undefined
    expect(objectPath.has(obj, 'key')).to.be.equal(true)
  })

  it('should work with deep undefined/null values', function () {
    var obj = {}
    expect(objectPath.has(obj, 'missing.test')).to.be.equal(false)

    obj.missing = null
    expect(objectPath.has(obj, 'missing.test')).to.be.equal(false)

    obj.sparseArray = [1, undefined, 3]
    expect(objectPath.has(obj, 'sparseArray.1.test')).to.be.equal(false)
  })
})


describe('bind object', function () {
  // just get one scenario from each feature, so whole functionality is proxied well
  it('should return the value under shallow object', function () {
    var obj = getTestObj()
    var model = objectPath(obj)
    expect(model.get('a')).to.be.equal('b')
    expect(model.get(['a'])).to.be.equal('b')
  })

  it('should set value under shallow object', function () {
    var obj = getTestObj()
    var model = objectPath(obj)
    model.set('c', {m: 'o'})
    expect(obj).to.have.nested.property('c.m', 'o')
    obj = getTestObj()
    model = objectPath(obj)
    model.set(['c'], {m: 'o'})
    expect(obj).to.have.nested.property('c.m', 'o')
  })

  it('should push value to existing array', function () {
    var obj = getTestObj()
    var model = objectPath(obj)
    model.push('b.c', 'l')
    expect(obj).to.have.nested.property('b.c.0', 'l')
    obj = getTestObj()
    model = objectPath(obj)
    model.push(['b', 'c'], 'l')
    expect(obj).to.have.nested.property('b.c.0', 'l')
  })

  it('should create the path if it does not exists', function () {
    var obj = getTestObj()
    var model = objectPath(obj)
    var oldVal = model.ensureExists('b.g.1.l', 'test')
    expect(oldVal).to.not.exist
    expect(obj).to.have.nested.property('b.g.1.l', 'test')
    oldVal = model.ensureExists('b.g.1.l', 'test1')
    expect(oldVal).to.be.equal('test')
    expect(obj).to.have.nested.property('b.g.1.l', 'test')
  })

  it('should return the first non-undefined value', function () {
    var obj = {
      should: {have: 'prop'}
    }
    var model = objectPath(obj)

    expect(model.coalesce([
      'doesnt.exist',
      ['might', 'not', 'exist'],
      'should.have'
    ])).to.equal('prop')
  })

  it('should empty each path according to their types', function () {
    function Instance () {
      this.notOwn = true
    }

    /*istanbul ignore next: not part of code */
    Instance.prototype.test = function () {
    }
    /*istanbul ignore next: not part of code */
    Instance.prototype.arr = []

    var
      obj = {
        string: 'some string',
        array: ['some', 'array', [1, 2, 3]],
        number: 21,
        boolean: true,
        object: {
          some: 'property',
          sub: {
            'property': true
          }
        },
        instance: new Instance()
      }

    /*istanbul ignore next: not part of code */
    obj['function'] = function () {
    }

    var model = objectPath(obj)

    model.empty(['array', '2'])
    expect(obj.array[2]).to.deep.equal([])

    model.empty('object.sub')
    expect(obj.object.sub).to.deep.equal({})

    model.empty('instance.test')
    //instance.test is not own property so it shouldn't be emptied
    expect(obj.instance.test).to.be.a('function')
    expect(Instance.prototype.test).to.be.a('function')

    model.empty('string')
    model.empty('number')
    model.empty('boolean')
    model.empty('function')
    model.empty('array')
    model.empty('object')
    model.empty('instance')

    expect(obj.string).to.equal('')
    expect(obj.array).to.deep.equal([])
    expect(obj.number).to.equal(0)
    expect(obj.boolean).to.equal(false)
    expect(obj.object).to.deep.equal({})
    expect(obj.instance.notOwn).to.be.an('undefined')
    expect(obj.instance.arr).to.be.an('array')
    expect(obj['function']).to.equal(null)
  })

  it('should delete deep paths', function () {
    var obj = getTestObj()
    var model = objectPath(obj)

    expect(model.del()).to.be.equal(obj)

    model.set('b.g.1.0', 'test')
    model.set('b.g.1.1', 'test')
    model.set('b.h.az', 'test')

    expect(obj).to.have.nested.property('b.g.1.0', 'test')
    expect(obj).to.have.nested.property('b.g.1.1', 'test')
    expect(obj).to.have.nested.property('b.h.az', 'test')

    model.del('b.h.az')
    expect(obj).to.not.have.nested.property('b.h.az')
    expect(obj).to.have.nested.property('b.h')

    model.del('b.g.1.1')
    expect(obj).to.not.have.nested.property('b.g.1.1')
    expect(obj).to.have.nested.property('b.g.1.0', 'test')

    model.del(['b', 'g', '1', '0'])
    expect(obj).to.not.have.nested.property('b.g.1.0')
    expect(obj).to.have.nested.property('b.g.1')

    expect(model.del(['b'])).to.not.have.nested.property('b.g')
    expect(obj).to.be.deep.equal({'a': 'b'})
  })

  it('should insert value into existing array', function () {
    var obj = getTestObj()
    var model = objectPath(obj)

    model.insert('b.c', 'asdf')
    expect(obj).to.have.nested.property('b.c.0', 'asdf')
    expect(obj).to.not.have.nested.property('b.c.1')
  })

  it('should test under shallow object', function () {
    var obj = getTestObj()
    var model = objectPath(obj)

    expect(model.has('a')).to.be.equal(true)
    expect(model.has(['a'])).to.be.equal(true)
    expect(model.has('z')).to.be.equal(false)
    expect(model.has(['z'])).to.be.equal(false)
  })
})

describe('Don\'t access not own properties [default]', function () {
  it('should not get a not own property', function () {
    var Obj = function () {
    }
    Obj.prototype.notOwn = {a: 'a'}
    var obj = new Obj()

    expect(objectPath.get(obj, 'notOwn')).to.be.undefined
  })

  it('should set a not own property on the instance (not the prototype)', function () {
    var proto = {
      notOwn: {}
    }
    var obj = Object.create(proto)

    objectPath.set(obj, 'notOwn.test', 'a')
    expect(obj.notOwn.test).to.be.equal('a')
    expect(proto.notOwn).to.be.deep.equal({})
  })

  it('has should return false on a not own property', function () {
    var proto = {
      notOwn: {a: 'a'}
    }
    var obj = Object.create(proto)


    expect(objectPath.has(obj, 'notOwn')).to.be.false
    expect(objectPath.has(obj, 'notOwn.a')).to.be.false
  })

  it('empty should not empty on a not own property', function () {
    var proto = {
      notOwn: {a: 'a'}
    }
    var obj = Object.create(proto)

    objectPath.empty(obj, 'notOwn')
    expect(proto.notOwn).to.be.deep.equal({a: 'a'})
    expect(obj.notOwn).to.be.deep.equal({a: 'a'})
  })

  it('del should not delete not own property', function () {
    var proto = {
      notOwn: {a: 'a'}
    }
    var obj = Object.create(proto)

    objectPath.del(obj, 'notOwn.a')
    expect(proto.notOwn).to.be.deep.equal({a: 'a'})
    //expect(obj.notOwn).to.be.deep.equal({a: 'a'});
    //objectPath.del(obj, 'notOwn');
    //expect(proto).to.be.deep.equal({notOwn: {a: 'a'}});
    //expect(obj).to.be.deep.equal({notOwn: {a: 'a'}});
  })
})

describe('Access own properties [optional]', function () {
  it('should get a not own property', function () {
    var Obj = function () {
    }
    Obj.prototype.notOwn = {a: 'a'}
    var obj = new Obj()

    expect(objectPath.withInheritedProps.get(obj, 'notOwn.a')).to.be.equal('a')
  })

  it('should set a deep not own property on the prototype (if exists)', function () {
    var proto = {
      notOwn: {}
    }
    var obj = Object.create(proto)

    objectPath.withInheritedProps.set(obj, 'notOwn.test', 'a')
    expect(obj.notOwn.test).to.be.equal('a')
    expect(proto.notOwn).to.be.deep.equal({test: 'a'})
  })


  it('has should return true on a not own property', function () {
    var proto = {
      notOwn: {a: 'a'}
    }
    var obj = Object.create(proto)

    expect(objectPath.withInheritedProps.has(obj, 'notOwn')).to.be.true
    expect(objectPath.withInheritedProps.has(obj, 'notOwn.a')).to.be.true
  })

  it('empty should empty a not own property', function () {
    var proto = {
      notOwn: {a: 'a'}
    }
    var obj = Object.create(proto)

    objectPath.withInheritedProps.empty(obj, 'notOwn')
    expect(proto.notOwn).to.be.deep.equal({})
    expect(obj.notOwn).to.be.deep.equal({})
  })

  it('del should delete a not own property', function () {
    var proto = {
      notOwn: {a: 'a'}
    }
    var obj = Object.create(proto)

    objectPath.withInheritedProps.del(obj, 'notOwn.a')
    expect(proto.notOwn).to.be.deep.equal({})
    //expect(obj.notOwn).to.be.deep.equal({});
    objectPath.withInheritedProps.del(obj, 'notOwn')
    //expect(proto).to.be.deep.equal({notOwn: {}});
    //expect(obj).to.be.deep.equal({notOwn: {}});
  })
})
