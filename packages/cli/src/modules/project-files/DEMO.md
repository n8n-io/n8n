# Project Files — local demo

Two ways to run project files locally and see where the bytes actually land:
on the local filesystem, and in an S3-compatible bucket.

Both use `pnpm dev` from `packages/cli`, which is
`concurrently "npm run watch" "nodemon --delay 1"` — a TypeScript watch plus a
nodemon-restarted server. Build once before the first run:

```bash
pnpm build        # from the repo root
```

The frontend is served separately. Either run `pnpm dev` from the repo root
instead (backend + editor together), or run `pnpm --filter=n8n-editor-ui dev` in a
second terminal.

> The `project_file` table is created by a migration in `@n8n/db`, so it exists on
> every instance regardless of these settings. Only *where the bytes go* changes.

---

## Scenario 1 — local filesystem

This is the default: `N8N_DEFAULT_BINARY_DATA_MODE` falls back to `filesystem`
outside queue mode, so no configuration is strictly needed. Setting it explicitly
makes the demo reproducible on a machine that has other env vars lying around.

```bash
cd packages/cli

N8N_DEFAULT_BINARY_DATA_MODE=filesystem \
N8N_STORAGE_PATH="$HOME/.n8n/storage" \
pnpm dev
```

Then: open a project → **Files** tab → upload a file.

### Where the bytes are

```
$N8N_STORAGE_PATH/projects/<projectId>/files/binary_data/<uuid>
$N8N_STORAGE_PATH/projects/<projectId>/files/binary_data/<uuid>.metadata
```

The path comes straight from the module. `ProjectFileService.writeBlob` asks for a
custom location:

```ts
FileLocation.ofCustom({
  pathSegments: ['projects', projectId, 'files'],
  sourceType: 'project_file',
  sourceId: fileId,
})
```

`BinaryDataBlobManager.toFileId` turns that into
`projects/<projectId>/files/binary_data/<uuid>`, and `FsByteStore` resolves the key
directly under `storagePath` — no extra prefix.

The `.metadata` companion holds the file name, MIME type and size. It only exists
on the filesystem backend: S3 and Azure carry that on the object itself.

**The stored file name is a uuid, not the user-facing name.** That is deliberate —
the display name lives in the `project_file` row, which is why renaming never
touches the bytes. To go from a file in the UI to a file on disk, read the row:

```bash
sqlite3 ~/.n8n/database.sqlite \
  "SELECT name, binaryDataId FROM project_file ORDER BY createdAt DESC LIMIT 5;"
```

`binaryDataId` is mode-prefixed, e.g.
`filesystem-v2:projects/AbCd.../files/binary_data/9f2c...`. Strip the
`filesystem-v2:` prefix and the remainder is the path under `$N8N_STORAGE_PATH`.

Watch it happen live:

```bash
find "$HOME/.n8n/storage/projects" -type f -newermt '-5 minutes' 2>/dev/null
```

### Two gotchas

**`~/.n8n/storage` may not be your storage path.** If `~/.n8n/binaryData` already
exists from an older run and `N8N_MIGRATE_FS_STORAGE_PATH=true` is not set,
`StorageConfig` keeps using the old directory and logs a deprecation warning. Set
`N8N_STORAGE_PATH` explicitly, as above, to avoid guessing.

**Deleting a file removes the row first, then the bytes.** If you kill the process
between the two, you get an unreferenced blob — expected, and documented in the
[README](./README.md). The sweeper does not clean those; it only sweeps the
multipart staging directory.

---

## Scenario 2 — S3-compatible bucket

Same module, same code path. Switching `N8N_DEFAULT_BINARY_DATA_MODE` to `s3` is
the only change: `BinaryDataService` dispatches to whichever manager the mode names,
so project files follow along with no module-level branching.

### This needs a license

```
S3 binary data storage requires a valid license. Either set
`N8N_DEFAULT_BINARY_DATA_MODE` to something else, or upgrade to a license that
supports this feature.
```

