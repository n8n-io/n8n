Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const node = require('./node.js');
const worldwide = require('./worldwide.js');

/**
 * Returns true if we are in the browser.
 */
function isBrowser() {
  // eslint-disable-next-line no-restricted-globals
  return typeof window !== 'undefined' && (!node.isNodeEnv() || isElectronNodeRenderer());
}

// Electron renderers with nodeIntegration enabled are detected as Node.js so we specifically test for them
function isElectronNodeRenderer() {
  const process = (worldwide.GLOBAL_OBJ ).process;
  return process?.type === 'renderer';
}

exports.isBrowser = isBrowser;
//# sourceMappingURL=isBrowser.js.map
