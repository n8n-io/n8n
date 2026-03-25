'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../utils/index.js');
var container = require('./src/container.js');
var aside = require('./src/aside.js');
var footer = require('./src/footer.js');
var header = require('./src/header.js');
var main = require('./src/main.js');
var install = require('../../utils/vue/install.js');

const ElContainer = install.withInstall(container["default"], {
  Aside: aside["default"],
  Footer: footer["default"],
  Header: header["default"],
  Main: main["default"]
});
const ElAside = install.withNoopInstall(aside["default"]);
const ElFooter = install.withNoopInstall(footer["default"]);
const ElHeader = install.withNoopInstall(header["default"]);
const ElMain = install.withNoopInstall(main["default"]);

exports.ElAside = ElAside;
exports.ElContainer = ElContainer;
exports.ElFooter = ElFooter;
exports.ElHeader = ElHeader;
exports.ElMain = ElMain;
exports["default"] = ElContainer;
//# sourceMappingURL=index.js.map
