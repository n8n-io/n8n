'use strict';

const assert = require('assert');
const { constants } = require('fs');

const {
  fixture,
  mustCall,
  mustCallAtLeast,
  mustNotCall,
  setup: setup_,
  setupSimple
} = require('./common.js');

const { OPEN_MODE, Stats, STATUS_CODE } = require('../lib/protocol/SFTP.js');

const DEBUG = false;

setup('open', mustCall((client, server) => {
  const path_ = '/tmp/foo.txt';
  const handle_ = Buffer.from('node.js');
  const pflags_ = (OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE);
  server.on('OPEN', mustCall((id, path, pflags, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    assert(pflags === pflags_, `Wrong flags: ${flagsToHuman(pflags)}`);
    server.handle(id, handle_);
    server.end();
  }));
  client.open(path_, 'w', mustCall((err, handle) => {
    assert(!err, `Unexpected open() error: ${err}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
  }));
}));

setup('close', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  server.on('CLOSE', mustCall((id, handle) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.close(handle_, mustCall((err) => {
    assert(!err, `Unexpected close() error: ${err}`);
  }));
}));

setup('read', mustCall((client, server) => {
  const expected = Buffer.from('node.jsnode.jsnode.jsnode.jsnode.jsnode.js');
  const handle_ = Buffer.from('node.js');
  const buf = Buffer.alloc(expected.length);
  server.on('READ', mustCall((id, handle, offset, len) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert(offset === 5, `Wrong read offset: ${offset}`);
    assert(len === buf.length, `Wrong read len: ${len}`);
    server.data(id, expected);
    server.end();
  }));
  client.read(handle_, buf, 0, buf.length, 5, mustCall((err, nb) => {
    assert(!err, `Unexpected read() error: ${err}`);
    assert.deepStrictEqual(buf, expected, 'read data mismatch');
  }));
}));

setup('read (partial)', mustCall((client, server) => {
  const expected = Buffer.from('blargh');
  const handle_ = Buffer.from('node.js');
  const buf = Buffer.alloc(256);
  server.on('READ', mustCall((id, handle, offset, len) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert(offset === 0, `Wrong read offset: ${offset}`);
    assert(len === buf.length, `Wrong read len: ${len}`);
    server.data(id, expected);
    server.end();
  }));
  client.read(handle_, buf, 0, buf.length, 0, mustCall((err, nb, data) => {
    assert(!err, `Unexpected read() error: ${err}`);
    assert.strictEqual(nb, expected.length, 'nb count mismatch');
    assert.deepStrictEqual(
      buf.slice(0, expected.length),
      expected,
      'read data mismatch'
    );
    assert.deepStrictEqual(data, expected, 'read data mismatch');
  }));
}));

setup('read (overflow)', mustCall((client, server) => {
  const maxChunk = client._maxReadLen;
  const expected = Buffer.alloc(3 * maxChunk, 'Q');
  const handle_ = Buffer.from('node.js');
  const buf = Buffer.alloc(expected.length, 0);
  let reqs = 0;
  server.on('READ', mustCall((id, handle, offset, len) => {
    ++reqs;
    assert.strictEqual(id, reqs - 1, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert.strictEqual(offset,
                       (reqs - 1) * maxChunk,
                       `Wrong read offset: ${offset}`);
    server.data(id, expected.slice(offset, offset + len));
    if (reqs === 3)
      server.end();
  }, 3));
  client.read(handle_, buf, 0, buf.length, 0, mustCall((err, nb) => {
    assert(!err, `Unexpected read() error: ${err}`);
    assert.deepStrictEqual(buf, expected);
    assert.strictEqual(nb, buf.length, 'read nb mismatch');
  }));
}));

setup('write', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  const buf = Buffer.from('node.jsnode.jsnode.jsnode.jsnode.jsnode.js');
  server.on('WRITE', mustCall((id, handle, offset, data) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert(offset === 5, `Wrong write offset: ${offset}`);
    assert.deepStrictEqual(data, buf, 'write data mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.write(handle_, buf, 0, buf.length, 5, mustCall((err, nb) => {
    assert(!err, `Unexpected write() error: ${err}`);
    assert.strictEqual(nb, buf.length, 'wrong bytes written');
  }));
}));

setup('write (overflow)', mustCall((client, server) => {
  const maxChunk = client._maxWriteLen;
  const handle_ = Buffer.from('node.js');
  const buf = Buffer.allocUnsafe(3 * maxChunk);
  let reqs = 0;
  server.on('WRITE', mustCall((id, handle, offset, data) => {
    ++reqs;
    assert.strictEqual(id, reqs - 1, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert.strictEqual(offset,
                       (reqs - 1) * maxChunk,
                       `Wrong write offset: ${offset}`);
    assert((offset + data.length) <= buf.length, 'bad offset');
    assert.deepStrictEqual(data,
                           buf.slice(offset, offset + data.length),
                           'write data mismatch');
    server.status(id, STATUS_CODE.OK);
    if (reqs === 3)
      server.end();
  }, 3));
  client.write(handle_, buf, 0, buf.length, 0, mustCall((err, nb) => {
    assert(!err, `Unexpected write() error: ${err}`);
    assert.strictEqual(nb, buf.length, 'wrote bytes written');
  }));
}));

setup('lstat', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  const attrs_ = new Stats({
    size: 10 * 1024,
    uid: 9001,
    gid: 9001,
    atime: (Date.now() / 1000) | 0,
    mtime: (Date.now() / 1000) | 0
  });
  server.on('LSTAT', mustCall((id, path) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    server.attrs(id, attrs_);
    server.end();
  }));
  client.lstat(path_, mustCall((err, attrs) => {
    assert(!err, `Unexpected lstat() error: ${err}`);
    assert.deepStrictEqual(attrs, attrs_, 'attrs mismatch');
  }));
}));

setup('fstat', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  const attrs_ = new Stats({
    size: 10 * 1024,
    uid: 9001,
    gid: 9001,
    atime: (Date.now() / 1000) | 0,
    mtime: (Date.now() / 1000) | 0
  });
  server.on('FSTAT', mustCall((id, handle) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.attrs(id, attrs_);
    server.end();
  }));
  client.fstat(handle_, mustCall((err, attrs) => {
    assert(!err, `Unexpected fstat() error: ${err}`);
    assert.deepStrictEqual(attrs, attrs_, 'attrs mismatch');
  }));
}));

setup('setstat', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  const attrs_ = new Stats({
    uid: 9001,
    gid: 9001,
    atime: (Date.now() / 1000) | 0,
    mtime: (Date.now() / 1000) | 0
  });
  server.on('SETSTAT', mustCall((id, path, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    assert.deepStrictEqual(attrs, attrs_, 'attrs mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.setstat(path_, attrs_, mustCall((err) => {
    assert(!err, `Unexpected setstat() error: ${err}`);
  }));
}));

setup('fsetstat', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  const attrs_ = new Stats({
    uid: 9001,
    gid: 9001,
    atime: (Date.now() / 1000) | 0,
    mtime: (Date.now() / 1000) | 0
  });
  server.on('FSETSTAT', mustCall((id, handle, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert.deepStrictEqual(attrs, attrs_, 'attrs mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.fsetstat(handle_, attrs_, mustCall((err) => {
    assert(!err, `Unexpected fsetstat() error: ${err}`);
  }));
}));

setup('opendir', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  const path_ = '/tmp';
  server.on('OPENDIR', mustCall((id, path) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    server.handle(id, handle_);
    server.end();
  }));
  client.opendir(path_, mustCall((err, handle) => {
    assert(!err, `Unexpected opendir() error: ${err}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
  }));
}));

setup('readdir', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  const list_ = [
    { filename: '.',
      longname: 'drwxr-xr-x  56 nodejs nodejs      4096 Nov 10 01:05 .',
      attrs: new Stats({
        mode: 0o755 | constants.S_IFDIR,
        size: 4096,
        uid: 9001,
        gid: 8001,
        atime: 1415599549,
        mtime: 1415599590
      })
    },
    { filename: '..',
      longname: 'drwxr-xr-x   4 root   root        4096 May 16  2013 ..',
      attrs: new Stats({
        mode: 0o755 | constants.S_IFDIR,
        size: 4096,
        uid: 0,
        gid: 0,
        atime: 1368729954,
        mtime: 1368729999
      })
    },
    { filename: 'foo',
      longname: 'drwxrwxrwx   2 nodejs nodejs      4096 Mar  8  2009 foo',
      attrs: new Stats({
        mode: 0o777 | constants.S_IFDIR,
        size: 4096,
        uid: 9001,
        gid: 8001,
        atime: 1368729954,
        mtime: 1368729999
      })
    },
    { filename: 'bar',
      longname: '-rw-r--r--   1 nodejs nodejs 513901992 Dec  4  2009 bar',
      attrs: new Stats({
        mode: 0o644 | constants.S_IFREG,
        size: 513901992,
        uid: 9001,
        gid: 8001,
        atime: 1259972199,
        mtime: 1259972199
      })
    }
  ];
  server.on('READDIR', mustCall((id, handle) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.name(id, list_);
    server.end();
  }));
  client.readdir(handle_, mustCall((err, list) => {
    assert(!err, `Unexpected readdir() error: ${err}`);
    assert.deepStrictEqual(list,
                           list_.slice(2),
                           'dir list mismatch');
  }));
}));

