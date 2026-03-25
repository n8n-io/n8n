"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwkImport = exports.jwkExport = exports.rsaPssParams = exports.oneShotCallback = void 0;
const [major, minor] = process.versions.node.split('.').map((str) => parseInt(str, 10));
exports.oneShotCallback = major >= 16 || (major === 15 && minor >= 13);
exports.rsaPssParams = !('electron' in process.versions) && (major >= 17 || (major === 16 && minor >= 9));
exports.jwkExport = major >= 16 || (major === 15 && minor >= 9);
exports.jwkImport = major >= 16 || (major === 15 && minor >= 12);
