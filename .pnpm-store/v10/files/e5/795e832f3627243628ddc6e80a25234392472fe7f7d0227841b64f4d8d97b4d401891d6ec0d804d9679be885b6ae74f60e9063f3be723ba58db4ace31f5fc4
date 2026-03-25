#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readable_stream_1 = require("readable-stream");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const concat_stream_1 = __importDefault(require("concat-stream"));
const help_me_1 = __importDefault(require("help-me"));
const minimist_1 = __importDefault(require("minimist"));
const split2_1 = __importDefault(require("split2"));
const mqtt_1 = require("../mqtt");
const stream_1 = require("stream");
const helpMe = (0, help_me_1.default)({
    dir: path_1.default.join(__dirname, '../../', 'help'),
});
function send(args) {
    const client = (0, mqtt_1.connect)(args);
    client.on('connect', () => {
        client.publish(args.topic, args.message, args, (err) => {
            if (err) {
                console.warn(err);
            }
            client.end();
        });
    });
    client.on('error', (err) => {
        console.warn(err);
        client.end();
    });
}
function multisend(args) {
    const client = (0, mqtt_1.connect)(args);
    const sender = new readable_stream_1.Writable({
        objectMode: true,
    });
    sender._write = (line, enc, cb) => {
        client.publish(args.topic, line.trim(), args, cb);
    };
    client.on('connect', () => {
        (0, stream_1.pipeline)(process.stdin, (0, split2_1.default)(), sender, (err) => {
            client.end();
            if (err) {
                throw err;
            }
        });
    });
}
function start(args) {
    var _a, _b;
    const parsedArgs = (0, minimist_1.default)(args, {
        string: [
            'hostname',
            'username',
            'password',
            'key',
            'cert',
            'ca',
            'message',
            'clientId',
            'i',
            'id',
        ],
        boolean: ['stdin', 'retain', 'help', 'insecure', 'multiline'],
        alias: {
            port: 'p',
            hostname: ['h', 'host'],
            topic: 't',
            message: 'm',
            qos: 'q',
            clientId: ['i', 'id'],
            retain: 'r',
            username: 'u',
            password: 'P',
            stdin: 's',
            multiline: 'M',
            protocol: ['C', 'l'],
            help: 'H',
            ca: 'cafile',
        },
        default: {
            host: 'localhost',
            qos: 0,
            retain: false,
            topic: '',
            message: '',
        },
    });
    if (parsedArgs.help) {
        return helpMe.toStdout('publish');
    }
    if (parsedArgs.key) {
        parsedArgs.key = fs_1.default.readFileSync(parsedArgs.key);
    }
    if (parsedArgs.cert) {
        parsedArgs.cert = fs_1.default.readFileSync(parsedArgs.cert);
    }
    if (parsedArgs.ca) {
        parsedArgs.ca = fs_1.default.readFileSync(parsedArgs.ca);
    }
    if (parsedArgs.key && parsedArgs.cert && !parsedArgs.protocol) {
        parsedArgs.protocol = 'mqtts';
    }
    if (parsedArgs.port) {
        if (typeof parsedArgs.port !== 'number') {
            console.warn("# Port: number expected, '%s' was given.", typeof parsedArgs.port);
            return;
        }
    }
    if (parsedArgs['will-topic']) {
        parsedArgs.will = {};
        parsedArgs.will.topic = parsedArgs['will-topic'];
        parsedArgs.will.payload = parsedArgs['will-message'];
        parsedArgs.will.qos = parsedArgs['will-qos'];
        parsedArgs.will.retain = parsedArgs['will-retain'];
    }
    if (parsedArgs.insecure) {
        parsedArgs.rejectUnauthorized = false;
    }
    parsedArgs.topic = (_a = (parsedArgs.topic || parsedArgs._.shift())) === null || _a === void 0 ? void 0 : _a.toString();
    parsedArgs.message = (_b = (parsedArgs.message || parsedArgs._.shift())) === null || _b === void 0 ? void 0 : _b.toString();
    if (!parsedArgs.topic) {
        console.error('missing topic\n');
        return helpMe.toStdout('publish');
    }
    if (parsedArgs.stdin) {
        if (parsedArgs.multiline) {
            multisend(parsedArgs);
        }
        else {
            process.stdin.pipe((0, concat_stream_1.default)((data) => {
                parsedArgs.message = data;
                send(parsedArgs);
            }));
        }
    }
    else {
        send(parsedArgs);
    }
}
exports.default = start;
if (require.main === module) {
    start(process.argv.slice(2));
}
//# sourceMappingURL=pub.js.map