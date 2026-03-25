'use strict';

const kolorist = require('kolorist');

const warned = /* @__PURE__ */ new Set();
function warnOnce(msg) {
  if (!warned.has(msg)) {
    warned.add(msg);
    console.warn(kolorist.yellow(`[@iconify-loader] ${msg}`));
  }
}

exports.warnOnce = warnOnce;
