"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const editorconfig = __importStar(require("./"));
const package_json_1 = __importDefault(require("../package.json"));
/**
 * Default output routine, goes to stdout.
 *
 * @param s String to output
 */
function writeStdOut(s) {
    process.stdout.write(s);
}
/**
 * Command line interface for editorconfig.  Pulled out into a separate module
 * to make it easier to test.
 *
 * @param args Usually process.argv.  Note that the first two parameters are
 * usually 'node' and 'editorconfig'
 * @param testing If testing, you may pass in a Commander OutputConfiguration
 * so that you can capture stdout and stderror.  If `testing` is provided,
 * this routine will throw an error instead of calling `process.exit`.
 * @returns An array of combined properties, one for each file argument.
 */
async function cli(args, testing) {
    const program = new commander_1.Command();
    let writeOut = writeStdOut;
    if (testing) {
        if (testing.writeOut) {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            writeOut = testing.writeOut;
        }
        program.configureOutput(testing);
        program.exitOverride();
    }
    program.version('EditorConfig Node.js Core Version ' + package_json_1.default.version, '-v, --version', 'Display version information')
        .showHelpAfterError()
        .argument('<FILEPATH...>', 'Files to find configuration for.  Can be a hyphen (-) if you want path(s) to be read from stdin.')
        .option('-f <path>', 'Specify conf filename other than \'.editorconfig\'')
        .option('-b <version>', 'Specify version (used by devs to test compatibility)')
        .option('--files', 'Output file names that contributed to the configuration, rather than the configuation itself')
        .parse(args);
    const files = program.args;
    const opts = program.opts();
    const cache = new Map();
    const visited = opts.files ?
        files.map(() => []) :
        undefined;
    // Process sequentially so caching works
    async function processAll() {
        const p = [];
        let i = 0;
        for (const filePath of files) {
            p.push(await editorconfig.parse(filePath, {
                config: opts.f,
                version: opts.b,
                files: visited ? visited[i++] : undefined,
                cache,
            }));
        }
        return p;
    }
    return await processAll().then((parsed) => {
        const header = parsed.length > 1;
        parsed.forEach((props, i) => {
            if (header) {
                writeOut(`[${files[i]}]\n`);
            }
            if (visited) {
                for (const v of visited[i]) {
                    writeOut(`${v.fileName} [${v.glob}]\n`);
                }
            }
            else {
                for (const [key, value] of Object.entries(props)) {
                    writeOut(`${key}=${String(value)}\n`);
                }
            }
        });
        return parsed;
    });
}
exports.default = cli;
