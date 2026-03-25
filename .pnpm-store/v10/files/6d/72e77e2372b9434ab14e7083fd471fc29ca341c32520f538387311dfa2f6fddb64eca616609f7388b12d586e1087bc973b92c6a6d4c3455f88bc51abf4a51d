import { isNodeEnv } from './node.js';
import { GLOBAL_OBJ } from './worldwide.js';

/**
 * Returns true if we are in the browser.
 */
function isBrowser() {
  // eslint-disable-next-line no-restricted-globals
  return typeof window !== 'undefined' && (!isNodeEnv() || isElectronNodeRenderer());
}

// Electron renderers with nodeIntegration enabled are detected as Node.js so we specifically test for them
function isElectronNodeRenderer() {
  const process = (GLOBAL_OBJ ).process;
  return process?.type === 'renderer';
}

export { isBrowser };
//# sourceMappingURL=isBrowser.js.map
