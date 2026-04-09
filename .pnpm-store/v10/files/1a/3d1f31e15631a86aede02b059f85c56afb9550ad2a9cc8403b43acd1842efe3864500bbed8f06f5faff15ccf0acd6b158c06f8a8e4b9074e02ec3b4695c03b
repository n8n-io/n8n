/* jshint node: true */

// TODO: Make it easier to implement custom types. This will likely require
// exposing the `Tap` object, perhaps under another name. Probably worth a
// major release.
// TODO: Allow configuring when to write the size when writing arrays and maps,
// and customizing their block size.
// TODO: Code-generate `compare` and `clone` record and union methods.

'use strict';

/**
 * This module defines all Avro data types and their serialization logic.
 *
 */

var utils = require('./utils'),
    buffer = require('buffer'),
    util = require('util');

var Buffer = buffer.Buffer;

// Convenience imports.
var Tap = utils.Tap;
var debug = util.debuglog('avsc:types');
var f = util.format;

// All non-union concrete (i.e. non-logical) Avro types.
var TYPES = {
  'array': ArrayType,
  'boolean': BooleanType,
  'bytes': BytesType,
  'double': DoubleType,
  'enum': EnumType,
  'error': RecordType,
  'fixed': FixedType,
  'float': FloatType,
  'int': IntType,
  'long': LongType,
  'map': MapType,
  'null': NullType,
  'record': RecordType,
  'string': StringType
};

// Random generator.
var RANDOM = new utils.Lcg();

// Encoding tap (shared for performance).
var TAP = new Tap(utils.newSlowBuffer(1024));

// Currently active logical type, used for name redirection.
var LOGICAL_TYPE = null;

// Underlying types of logical types currently being instantiated. This is used
// to be able to reference names (i.e. for branches) during instantiation.
var UNDERLYING_TYPES = [];

/**
 * "Abstract" base Avro type.
 *
 * This class' constructor will register any named types to support recursive
 * schemas. All type values are represented in memory similarly to their JSON
 * representation, except for:
 *
 * + `bytes` and `fixed` which are represented as `Buffer`s.
 * + `union`s which will be "unwrapped" unless the `wrapUnions` option is set.
 *
 *  See individual subclasses for details.
 */
function Type(schema, opts) {
  var type;
  if (LOGICAL_TYPE) {
    type = LOGICAL_TYPE;
    UNDERLYING_TYPES.push([LOGICAL_TYPE, this]);
    LOGICAL_TYPE = null;
  } else {
    type = this;
  }

  // Lazily instantiated hash string. It will be generated the first time the
  // type's default fingerprint is computed (for example when using `equals`).
  // We use a mutable object since types are frozen after instantiation.
  this._hash = new Hash();
  this.name = undefined;
  this.aliases = undefined;
  this.doc = (schema && schema.doc) ? '' + schema.doc : undefined;

  if (schema) {
    // This is a complex (i.e. non-primitive) type.
    var name = schema.name;
    var namespace = schema.namespace === undefined ?
      opts && opts.namespace :
      schema.namespace;
    if (name !== undefined) {
      // This isn't an anonymous type.
      name = maybeQualify(name, namespace);
      if (isPrimitive(name)) {
        // Avro doesn't allow redefining primitive names.
        throw new Error(f('cannot rename primitive type: %j', name));
      }
      var registry = opts && opts.registry;
      if (registry) {
        if (registry[name] !== undefined) {
          throw new Error(f('duplicate type name: %s', name));
        }
        registry[name] = type;
      }
    } else if (opts && opts.noAnonymousTypes) {
      throw new Error(f('missing name property in schema: %j', schema));
    }
    this.name = name;
    this.aliases = schema.aliases ?
      schema.aliases.map(function (s) { return maybeQualify(s, namespace); }) :
      [];
  }
}

Type.forSchema = function (schema, opts) {
  opts = opts || {};
  opts.registry = opts.registry || {};

  var UnionType = (function (wrapUnions) {
    if (wrapUnions === true) {
      wrapUnions = 'always';
    } else if (wrapUnions === false) {
      wrapUnions = 'never';
    } else if (wrapUnions === undefined) {
      wrapUnions = 'auto';
    } else if (typeof wrapUnions == 'string') {
      wrapUnions = wrapUnions.toLowerCase();
    }
    switch (wrapUnions) {
      case 'always':
        return WrappedUnionType;
      case 'never':
        return UnwrappedUnionType;
      case 'auto':
        return undefined; // Determined dynamically later on.
      default:
        throw new Error(f('invalid wrap unions option: %j', wrapUnions));
    }
  })(opts.wrapUnions);

  if (schema === null) {
    // Let's be helpful for this common error.
    throw new Error('invalid type: null (did you mean "null"?)');
  }

  if (Type.isType(schema)) {
    return schema;
  }

  var type;
  if (opts.typeHook && (type = opts.typeHook(schema, opts))) {
    if (!Type.isType(type)) {
      throw new Error(f('invalid typehook return value: %j', type));
    }
    return type;
  }

  if (typeof schema == 'string') { // Type reference.
    schema = maybeQualify(schema, opts.namespace);
    type = opts.registry[schema];
    if (type) {
      // Type was already defined, return it.
      return type;
    }
    if (isPrimitive(schema)) {
      // Reference to a primitive type. These are also defined names by default
      // so we create the appropriate type and it to the registry for future
      // reference.
      return opts.registry[schema] = Type.forSchema({type: schema}, opts);
    }
    throw new Error(f('undefined type name: %s', schema));
  }

  if (schema.logicalType && opts.logicalTypes && !LOGICAL_TYPE) {
    var DerivedType = opts.logicalTypes[schema.logicalType];
    if (DerivedType) {
      var namespace = opts.namespace;
      var registry = {};
      Object.keys(opts.registry).forEach(function (key) {
        registry[key] = opts.registry[key];
      });
      try {
        debug('instantiating logical type for %s', schema.logicalType);
        return new DerivedType(schema, opts);
      } catch (err) {
        debug('failed to instantiate logical type for %s', schema.logicalType);
        if (opts.assertLogicalTypes) {
          // The spec mandates that we fall through to the underlying type if
          // the logical type is invalid. We provide this option to ease
          // debugging.
          throw err;
        }
        LOGICAL_TYPE = null;
        opts.namespace = namespace;
        opts.registry = registry;
      }
    }
  }

  if (Array.isArray(schema)) { // Union.
    // We temporarily clear the logical type since we instantiate the branch's
    // types before the underlying union's type (necessary to decide whether the
    // union is ambiguous or not).
    var logicalType = LOGICAL_TYPE;
    LOGICAL_TYPE = null;
    var types = schema.map(function (obj) {
      return Type.forSchema(obj, opts);
    });
    if (!UnionType) {
      UnionType = isAmbiguous(types) ? WrappedUnionType : UnwrappedUnionType;
    }
    LOGICAL_TYPE = logicalType;
    type = new UnionType(types, opts);
  } else { // New type definition.
    type = (function (typeName) {
      var Type = TYPES[typeName];
      if (Type === undefined) {
        throw new Error(f('unknown type: %j', typeName));
      }
      return new Type(schema, opts);
    })(schema.type);
  }
  return type;
};

Type.forValue = function (val, opts) {
  opts = opts || {};

  // Sentinel used when inferring the types of empty arrays.
  opts.emptyArrayType = opts.emptyArrayType || Type.forSchema({
    type: 'array', items: 'null'
  });

  // Optional custom inference hook.
  if (opts.valueHook) {
    var type = opts.valueHook(val, opts);
    if (type !== undefined) {
      if (!Type.isType(type)) {
        throw new Error(f('invalid value hook return value: %j', type));
      }
      return type;
    }
  }

  // Default inference logic.
  switch (typeof val) {
    case 'string':
      return Type.forSchema('string', opts);
    case 'boolean':
      return Type.forSchema('boolean', opts);
    case 'number':
      if ((val | 0) === val) {
        return Type.forSchema('int', opts);
      } else if (Math.abs(val) < 9007199254740991) {
        return Type.forSchema('float', opts);
      }
      return Type.forSchema('double', opts);
    case 'object':
      if (val === null) {
        return Type.forSchema('null', opts);
      } else if (Array.isArray(val)) {
        if (!val.length) {
          return opts.emptyArrayType;
        }
        return Type.forSchema({
          type: 'array',
          items: Type.forTypes(
            val.map(function (v) { return Type.forValue(v, opts); }),
            opts
          )
        }, opts);
      } else if (Buffer.isBuffer(val)) {
        return Type.forSchema('bytes', opts);
      }
      var fieldNames = Object.keys(val);
      if (fieldNames.some(function (s) { return !utils.isValidName(s); })) {
        // We have to fall back to a map.
        return Type.forSchema({
          type: 'map',
          values: Type.forTypes(fieldNames.map(function (s) {
            return Type.forValue(val[s], opts);
          }), opts)
        }, opts);
      }
      return Type.forSchema({
        type: 'record',
        fields: fieldNames.map(function (s) {
          return {name: s, type: Type.forValue(val[s], opts)};
        })
      }, opts);
    default:
      throw new Error(f('cannot infer type from: %j', val));
  }
};

Type.forTypes = function (types, opts) {
  if (!types.length) {
    throw new Error('no types to combine');
  }
  if (types.length === 1) {
    return types[0]; // Nothing to do.
  }
  opts = opts || {};

  // Extract any union types, with special care for wrapped unions (see below).
  var expanded = [];
  var numWrappedUnions = 0;
  var isValidWrappedUnion = true;
  types.forEach(function (type) {
    switch (type.typeName) {
      case 'union:unwrapped':
        isValidWrappedUnion = false;
        expanded = expanded.concat(type.types);
        break;
      case 'union:wrapped':
        numWrappedUnions++;
        expanded = expanded.concat(type.types);
        break;
      case 'null':
        expanded.push(type);
        break;
      default:
        isValidWrappedUnion = false;
        expanded.push(type);
    }
  });
  if (numWrappedUnions) {
    if (!isValidWrappedUnion) {
      // It is only valid to combine wrapped unions when no other type is
      // present other than wrapped unions and nulls (otherwise the values of
      // others wouldn't be valid in the resulting union).
      throw new Error('cannot combine wrapped union');
    }
    var branchTypes = {};
    expanded.forEach(function (type) {
      var name = type.branchName;
      var branchType = branchTypes[name];
      if (!branchType) {
        branchTypes[name] = type;
      } else if (!type.equals(branchType)) {
        throw new Error('inconsistent branch type');
      }
    });
    var wrapUnions = opts.wrapUnions;
    var unionType;
    opts.wrapUnions = true;
    try {
      unionType = Type.forSchema(Object.keys(branchTypes).map(function (name) {
        return branchTypes[name];
      }), opts);
    } catch (err) {
      opts.wrapUnions = wrapUnions;
      throw err;
    }
    opts.wrapUnions = wrapUnions;
    return unionType;
  }

  // Group types by category, similar to the logic for unwrapped unions.
  var bucketized = {};
  expanded.forEach(function (type) {
    var bucket = getTypeBucket(type);
    var bucketTypes = bucketized[bucket];
    if (!bucketTypes) {
      bucketized[bucket] = bucketTypes = [];
    }
    bucketTypes.push(type);
  });

  // Generate the "augmented" type for each group.
  var buckets = Object.keys(bucketized);
  var augmented = buckets.map(function (bucket) {
    var bucketTypes = bucketized[bucket];
    if (bucketTypes.length === 1) {
      return bucketTypes[0];
    } else {
      switch (bucket) {
        case 'null':
        case 'boolean':
          return bucketTypes[0];
        case 'number':
          return combineNumbers(bucketTypes);
        case 'string':
          return combineStrings(bucketTypes, opts);
        case 'buffer':
          return combineBuffers(bucketTypes, opts);
        case 'array':
          // Remove any sentinel arrays (used when inferring from empty arrays)
          // to avoid making things nullable when they shouldn't be.
          bucketTypes = bucketTypes.filter(function (t) {
            return t !== opts.emptyArrayType;
          });
          if (!bucketTypes.length) {
            // We still don't have a real type, just return the sentinel.
            return opts.emptyArrayType;
          }
          return Type.forSchema({
            type: 'array',
            items: Type.forTypes(bucketTypes.map(function (t) {
              return t.itemsType;
            }), opts)
          }, opts);
        default:
          return combineObjects(bucketTypes, opts);
      }
    }
  });

  if (augmented.length === 1) {
    return augmented[0];
  } else {
    // We return an (unwrapped) union of all augmented types.
    return Type.forSchema(augmented, opts);
  }
};

