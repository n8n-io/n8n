import * as Comlink from 'comlink';
import * as VFS from '../src/VFS.js';

const FILEID = 1;

export function vfs_xClose(context) {
  describe('vfs_xClose', function() {
    let proxy, vfs;
    beforeEach(async function() {
      proxy = await context.create();
      vfs = proxy.vfs;
    });

    afterEach(async function() {
      await context.destroy(proxy);
    });

    it('should leave an accessible file', async function() {
      let rc;
      const pOpenOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      const openFlags = VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE;
      rc = await vfs.jOpen('test', FILEID, openFlags, pOpenOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);

      await vfs.jClose(FILEID);

      const pAccessOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      rc = await vfs.jAccess('test', VFS.SQLITE_ACCESS_READWRITE, pAccessOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pAccessOutput.getInt32(0, true)).not.toEqual(0);
    });

    it('should delete on close', async function() {
      let rc;
      const pOpenOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      const openFlags = VFS.SQLITE_OPEN_CREATE | VFS.SQLITE_OPEN_READWRITE | VFS.SQLITE_OPEN_DELETEONCLOSE;
      rc = await vfs.jOpen('test', FILEID, openFlags, pOpenOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);

      const pAccessOutput = Comlink.proxy(new DataView(new ArrayBuffer(4)));
      rc = await vfs.jAccess('test', VFS.SQLITE_ACCESS_READWRITE, pAccessOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pAccessOutput.getInt32(0, true)).toEqual(1);

      await vfs.jClose(FILEID);

      rc = await vfs.jAccess('test', VFS.SQLITE_ACCESS_READWRITE, pAccessOutput);
      expect(rc).toEqual(VFS.SQLITE_OK);
      expect(pAccessOutput.getInt32(0, true)).toEqual(0);
    });
  });
}