setup('readdir (full)', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  const list_ = [
    { filename: '.',
      longname: 'drwxr-xr-x  56 nodejs nodejs      4096 Nov 10 01:05 .',
      attrs: new Stats({
        mode: 0o755 | constants.S_IFDIR,
        size: 4096,
        uid: 9001,
        gid: 8001,
        atime: 1415599549,
        mtime: 1415599590
      })
    },
    { filename: '..',
      longname: 'drwxr-xr-x   4 root   root        4096 May 16  2013 ..',
      attrs: new Stats({
        mode: 0o755 | constants.S_IFDIR,
        size: 4096,
        uid: 0,
        gid: 0,
        atime: 1368729954,
        mtime: 1368729999
      })
    },
    { filename: 'foo',
      longname: 'drwxrwxrwx   2 nodejs nodejs      4096 Mar  8  2009 foo',
      attrs: new Stats({
        mode: 0o777 | constants.S_IFDIR,
        size: 4096,
        uid: 9001,
        gid: 8001,
        atime: 1368729954,
        mtime: 1368729999
      })
    },
    { filename: 'bar',
      longname: '-rw-r--r--   1 nodejs nodejs 513901992 Dec  4  2009 bar',
      attrs: new Stats({
        mode: 0o644 | constants.S_IFREG,
        size: 513901992,
        uid: 9001,
        gid: 8001,
        atime: 1259972199,
        mtime: 1259972199
      })
    }
  ];
  server.on('READDIR', mustCall((id, handle) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.name(id, list_);
    server.end();
  }));
  client.readdir(handle_, { full: true }, mustCall((err, list) => {
    assert(!err, `Unexpected readdir() error: ${err}`);
    assert.deepStrictEqual(list, list_, 'dir list mismatch');
  }));
}));

