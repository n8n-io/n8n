import { WebLocksMixin } from "../src/WebLocksMixin.js";
import * as SQLite from "../src/sqlite-api.js";

class Tester extends WebLocksMixin(Object) {
  getFilename(fileId) {
    return fileId.toString();
  }
}

basicTests('exclusive');
basicTests('shared');
basicTests('shared+hint');

function basicTests(policy) {
  beforeEach(async () => {
    await clearAllLocks();
  });

  afterEach(async () => {
    await clearAllLocks();
  });

  describe(`WebLocksMixin basics ${policy}`, () => {
    it('should make normal lock transitions', async () => {
      let rc;
      const tester = new Tester(null, null, { lockPolicy: policy });

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
      expect(rc).toBe(SQLite.SQLITE_OK);

      await expectAsync(clearAllLocks()).toBeResolvedTo(0);
    });

    it('should make recovery lock transitions', async () => {
      let rc;
      const tester = new Tester(null, null, { lockPolicy: policy });

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
      expect(rc).toBe(SQLite.SQLITE_OK);

      await expectAsync(clearAllLocks()).toBeResolvedTo(0);
    });

    it('should ignore repeated state requests', async () => {
      let rc;
      const tester = new Tester(null, null, { lockPolicy: policy });

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);
      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
      expect(rc).toBe(SQLite.SQLITE_OK);
      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
      expect(rc).toBe(SQLite.SQLITE_OK);
      rc = await tester.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);
      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
      expect(rc).toBe(SQLite.SQLITE_OK);

      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
      expect(rc).toBe(SQLite.SQLITE_OK);
      rc = await tester.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
      expect(rc).toBe(SQLite.SQLITE_OK);

      await expectAsync(clearAllLocks()).toBeResolvedTo(0);
    });
  });
}

describe('WebLocksMixin exclusive', () => {
  beforeEach(async () => {
    await clearAllLocks();
  });

  afterEach(async () => {
    await clearAllLocks();
  });

  it('should block multiple SHARED connections', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'exclusive' });
    const testerB = new Tester(null, null, { lockPolicy: 'exclusive' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    const result = testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expectAsync(result).toBePending();

    rc = await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await new Promise(resolve => setTimeout(resolve));
    await expectAsync(result).toBeResolvedTo(SQLite.SQLITE_OK);

    rc = await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    expect(rc).toBe(SQLite.SQLITE_OK);
  });

  it('should timeout', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'exclusive', lockTimeout: 5 });
    const testerB = new Tester(null, null, { lockPolicy: 'exclusive', lockTimeout: 5 });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    const result = testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expectAsync(result).toBeResolvedTo(SQLite.SQLITE_BUSY);

    rc = await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await expectAsync(clearAllLocks()).toBeResolvedTo(0);
  });
});

describe('WebLocksMixin shared', () => {
  beforeEach(async () => {
    await clearAllLocks();
  });

  afterEach(async () => {
    await clearAllLocks();
  });

  it('should allow multiple SHARED connections', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should allow SHARED and RESERVED connections', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);
    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should return BUSY on RESERVED deadlock', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_BUSY);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should block EXCLUSIVE until SHARED connections are released', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    const result = testerA.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expectAsync(result).toBePending();

    rc = await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await new Promise(resolve => setTimeout(resolve));
    await expectAsync(result).toBeResolvedTo(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should block SHARED until EXCLUSIVE connection is released', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    expect(rc).toBe(SQLite.SQLITE_OK);

    const result = testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expectAsync(result).toBePending();

    rc = await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await new Promise(resolve => setTimeout(resolve));
    await expectAsync(result).toBeResolvedTo(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should timeout on SHARED', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared', lockTimeout: 5 });
    const testerB = new Tester(null, null, { lockPolicy: 'shared', lockTimeout: 5 });

    await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    await testerA.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_BUSY);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should timeout on EXCLUSIVE', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared', lockTimeout: 5 });
    const testerB = new Tester(null, null, { lockPolicy: 'shared', lockTimeout: 5 });

    await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerB.jLock(1, SQLite.SQLITE_LOCK_RESERVED);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    expect(rc).toBe(SQLite.SQLITE_BUSY);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });
});

describe('WebLocksMixin shared+hint', () => {
  beforeEach(async () => {
    await clearAllLocks();
  });

  afterEach(async () => {
    await clearAllLocks();
  });

  it('should allow multiple SHARED connections', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should allow SHARED and RESERVED connections', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);
    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should return BUSY on RESERVED deadlock', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_BUSY);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should block EXCLUSIVE until SHARED connections are released', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    const result = testerA.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expectAsync(result).toBePending();

    rc = await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await new Promise(resolve => setTimeout(resolve));
    await expectAsync(result).toBeResolvedTo(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should block SHARED until EXCLUSIVE connection is released', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint' });

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    rc = await testerA.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    expect(rc).toBe(SQLite.SQLITE_OK);

    const result = testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expectAsync(result).toBePending();

    rc = await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_OK);

    await new Promise(resolve => setTimeout(resolve));
    await expectAsync(result).toBeResolvedTo(SQLite.SQLITE_OK);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should timeout on SHARED', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint', lockTimeout: 5 });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint', lockTimeout: 5 });

    await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    await testerA.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    expect(rc).toBe(SQLite.SQLITE_BUSY);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should timeout on EXCLUSIVE', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint', lockTimeout: 5 });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint', lockTimeout: 5 });

    await testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerB.jLock(1, SQLite.SQLITE_LOCK_RESERVED);

    rc = await testerB.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    expect(rc).toBe(SQLite.SQLITE_BUSY);

    await testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    await testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
  });

  it('should not deadlock with hint', async () => {
    let rc;
    const testerA = new Tester(null, null, { lockPolicy: 'shared+hint' });
    const testerB = new Tester(null, null, { lockPolicy: 'shared+hint' });

    const resultA = Promise.resolve().then(() => {
      testerA.jFileControl(1, WebLocksMixin.WRITE_HINT_OP_CODE, null);
      return testerA.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerA.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerA.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerA.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerA.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    });

    const resultB = Promise.resolve().then(() => {
      testerB.jFileControl(1, WebLocksMixin.WRITE_HINT_OP_CODE, null);
      return testerB.jLock(1, SQLite.SQLITE_LOCK_SHARED);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerB.jLock(1, SQLite.SQLITE_LOCK_RESERVED);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerB.jLock(1, SQLite.SQLITE_LOCK_EXCLUSIVE);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerB.jUnlock(1, SQLite.SQLITE_LOCK_SHARED);
    }).then(result => {
      if (result !== SQLite.SQLITE_OK) throw Object.assign(new Error('failed'), { result });
      return testerB.jUnlock(1, SQLite.SQLITE_LOCK_NONE);
    });

    await expectAsync(resultA).toBeResolvedTo(SQLite.SQLITE_OK);
    await expectAsync(resultB).toBeResolvedTo(SQLite.SQLITE_OK);
  });
});

async function clearAllLocks() {
  await new Promise(resolve => setTimeout(resolve));

  let count = 0;
  while (true) {
    const locks = await navigator.locks.query();
    const lockNames = [...locks.held, ...locks.pending]
      .map(lock => lock.name)
      .filter(name => name.startsWith('lock##'));
    if (lockNames.length === 0) {
      break;
    }

    for (const name of new Set(lockNames)) {
      await navigator.locks.request(name, { steal: true }, async lock => {
      });
      count++;
    }
    await new Promise(resolve => setTimeout(resolve));
  }
  return count;
}