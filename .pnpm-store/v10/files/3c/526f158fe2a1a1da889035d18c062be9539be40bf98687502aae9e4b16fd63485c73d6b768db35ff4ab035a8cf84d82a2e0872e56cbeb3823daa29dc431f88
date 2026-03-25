import { TestContext } from "./TestContext.js";
import { vfs_xOpen } from "./vfs_xOpen.js";
import { vfs_xAccess } from "./vfs_xAccess.js";
import { vfs_xClose } from "./vfs_xClose.js";
import { vfs_xRead } from "./vfs_xRead.js";
import { vfs_xWrite } from "./vfs_xWrite.js";

const CONFIG = 'MemoryAsyncVFS';
const BUILDS = ['asyncify', 'jspi'];

const supportsJSPI = await TestContext.supportsJSPI();

describe(CONFIG, function() {
  for (const build of BUILDS) {
    if (build === 'jspi' && !supportsJSPI) return;

    describe(build, function() {
      const context = new TestContext({ build, config: CONFIG });
    
      vfs_xAccess(context);
      vfs_xOpen(context);
      vfs_xClose(context);
      vfs_xRead(context);
      vfs_xWrite(context);
    });
  }
});
