"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupRestorer = exports.BackupRestoreStatusGetter = exports.BackupCreator = exports.BackupCreateStatusGetter = void 0;
const backupCreateStatusGetter_js_1 = __importDefault(require("./backupCreateStatusGetter.js"));
const backupCreator_js_1 = __importDefault(require("./backupCreator.js"));
const backupRestoreStatusGetter_js_1 = __importDefault(require("./backupRestoreStatusGetter.js"));
const backupRestorer_js_1 = __importDefault(require("./backupRestorer.js"));
const backup = (client) => {
    return {
        creator: () => new backupCreator_js_1.default(client, new backupCreateStatusGetter_js_1.default(client)),
        createStatusGetter: () => new backupCreateStatusGetter_js_1.default(client),
        restorer: () => new backupRestorer_js_1.default(client, new backupRestoreStatusGetter_js_1.default(client)),
        restoreStatusGetter: () => new backupRestoreStatusGetter_js_1.default(client),
    };
};
exports.default = backup;
var backupCreateStatusGetter_js_2 = require("./backupCreateStatusGetter.js");
Object.defineProperty(exports, "BackupCreateStatusGetter", { enumerable: true, get: function () { return __importDefault(backupCreateStatusGetter_js_2).default; } });
var backupCreator_js_2 = require("./backupCreator.js");
Object.defineProperty(exports, "BackupCreator", { enumerable: true, get: function () { return __importDefault(backupCreator_js_2).default; } });
var backupRestoreStatusGetter_js_2 = require("./backupRestoreStatusGetter.js");
Object.defineProperty(exports, "BackupRestoreStatusGetter", { enumerable: true, get: function () { return __importDefault(backupRestoreStatusGetter_js_2).default; } });
var backupRestorer_js_2 = require("./backupRestorer.js");
Object.defineProperty(exports, "BackupRestorer", { enumerable: true, get: function () { return __importDefault(backupRestorer_js_2).default; } });
