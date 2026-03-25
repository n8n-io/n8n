#!/usr/bin/env node
import { rimraf } from './index.js';
import { loadPackageJson } from 'package-json-from-dist';
const { version } = loadPackageJson(import.meta.url, '../package.json');
const runHelpForUsage = () => console.error('run `rimraf --help` for usage information');
export const help = `rimraf version ${version}

Usage: rimraf <path> [<path> ...]
Deletes all files and folders at "path", recursively.

Options:
  --                   Treat all subsequent arguments as paths
  -h --help            Display this usage info
  --version            Display version
  --preserve-root      Do not remove '/' recursively (default)
  --no-preserve-root   Do not treat '/' specially
  -G --no-glob         Treat arguments as literal paths, not globs (default)
  -g --glob            Treat arguments as glob patterns
  -v --verbose         Be verbose when deleting files, showing them as
                       they are removed. Not compatible with --impl=native
  -V --no-verbose      Be silent when deleting files, showing nothing as
                       they are removed (default)
  -i --interactive     Ask for confirmation before deleting anything
                       Not compatible with --impl=native
  -I --no-interactive  Do not ask for confirmation before deleting

  --impl=<type>        Specify the implementation to use:
                       rimraf: choose the best option (default)
                       native: the built-in implementation in Node.js
                       manual: the platform-specific JS implementation
                       posix: the Posix JS implementation
                       windows: the Windows JS implementation (falls back to
                                move-remove on ENOTEMPTY)
                       move-remove: a slow reliable Windows fallback

Implementation-specific options:
  --tmp=<path>        Temp file folder for 'move-remove' implementation
  --max-retries=<n>   maxRetries for 'native' and 'windows' implementations
  --retry-delay=<n>   retryDelay for 'native' implementation, default 100
  --backoff=<n>       Exponential backoff factor for retries (default: 1.2)
`;
import { parse, relative, resolve } from 'path';
const cwd = process.cwd();
import { createInterface } from 'readline';
const prompt = async (rl, q) => new Promise(res => rl.question(q, res));
const interactiveRimraf = async (impl, paths, opt) => {
    const existingFilter = opt.filter || (() => true);
    let allRemaining = false;
    let noneRemaining = false;
    const queue = [];
    let processing = false;
    const processQueue = async () => {
        if (processing)
            return;
        processing = true;
        let next;
        while ((next = queue.shift())) {
            await next();
        }
        processing = false;
    };
    const oneAtATime = (fn) => async (s, e) => {
        const p = new Promise(res => {
            queue.push(async () => {
                const result = await fn(s, e);
                res(result);
                return result;
            });
        });
        processQueue();
        return p;
    };
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    opt.filter = oneAtATime(async (path, ent) => {
        if (noneRemaining) {
            return false;
        }
        while (!allRemaining) {
            const a = (await prompt(rl, `rm? ${relative(cwd, path)}\n[(Yes)/No/All/Quit] > `)).trim();
            if (/^n/i.test(a)) {
                return false;
            }
            else if (/^a/i.test(a)) {
                allRemaining = true;
                break;
            }
            else if (/^q/i.test(a)) {
                noneRemaining = true;
                return false;
            }
            else if (a === '' || /^y/i.test(a)) {
                break;
            }
            else {
                continue;
            }
        }
        return existingFilter(path, ent);
    });
    await impl(paths, opt);
    rl.close();
};
const main = async (...args) => {
    const verboseFilter = (s) => {
        console.log(relative(cwd, s));
        return true;
    };
    if (process.env.__RIMRAF_TESTING_BIN_FAIL__ === '1') {
        throw new Error('simulated rimraf failure');
    }
    const opt = {};
    const paths = [];
    let dashdash = false;
    let impl = rimraf;
    let interactive = false;
    for (const arg of args) {
        if (dashdash) {
            paths.push(arg);
            continue;
        }
        if (arg === '--') {
            dashdash = true;
            continue;
        }
        else if (arg === '-rf' || arg === '-fr') {
            // this never did anything, but people put it there I guess
            continue;
        }
        else if (arg === '-h' || arg === '--help') {
            console.log(help);
            return 0;
        }
        else if (arg === '--version') {
            console.log(version);
            return 0;
        }
        else if (arg === '--interactive' || arg === '-i') {
            interactive = true;
            continue;
        }
        else if (arg === '--no-interactive' || arg === '-I') {
            interactive = false;
            continue;
        }
        else if (arg === '--verbose' || arg === '-v') {
            opt.filter = verboseFilter;
            continue;
        }
        else if (arg === '--no-verbose' || arg === '-V') {
            opt.filter = undefined;
            continue;
        }
        else if (arg === '-g' || arg === '--glob') {
            opt.glob = true;
            continue;
        }
        else if (arg === '-G' || arg === '--no-glob') {
            opt.glob = false;
            continue;
        }
        else if (arg === '--preserve-root') {
            opt.preserveRoot = true;
            continue;
        }
        else if (arg === '--no-preserve-root') {
            opt.preserveRoot = false;
            continue;
        }
        else if (/^--tmp=/.test(arg)) {
            const val = arg.substring('--tmp='.length);
            opt.tmp = val;
            continue;
        }
        else if (/^--max-retries=/.test(arg)) {
            const val = +arg.substring('--max-retries='.length);
            opt.maxRetries = val;
            continue;
        }
        else if (/^--retry-delay=/.test(arg)) {
            const val = +arg.substring('--retry-delay='.length);
            opt.retryDelay = val;
            continue;
        }
        else if (/^--backoff=/.test(arg)) {
            const val = +arg.substring('--backoff='.length);
            opt.backoff = val;
            continue;
        }
        else if (/^--impl=/.test(arg)) {
            const val = arg.substring('--impl='.length);
            switch (val) {
                case 'rimraf':
                    impl = rimraf;
                    continue;
                case 'native':
                case 'manual':
                case 'posix':
                case 'windows':
                    impl = rimraf[val];
                    continue;
                case 'move-remove':
                    impl = rimraf.moveRemove;
                    continue;
                default:
                    console.error(`unknown implementation: ${val}`);
                    runHelpForUsage();
                    return 1;
            }
        }
        else if (/^-/.test(arg)) {
            console.error(`unknown option: ${arg}`);
            runHelpForUsage();
            return 1;
        }
        else {
            paths.push(arg);
        }
    }
    if (opt.preserveRoot !== false) {
        for (const path of paths.map(p => resolve(p))) {
            if (path === parse(path).root) {
                console.error(`rimraf: it is dangerous to operate recursively on '/'`);
                console.error('use --no-preserve-root to override this failsafe');
                return 1;
            }
        }
    }
    if (!paths.length) {
        console.error('rimraf: must provide a path to remove');
        runHelpForUsage();
        return 1;
    }
    if (impl === rimraf.native && (interactive || opt.filter)) {
        console.error('native implementation does not support -v or -i');
        runHelpForUsage();
        return 1;
    }
    if (interactive) {
        await interactiveRimraf(impl, paths, opt);
    }
    else {
        await impl(paths, opt);
    }
    return 0;
};
main.help = help;
main.version = version;
export default main;
if (process.env.__TESTING_RIMRAF_BIN__ !== '1') {
    const args = process.argv.slice(2);
    main(...args).then(code => process.exit(code), er => {
        console.error(er);
        process.exit(1);
    });
}
//# sourceMappingURL=bin.mjs.map