Type.isType = function (/* any, [prefix] ... */) {
  var l = arguments.length;
  if (!l) {
    return false;
  }

  var any = arguments[0];
  if (
    !any ||
    typeof any._update != 'function' ||
    typeof any.fingerprint != 'function'
  ) {
    // Not fool-proof, but most likely good enough.
    return false;
  }

  if (l === 1) {
    // No type names specified, we are done.
    return true;
  }

  // We check if at least one of the prefixes matches.
  var typeName = any.typeName;
  var i;
  for (i = 1; i < l; i++) {
    if (typeName.indexOf(arguments[i]) === 0) {
      return true;
    }
  }
  return false;
};

Type.__reset = function (size) {
  debug('resetting type buffer to %d', size);
  TAP.buf = utils.newSlowBuffer(size);
};

Object.defineProperty(Type.prototype, 'branchName', {
  enumerable: true,
  get: function () {
    var type = Type.isType(this, 'logical') ? this.underlyingType : this;
    if (type.name) {
      return type.name;
    }
    if (Type.isType(type, 'abstract')) {
      return type._concreteTypeName;
    }
    return Type.isType(type, 'union') ? undefined : type.typeName;
  }
});

Type.prototype.clone = function (val, opts) {
  if (opts) {
    opts = {
      coerce: !!opts.coerceBuffers | 0, // Coerce JSON to Buffer.
      fieldHook: opts.fieldHook,
      qualifyNames: !!opts.qualifyNames,
      skip: !!opts.skipMissingFields,
      wrap: !!opts.wrapUnions | 0 // Wrap first match into union.
    };
    return this._copy(val, opts);
  } else {
    // If no modifications are required, we can get by with a serialization
    // roundtrip (generally much faster than a standard deep copy).
    return this.fromBuffer(this.toBuffer(val));
  }
};

Type.prototype.compare = utils.abstractFunction;

Type.prototype.compareBuffers = function (buf1, buf2) {
  return this._match(new Tap(buf1), new Tap(buf2));
};

Type.prototype.createResolver = function (type, opts) {
  if (!Type.isType(type)) {
    // More explicit error message than the "incompatible type" thrown
    // otherwise (especially because of the overridden `toJSON` method).
    throw new Error(f('not a type: %j', type));
  }

  if (!Type.isType(this, 'union', 'logical') && Type.isType(type, 'logical')) {
    // Trying to read a logical type as a built-in: unwrap the logical type.
    // Note that we exclude unions to support resolving into unions containing
    // logical types.
    return this.createResolver(type.underlyingType, opts);
  }

  opts = opts || {};
  opts.registry = opts.registry || {};

  var resolver, key;
  if (
    Type.isType(this, 'record', 'error') &&
    Type.isType(type, 'record', 'error')
  ) {
    // We allow conversions between records and errors.
    key = this.name + ':' + type.name; // ':' is illegal in Avro type names.
    resolver = opts.registry[key];
    if (resolver) {
      return resolver;
    }
  }

  resolver = new Resolver(this);
  if (key) { // Register resolver early for recursive schemas.
    opts.registry[key] = resolver;
  }

  if (Type.isType(type, 'union')) {
    var resolvers = type.types.map(function (t) {
      return this.createResolver(t, opts);
    }, this);
    resolver._read = function (tap) {
      var index = tap.readLong();
      var resolver = resolvers[index];
      if (resolver === undefined) {
        throw new Error(f('invalid union index: %s', index));
      }
      return resolvers[index]._read(tap);
    };
  } else {
    this._update(resolver, type, opts);
  }

  if (!resolver._read) {
    throw new Error(f('cannot read %s as %s', type, this));
  }
  return Object.freeze(resolver);
};

Type.prototype.decode = function (buf, pos, resolver) {
  var tap = new Tap(buf, pos);
  var val = readValue(this, tap, resolver);
  if (!tap.isValid()) {
    return {value: undefined, offset: -1};
  }
  return {value: val, offset: tap.pos};
};

Type.prototype.encode = function (val, buf, pos) {
  var tap = new Tap(buf, pos);
  this._write(tap, val);
  if (!tap.isValid()) {
    // Don't throw as there is no way to predict this. We also return the
    // number of missing bytes to ease resizing.
    return buf.length - tap.pos;
  }
  return tap.pos;
};

Type.prototype.equals = function (type, opts) {
  var canon = ( // Canonical equality.
    Type.isType(type) &&
    this.fingerprint().equals(type.fingerprint())
  );
  if (!canon || !(opts && opts.strict)) {
    return canon;
  }
  return (
    JSON.stringify(this.schema({exportAttrs: true})) ===
    JSON.stringify(type.schema({exportAttrs: true}))
  );
};

Type.prototype.fingerprint = function (algorithm) {
  if (!algorithm) {
    if (!this._hash.str) {
      var schemaStr = JSON.stringify(this.schema());
      this._hash.str = utils.getHash(schemaStr).toString('binary');
    }
    return utils.bufferFrom(this._hash.str, 'binary');
  } else {
    return utils.getHash(JSON.stringify(this.schema()), algorithm);
  }
};

Type.prototype.fromBuffer = function (buf, resolver, noCheck) {
  var tap = new Tap(buf);
  var val = readValue(this, tap, resolver, noCheck);
  if (!tap.isValid()) {
    throw new Error('truncated buffer');
  }
  if (!noCheck && tap.pos < buf.length) {
    throw new Error('trailing data');
  }
  return val;
};

Type.prototype.fromString = function (str) {
  return this._copy(JSON.parse(str), {coerce: 2});
};

Type.prototype.inspect = function () {
  var typeName = this.typeName;
  var className = getClassName(typeName);
  if (isPrimitive(typeName)) {
    // The class name is sufficient to identify the type.
    return f('<%s>', className);
  } else {
    // We add a little metadata for convenience.
    var obj = this.schema({exportAttrs: true, noDeref: true});
    if (typeof obj == 'object' && !Type.isType(this, 'logical')) {
      obj.type = undefined; // Would be redundant with constructor name.
    }
    return f('<%s %j>', className, obj);
  }
};

Type.prototype.isValid = function (val, opts) {
  // We only have a single flag for now, so no need to complicate things.
  var flags = (opts && opts.noUndeclaredFields) | 0;
  var errorHook = opts && opts.errorHook;
  var hook, path;
  if (errorHook) {
    path = [];
    hook = function (any, type) {
      errorHook.call(this, path.slice(), any, type, val);
    };
  }
  return this._check(val, flags, hook, path);
};

Type.prototype.random = utils.abstractFunction;

Type.prototype.schema = function (opts) {
  // Copy the options to avoid mutating the original options object when we add
  // the registry of dereferenced types.
  return this._attrs({
    exportAttrs: !!(opts && opts.exportAttrs),
    noDeref: !!(opts && opts.noDeref)
  });
};

Type.prototype.toBuffer = function (val) {
  TAP.pos = 0;
  this._write(TAP, val);
  var buf = utils.newBuffer(TAP.pos);
  if (TAP.isValid()) {
    TAP.buf.copy(buf, 0, 0, TAP.pos);
  } else {
    this._write(new Tap(buf), val);
  }
  return buf;
};

Type.prototype.toJSON = function () {
  // Convenience to allow using `JSON.stringify(type)` to get a type's schema.
  return this.schema({exportAttrs: true});
};

Type.prototype.toString = function (val) {
  if (val === undefined) {
    // Consistent behavior with standard `toString` expectations.
    return JSON.stringify(this.schema({noDeref: true}));
  }
  return JSON.stringify(this._copy(val, {coerce: 3}));
};

Type.prototype.wrap = function (val) {
  var Branch = this._branchConstructor;
  return Branch === null ? null : new Branch(val);
};

Type.prototype._attrs = function (opts) {
  // This function handles a lot of the common logic to schema generation
  // across types, for example keeping track of which types have already been
  // de-referenced (i.e. derefed).
  opts.derefed = opts.derefed || {};
  var name = this.name;
  if (name !== undefined) {
    if (opts.noDeref || opts.derefed[name]) {
      return name;
    }
    opts.derefed[name] = true;
  }
  var schema = {};
  // The order in which we add fields to the `schema` object matters here.
  // Since JS objects are unordered, this implementation (unfortunately) relies
  // on engines returning properties in the same order that they are inserted
  // in. This is not in the JS spec, but can be "somewhat" safely assumed (see
  // http://stackoverflow.com/q/5525795/1062617).
  if (this.name !== undefined) {
    schema.name = name;
  }
  schema.type = this.typeName;
  var derefedSchema = this._deref(schema, opts);
  if (derefedSchema !== undefined) {
    // We allow the original schema to be overridden (this will happen for
    // primitive types and logical types).
    schema = derefedSchema;
  }
  if (opts.exportAttrs) {
    if (this.aliases && this.aliases.length) {
      schema.aliases = this.aliases;
    }
    if (this.doc !== undefined) {
      schema.doc = this.doc;
    }
  }
  return schema;
};

Type.prototype._createBranchConstructor = function () {
  // jshint -W054
  var name = this.branchName;
  if (name === 'null') {
    return null;
  }
  var attr = ~name.indexOf('.') ? 'this[\'' + name + '\']' : 'this.' + name;
  var body = 'return function Branch$(val) { ' + attr + ' = val; };';
  var Branch = (new Function(body))();
  Branch.type = this;
  Branch.prototype.unwrap = new Function('return ' + attr + ';');
  Branch.prototype.unwrapped = Branch.prototype.unwrap; // Deprecated.
  return Branch;
};

Type.prototype._peek = function (tap) {
  var pos = tap.pos;
  var val = this._read(tap);
  tap.pos = pos;
  return val;
};

Type.prototype._check = utils.abstractFunction;
Type.prototype._copy = utils.abstractFunction;
Type.prototype._deref = utils.abstractFunction;
Type.prototype._match = utils.abstractFunction;
Type.prototype._read = utils.abstractFunction;
Type.prototype._skip = utils.abstractFunction;
Type.prototype._update = utils.abstractFunction;
Type.prototype._write = utils.abstractFunction;

// "Deprecated" getters (will be explicitly deprecated in 5.1).

Type.prototype.getAliases = function () { return this.aliases; };

Type.prototype.getFingerprint = Type.prototype.fingerprint;

Type.prototype.getName = function (asBranch) {
  return (this.name || !asBranch) ? this.name : this.branchName;
};

Type.prototype.getSchema = Type.prototype.schema;

Type.prototype.getTypeName = function () { return this.typeName; };

// Implementations.

/**
 * Base primitive Avro type.
 *
 * Most of the primitive types share the same cloning and resolution
 * mechanisms, provided by this class. This class also lets us conveniently
 * check whether a type is a primitive using `instanceof`.
 */
function PrimitiveType(noFreeze) {
  Type.call(this);
  this._branchConstructor = this._createBranchConstructor();
  if (!noFreeze) {
    // Abstract long types can't be frozen at this stage.
    Object.freeze(this);
  }
}
util.inherits(PrimitiveType, Type);

PrimitiveType.prototype._update = function (resolver, type) {
  if (type.typeName === this.typeName) {
    resolver._read = this._read;
  }
};

PrimitiveType.prototype._copy = function (val) {
  this._check(val, undefined, throwInvalidError);
  return val;
};