setup('readdir (EOF)', mustCall((client, server) => {
  const handle_ = Buffer.from('node.js');
  server.on('READDIR', mustCall((id, handle) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.status(id, STATUS_CODE.EOF);
    server.end();
  }));
  client.readdir(handle_, mustCall((err, list) => {
    assert(err && err.code === STATUS_CODE.EOF,
           `Expected EOF, got: ${err}`);
  }));
}));

setup('unlink', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  server.on('REMOVE', mustCall((id, path) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.unlink(path_, mustCall((err) => {
    assert(!err, `Unexpected unlink() error: ${err}`);
  }));
}));

setup('mkdir', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  server.on('MKDIR', mustCall((id, path) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.mkdir(path_, mustCall((err) => {
    assert(!err, `Unexpected mkdir() error: ${err}`);
  }));
}));

setup('rmdir', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  server.on('RMDIR', mustCall((id, path) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.rmdir(path_, mustCall((err) => {
    assert(!err, `Unexpected rmdir() error: ${err}`);
  }));
}));

setup('realpath', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  const name_ = { filename: '/tmp/foo' };
  server.on('REALPATH', mustCall((id, path) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    server.name(id, name_);
    server.end();
  }));
  client.realpath(path_, mustCall((err, name) => {
    assert(!err, `Unexpected realpath() error: ${err}`);
    assert.deepStrictEqual(name, name_.filename, 'name mismatch');
  }));
}));

