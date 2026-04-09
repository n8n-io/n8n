"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = addCallSuperHelper;
var _core = require("@babel/core");
const helper = _core.template.statement`
  function CALL_SUPER(
    _this,
    derived,
    args,
  ) {
    function isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;

      // core-js@3
      if (Reflect.construct.sham) return false;

      // Proxy can't be polyfilled. Every browser implemented
      // proxies before or at the same time as Reflect.construct,
      // so if they support Proxy they also support Reflect.construct.
      if (typeof Proxy === "function") return true;

      // Since Reflect.construct can't be properly polyfilled, some
      // implementations (e.g. core-js@2) don't set the correct internal slots.
      // Those polyfills don't allow us to subclass built-ins, so we need to
      // use our fallback implementation.
      try {
        // If the internal slots aren't set, this throws an error similar to
        //   TypeError: this is not a Boolean object.
        return !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}),);
      } catch (e) {
        return false;
      }
    }

    // Super
    derived = GET_PROTOTYPE_OF(derived);
    return POSSIBLE_CONSTRUCTOR_RETURN(
      _this,
      isNativeReflectConstruct()
        ? // NOTE: This doesn't work if this.__proto__.constructor has been modified.
          Reflect.construct(
            derived,
            args || [],
            GET_PROTOTYPE_OF(_this).constructor,
          )
        : derived.apply(_this, args),
    );
  }
`;
const helperIDs = new WeakMap();
function addCallSuperHelper(file) {
  if (helperIDs.has(file)) {
    return (_core.types.cloneNode || _core.types.clone)(helperIDs.get(file));
  }
  try {
    return file.addHelper("callSuper");
  } catch (_unused) {}
  const id = file.scope.generateUidIdentifier("callSuper");
  helperIDs.set(file, id);
  const fn = helper({
    CALL_SUPER: id,
    GET_PROTOTYPE_OF: file.addHelper("getPrototypeOf"),
    POSSIBLE_CONSTRUCTOR_RETURN: file.addHelper("possibleConstructorReturn")
  });
  const [fnPath] = file.path.unshiftContainer("body", [fn]);
  file.scope.registerDeclaration(fnPath);
  return _core.types.cloneNode(id);
}

//# sourceMappingURL=inline-callSuper-helpers.js.map
