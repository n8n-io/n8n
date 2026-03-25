import { getGlobal } from '../helpers'

var names = ['Object', 'String', 'Boolean', 'Number', 'RegExp', 'Date', 'Array']
var immutable = { string: 'String', boolean: 'Boolean', number: 'Number' }

var primitives = names.map(getGlobal)
var protos = primitives.map(getProto)

function Primitives (context) {
  if (this instanceof Primitives) {
    this.context = context
    for (var i = 0; i < names.length; i++) {
      if (!this.context[names[i]]) {
        this.context[names[i]] = wrap(primitives[i])
      }
    }
  } else {
    return new Primitives(context)
  }
}

Primitives.prototype.replace = function (value) {
  var primIndex = primitives.indexOf(value),
    protoIndex = protos.indexOf(value),
    name

  if (~primIndex) {
    name = names[primIndex]
    return this.context[name]
  } else if (~protoIndex) {
    name = names[protoIndex]
    return this.context[name].prototype
  }

  return value
}

Primitives.prototype.getPropertyObject = function (object, property) {
  if (immutable[typeof object]) {
    return this.getPrototypeOf(object)
  }
  return object
}

Primitives.prototype.isPrimitive = function (value) {
  return !!~primitives.indexOf(value) || !!~protos.indexOf(value)
}

Primitives.prototype.getPrototypeOf = function (value) {
  if (value == null) { // handle null and undefined
    return value
  }

  var immutableType = immutable[typeof value],
    proto

  if (immutableType) {
    proto = this.context[immutableType].prototype
  } else {
    proto = Object.getPrototypeOf(value)
  }

  if (!proto || proto === Object.prototype) {
    return null
  }

  var replacement = this.replace(proto)

  if (replacement === value) {
    replacement = this.replace(Object.prototype)
  }
  return replacement

}

Primitives.prototype.applyNew = function (func, args) {
  if (func.wrapped) {
    var prim = Object.getPrototypeOf(func)
    var instance = new (Function.prototype.bind.apply(prim, arguments))

    setProto(instance, func.prototype)
    return instance
  }

  return new (Function.prototype.bind.apply(func, arguments))

}

function getProto (func) {
  return func.prototype
}

function setProto (obj, proto) {
  obj.__proto__ = proto // eslint-disable-line
}

function wrap (prim) {
  var proto = Object.create(prim.prototype)

  var result = function () {
    if (this instanceof result) {
      prim.apply(this, arguments)
    } else {
      var instance = prim.apply(null, arguments)

      setProto(instance, proto)
      return instance
    }
  }

  setProto(result, prim)
  result.prototype = proto
  result.wrapped = true
  return result
}

export default Primitives
