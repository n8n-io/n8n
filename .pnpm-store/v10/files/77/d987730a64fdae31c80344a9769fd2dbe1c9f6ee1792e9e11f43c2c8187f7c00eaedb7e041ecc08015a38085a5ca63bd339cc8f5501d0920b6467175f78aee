"use strict";
// Get the appropriate flag to use for creating files
// We use fmap on Windows platforms for files less than
// 512kb.  This is a fairly low limit, but avoids making
// things slower in some cases.  Since most of what this
// library is used for is extracting tarballs of many
// relatively small files in npm packages and the like,
// it can be a big boost on Windows platforms.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWriteFlag = void 0;
const fs_1 = __importDefault(require("fs"));
const platform = process.env.__FAKE_PLATFORM__ || process.platform;
const isWindows = platform === 'win32';
/* c8 ignore start */
const { O_CREAT, O_TRUNC, O_WRONLY } = fs_1.default.constants;
const UV_FS_O_FILEMAP = Number(process.env.__FAKE_FS_O_FILENAME__) ||
    fs_1.default.constants.UV_FS_O_FILEMAP ||
    0;
/* c8 ignore stop */
const fMapEnabled = isWindows && !!UV_FS_O_FILEMAP;
const fMapLimit = 512 * 1024;
const fMapFlag = UV_FS_O_FILEMAP | O_TRUNC | O_CREAT | O_WRONLY;
exports.getWriteFlag = !fMapEnabled ?
    () => 'w'
    : (size) => (size < fMapLimit ? fMapFlag : 'w');
//# sourceMappingURL=get-write-flag.js.map