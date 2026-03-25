"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const v1_js_1 = require("./v1.js");
const v3_js_1 = require("./v3.js");
const v4_js_1 = require("./v4.js");
const v5_js_1 = require("./v5.js");
const v6_js_1 = require("./v6.js");
const v7_js_1 = require("./v7.js");
function usage() {
    console.log('Usage:');
    console.log('  uuid');
    console.log('  uuid v1');
    console.log('  uuid v3 <name> <namespace uuid>');
    console.log('  uuid v4');
    console.log('  uuid v5 <name> <namespace uuid>');
    console.log('  uuid v6');
    console.log('  uuid v7');
    console.log('  uuid --help');
    console.log('\nNote: <namespace uuid> may be "URL" or "DNS" to use the corresponding UUIDs defined by RFC9562');
}
const args = process.argv.slice(2);
if (args.indexOf('--help') >= 0) {
    usage();
    process.exit(0);
}
const version = args.shift() || 'v4';
switch (version) {
    case 'v1':
        console.log((0, v1_js_1.default)());
        break;
    case 'v3': {
        const name = args.shift();
        let namespace = args.shift();
        assert.ok(name != null, 'v3 name not specified');
        assert.ok(namespace != null, 'v3 namespace not specified');
        if (namespace === 'URL') {
            namespace = v3_js_1.default.URL;
        }
        if (namespace === 'DNS') {
            namespace = v3_js_1.default.DNS;
        }
        console.log((0, v3_js_1.default)(name, namespace));
        break;
    }
    case 'v4':
        console.log((0, v4_js_1.default)());
        break;
    case 'v5': {
        const name = args.shift();
        let namespace = args.shift();
        assert.ok(name != null, 'v5 name not specified');
        assert.ok(namespace != null, 'v5 namespace not specified');
        if (namespace === 'URL') {
            namespace = v5_js_1.default.URL;
        }
        if (namespace === 'DNS') {
            namespace = v5_js_1.default.DNS;
        }
        console.log((0, v5_js_1.default)(name, namespace));
        break;
    }
    case 'v6':
        console.log((0, v6_js_1.default)());
        break;
    case 'v7':
        console.log((0, v7_js_1.default)());
        break;
    default:
        usage();
        process.exit(1);
}
