import { yellow } from 'kolorist';

const warned = /* @__PURE__ */ new Set();
function warnOnce(msg) {
  if (!warned.has(msg)) {
    warned.add(msg);
    console.warn(yellow(`[@iconify-loader] ${msg}`));
  }
}

export { warnOnce };
