#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const minimist_1 = __importDefault(require("minimist"));
const help_me_1 = __importDefault(require("help-me"));
const mqtt_1 = require("../mqtt");
const helpMe = (0, help_me_1.default)({
    dir: path_1.default.join(__dirname, '../../', 'help'),
});
function start(args) {
    const parsedArgs = (0, minimist_1.default)(args, {
        string: [
            'hostname',
            'username',
            'password',
            'key',
            'cert',
            'ca',
            'clientId',
            'i',
            'id',
        ],
        boolean: ['stdin', 'help', 'clean', 'insecure'],
        alias: {
            port: 'p',
            hostname: ['h', 'host'],
            topic: 't',
            qos: 'q',
            clean: 'c',
            keepalive: 'k',
            clientId: ['i', 'id'],
            username: 'u',
            password: 'P',
            protocol: ['C', 'l'],
            verbose: 'v',
            help: '-H',
            ca: 'cafile',
        },
        default: {
            host: 'localhost',
            qos: 0,
            retain: false,
            clean: true,
            keepAlive: 30,
        },
    });
    if (parsedArgs.help) {
        return helpMe.toStdout('subscribe');
    }
    parsedArgs.topic = parsedArgs.topic || parsedArgs._.shift();
    if (!parsedArgs.topic) {
        console.error('missing topic\n');
        return helpMe.toStdout('subscribe');
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
    if (parsedArgs.insecure) {
        parsedArgs.rejectUnauthorized = false;
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
    parsedArgs.keepAlive = parsedArgs['keep-alive'];
    const client = (0, mqtt_1.connect)(parsedArgs);
    client.on('connect', () => {
        client.subscribe(parsedArgs.topic, { qos: parsedArgs.qos }, (err, result) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            result.forEach((sub) => {
                if (sub.qos > 2) {
                    console.error('subscription negated to', sub.topic, 'with code', sub.qos);
                    process.exit(1);
                }
            });
        });
    });
    client.on('message', (topic, payload) => {
        if (parsedArgs.verbose) {
            console.log(topic, payload.toString());
        }
        else {
            console.log(payload.toString());
        }
    });
    client.on('error', (err) => {
        console.warn(err);
        client.end();
    });
}
exports.default = start;
if (require.main === module) {
    start(process.argv.slice(2));
}
//# sourceMappingURL=sub.js.map