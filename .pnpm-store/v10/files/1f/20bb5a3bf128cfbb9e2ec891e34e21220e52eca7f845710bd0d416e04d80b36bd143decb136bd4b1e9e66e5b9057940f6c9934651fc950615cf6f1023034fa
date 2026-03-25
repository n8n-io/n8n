"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.string = exports.object = exports.number = exports.mixed = exports.default = exports.date = exports.boolean = exports.array = void 0;

var _printValue = _interopRequireDefault(require("./util/printValue"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let mixed = {
  default: '${path} is invalid',
  required: '${path} is a required field',
  oneOf: '${path} must be one of the following values: ${values}',
  notOneOf: '${path} must not be one of the following values: ${values}',
  notType: ({
    path,
    type,
    value,
    originalValue
  }) => {
    let isCast = originalValue != null && originalValue !== value;
    let msg = `${path} must be a \`${type}\` type, ` + `but the final value was: \`${(0, _printValue.default)(value, true)}\`` + (isCast ? ` (cast from the value \`${(0, _printValue.default)(originalValue, true)}\`).` : '.');

    if (value === null) {
      msg += `\n If "null" is intended as an empty value be sure to mark the schema as \`.nullable()\``;
    }

    return msg;
  },
  defined: '${path} must be defined'
};
exports.mixed = mixed;
let string = {
  length: '${path} must be exactly ${length} characters',
  min: '${path} must be at least ${min} characters',
  max: '${path} must be at most ${max} characters',
  matches: '${path} must match the following: "${regex}"',
  email: '${path} must be a valid email',
  url: '${path} must be a valid URL',
  uuid: '${path} must be a valid UUID',
  trim: '${path} must be a trimmed string',
  lowercase: '${path} must be a lowercase string',
  uppercase: '${path} must be a upper case string'
};
exports.string = string;
let number = {
  min: '${path} must be greater than or equal to ${min}',
  max: '${path} must be less than or equal to ${max}',
  lessThan: '${path} must be less than ${less}',
  moreThan: '${path} must be greater than ${more}',
  positive: '${path} must be a positive number',
  negative: '${path} must be a negative number',
  integer: '${path} must be an integer'
};
exports.number = number;
let date = {
  min: '${path} field must be later than ${min}',
  max: '${path} field must be at earlier than ${max}'
};
exports.date = date;
let boolean = {
  isValue: '${path} field must be ${value}'
};
exports.boolean = boolean;
let object = {
  noUnknown: '${path} field has unspecified keys: ${unknown}'
};
exports.object = object;
let array = {
  min: '${path} field must have at least ${min} items',
  max: '${path} field must have less than or equal to ${max} items',
  length: '${path} must have ${length} items'
};
exports.array = array;

var _default = Object.assign(Object.create(null), {
  mixed,
  string,
  number,
  date,
  object,
  array,
  boolean
});

exports.default = _default;