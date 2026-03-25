import * as Comlink from 'comlink';
import * as VFS from '../src/VFS.js';

const FILEID = 1;

export function vfs_xOpen(context) {
  describe('vfs_xOpen', function() {
    let proxy, vfs;
    beforeEach(async function() {
      proxy = await context.create();
      vfs = proxy.vfs;
    });

    afterEach(async function() {
      await context.destroy(proxy);
    });

    it('should create a file', async function() {
      let rc;
      const pOpenOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      const openFlags = VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE;
      rc = await vfs.jOpen('test', FILEID, openFlags, pOpenOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pOpenOutput.getInt32(0, true)).toEqual(openFlags);

      const pAccessOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      rc = await vfs.jAccess('test', VFS.SQLITE_ACCESS_READWRITE, pAccessOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pAccessOutput.getInt32(0, true)).not.toEqual(0);
    });

    it('should create a database file', async function() {
      let rc;
      const pOpenOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      const openFlags = VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE | VFS.SQLITE_OPEN_MAIN_DB;
      
      do {
        const nRetryOps = await proxy.module.retryOps.length;
        for (let i = 0; i < nRetryOps; i++) {
          await proxy.module.retryOps[i];
        }
        rc = await vfs.jOpen('test',  1, openFlags, pOpenOutput);
      } while (rc === VFS.SQLITE_BUSY);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pOpenOutput.getInt32(0, true)).toEqual(openFlags);

      const pAccessOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      rc = await vfs.jAccess('test', VFS.SQLITE_ACCESS_READWRITE, pAccessOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pAccessOutput.getInt32(0, true)).not.toEqual(0);
    });

    it('should not create a file', async function() {
      let rc;
      const pOpenOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      const openFlags = VFS.SQLITE_OPEN_READWRITE;
      rc = await vfs.jOpen('test',  1, openFlags, pOpenOutput);
      expect(rc).toEqual(VFS.SQLITE_CANTOPEN);

      const pAccessOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      rc = await vfs.jAccess('test', VFS.SQLITE_ACCESS_READWRITE, pAccessOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pAccessOutput.getInt32(0, true)).toEqual(0);
    });

    it('should open an existing file', async function() {
      let rc;
      const pOpenOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      const openFlags = VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE;
      rc = await vfs.jOpen('test', FILEID, openFlags, pOpenOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);

      // Close the file because some VFS implementations don't allow
      // multiple open handles.
      await vfs.jClose(FILEID);

      rc = await vfs.jOpen('test', FILEID, VFS.SQLITE_OPEN_READWRITE, pOpenOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pOpenOutput.getInt32(0, true)).toEqual(VFS.SQLITE_OPEN_READWRITE);
    });

    it('should create an anonymous file', async function() {
      let rc;
      const pOpenOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      const openFlags = VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE;
      rc = await vfs.jOpen(null, FILEID, openFlags, pOpenOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pOpenOutput.getInt32(0, true)).toEqual(openFlags);
    });
  });
}