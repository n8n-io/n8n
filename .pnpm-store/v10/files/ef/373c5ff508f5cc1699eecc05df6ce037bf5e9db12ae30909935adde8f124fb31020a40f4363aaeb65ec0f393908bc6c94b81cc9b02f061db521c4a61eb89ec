"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = void 0;
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        timer && clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
exports.debounce = debounce;
