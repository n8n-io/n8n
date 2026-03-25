import { WriteStream, WriteStreamSync } from '@isaacs/fs-minipass';
import path from 'node:path';
import { list } from './list.js';
import { makeCommand } from './make-command.js';
import { Pack, PackSync } from './pack.js';
const createFileSync = (opt, files) => {
    const p = new PackSync(opt);
    const stream = new WriteStreamSync(opt.file, {
        mode: opt.mode || 0o666,
    });
    p.pipe(stream);
    addFilesSync(p, files);
};
const createFile = (opt, files) => {
    const p = new Pack(opt);
    const stream = new WriteStream(opt.file, {
        mode: opt.mode || 0o666,
    });
    p.pipe(stream);
    const promise = new Promise((res, rej) => {
        stream.on('error', rej);
        stream.on('close', res);
        p.on('error', rej);
    });
    addFilesAsync(p, files);
    return promise;
};
const addFilesSync = (p, files) => {
    files.forEach(file => {
        if (file.charAt(0) === '@') {
            list({
                file: path.resolve(p.cwd, file.slice(1)),
                sync: true,
                noResume: true,
                onReadEntry: entry => p.add(entry),
            });
        }
        else {
            p.add(file);
        }
    });
    p.end();
};
const addFilesAsync = async (p, files) => {
    for (let i = 0; i < files.length; i++) {
        const file = String(files[i]);
        if (file.charAt(0) === '@') {
            await list({
                file: path.resolve(String(p.cwd), file.slice(1)),
                noResume: true,
                onReadEntry: entry => {
                    p.add(entry);
                },
            });
        }
        else {
            p.add(file);
        }
    }
    p.end();
};
const createSync = (opt, files) => {
    const p = new PackSync(opt);
    addFilesSync(p, files);
    return p;
};
const createAsync = (opt, files) => {
    const p = new Pack(opt);
    addFilesAsync(p, files);
    return p;
};
export const create = makeCommand(createFileSync, createFile, createSync, createAsync, (_opt, files) => {
    if (!files?.length) {
        throw new TypeError('no paths specified to add to archive');
    }
});
//# sourceMappingURL=create.js.map