define(['exports', 'module', './handlebars.runtime', './handlebars/compiler/ast', './handlebars/compiler/base', './handlebars/compiler/compiler', './handlebars/compiler/javascript-compiler', './handlebars/compiler/visitor', './handlebars/no-conflict'], function (exports, module, _handlebarsRuntime, _handlebarsCompilerAst, _handlebarsCompilerBase, _handlebarsCompilerCompiler, _handlebarsCompilerJavascriptCompiler, _handlebarsCompilerVisitor, _handlebarsNoConflict) {
  'use strict';

  // istanbul ignore next

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  var _runtime = _interopRequireDefault(_handlebarsRuntime);

  // Compiler imports

  var _AST = _interopRequireDefault(_handlebarsCompilerAst);

  var _JavaScriptCompiler = _interopRequireDefault(_handlebarsCompilerJavascriptCompiler);

  var _Visitor = _interopRequireDefault(_handlebarsCompilerVisitor);

  var _noConflict = _interopRequireDefault(_handlebarsNoConflict);

  var _create = _runtime['default'].create;
  function create() {
    var hb = _create();

    hb.compile = function (input, options) {
      return _handlebarsCompilerCompiler.compile(input, options, hb);
    };
    hb.precompile = function (input, options) {
      return _handlebarsCompilerCompiler.precompile(input, options, hb);
    };

    hb.AST = _AST['default'];
    hb.Compiler = _handlebarsCompilerCompiler.Compiler;
    hb.JavaScriptCompiler = _JavaScriptCompiler['default'];
    hb.Parser = _handlebarsCompilerBase.parser;
    hb.parse = _handlebarsCompilerBase.parse;
    hb.parseWithoutProcessing = _handlebarsCompilerBase.parseWithoutProcessing;

    return hb;
  }

  var inst = create();
  inst.create = create;

  _noConflict['default'](inst);

  inst.Visitor = _Visitor['default'];

  inst['default'] = inst;

  module.exports = inst;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL2xpYi9oYW5kbGViYXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFlQSxNQUFJLE9BQU8sR0FBRyxvQkFBUSxNQUFNLENBQUM7QUFDN0IsV0FBUyxNQUFNLEdBQUc7QUFDaEIsUUFBSSxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUM7O0FBRW5CLE1BQUUsQ0FBQyxPQUFPLEdBQUcsVUFBUyxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQ3BDLGFBQU8sNEJBWFEsT0FBTyxDQVdQLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDcEMsQ0FBQztBQUNGLE1BQUUsQ0FBQyxVQUFVLEdBQUcsVUFBUyxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQ3ZDLGFBQU8sNEJBZGlCLFVBQVUsQ0FjaEIsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztLQUN2QyxDQUFDOztBQUVGLE1BQUUsQ0FBQyxHQUFHLGtCQUFNLENBQUM7QUFDYixNQUFFLENBQUMsUUFBUSwrQkFsQkosUUFBUSxBQWtCTyxDQUFDO0FBQ3ZCLE1BQUUsQ0FBQyxrQkFBa0IsaUNBQXFCLENBQUM7QUFDM0MsTUFBRSxDQUFDLE1BQU0sMkJBeEJULE1BQU0sQUF3QlksQ0FBQztBQUNuQixNQUFFLENBQUMsS0FBSywyQkF4QlIsS0FBSyxBQXdCVyxDQUFDO0FBQ2pCLE1BQUUsQ0FBQyxzQkFBc0IsMkJBeEJ6QixzQkFBc0IsQUF3QjRCLENBQUM7O0FBRW5ELFdBQU8sRUFBRSxDQUFDO0dBQ1g7O0FBRUQsTUFBSSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUM7QUFDcEIsTUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7O0FBRXJCLHlCQUFXLElBQUksQ0FBQyxDQUFDOztBQUVqQixNQUFJLENBQUMsT0FBTyxzQkFBVSxDQUFDOztBQUV2QixNQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDOzttQkFFUixJQUFJIiwiZmlsZSI6ImhhbmRsZWJhcnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcnVudGltZSBmcm9tICcuL2hhbmRsZWJhcnMucnVudGltZSc7XG5cbi8vIENvbXBpbGVyIGltcG9ydHNcbmltcG9ydCBBU1QgZnJvbSAnLi9oYW5kbGViYXJzL2NvbXBpbGVyL2FzdCc7XG5pbXBvcnQge1xuICBwYXJzZXIgYXMgUGFyc2VyLFxuICBwYXJzZSxcbiAgcGFyc2VXaXRob3V0UHJvY2Vzc2luZ1xufSBmcm9tICcuL2hhbmRsZWJhcnMvY29tcGlsZXIvYmFzZSc7XG5pbXBvcnQgeyBDb21waWxlciwgY29tcGlsZSwgcHJlY29tcGlsZSB9IGZyb20gJy4vaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlcic7XG5pbXBvcnQgSmF2YVNjcmlwdENvbXBpbGVyIGZyb20gJy4vaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyJztcbmltcG9ydCBWaXNpdG9yIGZyb20gJy4vaGFuZGxlYmFycy9jb21waWxlci92aXNpdG9yJztcblxuaW1wb3J0IG5vQ29uZmxpY3QgZnJvbSAnLi9oYW5kbGViYXJzL25vLWNvbmZsaWN0JztcblxubGV0IF9jcmVhdGUgPSBydW50aW1lLmNyZWF0ZTtcbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgbGV0IGhiID0gX2NyZWF0ZSgpO1xuXG4gIGhiLmNvbXBpbGUgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBjb21waWxlKGlucHV0LCBvcHRpb25zLCBoYik7XG4gIH07XG4gIGhiLnByZWNvbXBpbGUgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBwcmVjb21waWxlKGlucHV0LCBvcHRpb25zLCBoYik7XG4gIH07XG5cbiAgaGIuQVNUID0gQVNUO1xuICBoYi5Db21waWxlciA9IENvbXBpbGVyO1xuICBoYi5KYXZhU2NyaXB0Q29tcGlsZXIgPSBKYXZhU2NyaXB0Q29tcGlsZXI7XG4gIGhiLlBhcnNlciA9IFBhcnNlcjtcbiAgaGIucGFyc2UgPSBwYXJzZTtcbiAgaGIucGFyc2VXaXRob3V0UHJvY2Vzc2luZyA9IHBhcnNlV2l0aG91dFByb2Nlc3Npbmc7XG5cbiAgcmV0dXJuIGhiO1xufVxuXG5sZXQgaW5zdCA9IGNyZWF0ZSgpO1xuaW5zdC5jcmVhdGUgPSBjcmVhdGU7XG5cbm5vQ29uZmxpY3QoaW5zdCk7XG5cbmluc3QuVmlzaXRvciA9IFZpc2l0b3I7XG5cbmluc3RbJ2RlZmF1bHQnXSA9IGluc3Q7XG5cbmV4cG9ydCBkZWZhdWx0IGluc3Q7XG4iXX0=
