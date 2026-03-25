"use strict";
// When writing files on Windows, translate the characters to their
// 0xf000 higher-encoded versions.
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = void 0;
const raw = ['|', '<', '>', '?', ':'];
const win = raw.map(char => String.fromCharCode(0xf000 + char.charCodeAt(0)));
const toWin = new Map(raw.map((char, i) => [char, win[i]]));
const toRaw = new Map(win.map((char, i) => [char, raw[i]]));
const encode = (s) => raw.reduce((s, c) => s.split(c).join(toWin.get(c)), s);
exports.encode = encode;
const decode = (s) => win.reduce((s, c) => s.split(c).join(toRaw.get(c)), s);
exports.decode = decode;
//# sourceMappingURL=winchars.js.map