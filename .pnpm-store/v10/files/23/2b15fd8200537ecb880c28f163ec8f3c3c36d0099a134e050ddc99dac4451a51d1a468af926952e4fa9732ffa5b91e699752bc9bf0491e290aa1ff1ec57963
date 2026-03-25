"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _getIdentifierNames = require('./util/getIdentifierNames'); var _getIdentifierNames2 = _interopRequireDefault(_getIdentifierNames);

 class NameManager {
    __init() {this.usedNames = new Set()}

  constructor(code, tokens) {;NameManager.prototype.__init.call(this);
    this.usedNames = new Set(_getIdentifierNames2.default.call(void 0, code, tokens));
  }

  claimFreeName(name) {
    const newName = this.findFreeName(name);
    this.usedNames.add(newName);
    return newName;
  }

  findFreeName(name) {
    if (!this.usedNames.has(name)) {
      return name;
    }
    let suffixNum = 2;
    while (this.usedNames.has(name + String(suffixNum))) {
      suffixNum++;
    }
    return name + String(suffixNum);
  }
} exports.default = NameManager;