`BaseCommand.initBinaryDataService` checks `feat:binaryDataS3` when the mode is
`s3` and calls `process.exit(1)` if it is missing. Use a license that includes the
entitlement (`N8N_LICENSE_ACTIVATION_KEY`).

**`E2E_TESTS=true` does not work as a bypass here**, even though it does for most
licensed features. The e2e controller monkey-patches `License.isLicensed`, but it
is only imported from `Server.registerAdditionalControllers` during
`server.start()` (`start.ts:403`), while the S3 check runs in
`initBinaryDataService` (`start.ts:266`). The process has already exited by the
time the patch would apply.

If you only need to exercise the module's own logic without a license, the
integration tests already run against a real filesystem-backed `BinaryDataService`
and cover the storage path end to end:

```bash
cd packages/cli
pnpm test:integration test/integration/modules/project-files.integration.test.ts
```

### Against MinIO (no AWS account)

`forcePathStyle` defaults to `true` and the host is configurable, so any
S3-compatible server works.

```bash
docker run -d --name minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

Create a bucket named `n8n` at http://localhost:9001 (login `minioadmin` /
`minioadmin`), then:

```bash
cd packages/cli

N8N_DEFAULT_BINARY_DATA_MODE=s3 \
N8N_EXTERNAL_STORAGE_S3_HOST=127.0.0.1:9000 \
N8N_EXTERNAL_STORAGE_S3_PROTOCOL=http \
N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME=n8n \
N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION=us-east-1 \
N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY=minioadmin \
N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET=minioadmin \
N8N_LICENSE_ACTIVATION_KEY=<key with feat:binaryDataS3> \
pnpm dev
```

### Against real AWS S3

Same variables, with `N8N_EXTERNAL_STORAGE_S3_HOST=s3.<region>.amazonaws.com`,
`N8N_EXTERNAL_STORAGE_S3_PROTOCOL=https`, and either explicit keys or
`N8N_EXTERNAL_STORAGE_S3_AUTH_AUTO_DETECT=true` to use the default credential
provider chain.

### Where the bytes are

The same key, now an object key instead of a path:

```
s3://<bucket>/projects/<projectId>/files/binary_data/<uuid>
```

No `.metadata` object — S3 carries the file name and MIME type as object metadata.

```bash
# MinIO
docker exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec minio mc ls --recursive local/n8n/projects/

# AWS
aws s3 ls "s3://<bucket>/projects/" --recursive
```

And the row now carries an `s3:`-prefixed reference:

```bash
sqlite3 ~/.n8n/database.sqlite \
  "SELECT name, binaryDataId FROM project_file ORDER BY createdAt DESC LIMIT 5;"
# s3:projects/AbCd.../files/binary_data/9f2c...
```

### One thing worth demonstrating

Upload a file on `filesystem`, then restart with `s3` and upload another. The
project now has one file in each backend, and **both still download and delete
correctly** — the mode prefix on each row routes every read and delete to the right
manager. That is the reason the full `mode:fileId` reference is stored rather than
a bare key.

What will *not* work is deleting the whole project's bytes by prefix: prefix
deletion is absent on S3, which is why the module always deletes by id. See the
README's [storage integration](./README.md#storage-integration) notes.

---

## Verifying either scenario

| Check | How |
|---|---|
| Which mode is active | The upload telemetry event carries `n8n_binary_data_mode`; the row's `binaryDataId` prefix is the ground truth |
| Bytes were really written | Compare the on-disk or in-bucket size against `fileSizeBytes` in the row |
| Download works | The Files tab row menu → **Download**. A 401 here means the browser-id exemption is missing — see the README's gotchas |
| Preview works | The eye button on an image or text row. PDFs deliberately have none |
| Quota enforcement | `N8N_PROJECT_FILES_PROJECT_MAX_SIZE_BYTES=1024 pnpm dev`, then upload something larger and expect a 413 |
