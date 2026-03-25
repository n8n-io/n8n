import shelljs = require('./index');
declare global {
    interface Target {
        (...args: any[]): void;
        result?: any;
        done?: boolean;
    }
    const target: {
        all?: Target;
        [s: string]: Target;
    };

    const cat: typeof shelljs.cat;
    const cd: typeof shelljs.cd;
    const chmod: typeof shelljs.chmod;
    const config: typeof shelljs.config;
    const cp: typeof shelljs.cp;
    const dirs: typeof shelljs.dirs;
    const echo: typeof shelljs.echo;
    const env: typeof shelljs.env;
    const error: typeof shelljs.error;
    const exec: typeof shelljs.exec;
    const exit: typeof shelljs.exit;
    const find: typeof shelljs.find;
    const grep: typeof shelljs.grep;
    const head: typeof shelljs.head;
    const ln: typeof shelljs.ln;
    const ls: typeof shelljs.ls;
    const mkdir: typeof shelljs.mkdir;
    const mv: typeof shelljs.mv;
    const popd: typeof shelljs.popd;
    const pushd: typeof shelljs.pushd;
    const pwd: typeof shelljs.pwd;
    const rm: typeof shelljs.rm;
    const sed: typeof shelljs.sed;
    const set: typeof shelljs.set;
    const sort: typeof shelljs.sort;
    const tail: typeof shelljs.tail;
    const tempdir: typeof shelljs.tempdir;
    const touch: typeof shelljs.touch;
    const uniq: typeof shelljs.uniq;
    const ShellString: typeof shelljs.ShellString;
}