PrimitiveType.prototype._deref = function () { return this.typeName; };

PrimitiveType.prototype.compare = utils.compare;

/** Nulls. */
function NullType() { PrimitiveType.call(this); }
util.inherits(NullType, PrimitiveType);

NullType.prototype._check = function (val, flags, hook) {
  var b = val === null;
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

NullType.prototype._read = function () { return null; };

NullType.prototype._skip = function () {};

NullType.prototype._write = function (tap, val) {
  if (val !== null) {
    throwInvalidError(val, this);
  }
};

NullType.prototype._match = function () { return 0; };

NullType.prototype.compare = NullType.prototype._match;

NullType.prototype.typeName = 'null';

NullType.prototype.random = NullType.prototype._read;

/** Booleans. */
function BooleanType() { PrimitiveType.call(this); }
util.inherits(BooleanType, PrimitiveType);

BooleanType.prototype._check = function (val, flags, hook) {
  var b = typeof val == 'boolean';
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

BooleanType.prototype._read = function (tap) { return tap.readBoolean(); };

BooleanType.prototype._skip = function (tap) { tap.skipBoolean(); };

BooleanType.prototype._write = function (tap, val) {
  if (typeof val != 'boolean') {
    throwInvalidError(val, this);
  }
  tap.writeBoolean(val);
};

BooleanType.prototype._match = function (tap1, tap2) {
  return tap1.matchBoolean(tap2);
};

BooleanType.prototype.typeName = 'boolean';

BooleanType.prototype.random = function () { return RANDOM.nextBoolean(); };

/** Integers. */
function IntType() { PrimitiveType.call(this); }
util.inherits(IntType, PrimitiveType);

IntType.prototype._check = function (val, flags, hook) {
  var b = val === (val | 0);
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

IntType.prototype._read = function (tap) { return tap.readInt(); };

IntType.prototype._skip = function (tap) { tap.skipInt(); };

IntType.prototype._write = function (tap, val) {
  if (val !== (val | 0)) {
    throwInvalidError(val, this);
  }
  tap.writeInt(val);
};

IntType.prototype._match = function (tap1, tap2) {
  return tap1.matchInt(tap2);
};

IntType.prototype.typeName = 'int';

IntType.prototype.random = function () { return RANDOM.nextInt(1000) | 0; };

/**
 * Longs.
 *
 * We can't capture all the range unfortunately since JavaScript represents all
 * numbers internally as `double`s, so the default implementation plays safe
 * and throws rather than potentially silently change the data. See `__with` or
 * `AbstractLongType` below for a way to implement a custom long type.
 */
function LongType() { PrimitiveType.call(this); }
util.inherits(LongType, PrimitiveType);

LongType.prototype._check = function (val, flags, hook) {
  var b = typeof val == 'number' && val % 1 === 0 && isSafeLong(val);
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

LongType.prototype._read = function (tap) {
  var n = tap.readLong();
  if (!isSafeLong(n)) {
    throw new Error('potential precision loss');
  }
  return n;
};

LongType.prototype._skip = function (tap) { tap.skipLong(); };

LongType.prototype._write = function (tap, val) {
  if (typeof val != 'number' || val % 1 || !isSafeLong(val)) {
    throwInvalidError(val, this);
  }
  tap.writeLong(val);
};

LongType.prototype._match = function (tap1, tap2) {
  return tap1.matchLong(tap2);
};

LongType.prototype._update = function (resolver, type) {
  switch (type.typeName) {
    case 'int':
      resolver._read = type._read;
      break;
    case 'abstract:long':
    case 'long':
      resolver._read = this._read; // In case `type` is an `AbstractLongType`.
  }
};

LongType.prototype.typeName = 'long';

LongType.prototype.random = function () { return RANDOM.nextInt(); };

LongType.__with = function (methods, noUnpack) {
  methods = methods || {}; // Will give a more helpful error message.
  // We map some of the methods to a different name to be able to intercept
  // their input and output (otherwise we wouldn't be able to perform any
  // unpacking logic, and the type wouldn't work when nested).
  var mapping = {
    toBuffer: '_toBuffer',
    fromBuffer: '_fromBuffer',
    fromJSON: '_fromJSON',
    toJSON: '_toJSON',
    isValid: '_isValid',
    compare: 'compare'
  };
  var type = new AbstractLongType(noUnpack);
  Object.keys(mapping).forEach(function (name) {
    if (methods[name] === undefined) {
      throw new Error(f('missing method implementation: %s', name));
    }
    type[mapping[name]] = methods[name];
  });
  return Object.freeze(type);
};

/** Floats. */
function FloatType() { PrimitiveType.call(this); }
util.inherits(FloatType, PrimitiveType);

FloatType.prototype._check = function (val, flags, hook) {
  var b = typeof val == 'number';
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

FloatType.prototype._read = function (tap) { return tap.readFloat(); };

FloatType.prototype._skip = function (tap) { tap.skipFloat(); };

FloatType.prototype._write = function (tap, val) {
  if (typeof val != 'number') {
    throwInvalidError(val, this);
  }
  tap.writeFloat(val);
};

FloatType.prototype._match = function (tap1, tap2) {
  return tap1.matchFloat(tap2);
};

FloatType.prototype._update = function (resolver, type) {
  switch (type.typeName) {
    case 'float':
    case 'int':
      resolver._read = type._read;
      break;
    case 'abstract:long':
    case 'long':
      // No need to worry about precision loss here since we're always rounding
      // to float anyway.
      resolver._read = function (tap) { return tap.readLong(); };
  }
};

FloatType.prototype.typeName = 'float';

FloatType.prototype.random = function () { return RANDOM.nextFloat(1e3); };

/** Doubles. */
function DoubleType() { PrimitiveType.call(this); }
util.inherits(DoubleType, PrimitiveType);

DoubleType.prototype._check = function (val, flags, hook) {
  var b = typeof val == 'number';
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

DoubleType.prototype._read = function (tap) { return tap.readDouble(); };

DoubleType.prototype._skip = function (tap) { tap.skipDouble(); };

DoubleType.prototype._write = function (tap, val) {
  if (typeof val != 'number') {
    throwInvalidError(val, this);
  }
  tap.writeDouble(val);
};

DoubleType.prototype._match = function (tap1, tap2) {
  return tap1.matchDouble(tap2);
};

DoubleType.prototype._update = function (resolver, type) {
  switch (type.typeName) {
    case 'double':
    case 'float':
    case 'int':
      resolver._read = type._read;
      break;
    case 'abstract:long':
    case 'long':
      // Similar to inside `FloatType`, no need to worry about precision loss
      // here since we're always rounding to double anyway.
      resolver._read = function (tap) { return tap.readLong(); };
  }
};

DoubleType.prototype.typeName = 'double';

DoubleType.prototype.random = function () { return RANDOM.nextFloat(); };

/** Strings. */
function StringType() { PrimitiveType.call(this); }
util.inherits(StringType, PrimitiveType);

StringType.prototype._check = function (val, flags, hook) {
  var b = typeof val == 'string';
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

StringType.prototype._read = function (tap) { return tap.readString(); };

StringType.prototype._skip = function (tap) { tap.skipString(); };

StringType.prototype._write = function (tap, val) {
  if (typeof val != 'string') {
    throwInvalidError(val, this);
  }
  tap.writeString(val);
};

StringType.prototype._match = function (tap1, tap2) {
  return tap1.matchString(tap2);
};

StringType.prototype._update = function (resolver, type) {
  switch (type.typeName) {
    case 'bytes':
    case 'string':
      resolver._read = this._read;
  }
};

StringType.prototype.typeName = 'string';

StringType.prototype.random = function () {
  return RANDOM.nextString(RANDOM.nextInt(32));
};

/**
 * Bytes.
 *
 * These are represented in memory as `Buffer`s rather than binary-encoded
 * strings. This is more efficient (when decoding/encoding from bytes, the
 * common use-case), idiomatic, and convenient.
 *
 * Note the coercion in `_copy`.
 */
function BytesType() { PrimitiveType.call(this); }
util.inherits(BytesType, PrimitiveType);

BytesType.prototype._check = function (val, flags, hook) {
  var b = Buffer.isBuffer(val);
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

BytesType.prototype._read = function (tap) { return tap.readBytes(); };

BytesType.prototype._skip = function (tap) { tap.skipBytes(); };

BytesType.prototype._write = function (tap, val) {
  if (!Buffer.isBuffer(val)) {
    throwInvalidError(val, this);
  }
  tap.writeBytes(val);
};

BytesType.prototype._match = function (tap1, tap2) {
  return tap1.matchBytes(tap2);
};

BytesType.prototype._update = StringType.prototype._update;

BytesType.prototype._copy = function (obj, opts) {
  var buf;
  switch ((opts && opts.coerce) | 0) {
    case 3: // Coerce buffers to strings.
      this._check(obj, undefined, throwInvalidError);
      return obj.toString('binary');
    case 2: // Coerce strings to buffers.
      if (typeof obj != 'string') {
        throw new Error(f('cannot coerce to buffer: %j', obj));
      }
      buf = utils.bufferFrom(obj, 'binary');
      this._check(buf, undefined, throwInvalidError);
      return buf;
    case 1: // Coerce buffer JSON representation to buffers.
      if (!isJsonBuffer(obj)) {
        throw new Error(f('cannot coerce to buffer: %j', obj));
      }
      buf = utils.bufferFrom(obj.data);
      this._check(buf, undefined, throwInvalidError);
      return buf;
    default: // Copy buffer.
      this._check(obj, undefined, throwInvalidError);
      return utils.bufferFrom(obj);
  }
};

BytesType.prototype.compare = Buffer.compare;

BytesType.prototype.typeName = 'bytes';

BytesType.prototype.random = function () {
  return RANDOM.nextBuffer(RANDOM.nextInt(32));
};

/** Base "abstract" Avro union type. */
function UnionType(schema, opts) {
  Type.call(this);

  if (!Array.isArray(schema)) {
    throw new Error(f('non-array union schema: %j', schema));
  }
  if (!schema.length) {
    throw new Error('empty union');
  }
  this.types = Object.freeze(schema.map(function (obj) {
    return Type.forSchema(obj, opts);
  }));

  this._branchIndices = {};
  this.types.forEach(function (type, i) {
    if (Type.isType(type, 'union')) {
      throw new Error('unions cannot be directly nested');
    }
    var branch = type.branchName;
    if (this._branchIndices[branch] !== undefined) {
      throw new Error(f('duplicate union branch name: %j', branch));
    }
    this._branchIndices[branch] = i;
  }, this);
}
util.inherits(UnionType, Type);

UnionType.prototype._branchConstructor = function () {
  throw new Error('unions cannot be directly wrapped');
};

UnionType.prototype._skip = function (tap) {
  this.types[tap.readLong()]._skip(tap);
};

UnionType.prototype._match = function (tap1, tap2) {
  var n1 = tap1.readLong();
  var n2 = tap2.readLong();
  if (n1 === n2) {
    return this.types[n1]._match(tap1, tap2);
  } else {
    return n1 < n2 ? -1 : 1;
  }
};

UnionType.prototype._deref = function (schema, opts) {
  return this.types.map(function (t) { return t._attrs(opts); });
};

UnionType.prototype.getTypes = function () { return this.types; };

/**
 * "Natural" union type.
 *
 * This representation doesn't require a wrapping object and is therefore
 * simpler and generally closer to what users expect. However it cannot be used
 * to represent all Avro unions since some lead to ambiguities (e.g. if two
 * number types are in the union).
 *
 * Currently, this union supports at most one type in each of the categories
 * below:
 *
 * + `null`
 * + `boolean`
 * + `int`, `long`, `float`, `double`
 * + `string`, `enum`
 * + `bytes`, `fixed`
 * + `array`
 * + `map`, `record`
 */
function UnwrappedUnionType(schema, opts) {
  UnionType.call(this, schema, opts);

  this._dynamicBranches = null;
  this._bucketIndices = {};
  this.types.forEach(function (type, index) {
    if (Type.isType(type, 'abstract', 'logical')) {
      if (!this._dynamicBranches) {
        this._dynamicBranches = [];
      }
      this._dynamicBranches.push({index: index, type: type});
    } else {
      var bucket = getTypeBucket(type);
      if (this._bucketIndices[bucket] !== undefined) {
        throw new Error(f('ambiguous unwrapped union: %j', this));
      }
      this._bucketIndices[bucket] = index;
    }
  }, this);

  Object.freeze(this);
}
util.inherits(UnwrappedUnionType, UnionType);

UnwrappedUnionType.prototype._getIndex = function (val) {
  var index = this._bucketIndices[getValueBucket(val)];
  if (this._dynamicBranches) {
    // Slower path, we must run the value through all branches.
    index = this._getBranchIndex(val, index);
  }
  return index;
};

UnwrappedUnionType.prototype._getBranchIndex = function (any, index) {
  var logicalBranches = this._dynamicBranches;
  var i, l, branch;
  for (i = 0, l = logicalBranches.length; i < l; i++) {
    branch = logicalBranches[i];
    if (branch.type._check(any)) {
      if (index === undefined) {
        index = branch.index;
      } else {
        // More than one branch matches the value so we aren't guaranteed to
        // infer the correct type. We throw rather than corrupt data. This can
        // be fixed by "tightening" the logical types.
        throw new Error('ambiguous conversion');
      }
    }
  }
  return index;
};

UnwrappedUnionType.prototype._check = function (val, flags, hook, path) {
  var index = this._getIndex(val);
  var b = index !== undefined;
  if (b) {
    return this.types[index]._check(val, flags, hook, path);
  }
  if (hook) {
    hook(val, this);
  }
  return b;
};

UnwrappedUnionType.prototype._read = function (tap) {
  var index = tap.readLong();
  var branchType = this.types[index];
  if (branchType) {
    return branchType._read(tap);
  } else {
    throw new Error(f('invalid union index: %s', index));
  }
};

UnwrappedUnionType.prototype._write = function (tap, val) {
  var index = this._getIndex(val);
  if (index === undefined) {
    throwInvalidError(val, this);
  }
  tap.writeLong(index);
  if (val !== null) {
    this.types[index]._write(tap, val);
  }
};

UnwrappedUnionType.prototype._update = function (resolver, type, opts) {
  // jshint -W083
  // (The loop exits after the first function is created.)
  var i, l, typeResolver;
  for (i = 0, l = this.types.length; i < l; i++) {
    try {
      typeResolver = this.types[i].createResolver(type, opts);
    } catch (err) {
      continue;
    }
    resolver._read = function (tap) { return typeResolver._read(tap); };
    return;
  }
};

UnwrappedUnionType.prototype._copy = function (val, opts) {
  var coerce = opts && opts.coerce | 0;
  var wrap = opts && opts.wrap | 0;
  var index;
  if (wrap === 2) {
    // We are parsing a default, so always use the first branch's type.
    index = 0;
  } else {
    switch (coerce) {
      case 1:
        // Using the `coerceBuffers` option can cause corruption and erroneous
        // failures with unwrapped unions (in rare cases when the union also
        // contains a record which matches a buffer's JSON representation).
        if (isJsonBuffer(val) && this._bucketIndices.buffer !== undefined) {
          index = this._bucketIndices.buffer;
        } else {
          index = this._getIndex(val);
        }
        break;
      case 2:
        // Decoding from JSON, we must unwrap the value.
        if (val === null) {
          index = this._bucketIndices['null'];
        } else if (typeof val === 'object') {
          var keys = Object.keys(val);
          if (keys.length === 1) {
            index = this._branchIndices[keys[0]];
            val = val[keys[0]];
          }
        }
        break;
      default:
        index = this._getIndex(val);
    }
    if (index === undefined) {
      throwInvalidError(val, this);
    }
  }
  var type = this.types[index];
  if (val === null || wrap === 3) {
    return type._copy(val, opts);
  } else {
    switch (coerce) {
      case 3:
        // Encoding to JSON, we wrap the value.
        var obj = {};
        obj[type.branchName] = type._copy(val, opts);
        return obj;
      default:
        return type._copy(val, opts);
    }
  }
};

UnwrappedUnionType.prototype.compare = function (val1, val2) {
  var index1 = this._getIndex(val1);
  var index2 = this._getIndex(val2);
  if (index1 === undefined) {
    throwInvalidError(val1, this);
  } else if (index2 === undefined) {
    throwInvalidError(val2, this);
  } else if (index1 === index2) {
    return this.types[index1].compare(val1, val2);
  } else {
    return utils.compare(index1, index2);
  }
};

UnwrappedUnionType.prototype.typeName = 'union:unwrapped';

UnwrappedUnionType.prototype.random = function () {
  var index = RANDOM.nextInt(this.types.length);
  return this.types[index].random();
};

/**
 * Compatible union type.
 *
 * Values of this type are represented in memory similarly to their JSON
 * representation (i.e. inside an object with single key the name of the
 * contained type).
 *
 * This is not ideal, but is the most efficient way to unambiguously support
 * all unions. Here are a few reasons why the wrapping object is necessary:
 *
 * + Unions with multiple number types would have undefined behavior, unless
 *   numbers are wrapped (either everywhere, leading to large performance and
 *   convenience costs; or only when necessary inside unions, making it hard to
 *   understand when numbers are wrapped or not).
 * + Fixed types would have to be wrapped to be distinguished from bytes.
 * + Using record's constructor names would work (after a slight change to use
 *   the fully qualified name), but would mean that generic objects could no
 *   longer be valid records (making it inconvenient to do simple things like
 *   creating new records).
 */
function WrappedUnionType(schema, opts) {
  UnionType.call(this, schema, opts);
  Object.freeze(this);
}
util.inherits(WrappedUnionType, UnionType);

WrappedUnionType.prototype._check = function (val, flags, hook, path) {
  var b = false;
  if (val === null) {
    // Shortcut type lookup in this case.
    b = this._branchIndices['null'] !== undefined;
  } else if (typeof val == 'object') {
    var keys = Object.keys(val);
    if (keys.length === 1) {
      // We require a single key here to ensure that writes are correct and
      // efficient as soon as a record passes this check.
      var name = keys[0];
      var index = this._branchIndices[name];
      if (index !== undefined) {
        if (hook) {
          // Slow path.
          path.push(name);
          b = this.types[index]._check(val[name], flags, hook, path);
          path.pop();
          return b;
        } else {
          return this.types[index]._check(val[name], flags);
        }
      }
    }
  }
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

WrappedUnionType.prototype._read = function (tap) {
  var type = this.types[tap.readLong()];
  if (!type) {
    throw new Error(f('invalid union index'));
  }
  var Branch = type._branchConstructor;
  if (Branch === null) {
    return null;
  } else {
    return new Branch(type._read(tap));
  }
};

WrappedUnionType.prototype._write = function (tap, val) {
  var index, keys, name;
  if (val === null) {
    index = this._branchIndices['null'];
    if (index === undefined) {
      throwInvalidError(val, this);
    }
    tap.writeLong(index);
  } else {
    keys = Object.keys(val);
    if (keys.length === 1) {
      name = keys[0];
      index = this._branchIndices[name];
    }
    if (index === undefined) {
      throwInvalidError(val, this);
    }
    tap.writeLong(index);
    this.types[index]._write(tap, val[name]);
  }
};

WrappedUnionType.prototype._update = function (resolver, type, opts) {
  // jshint -W083
  // (The loop exits after the first function is created.)
  var i, l, typeResolver, Branch;
  for (i = 0, l = this.types.length; i < l; i++) {
    try {
      typeResolver = this.types[i].createResolver(type, opts);
    } catch (err) {
      continue;
    }
    Branch = this.types[i]._branchConstructor;
    if (Branch) {
      resolver._read = function (tap) {
        return new Branch(typeResolver._read(tap));
      };
    } else {
      resolver._read = function () { return null; };
    }
    return;
  }
};

WrappedUnionType.prototype._copy = function (val, opts) {
  var wrap = opts && opts.wrap | 0;
  if (wrap === 2) {
    var firstType = this.types[0];
    // Promote into first type (used for schema defaults).
    if (val === null && firstType.typeName === 'null') {
      return null;
    }
    return new firstType._branchConstructor(firstType._copy(val, opts));
  }
  if (val === null && this._branchIndices['null'] !== undefined) {
    return null;
  }

  var i, l, obj;
  if (typeof val == 'object') {
    var keys = Object.keys(val);
    if (keys.length === 1) {
      var name = keys[0];
      i = this._branchIndices[name];
      if (i === undefined && opts.qualifyNames) {
        // We are a bit more flexible than in `_check` here since we have
        // to deal with other serializers being less strict, so we fall
        // back to looking up unqualified names.
        var j, type;
        for (j = 0, l = this.types.length; j < l; j++) {
          type = this.types[j];
          if (type.name && name === utils.unqualify(type.name)) {
            i = j;
            break;
          }
        }
      }
      if (i !== undefined) {
        obj = this.types[i]._copy(val[name], opts);
      }
    }
  }
  if (wrap === 1 && obj === undefined) {
    // Try promoting into first match (convenience, slow).
    i = 0;
    l = this.types.length;
    while (i < l && obj === undefined) {
      try {
        obj = this.types[i]._copy(val, opts);
      } catch (err) {
        i++;
      }
    }
  }
  if (obj !== undefined) {
    return wrap === 3 ? obj : new this.types[i]._branchConstructor(obj);
  }
  throwInvalidError(val, this);
};

WrappedUnionType.prototype.compare = function (val1, val2) {
  var name1 = val1 === null ? 'null' : Object.keys(val1)[0];
  var name2 = val2 === null ? 'null' : Object.keys(val2)[0];
  var index = this._branchIndices[name1];
  if (name1 === name2) {
    return name1 === 'null' ?
      0 :
      this.types[index].compare(val1[name1], val2[name1]);
  } else {
    return utils.compare(index, this._branchIndices[name2]);
  }
};

WrappedUnionType.prototype.typeName = 'union:wrapped';

WrappedUnionType.prototype.random = function () {
  var index = RANDOM.nextInt(this.types.length);
  var type = this.types[index];
  var Branch = type._branchConstructor;
  if (!Branch) {
    return null;
  }
  return new Branch(type.random());
};

/**
 * Avro enum type.
 *
 * Represented as strings (with allowed values from the set of symbols). Using
 * integers would be a reasonable option, but the performance boost is arguably
 * offset by the legibility cost and the extra deviation from the JSON encoding
 * convention.
 *
 * An integer representation can still be used (e.g. for compatibility with
 * TypeScript `enum`s) by overriding the `EnumType` with a `LongType` (e.g. via
 * `parse`'s registry).
 */
function EnumType(schema, opts) {
  Type.call(this, schema, opts);
  if (!Array.isArray(schema.symbols) || !schema.symbols.length) {
    throw new Error(f('invalid enum symbols: %j', schema.symbols));
  }
  this.symbols = Object.freeze(schema.symbols.slice());
  this._indices = {};
  this.symbols.forEach(function (symbol, i) {
    if (!utils.isValidName(symbol)) {
      throw new Error(f('invalid %s symbol: %j', this, symbol));
    }
    if (this._indices[symbol] !== undefined) {
      throw new Error(f('duplicate %s symbol: %j', this, symbol));
    }
    this._indices[symbol] = i;
  }, this);
  this.default = schema.default;
  if (this.default !== undefined && this._indices[this.default] === undefined) {
    throw new Error(f('invalid %s default: %j', this, this.default));
  }
  this._branchConstructor = this._createBranchConstructor();
  Object.freeze(this);
}
util.inherits(EnumType, Type);

EnumType.prototype._check = function (val, flags, hook) {
  var b = this._indices[val] !== undefined;
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

EnumType.prototype._read = function (tap) {
  var index = tap.readLong();
  var symbol = this.symbols[index];
  if (symbol === undefined) {
    throw new Error(f('invalid %s enum index: %s', this.name, index));
  }
  return symbol;
};

EnumType.prototype._skip = function (tap) { tap.skipLong(); };

EnumType.prototype._write = function (tap, val) {
  var index = this._indices[val];
  if (index === undefined) {
    throwInvalidError(val, this);
  }
  tap.writeLong(index);
};

EnumType.prototype._match = function (tap1, tap2) {
  return tap1.matchLong(tap2);
};

EnumType.prototype.compare = function (val1, val2) {
  return utils.compare(this._indices[val1], this._indices[val2]);
};

EnumType.prototype._update = function (resolver, type, opts) {
  var symbols = this.symbols;
  if (
    type.typeName === 'enum' &&
    hasCompatibleName(this, type, !opts.ignoreNamespaces) &&
    (
      type.symbols.every(function (s) { return ~symbols.indexOf(s); }) ||
      this.default !== undefined
    )
  ) {
    resolver.symbols = type.symbols.map(function (s) {
      return this._indices[s] === undefined ? this.default : s;
    }, this);
    resolver._read = type._read;
  }
};

EnumType.prototype._copy = function (val) {
  this._check(val, undefined, throwInvalidError);
  return val;
};

EnumType.prototype._deref = function (schema) {
  schema.symbols = this.symbols;
};

EnumType.prototype.getSymbols = function () { return this.symbols; };

EnumType.prototype.typeName = 'enum';

EnumType.prototype.random = function () {
  return RANDOM.choice(this.symbols);
};

/** Avro fixed type. Represented simply as a `Buffer`. */
function FixedType(schema, opts) {
  Type.call(this, schema, opts);
  if (schema.size !== (schema.size | 0) || schema.size < 0) {
    throw new Error(f('invalid %s size', this.branchName));
  }
  this.size = schema.size | 0;
  this._branchConstructor = this._createBranchConstructor();
  Object.freeze(this);
}
util.inherits(FixedType, Type);

FixedType.prototype._check = function (val, flags, hook) {
  var b = Buffer.isBuffer(val) && val.length === this.size;
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

FixedType.prototype._read = function (tap) {
  return tap.readFixed(this.size);
};

FixedType.prototype._skip = function (tap) {
  tap.skipFixed(this.size);
};

FixedType.prototype._write = function (tap, val) {
  if (!Buffer.isBuffer(val) || val.length !== this.size) {
    throwInvalidError(val, this);
  }
  tap.writeFixed(val, this.size);
};

FixedType.prototype._match = function (tap1, tap2) {
  return tap1.matchFixed(tap2, this.size);
};

FixedType.prototype.compare = Buffer.compare;

FixedType.prototype._update = function (resolver, type, opts) {
  if (
    type.typeName === 'fixed' &&
    this.size === type.size &&
    hasCompatibleName(this, type, !opts.ignoreNamespaces)
  ) {
    resolver.size = this.size;
    resolver._read = this._read;
  }
};

FixedType.prototype._copy = BytesType.prototype._copy;

FixedType.prototype._deref = function (schema) { schema.size = this.size; };

FixedType.prototype.getSize = function () { return this.size; };

FixedType.prototype.typeName = 'fixed';

FixedType.prototype.random = function () {
  return RANDOM.nextBuffer(this.size);
};

/** Avro map. Represented as vanilla objects. */
function MapType(schema, opts) {
  Type.call(this);
  if (!schema.values) {
    throw new Error(f('missing map values: %j', schema));
  }
  this.valuesType = Type.forSchema(schema.values, opts);
  this._branchConstructor = this._createBranchConstructor();
  Object.freeze(this);
}
util.inherits(MapType, Type);

MapType.prototype._check = function (val, flags, hook, path) {
  if (!val || typeof val != 'object' || Array.isArray(val)) {
    if (hook) {
      hook(val, this);
    }
    return false;
  }

  var keys = Object.keys(val);
  var b = true;
  var i, l, j, key;
  if (hook) {
    // Slow path.
    j = path.length;
    path.push('');
    for (i = 0, l = keys.length; i < l; i++) {
      key = path[j] = keys[i];
      if (!this.valuesType._check(val[key], flags, hook, path)) {
        b = false;
      }
    }
    path.pop();
  } else {
    for (i = 0, l = keys.length; i < l; i++) {
      if (!this.valuesType._check(val[keys[i]], flags)) {
        return false;
      }
    }
  }
  return b;
};

MapType.prototype._read = function (tap) {
  var values = this.valuesType;
  var val = {};
  var n;
  while ((n = readArraySize(tap))) {
    while (n--) {
      var key = tap.readString();
      val[key] = values._read(tap);
    }
  }
  return val;
};

MapType.prototype._skip = function (tap) {
  var values = this.valuesType;
  var len, n;
  while ((n = tap.readLong())) {
    if (n < 0) {
      len = tap.readLong();
      tap.pos += len;
    } else {
      while (n--) {
        tap.skipString();
        values._skip(tap);
      }
    }
  }
};

MapType.prototype._write = function (tap, val) {
  if (!val || typeof val != 'object' || Array.isArray(val)) {
    throwInvalidError(val, this);
  }

  var values = this.valuesType;
  var keys = Object.keys(val);
  var n = keys.length;
  var i, key;
  if (n) {
    tap.writeLong(n);
    for (i = 0; i < n; i++) {
      key = keys[i];
      tap.writeString(key);
      values._write(tap, val[key]);
    }
  }
  tap.writeLong(0);
};

MapType.prototype._match = function () {
  throw new Error('maps cannot be compared');
};

MapType.prototype._update = function (rsv, type, opts) {
  if (type.typeName === 'map') {
    rsv.valuesType = this.valuesType.createResolver(type.valuesType, opts);
    rsv._read = this._read;
  }
};

MapType.prototype._copy = function (val, opts) {
  if (val && typeof val == 'object' && !Array.isArray(val)) {
    var values = this.valuesType;
    var keys = Object.keys(val);
    var i, l, key;
    var copy = {};
    for (i = 0, l = keys.length; i < l; i++) {
      key = keys[i];
      copy[key] = values._copy(val[key], opts);
    }
    return copy;
  }
  throwInvalidError(val, this);
};

MapType.prototype.compare = MapType.prototype._match;

MapType.prototype.typeName = 'map';

MapType.prototype.getValuesType = function () { return this.valuesType; };

MapType.prototype.random = function () {
  var val = {};
  var i, l;
  for (i = 0, l = RANDOM.nextInt(10); i < l; i++) {
    val[RANDOM.nextString(RANDOM.nextInt(20))] = this.valuesType.random();
  }
  return val;
};

MapType.prototype._deref = function (schema, opts) {
  schema.values = this.valuesType._attrs(opts);
};

/** Avro array. Represented as vanilla arrays. */
function ArrayType(schema, opts) {
  Type.call(this);
  if (!schema.items) {
    throw new Error(f('missing array items: %j', schema));
  }
  this.itemsType = Type.forSchema(schema.items, opts);
  this._branchConstructor = this._createBranchConstructor();
  Object.freeze(this);
}
util.inherits(ArrayType, Type);

ArrayType.prototype._check = function (val, flags, hook, path) {
  if (!Array.isArray(val)) {
    if (hook) {
      hook(val, this);
    }
    return false;
  }
  var items = this.itemsType;
  var b = true;
  var i, l, j;
  if (hook) {
    // Slow path.
    j = path.length;
    path.push('');
    for (i = 0, l = val.length; i < l; i++) {
      path[j] = '' + i;
      if (!items._check(val[i], flags, hook, path)) {
        b = false;
      }
    }
    path.pop();
  } else {
    for (i = 0, l = val.length; i < l; i++) {
      if (!items._check(val[i], flags)) {
        return false;
      }
    }
  }
  return b;
};

ArrayType.prototype._read = function (tap) {
  var items = this.itemsType;
  var i = 0;
  var val, n;
  while ((n = tap.readLong())) {
    if (n < 0) {
      n = -n;
      tap.skipLong(); // Skip size.
    }
    // Initializing the array on the first batch gives a ~10% speedup. See
    // https://github.com/mtth/avsc/pull/338 for more context.
    val = val || new Array(n)
    while (n--) {
      val[i++] = items._read(tap);
    }
  }
  return val || [];
};

ArrayType.prototype._skip = function (tap) {
  var items = this.itemsType;
  var len, n;
  while ((n = tap.readLong())) {
    if (n < 0) {
      len = tap.readLong();
      tap.pos += len;
    } else {
      while (n--) {
        items._skip(tap);
      }
    }
  }
};

ArrayType.prototype._write = function (tap, val) {
  if (!Array.isArray(val)) {
    throwInvalidError(val, this);
  }
  var items = this.itemsType;
  var n = val.length;
  var i;
  if (n) {
    tap.writeLong(n);
    for (i = 0; i < n; i++) {
      items._write(tap, val[i]);
    }
  }
  tap.writeLong(0);
};

ArrayType.prototype._match = function (tap1, tap2) {
  var n1 = tap1.readLong();
  var n2 = tap2.readLong();
  var f;
  while (n1 && n2) {
    f = this.itemsType._match(tap1, tap2);
    if (f) {
      return f;
    }
    if (!--n1) {
      n1 = readArraySize(tap1);
    }
    if (!--n2) {
      n2 = readArraySize(tap2);
    }
  }
  return utils.compare(n1, n2);
};

ArrayType.prototype._update = function (resolver, type, opts) {
  if (type.typeName === 'array') {
    resolver.itemsType = this.itemsType.createResolver(type.itemsType, opts);
    resolver._read = this._read;
  }
};

ArrayType.prototype._copy = function (val, opts) {
  if (!Array.isArray(val)) {
    throwInvalidError(val, this);
  }
  var items = new Array(val.length);
  var i, l;
  for (i = 0, l = val.length; i < l; i++) {
    items[i] = this.itemsType._copy(val[i], opts);
  }
  return items;
};

ArrayType.prototype._deref = function (schema, opts) {
  schema.items = this.itemsType._attrs(opts);
};

ArrayType.prototype.compare = function (val1, val2) {
  var n1 = val1.length;
  var n2 = val2.length;
  var i, l, f;
  for (i = 0, l = Math.min(n1, n2); i < l; i++) {
    if ((f = this.itemsType.compare(val1[i], val2[i]))) {
      return f;
    }
  }
  return utils.compare(n1, n2);
};

ArrayType.prototype.getItemsType = function () { return this.itemsType; };

ArrayType.prototype.typeName = 'array';

ArrayType.prototype.random = function () {
  var arr = [];
  var i, l;
  for (i = 0, l = RANDOM.nextInt(10); i < l; i++) {
    arr.push(this.itemsType.random());
  }
  return arr;
};

/**
 * Avro record.
 *
 * Values are represented as instances of a programmatically generated
 * constructor (similar to a "specific record"), available via the
 * `getRecordConstructor` method. This "specific record class" gives
 * significant speedups over using generics objects.
 *
 * Note that vanilla objects are still accepted as valid as long as their
 * fields match (this makes it much more convenient to do simple things like
 * update nested records).
 *
 * This type is also used for errors (similar, except for the extra `Error`
 * constructor call) and for messages (see comment below).
 */
function RecordType(schema, opts) {
  // Force creation of the options object in case we need to register this
  // record's name.
  opts = opts || {};

  // Save the namespace to restore it as we leave this record's scope.
  var namespace = opts.namespace;
  if (schema.namespace !== undefined) {
    opts.namespace = schema.namespace;
  } else if (schema.name) {
    // Fully qualified names' namespaces are used when no explicit namespace
    // attribute was specified.
    var ns = utils.impliedNamespace(schema.name);
    if (ns !== undefined) {
      opts.namespace = ns;
    }
  }
  Type.call(this, schema, opts);

  if (!Array.isArray(schema.fields)) {
    throw new Error(f('non-array record fields: %j', schema.fields));
  }
  if (utils.hasDuplicates(schema.fields, function (f) { return f.name; })) {
    throw new Error(f('duplicate field name: %j', schema.fields));
  }
  this._fieldsByName = {};
  this.fields = Object.freeze(schema.fields.map(function (f) {
    var field = new Field(f, opts);
    this._fieldsByName[field.name] = field;
    return field;
  }, this));
  this._branchConstructor = this._createBranchConstructor();
  this._isError = schema.type === 'error';
  this.recordConstructor = this._createConstructor(
    opts.errorStackTraces,
    opts.omitRecordMethods
  );
  this._read = this._createReader();
  this._skip = this._createSkipper();
  this._write = this._createWriter();
  this._check = this._createChecker();

  opts.namespace = namespace;
  Object.freeze(this);
}
util.inherits(RecordType, Type);

RecordType.prototype._getConstructorName = function () {
  return this.name ?
    utils.capitalize(utils.unqualify(this.name)) :
    this._isError ? 'Error$' : 'Record$';
};

RecordType.prototype._createConstructor = function (errorStack, plainRecords) {
  // jshint -W054
  var outerArgs = [];
  var innerArgs = [];
  var ds = []; // Defaults.
  var innerBody = '';
  var i, l, field, name, defaultValue, hasDefault, stackField;
  for (i = 0, l = this.fields.length; i < l; i++) {
    field = this.fields[i];
    defaultValue = field.defaultValue;
    hasDefault = defaultValue() !== undefined;
    name = field.name;
    if (
      errorStack && this._isError && name === 'stack' &&
      Type.isType(field.type, 'string') && !hasDefault
    ) {
      // We keep track of whether we've encountered a valid stack field (in
      // particular, without a default) to populate a stack trace below.
      stackField = field;
    }
    innerArgs.push('v' + i);
    innerBody += '  ';
    if (!hasDefault) {
      innerBody += 'this.' + name + ' = v' + i + ';\n';
    } else {
      innerBody += 'if (v' + i + ' === undefined) { ';
      innerBody += 'this.' + name + ' = d' + ds.length + '(); ';
      innerBody += '} else { this.' + name + ' = v' + i + '; }\n';
      outerArgs.push('d' + ds.length);
      ds.push(defaultValue);
    }
  }
  if (stackField) {
    // We should populate a stack trace.
    innerBody += '  if (this.stack === undefined) { ';
    /* istanbul ignore else */
    if (typeof Error.captureStackTrace == 'function') {
      // v8 runtimes, the easy case.
      innerBody += 'Error.captureStackTrace(this, this.constructor);';
    } else {
      // A few other runtimes (e.g. SpiderMonkey), might not work everywhere.
      innerBody += 'this.stack = Error().stack;';
    }
    innerBody += ' }\n';
  }
  var outerBody = 'return function ' + this._getConstructorName() + '(';
  outerBody += innerArgs.join() + ') {\n' + innerBody + '};';
  var Record = new Function(outerArgs.join(), outerBody).apply(undefined, ds);
  if (plainRecords) {
    return Record;
  }

  var self = this;
  Record.getType = function () { return self; };
  Record.type = self;
  if (this._isError) {
    util.inherits(Record, Error);
    Record.prototype.name = this._getConstructorName();
  }
  Record.prototype.clone = function (o) { return self.clone(this, o); };
  Record.prototype.compare = function (v) { return self.compare(this, v); };
  Record.prototype.isValid = function (o) { return self.isValid(this, o); };
  Record.prototype.toBuffer = function () { return self.toBuffer(this); };
  Record.prototype.toString = function () { return self.toString(this); };
  Record.prototype.wrap = function () { return self.wrap(this); };
  Record.prototype.wrapped = Record.prototype.wrap; // Deprecated.
  return Record;
};

RecordType.prototype._createChecker = function () {
  // jshint -W054
  var names = [];
  var values = [];
  var name = this._getConstructorName();
  var body = 'return function check' + name + '(v, f, h, p) {\n';
  body += '  if (\n';
  body += '    v === null ||\n';
  body += '    typeof v != \'object\' ||\n';
  body += '    (f && !this._checkFields(v))\n';
  body += '  ) {\n';
  body += '    if (h) { h(v, this); }\n';
  body += '    return false;\n';
  body += '  }\n';
  if (!this.fields.length) {
    // Special case, empty record. We handle this directly.
    body += '  return true;\n';
  } else {
    for (i = 0, l = this.fields.length; i < l; i++) {
      field = this.fields[i];
      names.push('t' + i);
      values.push(field.type);
      if (field.defaultValue() !== undefined) {
        body += '  var v' + i + ' = v.' + field.name + ';\n';
      }
    }
    body += '  if (h) {\n';
    body += '    var b = 1;\n';
    body += '    var j = p.length;\n';
    body += '    p.push(\'\');\n';
    var i, l, field;
    for (i = 0, l = this.fields.length; i < l; i++) {
      field = this.fields[i];
      body += '    p[j] = \'' + field.name + '\';\n';
      body += '    b &= ';
      if (field.defaultValue() === undefined) {
        body += 't' + i + '._check(v.' + field.name + ', f, h, p);\n';
      } else {
        body += 'v' + i + ' === undefined || ';
        body += 't' + i + '._check(v' + i + ', f, h, p);\n';
      }
    }
    body += '    p.pop();\n';
    body += '    return !!b;\n';
    body += '  } else {\n    return (\n      ';
    body += this.fields.map(function (field, i) {
      return field.defaultValue() === undefined ?
        't' + i + '._check(v.' + field.name + ', f)' :
        '(v' + i + ' === undefined || t' + i + '._check(v' + i + ', f))';
    }).join(' &&\n      ');
    body += '\n    );\n  }\n';
  }
  body += '};';
  return new Function(names.join(), body).apply(undefined, values);
};

RecordType.prototype._createReader = function () {
  // jshint -W054
  var names = [];
  var values = [this.recordConstructor];
  var i, l;
  for (i = 0, l = this.fields.length; i < l; i++) {
    names.push('t' + i);
    values.push(this.fields[i].type);
  }
  var name = this._getConstructorName();
  var body = 'return function read' + name + '(t) {\n';
  body += '  return new ' + name + '(\n    ';
  body += names.map(function (s) { return s + '._read(t)'; }).join(',\n    ');
  body += '\n  );\n};';
  names.unshift(name);
  // We can do this since the JS spec guarantees that function arguments are
  // evaluated from left to right.
  return new Function(names.join(), body).apply(undefined, values);
};

RecordType.prototype._createSkipper = function () {
  // jshint -W054
  var args = [];
  var body = 'return function skip' + this._getConstructorName() + '(t) {\n';
  var values = [];
  var i, l;
  for (i = 0, l = this.fields.length; i < l; i++) {
    args.push('t' + i);
    values.push(this.fields[i].type);
    body += '  t' + i + '._skip(t);\n';
  }
  body += '}';
  return new Function(args.join(), body).apply(undefined, values);
};

RecordType.prototype._createWriter = function () {
  // jshint -W054
  // We still do default handling here, in case a normal JS object is passed.
  var args = [];
  var name = this._getConstructorName();
  var body = 'return function write' + name + '(t, v) {\n';
  var values = [];
  var i, l, field, value;
  for (i = 0, l = this.fields.length; i < l; i++) {
    field = this.fields[i];
    args.push('t' + i);
    values.push(field.type);
    body += '  ';
    if (field.defaultValue() === undefined) {
      body += 't' + i + '._write(t, v.' + field.name + ');\n';
    } else {
      value = field.type.toBuffer(field.defaultValue()).toString('binary');
      // Convert the default value to a binary string ahead of time. We aren't
      // converting it to a buffer to avoid retaining too much memory. If we
      // had our own buffer pool, this could be an idea in the future.
      args.push('d' + i);
      values.push(value);
      body += 'var v' + i + ' = v.' + field.name + ';\n';
      body += 'if (v' + i + ' === undefined) {\n';
      body += '    t.writeBinary(d' + i + ', ' + value.length + ');\n';
      body += '  } else {\n    t' + i + '._write(t, v' + i + ');\n  }\n';
    }
  }
  body += '}';
  return new Function(args.join(), body).apply(undefined, values);
};

RecordType.prototype._update = function (resolver, type, opts) {
  // jshint -W054
  if (!hasCompatibleName(this, type, !opts.ignoreNamespaces)) {
    throw new Error(f('no alias found for %s', type.name));
  }

  var rFields = this.fields;
  var wFields = type.fields;
  var wFieldsMap = utils.toMap(wFields, function (f) { return f.name; });

  var innerArgs = []; // Arguments for reader constructor.
  var resolvers = {}; // Resolvers keyed by writer field name.
  var i, j, field, name, names, matches, fieldResolver;
  for (i = 0; i < rFields.length; i++) {
    field = rFields[i];
    names = getAliases(field);
    matches = [];
    for (j = 0; j < names.length; j++) {
      name = names[j];
      if (wFieldsMap[name]) {
        matches.push(name);
      }
    }
    if (matches.length > 1) {
      throw new Error(
        f('ambiguous aliasing for %s.%s (%s)', type.name, field.name, matches)
      );
    }
    if (!matches.length) {
      if (field.defaultValue() === undefined) {
        throw new Error(
          f('no matching field for default-less %s.%s', type.name, field.name)
        );
      }
      innerArgs.push('undefined');
    } else {
      name = matches[0];
      fieldResolver = {
        resolver: field.type.createResolver(wFieldsMap[name].type, opts),
        name: '_' + field.name, // Reader field name.
      };
      if (!resolvers[name]) {
        resolvers[name] = [fieldResolver];
      } else {
        resolvers[name].push(fieldResolver);
      }
      innerArgs.push(fieldResolver.name);
    }
  }

  // See if we can add a bypass for unused fields at the end of the record.
  var lazyIndex = -1;
  i = wFields.length;
  while (i && resolvers[wFields[--i].name] === undefined) {
    lazyIndex = i;
  }

  var uname = this._getConstructorName();
  var args = [uname];
  var values = [this.recordConstructor];
  var body = '  return function read' + uname + '(t, b) {\n';
  for (i = 0; i < wFields.length; i++) {
    if (i === lazyIndex) {
      body += '  if (!b) {\n';
    }
    field = type.fields[i];
    name = field.name;
    if (resolvers[name] === undefined) {
      body += (~lazyIndex && i >= lazyIndex) ? '    ' : '  ';
      args.push('r' + i);
      values.push(field.type);
      body += 'r' + i + '._skip(t);\n';
    } else {
      j = resolvers[name].length;
      while (j--) {
        body += (~lazyIndex && i >= lazyIndex) ? '    ' : '  ';
        args.push('r' + i + 'f' + j);
        fieldResolver = resolvers[name][j];
        values.push(fieldResolver.resolver);
        body += 'var ' + fieldResolver.name + ' = ';
        body += 'r' + i + 'f' + j + '._' + (j ? 'peek' : 'read') + '(t);\n';
      }
    }
  }
  if (~lazyIndex) {
    body += '  }\n';
  }
  body += '  return new ' + uname + '(' + innerArgs.join() + ');\n};';

  resolver._read = new Function(args.join(), body).apply(undefined, values);
};

RecordType.prototype._match = function (tap1, tap2) {
  var fields = this.fields;
  var i, l, field, order, type;
  for (i = 0, l = fields.length; i < l; i++) {
    field = fields[i];
    order = field._order;
    type = field.type;
    if (order) {
      order *= type._match(tap1, tap2);
      if (order) {
        return order;
      }
    } else {
      type._skip(tap1);
      type._skip(tap2);
    }
  }
  return 0;
};

RecordType.prototype._checkFields = function (obj) {
  var keys = Object.keys(obj);
  var i, l;
  for (i = 0, l = keys.length; i < l; i++) {
    if (!this._fieldsByName[keys[i]]) {
      return false;
    }
  }
  return true;
};

RecordType.prototype._copy = function (val, opts) {
  // jshint -W058
  var hook = opts && opts.fieldHook;
  var values = [undefined];
  var i, l, field, value;
  for (i = 0, l = this.fields.length; i < l; i++) {
    field = this.fields[i];
    value = val[field.name];
    if (value === undefined && field.hasOwnProperty('defaultValue')) {
      value = field.defaultValue();
    }
    if ((opts && !opts.skip) || value !== undefined) {
      value = field.type._copy(value, opts);
    }
    if (hook) {
      value = hook(field, value, this);
    }
    values.push(value);
  }
  var Record = this.recordConstructor;
  return new (Record.bind.apply(Record, values))();
};

RecordType.prototype._deref = function (schema, opts) {
  schema.fields = this.fields.map(function (field) {
    var fieldType = field.type;
    var fieldSchema = {
      name: field.name,
      type: fieldType._attrs(opts)
    };
    if (opts.exportAttrs) {
      var val = field.defaultValue();
      if (val !== undefined) {
        // We must both unwrap all unions and coerce buffers to strings.
        fieldSchema['default'] = fieldType._copy(val, {coerce: 3, wrap: 3});
      }
      var fieldOrder = field.order;
      if (fieldOrder !== 'ascending') {
        fieldSchema.order = fieldOrder;
      }
      var fieldAliases = field.aliases;
      if (fieldAliases.length) {
        fieldSchema.aliases = fieldAliases;
      }
      var fieldDoc = field.doc;
      if (fieldDoc !== undefined) {
        fieldSchema.doc = fieldDoc;
      }
    }
    return fieldSchema;
  });
};

RecordType.prototype.compare = function (val1, val2) {
  var fields = this.fields;
  var i, l, field, name, order, type;
  for (i = 0, l = fields.length; i < l; i++) {
    field = fields[i];
    name = field.name;
    order = field._order;
    type = field.type;
    if (order) {
      order *= type.compare(val1[name], val2[name]);
      if (order) {
        return order;
      }
    }
  }
  return 0;
};

RecordType.prototype.random = function () {
  // jshint -W058
  var fields = this.fields.map(function (f) { return f.type.random(); });
  fields.unshift(undefined);
  var Record = this.recordConstructor;
  return new (Record.bind.apply(Record, fields))();
};

RecordType.prototype.field = function (name) {
  return this._fieldsByName[name];
};

RecordType.prototype.getField = RecordType.prototype.field;

RecordType.prototype.getFields = function () { return this.fields; };

RecordType.prototype.getRecordConstructor = function () {
  return this.recordConstructor;
};

Object.defineProperty(RecordType.prototype, 'typeName', {
  enumerable: true,
  get: function () { return this._isError ? 'error' : 'record'; }
});

/** Derived type abstract class. */
function LogicalType(schema, opts) {
  this._logicalTypeName = schema.logicalType;
  Type.call(this);
  LOGICAL_TYPE = this;
  try {
    this._underlyingType = Type.forSchema(schema, opts);
  } finally {
    LOGICAL_TYPE = null;
    // Remove the underlying type now that we're done instantiating. Note that
    // in some (rare) cases, it might not have been inserted; for example, if
    // this constructor was manually called with an already instantiated type.
    var l = UNDERLYING_TYPES.length;
    if (l && UNDERLYING_TYPES[l - 1][0] === this) {
      UNDERLYING_TYPES.pop();
    }
  }
  // We create a separate branch constructor for logical types to keep them
  // monomorphic.
  if (Type.isType(this.underlyingType, 'union')) {
    this._branchConstructor = this.underlyingType._branchConstructor;
  } else {
    this._branchConstructor = this.underlyingType._createBranchConstructor();
  }
  // We don't freeze derived types to allow arbitrary properties. Implementors
  // can still do so in the subclass' constructor at their convenience.
}
util.inherits(LogicalType, Type);

Object.defineProperty(LogicalType.prototype, 'typeName', {
  enumerable: true,
  get: function () { return 'logical:' + this._logicalTypeName; }
});

Object.defineProperty(LogicalType.prototype, 'underlyingType', {
  enumerable: true,
  get: function () {
    if (this._underlyingType) {
      return this._underlyingType;
    }
    // If the field wasn't present, it means the logical type isn't complete
    // yet: we're waiting on its underlying type to be fully instantiated. In
    // this case, it will be present in the `UNDERLYING_TYPES` array.
    var i, l, arr;
    for (i = 0, l = UNDERLYING_TYPES.length; i < l; i++) {
      arr = UNDERLYING_TYPES[i];
      if (arr[0] === this) {
        return arr[1];
      }
    }
  }
});

LogicalType.prototype.getUnderlyingType = function () {
  return this.underlyingType;
};

LogicalType.prototype._read = function (tap) {
  return this._fromValue(this.underlyingType._read(tap));
};

LogicalType.prototype._write = function (tap, any) {
  this.underlyingType._write(tap, this._toValue(any));
};

LogicalType.prototype._check = function (any, flags, hook, path) {
  try {
    var val = this._toValue(any);
  } catch (err) {
    // Handled below.
  }
  if (val === undefined) {
    if (hook) {
      hook(any, this);
    }
    return false;
  }
  return this.underlyingType._check(val, flags, hook, path);
};

LogicalType.prototype._copy = function (any, opts) {
  var type = this.underlyingType;
  switch (opts && opts.coerce) {
    case 3: // To string.
      return type._copy(this._toValue(any), opts);
    case 2: // From string.
      return this._fromValue(type._copy(any, opts));
    default: // Normal copy.
      return this._fromValue(type._copy(this._toValue(any), opts));
  }
};

LogicalType.prototype._update = function (resolver, type, opts) {
  var _fromValue = this._resolve(type, opts);
  if (_fromValue) {
    resolver._read = function (tap) { return _fromValue(type._read(tap)); };
  }
};

LogicalType.prototype.compare = function (obj1, obj2) {
  var val1 = this._toValue(obj1);
  var val2 = this._toValue(obj2);
  return this.underlyingType.compare(val1, val2);
};

LogicalType.prototype.random = function () {
  return this._fromValue(this.underlyingType.random());
};

LogicalType.prototype._deref = function (schema, opts) {
  var type = this.underlyingType;
  var isVisited = type.name !== undefined && opts.derefed[type.name];
  schema = type._attrs(opts);
  if (!isVisited && opts.exportAttrs) {
    if (typeof schema == 'string') {
      schema = {type: schema};
    }
    schema.logicalType = this._logicalTypeName;
    this._export(schema);
  }
  return schema;
};

LogicalType.prototype._skip = function (tap) {
  this.underlyingType._skip(tap);
};

// Unlike the other methods below, `_export` has a reasonable default which we
// can provide (not exporting anything).
LogicalType.prototype._export = function (/* schema */) {};

// Methods to be implemented.
LogicalType.prototype._fromValue = utils.abstractFunction;
LogicalType.prototype._toValue = utils.abstractFunction;
LogicalType.prototype._resolve = utils.abstractFunction;


// General helpers.

/**
 * Customizable long.
 *
 * This allows support of arbitrarily large long (e.g. larger than
 * `Number.MAX_SAFE_INTEGER`). See `LongType.__with` method above. Note that we
 * can't use a logical type because we need a "lower-level" hook here: passing
 * through through the standard long would cause a loss of precision.
 */
function AbstractLongType(noUnpack) {
  this._concreteTypeName = 'long';
  PrimitiveType.call(this, true);
  // Note that this type "inherits" `LongType` (i.e. gain its prototype
  // methods) but only "subclasses" `PrimitiveType` to avoid being prematurely
  // frozen.
  this._noUnpack = !!noUnpack;
}
util.inherits(AbstractLongType, LongType);

AbstractLongType.prototype.typeName = 'abstract:long';

AbstractLongType.prototype._check = function (val, flags, hook) {
  var b = this._isValid(val);
  if (!b && hook) {
    hook(val, this);
  }
  return b;
};

AbstractLongType.prototype._read = function (tap) {
  var buf, pos;
  if (this._noUnpack) {
    pos = tap.pos;
    tap.skipLong();
    buf = tap.buf.slice(pos, tap.pos);
  } else {
    buf = tap.unpackLongBytes(tap);
  }
  if (tap.isValid()) {
    return this._fromBuffer(buf);
  }
};

AbstractLongType.prototype._write = function (tap, val) {
  if (!this._isValid(val)) {
    throwInvalidError(val, this);
  }
  var buf = this._toBuffer(val);
  if (this._noUnpack) {
    tap.writeFixed(buf);
  } else {
    tap.packLongBytes(buf);
  }
};

AbstractLongType.prototype._copy = function (val, opts) {
  switch (opts && opts.coerce) {
    case 3: // To string.
      return this._toJSON(val);
    case 2: // From string.
      return this._fromJSON(val);
    default: // Normal copy.
      // Slow but guarantees most consistent results. Faster alternatives would
      // require assumptions on the long class used (e.g. immutability).
      return this._fromJSON(this._toJSON(val));
  }
};

AbstractLongType.prototype._deref = function () { return 'long'; };

AbstractLongType.prototype._update = function (resolver, type) {
  var self = this;
  switch (type.typeName) {
    case 'int':
      resolver._read = function (tap) {
        return self._fromJSON(type._read(tap));
      };
      break;
    case 'abstract:long':
    case 'long':
      resolver._read = function (tap) { return self._read(tap); };
  }
};

AbstractLongType.prototype.random = function () {
  return this._fromJSON(LongType.prototype.random());
};

// Methods to be implemented by the user.
AbstractLongType.prototype._fromBuffer = utils.abstractFunction;
AbstractLongType.prototype._toBuffer = utils.abstractFunction;
AbstractLongType.prototype._fromJSON = utils.abstractFunction;
AbstractLongType.prototype._toJSON = utils.abstractFunction;
AbstractLongType.prototype._isValid = utils.abstractFunction;
AbstractLongType.prototype.compare = utils.abstractFunction;

/** A record field. */
function Field(schema, opts) {
  var name = schema.name;
  if (typeof name != 'string' || !utils.isValidName(name)) {
    throw new Error(f('invalid field name: %s', name));
  }

  this.name = name;
  this.type = Type.forSchema(schema.type, opts);
  this.aliases = schema.aliases || [];
  this.doc = schema.doc !== undefined ? '' + schema.doc : undefined;

  this._order = (function (order) {
    switch (order) {
      case 'ascending':
        return 1;
      case 'descending':
        return -1;
      case 'ignore':
        return 0;
      default:
        throw new Error(f('invalid order: %j', order));
    }
  })(schema.order === undefined ? 'ascending' : schema.order);

  var value = schema['default'];
  if (value !== undefined) {
    // We need to convert defaults back to a valid format (unions are
    // disallowed in default definitions, only the first type of each union is
    // allowed instead).
    // http://apache-avro.679487.n3.nabble.com/field-union-default-in-Java-td1175327.html
    var type = this.type;
    var val;
    try {
      val = type._copy(value, {coerce: 2, wrap: 2});
    } catch (err) {
      var msg = f('incompatible field default %j (%s)', value, err.message);
      if (Type.isType(type, 'union')) {
        msg += f(
          ', union defaults must match the first branch\'s type (%j)',
          type.types[0]
        );
      }
      throw new Error(msg);
    }
    // The clone call above will throw an error if the default is invalid.
    if (isPrimitive(type.typeName) && type.typeName !== 'bytes') {
      // These are immutable.
      this.defaultValue = function () { return val; };
    } else {
      this.defaultValue = function () { return type._copy(val); };
    }
  }

  Object.freeze(this);
}

Field.prototype.defaultValue = function () {}; // Undefined default.

Object.defineProperty(Field.prototype, 'order', {
  enumerable: true,
  get: function () {
    return ['descending', 'ignore', 'ascending'][this._order + 1];
  }
});

Field.prototype.getAliases = function () { return this.aliases; };

Field.prototype.getDefault = Field.prototype.defaultValue;

Field.prototype.getName = function () { return this.name; };

Field.prototype.getOrder = function () { return this.order; };

Field.prototype.getType = function () { return this.type; };

/**
 * Resolver to read a writer's schema as a new schema.
 *
 * @param readerType {Type} The type to convert to.
 */
function Resolver(readerType) {
  // Add all fields here so that all resolvers share the same hidden class.
  this._readerType = readerType;
  this._read = null;
  this.itemsType = null;
  this.size = 0;
  this.symbols = null;
  this.valuesType = null;
}

Resolver.prototype._peek = Type.prototype._peek;

Resolver.prototype.inspect = function () { return '<Resolver>'; };

/** Mutable hash container. */
function Hash() {
  this.str = undefined;
}

/**
 * Read a value from a tap.
 *
 * @param type {Type} The type to decode.
 * @param tap {Tap} The tap to read from. No checks are performed here.
 * @param resolver {Resolver} Optional resolver. It must match the input type.
 * @param lazy {Boolean} Skip trailing fields when using a resolver.
 */
function readValue(type, tap, resolver, lazy) {
  if (resolver) {
    if (resolver._readerType !== type) {
      throw new Error('invalid resolver');
    }
    return resolver._read(tap, lazy);
  } else {
    return type._read(tap);
  }
}

/**
 * Get all aliases for a type (including its name).
 *
 * @param obj {Type|Object} Typically a type or a field. Its aliases property
 * must exist and be an array.
 */
function getAliases(obj) {
  var names = {};
  if (obj.name) {
    names[obj.name] = true;
  }
  var aliases = obj.aliases;
  var i, l;
  for (i = 0, l = aliases.length; i < l; i++) {
    names[aliases[i]] = true;
  }
  return Object.keys(names);
}

/** Checks if a type can be read as another based on name resolution rules. */
function hasCompatibleName(reader, writer, strict) {
  if (!writer.name) {
    return true;
  }
  var name = strict ? writer.name : utils.unqualify(writer.name);
  var aliases = getAliases(reader);
  var i, l, alias;
  for (i = 0, l = aliases.length; i < l; i++) {
    alias = aliases[i];
    if (!strict) {
      alias = utils.unqualify(alias);
    }
    if (alias === name) {
      return true;
    }
  }
  return false;
}

/**
 * Check whether a type's name is a primitive.
 *
 * @param name {String} Type name (e.g. `'string'`, `'array'`).
 */
function isPrimitive(typeName) {
  // Since we use this module's own `TYPES` object, we can use `instanceof`.
  var type = TYPES[typeName];
  return type && type.prototype instanceof PrimitiveType;
}

/**
 * Return a type's class name from its Avro type name.
 *
 * We can't simply use `constructor.name` since it isn't supported in all
 * browsers.
 *
 * @param typeName {String} Type name.
 */
function getClassName(typeName) {
  if (typeName === 'error') {
    typeName = 'record';
  } else {
    var match = /^([^:]+):(.*)$/.exec(typeName);
    if (match) {
      if (match[1] === 'union') {
        typeName = match[2] + 'Union';
      } else {
        // Logical type.
        typeName = match[1];
      }
    }
  }
  return utils.capitalize(typeName) + 'Type';
}

/**
 * Get the number of elements in an array block.
 *
 * @param tap {Tap} A tap positioned at the beginning of an array block.
 */
function readArraySize(tap) {
  var n = tap.readLong();
  if (n < 0) {
    n = -n;
    tap.skipLong(); // Skip size.
  }
  return n;
}

/**
 * Check whether a long can be represented without precision loss.
 *
 * @param n {Number} The number.
 *
 * Two things to note:
 *
 * + We are not using the `Number` constants for compatibility with older
 *   browsers.
 * + We must remove one from each bound because of rounding errors.
 */
function isSafeLong(n) {
  return n >= -9007199254740990 && n <= 9007199254740990;
}

/**
 * Check whether an object is the JSON representation of a buffer.
 */
function isJsonBuffer(obj) {
  return obj && obj.type === 'Buffer' && Array.isArray(obj.data);
}

/**
 * Throw a somewhat helpful error on invalid object.
 *
 * @param path {Array} Passed from hook, but unused (because empty where this
 * function is used, since we aren't keeping track of it for effiency).
 * @param val {...} The object to reject.
 * @param type {Type} The type to check against.
 *
 * This method is mostly used from `_write` to signal an invalid object for a
 * given type. Note that this provides less information than calling `isValid`
 * with a hook since the path is not propagated (for efficiency reasons).
 */
function throwInvalidError(val, type) {
  throw new Error(f('invalid %j: %j', type.schema(), val));
}

function maybeQualify(name, ns) {
  var unqualified = utils.unqualify(name);
  // Primitives are always in the global namespace.
  return isPrimitive(unqualified) ? unqualified : utils.qualify(name, ns);
}

/**
 * Get a type's bucket when included inside an unwrapped union.
 *
 * @param type {Type} Any type.
 */
function getTypeBucket(type) {
  var typeName = type.typeName;
  switch (typeName) {
    case 'double':
    case 'float':
    case 'int':
    case 'long':
      return 'number';
    case 'bytes':
    case 'fixed':
      return 'buffer';
    case 'enum':
      return 'string';
    case 'map':
    case 'error':
    case 'record':
      return 'object';
    default:
      return typeName;
  }
}

/**
 * Infer a value's bucket (see unwrapped unions for more details).
 *
 * @param val {...} Any value.
 */
function getValueBucket(val) {
  if (val === null) {
    return 'null';
  }
  var bucket = typeof val;
  if (bucket === 'object') {
    // Could be bytes, fixed, array, map, or record.
    if (Array.isArray(val)) {
      return 'array';
    } else if (Buffer.isBuffer(val)) {
      return 'buffer';
    }
  }
  return bucket;
}

/**
 * Check whether a collection of types leads to an ambiguous union.
 *
 * @param types {Array} Array of types.
 */
function isAmbiguous(types) {
  var buckets = {};
  var i, l, bucket, type;
  for (i = 0, l = types.length; i < l; i++) {
    type = types[i];
    if (!Type.isType(type, 'logical')) {
      bucket = getTypeBucket(type);
      if (buckets[bucket]) {
        return true;
      }
      buckets[bucket] = true;
    }
  }
  return false;
}

/**
 * Combine number types.
 *
 * Note that never have to create a new type here, we are guaranteed to be able
 * to reuse one of the input types as super-type.
 */
function combineNumbers(types) {
  var typeNames = ['int', 'long', 'float', 'double'];
  var superIndex = -1;
  var superType = null;
  var i, l, type, index;
  for (i = 0, l = types.length; i < l; i++) {
    type = types[i];
    index = typeNames.indexOf(type.typeName);
    if (index > superIndex) {
      superIndex = index;
      superType = type;
    }
  }
  return superType;
}

/**
 * Combine enums and strings.
 *
 * The order of the returned symbols is undefined and the returned enum is
 *
 */
function combineStrings(types, opts) {
  var symbols = {};
  var i, l, type, typeSymbols;
  for (i = 0, l = types.length; i < l; i++) {
    type = types[i];
    if (type.typeName === 'string') {
      // If at least one of the types is a string, it will be the supertype.
      return type;
    }
    typeSymbols = type.symbols;
    var j, m;
    for (j = 0, m = typeSymbols.length; j < m; j++) {
      symbols[typeSymbols[j]] = true;
    }
  }
  return Type.forSchema({type: 'enum', symbols: Object.keys(symbols)}, opts);
}

/**
 * Combine bytes and fixed.
 *
 * This function is optimized to avoid creating new types when possible: in
 * case of a size mismatch between fixed types, it will continue looking
 * through the array to find an existing bytes type (rather than exit early by
 * creating one eagerly).
 */
function combineBuffers(types, opts) {
  var size = -1;
  var i, l, type;
  for (i = 0, l = types.length; i < l; i++) {
    type = types[i];
    if (type.typeName === 'bytes') {
      return type;
    }
    if (size === -1) {
      size = type.size;
    } else if (type.size !== size) {
      // Don't create a bytes type right away, we might be able to reuse one
      // later on in the types array. Just mark this for now.
      size = -2;
    }
  }
  return size < 0 ? Type.forSchema('bytes', opts) : types[0];
}

/**
 * Combine maps and records.
 *
 * Field defaults are kept when possible (i.e. when no coercion to a map
 * happens), with later definitions overriding previous ones.
 */
function combineObjects(types, opts) {
  var allTypes = []; // Field and value types.
  var fieldTypes = {}; // Record field types grouped by field name.
  var fieldDefaults = {};
  var isValidRecord = true;

  // Check whether the final type will be a map or a record.
  var i, l, type, fields;
  for (i = 0, l = types.length; i < l; i++) {
    type = types[i];
    if (type.typeName === 'map') {
      isValidRecord = false;
      allTypes.push(type.valuesType);
    } else {
      fields = type.fields;
      var j, m, field, fieldDefault, fieldName, fieldType;
      for (j = 0, m = fields.length; j < m; j++) {
        field = fields[j];
        fieldName = field.name;
        fieldType = field.type;
        allTypes.push(fieldType);
        if (isValidRecord) {
          if (!fieldTypes[fieldName]) {
            fieldTypes[fieldName] = [];
          }
          fieldTypes[fieldName].push(fieldType);
          fieldDefault = field.defaultValue();
          if (fieldDefault !== undefined) {
            // Later defaults will override any previous ones.
            fieldDefaults[fieldName] = fieldDefault;
          }
        }
      }
    }
  }

  if (isValidRecord) {
    // Check that no fields are missing and that we have the approriate
    // defaults for those which are.
    var fieldNames = Object.keys(fieldTypes);
    for (i = 0, l = fieldNames.length; i < l; i++) {
      fieldName = fieldNames[i];
      if (
        fieldTypes[fieldName].length < types.length &&
        fieldDefaults[fieldName] === undefined
      ) {
        // At least one of the records is missing a field with no default.
        if (opts && opts.strictDefaults) {
          isValidRecord = false;
        } else {
          fieldTypes[fieldName].unshift(Type.forSchema('null', opts));
          fieldDefaults[fieldName] = null;
        }
      }
    }
  }

  var schema;
  if (isValidRecord) {
    schema = {
      type: 'record',
      fields: fieldNames.map(function (s) {
        var fieldType = Type.forTypes(fieldTypes[s], opts);
        var fieldDefault = fieldDefaults[s];
        if (
          fieldDefault !== undefined &&
          ~fieldType.typeName.indexOf('union')
        ) {
          // Ensure that the default's corresponding type is first.
          var unionTypes = fieldType.types.slice();
          var i, l;
          for (i = 0, l = unionTypes.length; i < l; i++) {
            if (unionTypes[i].isValid(fieldDefault)) {
              break;
            }
          }
          if (i > 0) {
            var unionType = unionTypes[0];
            unionTypes[0] = unionTypes[i];
            unionTypes[i] = unionType;
            fieldType = Type.forSchema(unionTypes, opts);
          }
        }
        return {
          name: s,
          type: fieldType,
          'default': fieldDefaults[s]
        };
      })
    };
  } else {
    schema = {
      type: 'map',
      values: Type.forTypes(allTypes, opts)
    };
  }
  return Type.forSchema(schema, opts);
}


module.exports = {
  Type: Type,
  getTypeBucket: getTypeBucket,
  getValueBucket: getValueBucket,
  isPrimitive: isPrimitive,
  builtins: (function () {
    var types = {
      LogicalType: LogicalType,
      UnwrappedUnionType: UnwrappedUnionType,
      WrappedUnionType: WrappedUnionType
    };
    var typeNames = Object.keys(TYPES);
    var i, l, typeName;
    for (i = 0, l = typeNames.length; i < l; i++) {
      typeName = typeNames[i];
      types[getClassName(typeName)] = TYPES[typeName];
    }
    return types;
  })()
};
