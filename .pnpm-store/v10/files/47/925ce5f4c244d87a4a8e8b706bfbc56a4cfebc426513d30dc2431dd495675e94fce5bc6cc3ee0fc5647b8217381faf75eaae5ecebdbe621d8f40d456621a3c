import './browser.mjs';
import { isClient } from '@vueuse/core';

const rAF = (fn) => isClient ? window.requestAnimationFrame(fn) : setTimeout(fn, 16);
const cAF = (handle) => isClient ? window.cancelAnimationFrame(handle) : clearTimeout(handle);

export { cAF, rAF };
//# sourceMappingURL=raf.mjs.map
