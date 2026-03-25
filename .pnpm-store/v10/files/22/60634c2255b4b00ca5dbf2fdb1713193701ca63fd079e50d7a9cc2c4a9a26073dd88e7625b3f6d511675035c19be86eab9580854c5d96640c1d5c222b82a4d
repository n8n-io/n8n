import { file, withFile, dir, withDir, tmpName } from ".";

async function fileExample() {
  const { path, fd, cleanup } = await file({ discardDescriptor: true });
  await cleanup();

  await withFile(
    async ({ path, fd, cleanup }) => {
      console.log(fd);
      await cleanup();
    },
    { discardDescriptor: true }
  );
}

async function dirExample() {
  const { path, cleanup } = await dir({ unsafeCleanup: true });
  await cleanup();

  await withDir(
    async ({ path, cleanup }) => {
      console.log(path);
      await cleanup();
    },
    { unsafeCleanup: true }
  );
}

async function tmpNameExample() {
  const name = await tmpName({ tries: 3 });
}