setup('stat', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  const attrs_ = new Stats({
    mode: 0o644 | constants.S_IFREG,
    size: 10 * 1024,
    uid: 9001,
    gid: 9001,
    atime: (Date.now() / 1000) | 0,
    mtime: (Date.now() / 1000) | 0
  });
  server.on('STAT', mustCall((id, path) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    server.attrs(id, attrs_);
    server.end();
  }));
  client.stat(path_, mustCall((err, attrs) => {
    assert(!err, `Unexpected stat() error: ${err}`);
    assert.deepStrictEqual(attrs, attrs_, 'attrs mismatch');
    const expectedTypes = {
      isDirectory: false,
      isFile: true,
      isBlockDevice: false,
      isCharacterDevice: false,
      isSymbolicLink: false,
      isFIFO: false,
      isSocket: false
    };
    for (const [fn, expect] of Object.entries(expectedTypes))
      assert(attrs[fn]() === expect, `attrs.${fn}() failed`);
  }));
}));

setup('rename', mustCall((client, server) => {
  const oldPath_ = '/foo/bar/baz';
  const newPath_ = '/tmp/foo';
  server.on('RENAME', mustCall((id, oldPath, newPath) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(oldPath === oldPath_, `Wrong old path: ${oldPath}`);
    assert(newPath === newPath_, `Wrong new path: ${newPath}`);
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.rename(oldPath_, newPath_, mustCall((err) => {
    assert(!err, `Unexpected rename() error: ${err}`);
  }));
}));

setup('readlink', mustCall((client, server) => {
  const linkPath_ = '/foo/bar/baz';
  const name = { filename: '/tmp/foo' };
  server.on('READLINK', mustCall((id, linkPath) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(linkPath === linkPath_, `Wrong link path: ${linkPath}`);
    server.name(id, name);
    server.end();
  }));
  client.readlink(linkPath_, mustCall((err, targetPath) => {
    assert(!err, `Unexpected readlink() error: ${err}`);
    assert(targetPath === name.filename,
           `Wrong target path: ${targetPath}`);
  }));
}));

setup('symlink', mustCall((client, server) => {
  const linkPath_ = '/foo/bar/baz';
  const targetPath_ = '/tmp/foo';
  server.on('SYMLINK', mustCall((id, linkPath, targetPath) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(linkPath === linkPath_, `Wrong link path: ${linkPath}`);
    assert(targetPath === targetPath_, `Wrong target path: ${targetPath}`);
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.symlink(targetPath_, linkPath_, mustCall((err) => {
    assert(!err, `Unexpected symlink() error: ${err}`);
  }));
}));

setup('readFile', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  const handle_ = Buffer.from('hi mom!');
  const data_ = Buffer.from('hello world');
  server.on('OPEN', mustCall((id, path, pflags, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    assert(pflags === OPEN_MODE.READ, `Wrong flags: ${flagsToHuman(pflags)}`);
    server.handle(id, handle_);
  })).on('FSTAT', mustCall((id, handle) => {
    assert(id === 1, `Wrong request id: ${id}`);
    const attrs = new Stats({
      size: data_.length,
      uid: 9001,
      gid: 9001,
      atime: (Date.now() / 1000) | 0,
      mtime: (Date.now() / 1000) | 0
    });
    server.attrs(id, attrs);
  })).on('READ', mustCall((id, handle, offset, len) => {
    assert(id === 2, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert(offset === 0, `Wrong read offset: ${offset}`);
    server.data(id, data_);
  })).on('CLOSE', mustCall((id, handle) => {
    assert(id === 3, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.readFile(path_, mustCall((err, buf) => {
    assert(!err, `Unexpected error: ${err}`);
    assert.deepStrictEqual(buf, data_, 'data mismatch');
  }));
}));

setup('readFile (no size from fstat)', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  const handle_ = Buffer.from('hi mom!');
  const data_ = Buffer.from('hello world');
  let reads = 0;
  server.on('OPEN', mustCall((id, path, pflags, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    assert(pflags === OPEN_MODE.READ, `Wrong flags: ${flagsToHuman(pflags)}`);
    server.handle(id, handle_);
  })).on('FSTAT', mustCall((id, handle) => {
    assert(id === 1, `Wrong request id: ${id}`);
    const attrs = new Stats({
      uid: 9001,
      gid: 9001,
      atime: (Date.now() / 1000) | 0,
      mtime: (Date.now() / 1000) | 0
    });
    server.attrs(id, attrs);
  })).on('READ', mustCall((id, handle, offset, len) => {
    assert(++reads + 1 === id, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    switch (id) {
      case 2:
        assert(offset === 0, `Wrong read offset for first read: ${offset}`);
        server.data(id, data_);
        break;
      case 3:
        assert(offset === data_.length,
               `Wrong read offset for second read: ${offset}`);
        server.status(id, STATUS_CODE.EOF);
        break;
    }
  }, 2)).on('CLOSE', mustCall((id, handle) => {
    assert(id === 4, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  client.readFile(path_, mustCall((err, buf) => {
    assert(!err, `Unexpected error: ${err}`);
    assert.deepStrictEqual(buf, data_, 'data mismatch');
  }));
}));

setup('ReadStream', mustCall((client, server) => {
  let reads = 0;
  const path_ = '/foo/bar/baz';
  const handle_ = Buffer.from('hi mom!');
  const data_ = Buffer.from('hello world');
  server.on('OPEN', mustCall((id, path, pflags, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    assert(pflags === OPEN_MODE.READ, `Wrong flags: ${flagsToHuman(pflags)}`);
    server.handle(id, handle_);
  })).on('READ', mustCall((id, handle, offset, len) => {
    assert(id === ++reads, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    if (reads === 1) {
      assert(offset === 0, `Wrong read offset: ${offset}`);
      server.data(id, data_);
    } else {
      server.status(id, STATUS_CODE.EOF);
    }
  }, 2)).on('CLOSE', mustCall((id, handle) => {
    assert(id === 3, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  let buf = [];
  client.createReadStream(path_).on('readable', mustCallAtLeast(function() {
    let chunk;
    while ((chunk = this.read()) !== null)
      buf.push(chunk);
  })).on('end', mustCall(() => {
    buf = Buffer.concat(buf);
    assert.deepStrictEqual(buf, data_, 'data mismatch');
  }));
}));

setup('ReadStream (fewer bytes than requested)', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  const handle_ = Buffer.from('hi mom!');
  const data_ = Buffer.from('hello world');
  server.on('OPEN', mustCall((id, path, pflags, attrs) => {
    server.handle(id, handle_);
  })).on('READ', mustCallAtLeast((id, handle, offset, len) => {
    if (offset > data_.length) {
      server.status(id, STATUS_CODE.EOF);
    } else {
      // Only read 4 bytes at a time
      server.data(id, data_.slice(offset, offset + 4));
    }
  })).on('CLOSE', mustCall((id, handle) => {
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));
  let buf = [];
  client.createReadStream(path_).on('readable', mustCallAtLeast(function() {
    let chunk;
    while ((chunk = this.read()) !== null)
      buf.push(chunk);
  })).on('end', mustCall(() => {
    buf = Buffer.concat(buf);
    assert.deepStrictEqual(buf, data_, 'data mismatch');
  }));
}));

setup('ReadStream (error)', mustCall((client, server) => {
  const path_ = '/foo/bar/baz';
  server.on('OPEN', mustCall((id, path, pflags, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    assert(pflags === OPEN_MODE.READ, `Wrong flags: ${flagsToHuman(pflags)}`);
    server.status(id, STATUS_CODE.NO_SUCH_FILE);
    server.end();
  }));
  client.createReadStream(path_).on('error', mustCall((err) => {
    assert(err.code === STATUS_CODE.NO_SUCH_FILE);
  }));
}));

setup('WriteStream', mustCall((client, server) => {
  let writes = 0;
  const path_ = '/foo/bar/baz';
  const handle_ = Buffer.from('hi mom!');
  const data_ = Buffer.from('hello world');
  const pflags_ = OPEN_MODE.TRUNC | OPEN_MODE.CREAT | OPEN_MODE.WRITE;
  server.on('OPEN', mustCall((id, path, pflags, attrs) => {
    assert(id === 0, `Wrong request id: ${id}`);
    assert(path === path_, `Wrong path: ${path}`);
    assert(pflags === pflags_, `Wrong flags: ${flagsToHuman(pflags)}`);
    server.handle(id, handle_);
  })).on('FSETSTAT', mustCall((id, handle, attrs) => {
    assert(id === 1, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert.strictEqual(attrs.mode, 0o666, 'Wrong file mode');
    server.status(id, STATUS_CODE.OK);
  })).on('WRITE', mustCall((id, handle, offset, data) => {
    assert(id === ++writes + 1, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    assert(offset === ((writes - 1) * data_.length),
           `Wrong write offset: ${offset}`);
    assert.deepStrictEqual(data, data_, 'Wrong data');
    server.status(id, STATUS_CODE.OK);
  }, 3)).on('CLOSE', mustCall((id, handle) => {
    assert(id === 5, `Wrong request id: ${id}`);
    assert.deepStrictEqual(handle, handle_, 'handle mismatch');
    server.status(id, STATUS_CODE.OK);
    server.end();
  }));

  const writer = client.createWriteStream(path_);
  writer.cork && writer.cork();
  writer.write(data_);
  writer.write(data_);
  writer.write(data_);
  writer.uncork && writer.uncork();
  writer.end();
}));

{
  const { client, server } = setup_(
    'SFTP server aborts with exit-status',
    {
      client: { username: 'foo', password: 'bar' },
      server: { hostKeys: [ fixture('ssh_host_rsa_key') ] },
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('sftp', mustCall((accept, reject) => {
          const sftp = accept();

          // XXX: hack
          sftp._protocol.exitStatus(sftp.outgoing.id, 127);
          sftp._protocol.channelClose(sftp.outgoing.id);
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    const timeout = setTimeout(mustNotCall(), 1000);
    client.sftp(mustCall((err, sftp) => {
      clearTimeout(timeout);
      assert(err, 'Expected error');
      assert(err.code === 127, `Expected exit code 127, saw: ${err.code}`);
      client.end();
    }));
  }));
}


// =============================================================================
function setup(title, cb) {
  const { client, server } = setupSimple(DEBUG, title);
  let clientSFTP;
  let serverSFTP;

  const onSFTP = mustCall(() => {
    if (clientSFTP && serverSFTP)
      cb(clientSFTP, serverSFTP);
  }, 2);

  client.on('ready', mustCall(() => {
    client.sftp(mustCall((err, sftp) => {
      assert(!err, `[${title}] Unexpected client sftp start error: ${err}`);
      sftp.on('close', mustCall(() => {
        client.end();
      }));
      clientSFTP = sftp;
      onSFTP();
    }));
  }));

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('sftp', mustCall((accept, reject) => {
          const sftp = accept();
          sftp.on('close', mustCall(() => {
            conn.end();
          }));
          serverSFTP = sftp;
          onSFTP();
        }));
      }));
    }));
  }));
}

function flagsToHuman(flags) {
  const ret = [];

  for (const [name, value] of Object.entries(OPEN_MODE)) {
    if (flags & value)
      ret.push(name);
  }

  return ret.join(' | ');
}
