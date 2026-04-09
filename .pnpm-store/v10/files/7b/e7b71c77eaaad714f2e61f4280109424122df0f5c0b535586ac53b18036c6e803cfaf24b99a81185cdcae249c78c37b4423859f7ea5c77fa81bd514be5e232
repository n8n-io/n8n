"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = transformClass;
var _helperReplaceSupers = require("@babel/helper-replace-supers");
var _core = require("@babel/core");
var _traverse = require("@babel/traverse");
var _helperAnnotateAsPure = require("@babel/helper-annotate-as-pure");
var _inlineCallSuperHelpers = require("./inline-callSuper-helpers.js");
function buildConstructor(classRef, constructorBody, node) {
  const func = _core.types.functionDeclaration(_core.types.cloneNode(classRef), [], constructorBody);
  _core.types.inherits(func, node);
  return func;
}
function transformClass(path, file, builtinClasses, isLoose, assumptions, supportUnicodeId) {
  const classState = {
    parent: undefined,
    scope: undefined,
    node: undefined,
    path: undefined,
    file: undefined,
    classId: undefined,
    classRef: undefined,
    superName: null,
    superReturns: [],
    isDerived: false,
    extendsNative: false,
    construct: undefined,
    constructorBody: undefined,
    userConstructor: undefined,
    userConstructorPath: undefined,
    hasConstructor: false,
    body: [],
    superThises: [],
    pushedInherits: false,
    pushedCreateClass: false,
    protoAlias: null,
    isLoose: false,
    dynamicKeys: new Map(),
    methods: {
      instance: {
        hasComputed: false,
        list: [],
        map: new Map()
      },
      static: {
        hasComputed: false,
        list: [],
        map: new Map()
      }
    }
  };
  const setState = newState => {
    Object.assign(classState, newState);
  };
  const findThisesVisitor = _traverse.visitors.environmentVisitor({
    ThisExpression(path) {
      classState.superThises.push(path);
    }
  });
  function createClassHelper(args) {
    return _core.types.callExpression(classState.file.addHelper("createClass"), args);
  }
  function maybeCreateConstructor() {
    const classBodyPath = classState.path.get("body");
    for (const path of classBodyPath.get("body")) {
      if (path.isClassMethod({
        kind: "constructor"
      })) return;
    }
    const params = [];
    let body;
    if (classState.isDerived) {
      body = _core.template.statement.ast`{
          super(...arguments);
        }`;
    } else {
      body = _core.types.blockStatement([]);
    }
    classBodyPath.unshiftContainer("body", _core.types.classMethod("constructor", _core.types.identifier("constructor"), params, body));
  }
  function buildBody() {
    maybeCreateConstructor();
    pushBody();
    verifyConstructor();
    if (classState.userConstructor) {
      const {
        constructorBody,
        userConstructor,
        construct
      } = classState;
      constructorBody.body.push(...userConstructor.body.body);
      _core.types.inherits(construct, userConstructor);
      _core.types.inherits(constructorBody, userConstructor.body);
    }
    pushDescriptors();
  }
  function pushBody() {
    const classBodyPaths = classState.path.get("body.body");
    for (const path of classBodyPaths) {
      const node = path.node;
      if (path.isClassProperty() || path.isClassPrivateProperty()) {
        throw path.buildCodeFrameError("Missing class properties transform.");
      }
      if (node.decorators) {
        throw path.buildCodeFrameError("Method has decorators, put the decorator plugin before the classes one.");
      }
      if (_core.types.isClassMethod(node)) {
        const isConstructor = node.kind === "constructor";
        const replaceSupers = new _helperReplaceSupers.default({
          methodPath: path,
          objectRef: classState.classRef,
          superRef: classState.superName,
          constantSuper: assumptions.constantSuper,
          file: classState.file,
          refToPreserve: classState.classRef
        });
        replaceSupers.replace();
        const superReturns = [];
        path.traverse(_traverse.visitors.environmentVisitor({
          ReturnStatement(path) {
            if (!path.getFunctionParent().isArrowFunctionExpression()) {
              superReturns.push(path);
            }
          }
        }));
        if (isConstructor) {
          pushConstructor(superReturns, node, path);
        } else {
          var _path$ensureFunctionN;
          (_path$ensureFunctionN = path.ensureFunctionName) != null ? _path$ensureFunctionN : path.ensureFunctionName = require("@babel/traverse").NodePath.prototype.ensureFunctionName;
          path.ensureFunctionName(supportUnicodeId);
          let wrapped;
          if (node !== path.node) {
            wrapped = path.node;
            path.replaceWith(node);
          }
          pushMethod(node, wrapped);
        }
      }
    }
  }
  function pushDescriptors() {
    pushInheritsToBody();
    const {
      body
    } = classState;
    const props = {
      instance: null,
      static: null
    };
    for (const placement of ["static", "instance"]) {
      if (classState.methods[placement].list.length) {
        props[placement] = classState.methods[placement].list.map(desc => {
          const obj = _core.types.objectExpression([_core.types.objectProperty(_core.types.identifier("key"), desc.key)]);
          for (const kind of ["get", "set", "value"]) {
            if (desc[kind] != null) {
              obj.properties.push(_core.types.objectProperty(_core.types.identifier(kind), desc[kind]));
            }
          }
          return obj;
        });
      }
    }
    if (props.instance || props.static) {
      let args = [_core.types.cloneNode(classState.classRef), props.instance ? _core.types.arrayExpression(props.instance) : _core.types.nullLiteral(), props.static ? _core.types.arrayExpression(props.static) : _core.types.nullLiteral()];
      let lastNonNullIndex = 0;
      for (let i = 0; i < args.length; i++) {
        if (!_core.types.isNullLiteral(args[i])) lastNonNullIndex = i;
      }
      args = args.slice(0, lastNonNullIndex + 1);
      body.push(_core.types.returnStatement(createClassHelper(args)));
      classState.pushedCreateClass = true;
    }
  }
  function wrapSuperCall(bareSuper, superRef, thisRef, body) {
    const bareSuperNode = bareSuper.node;
    let call;
    if (assumptions.superIsCallableConstructor) {
      bareSuperNode.arguments.unshift(_core.types.thisExpression());
      if (bareSuperNode.arguments.length === 2 && _core.types.isSpreadElement(bareSuperNode.arguments[1]) && _core.types.isIdentifier(bareSuperNode.arguments[1].argument, {
        name: "arguments"
      })) {
        bareSuperNode.arguments[1] = bareSuperNode.arguments[1].argument;
        bareSuperNode.callee = _core.types.memberExpression(_core.types.cloneNode(superRef), _core.types.identifier("apply"));
      } else {
        bareSuperNode.callee = _core.types.memberExpression(_core.types.cloneNode(superRef), _core.types.identifier("call"));
      }
      call = _core.types.logicalExpression("||", bareSuperNode, _core.types.thisExpression());
    } else {
      var _bareSuperNode$argume;
      const args = [_core.types.thisExpression(), _core.types.cloneNode(classState.classRef)];
      if ((_bareSuperNode$argume = bareSuperNode.arguments) != null && _bareSuperNode$argume.length) {
        const bareSuperNodeArguments = bareSuperNode.arguments;
        if (bareSuperNodeArguments.length === 1 && _core.types.isSpreadElement(bareSuperNodeArguments[0]) && _core.types.isIdentifier(bareSuperNodeArguments[0].argument, {
          name: "arguments"
        })) {
          args.push(bareSuperNodeArguments[0].argument);
        } else {
          args.push(_core.types.arrayExpression(bareSuperNodeArguments));
        }
      }
      call = _core.types.callExpression((0, _inlineCallSuperHelpers.default)(classState.file), args);
    }
    if (bareSuper.parentPath.isExpressionStatement() && bareSuper.parentPath.container === body.node.body && body.node.body.length - 1 === bareSuper.parentPath.key) {
      if (classState.superThises.length) {
        call = _core.types.assignmentExpression("=", thisRef(), call);
      }
      bareSuper.parentPath.replaceWith(_core.types.returnStatement(call));
    } else {
      bareSuper.replaceWith(_core.types.assignmentExpression("=", thisRef(), call));
    }
  }
  function verifyConstructor() {
    if (!classState.isDerived) return;
    const path = classState.userConstructorPath;
    const body = path.get("body");
    const constructorBody = path.get("body");
    let maxGuaranteedSuperBeforeIndex = constructorBody.node.body.length;
    path.traverse(findThisesVisitor);
    let thisRef = function () {
      const ref = path.scope.generateDeclaredUidIdentifier("this");
      maxGuaranteedSuperBeforeIndex++;
      thisRef = () => _core.types.cloneNode(ref);
      return ref;
    };
    const buildAssertThisInitialized = function () {
      return _core.types.callExpression(classState.file.addHelper("assertThisInitialized"), [thisRef()]);
    };
    const bareSupers = [];
    path.traverse(_traverse.visitors.environmentVisitor({
      Super(path) {
        const {
          node,
          parentPath
        } = path;
        if (parentPath.isCallExpression({
          callee: node
        })) {
          bareSupers.unshift(parentPath);
        }
      }
    }));
    for (const bareSuper of bareSupers) {
      wrapSuperCall(bareSuper, classState.superName, thisRef, body);
      if (maxGuaranteedSuperBeforeIndex >= 0) {
        let lastParentPath;
        bareSuper.find(function (parentPath) {
          if (parentPath === constructorBody) {
            maxGuaranteedSuperBeforeIndex = Math.min(maxGuaranteedSuperBeforeIndex, lastParentPath.key);
            return true;
          }
          const {
            type
          } = parentPath;
          switch (type) {
            case "ExpressionStatement":
            case "SequenceExpression":
            case "AssignmentExpression":
            case "BinaryExpression":
            case "MemberExpression":
            case "CallExpression":
            case "NewExpression":
            case "VariableDeclarator":
            case "VariableDeclaration":
            case "BlockStatement":
            case "ArrayExpression":
            case "ObjectExpression":
            case "ObjectProperty":
            case "TemplateLiteral":
              lastParentPath = parentPath;
              return false;
            default:
              if (type === "LogicalExpression" && parentPath.node.left === lastParentPath.node || parentPath.isConditional() && parentPath.node.test === lastParentPath.node || type === "OptionalCallExpression" && parentPath.node.callee === lastParentPath.node || type === "OptionalMemberExpression" && parentPath.node.object === lastParentPath.node) {
                lastParentPath = parentPath;
                return false;
              }
          }
          maxGuaranteedSuperBeforeIndex = -1;
          return true;
        });
      }
    }
    const guaranteedCalls = new Set();
    for (const thisPath of classState.superThises) {
      const {
        node,
        parentPath
      } = thisPath;
      if (parentPath.isMemberExpression({
        object: node
      })) {
        thisPath.replaceWith(thisRef());
        continue;
      }
      let thisIndex;
      thisPath.find(function (parentPath) {
        if (parentPath.parentPath === constructorBody) {
          thisIndex = parentPath.key;
          return true;
        }
      });
      let exprPath = thisPath.parentPath.isSequenceExpression() ? thisPath.parentPath : thisPath;
      if (exprPath.listKey === "arguments" && (exprPath.parentPath.isCallExpression() || exprPath.parentPath.isOptionalCallExpression())) {
        exprPath = exprPath.parentPath;
      } else {
        exprPath = null;
      }
      if (maxGuaranteedSuperBeforeIndex !== -1 && thisIndex > maxGuaranteedSuperBeforeIndex || guaranteedCalls.has(exprPath)) {
        thisPath.replaceWith(thisRef());
      } else {
        if (exprPath) {
          guaranteedCalls.add(exprPath);
        }
        thisPath.replaceWith(buildAssertThisInitialized());
      }
    }
    let wrapReturn;
    if (classState.isLoose) {
      wrapReturn = returnArg => {
        const thisExpr = buildAssertThisInitialized();
        return returnArg ? _core.types.logicalExpression("||", returnArg, thisExpr) : thisExpr;
      };
    } else {
      wrapReturn = returnArg => {
        const returnParams = [thisRef()];
        if (returnArg != null) {
          returnParams.push(returnArg);
        }
        return _core.types.callExpression(classState.file.addHelper("possibleConstructorReturn"), returnParams);
      };
    }
    const bodyPaths = body.get("body");
    const guaranteedSuperBeforeFinish = maxGuaranteedSuperBeforeIndex !== -1 && maxGuaranteedSuperBeforeIndex < bodyPaths.length;
    if (!bodyPaths.length || !bodyPaths.pop().isReturnStatement()) {
      body.pushContainer("body", _core.types.returnStatement(guaranteedSuperBeforeFinish ? thisRef() : buildAssertThisInitialized()));
    }
    for (const returnPath of classState.superReturns) {
      returnPath.get("argument").replaceWith(wrapReturn(returnPath.node.argument));
    }
  }
  function pushMethod(node, wrapped) {
    if (node.kind === "method") {
      if (processMethod(node)) return;
    }
    const placement = node.static ? "static" : "instance";
    const methods = classState.methods[placement];
    const descKey = node.kind === "method" ? "value" : node.kind;
    const key = _core.types.isNumericLiteral(node.key) || _core.types.isBigIntLiteral(node.key) ? _core.types.stringLiteral(String(node.key.value)) : _core.types.toComputedKey(node);
    methods.hasComputed = !_core.types.isStringLiteral(key);
    const fn = wrapped != null ? wrapped : _core.types.toExpression(node);
    let descriptor;
    if (!methods.hasComputed && methods.map.has(key.value)) {
      descriptor = methods.map.get(key.value);
      descriptor[descKey] = fn;
      if (descKey === "value") {
        descriptor.get = null;
        descriptor.set = null;
      } else {
        descriptor.value = null;
      }
    } else {
      descriptor = {
        key: key,
        [descKey]: fn
      };
      methods.list.push(descriptor);
      if (!methods.hasComputed) {
        methods.map.set(key.value, descriptor);
      }
    }
  }
  function processMethod(node) {
    if (assumptions.setClassMethods && !node.decorators) {
      let {
        classRef
      } = classState;
      if (!node.static) {
        insertProtoAliasOnce();
        classRef = classState.protoAlias;
      }
      const methodName = _core.types.memberExpression(_core.types.cloneNode(classRef), node.key, node.computed || _core.types.isLiteral(node.key));
      const func = _core.types.functionExpression(node.id, node.params, node.body, node.generator, node.async);
      _core.types.inherits(func, node);
      const expr = _core.types.expressionStatement(_core.types.assignmentExpression("=", methodName, func));
      _core.types.inheritsComments(expr, node);
      classState.body.push(expr);
      return true;
    }
    return false;
  }
  function insertProtoAliasOnce() {
    if (classState.protoAlias === null) {
      setState({
        protoAlias: classState.scope.generateUidIdentifier("proto")
      });
      const classProto = _core.types.memberExpression(classState.classRef, _core.types.identifier("prototype"));
      const protoDeclaration = _core.types.variableDeclaration("var", [_core.types.variableDeclarator(classState.protoAlias, classProto)]);
      classState.body.push(protoDeclaration);
    }
  }
  function pushConstructor(superReturns, method, path) {
    setState({
      userConstructorPath: path,
      userConstructor: method,
      hasConstructor: true,
      superReturns
    });
    const {
      construct
    } = classState;
    _core.types.inheritsComments(construct, method);
    construct.params = method.params;
    _core.types.inherits(construct.body, method.body);
    construct.body.directives = method.body.directives;
    if (classState.hasInstanceDescriptors || classState.hasStaticDescriptors) {
      pushDescriptors();
    }
    pushInheritsToBody();
  }
  function pushInheritsToBody() {
    if (!classState.isDerived || classState.pushedInherits) return;
    classState.pushedInherits = true;
    classState.body.unshift(_core.types.expressionStatement(_core.types.callExpression(classState.file.addHelper(classState.isLoose ? "inheritsLoose" : "inherits"), [_core.types.cloneNode(classState.classRef), _core.types.cloneNode(classState.superName)])));
  }
  function extractDynamicKeys() {
    const {
      dynamicKeys,
      node,
      scope
    } = classState;
    for (const elem of node.body.body) {
      if (!_core.types.isClassMethod(elem) || !elem.computed) continue;
      if (scope.isPure(elem.key, true)) continue;
      const id = scope.generateUidIdentifierBasedOnNode(elem.key);
      dynamicKeys.set(id.name, elem.key);
      elem.key = id;
    }
  }
  function setupClosureParamsArgs() {
    const {
      superName,
      dynamicKeys
    } = classState;
    const closureParams = [];
    const closureArgs = [];
    if (classState.isDerived) {
      let arg = _core.types.cloneNode(superName);
      if (classState.extendsNative) {
        arg = _core.types.callExpression(classState.file.addHelper("wrapNativeSuper"), [arg]);
        (0, _helperAnnotateAsPure.default)(arg);
      }
      const param = classState.scope.generateUidIdentifierBasedOnNode(superName);
      closureParams.push(param);
      closureArgs.push(arg);
      setState({
        superName: _core.types.cloneNode(param)
      });
    }
    for (const [name, value] of dynamicKeys) {
      closureParams.push(_core.types.identifier(name));
      closureArgs.push(value);
    }
    return {
      closureParams,
      closureArgs
    };
  }
  function classTransformer(path, file, builtinClasses, isLoose) {
    setState({
      parent: path.parent,
      scope: path.scope,
      node: path.node,
      path,
      file,
      isLoose
    });
    setState({
      classId: classState.node.id,
      classRef: classState.node.id ? _core.types.identifier(classState.node.id.name) : classState.scope.generateUidIdentifier("class"),
      superName: classState.node.superClass,
      isDerived: !!classState.node.superClass,
      constructorBody: _core.types.blockStatement([])
    });
    setState({
      extendsNative: _core.types.isIdentifier(classState.superName) && builtinClasses.has(classState.superName.name) && !classState.scope.hasBinding(classState.superName.name, true)
    });
    const {
      classRef,
      node,
      constructorBody
    } = classState;
    setState({
      construct: buildConstructor(classRef, constructorBody, node)
    });
    extractDynamicKeys();
    const {
      body
    } = classState;
    const {
      closureParams,
      closureArgs
    } = setupClosureParamsArgs();
    buildBody();
    if (!assumptions.noClassCalls) {
      constructorBody.body.unshift(_core.types.expressionStatement(_core.types.callExpression(classState.file.addHelper("classCallCheck"), [_core.types.thisExpression(), _core.types.cloneNode(classState.classRef)])));
    }
    const isStrict = path.isInStrictMode();
    let constructorOnly = body.length === 0;
    if (constructorOnly && !isStrict) {
      for (const param of classState.construct.params) {
        if (!_core.types.isIdentifier(param)) {
          constructorOnly = false;
          break;
        }
      }
    }
    const directives = constructorOnly ? classState.construct.body.directives : [];
    if (!isStrict) {
      directives.push(_core.types.directive(_core.types.directiveLiteral("use strict")));
    }
    if (constructorOnly) {
      const expr = _core.types.toExpression(classState.construct);
      return classState.isLoose ? expr : createClassHelper([expr]);
    }
    if (!classState.pushedCreateClass) {
      body.push(_core.types.returnStatement(classState.isLoose ? _core.types.cloneNode(classState.classRef) : createClassHelper([_core.types.cloneNode(classState.classRef)])));
    }
    body.unshift(classState.construct);
    const container = _core.types.arrowFunctionExpression(closureParams, _core.types.blockStatement(body, directives));
    return _core.types.callExpression(container, closureArgs);
  }
  return classTransformer(path, file, builtinClasses, isLoose);
}

//# sourceMappingURL=transformClass.js.map
