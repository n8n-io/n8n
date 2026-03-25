"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.default = void 0;

var _schema = _interopRequireDefault(require("./schema"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const Mixed = _schema.default;
var _default = Mixed;
exports.default = _default;

function create() {
  return new Mixed();
} // XXX: this is using the Base schema so that `addMethod(mixed)` works as a base class


create.prototype = Mixed.prototype;