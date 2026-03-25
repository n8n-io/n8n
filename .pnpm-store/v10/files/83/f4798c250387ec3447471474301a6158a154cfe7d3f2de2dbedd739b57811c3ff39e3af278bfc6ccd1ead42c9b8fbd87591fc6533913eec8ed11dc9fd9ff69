import * as assert from 'assert';
import v1 from './v1.js';
import v3 from './v3.js';
import v4 from './v4.js';
import v5 from './v5.js';
import v6 from './v6.js';
import v7 from './v7.js';
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
        console.log(v1());
        break;
    case 'v3': {
        const name = args.shift();
        let namespace = args.shift();
        assert.ok(name != null, 'v3 name not specified');
        assert.ok(namespace != null, 'v3 namespace not specified');
        if (namespace === 'URL') {
            namespace = v3.URL;
        }
        if (namespace === 'DNS') {
            namespace = v3.DNS;
        }
        console.log(v3(name, namespace));
        break;
    }
    case 'v4':
        console.log(v4());
        break;
    case 'v5': {
        const name = args.shift();
        let namespace = args.shift();
        assert.ok(name != null, 'v5 name not specified');
        assert.ok(namespace != null, 'v5 namespace not specified');
        if (namespace === 'URL') {
            namespace = v5.URL;
        }
        if (namespace === 'DNS') {
            namespace = v5.DNS;
        }
        console.log(v5(name, namespace));
        break;
    }
    case 'v6':
        console.log(v6());
        break;
    case 'v7':
        console.log(v7());
        break;
    default:
        usage();
        process.exit(1);
}
