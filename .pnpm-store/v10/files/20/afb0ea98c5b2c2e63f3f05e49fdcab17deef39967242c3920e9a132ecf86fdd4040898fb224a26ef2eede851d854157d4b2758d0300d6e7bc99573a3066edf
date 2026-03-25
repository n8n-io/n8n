#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const commist_1 = __importDefault(require("commist"));
const help_me_1 = __importDefault(require("help-me"));
const pub_1 = __importDefault(require("./pub"));
const sub_1 = __importDefault(require("./sub"));
const version = require('../../package.json').version;
const helpMe = (0, help_me_1.default)({
    dir: path_1.default.join(__dirname, '../../', 'help'),
    ext: '.txt',
});
const commist = (0, commist_1.default)();
commist.register('publish', pub_1.default);
commist.register('pub', pub_1.default);
commist.register('subscribe', sub_1.default);
commist.register('sub', sub_1.default);
commist.register('version', () => {
    console.log('MQTT.js version:', version);
});
commist.register('help', helpMe.toStdout);
if (commist.parse(process.argv.slice(2)) !== null) {
    console.log('No such command:', process.argv[2], '\n');
    helpMe.toStdout();
}
//# sourceMappingURL=mqtt.js.map