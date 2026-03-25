// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import assert from 'assert';
import { execFile } from 'child_process';
import fs from 'fs';
import mv from 'mv';
import ncp from 'ncp';
import path from 'path';
import tmp from 'tmp';
import { promisify } from 'util';
import { describe, it, before, after } from 'mocha';
import { packNTest } from 'pack-n-play';
import { createServer } from 'node:http';
import util from '../src/util.cjs';
/**
 * Optionally keep the staging directory between tests.
 */
const KEEP_STAGING_DIRECTORY = false;
const mvp = promisify(mv);
const ncpp = promisify(ncp);
const pkg = util.pkg;
const exec = promisify(execFile);
describe('📦 pack and install', () => {
    let stagingDir;
    let stagingPath;
    before(() => {
        stagingDir = tmp.dirSync({
            keep: KEEP_STAGING_DIRECTORY,
            unsafeCleanup: true,
        });
        stagingPath = stagingDir.name;
    });
    after('cleanup staging', () => {
        if (!KEEP_STAGING_DIRECTORY) {
            stagingDir.removeCallback();
        }
    });
    describe('pack-n-play', () => {
        let server;
        let url;
        before(async () => {
            server = createServer((req, res) => {
                res.writeHead(200, { 'content-type': 'text/plain' });
                res.end(`Hello, ${req.headers['user-agent'] || 'World'}`);
            });
            await new Promise((resolve, reject) => {
                server.on('error', reject);
                server.listen(0, resolve);
            });
            const address = server.address();
            if (typeof address === 'string') {
                url = address;
            }
            else {
                const base = new URL('http://localhost');
                base.host = address.address;
                base.port = address.port.toString();
                url = base.toString();
            }
        });
        after(() => {
            server.close();
        });
        it('supports ESM', async () => {
            await packNTest({
                sample: {
                    description: 'import as ESM',
                    esm: `
          import {Gaxios} from 'gaxios';

          const gaxios = new Gaxios();
          await gaxios.request({url: '${url}'});
          `,
                },
            });
        });
        it('supports CJS', async () => {
            await packNTest({
                sample: {
                    description: 'require as CJS',
                    cjs: `
          const {Gaxios} = require('gaxios');

          const gaxios = new Gaxios();
          gaxios.request({url: '${url}'}).then(console.log);
          `,
                },
            });
        });
    });
    describe('webpack', () => {
        /**
         * Create a staging directory with temp fixtures used to test on a fresh
         * application.
         */
        before('pack and install', async () => {
            await exec('npm', ['pack']);
            const tarball = `${pkg.name}-${pkg.version}.tgz`;
            await mvp(tarball, `${stagingPath}/gaxios.tgz`);
            await ncpp('system-test/fixtures/sample', `${stagingPath}/`);
            await exec('npm', ['install'], { cwd: `${stagingPath}/` });
        });
        it('should be able to webpack the library', async () => {
            // we expect npm install is executed in the before hook
            await exec('npx', ['webpack'], { cwd: `${stagingPath}/` });
            const bundle = path.join(stagingPath, 'dist', 'bundle.min.js');
            const stat = fs.statSync(bundle);
            assert(stat.size < 256 * 1024);
        }).timeout(20000);
    });
});
//# sourceMappingURL=test.install.js.map