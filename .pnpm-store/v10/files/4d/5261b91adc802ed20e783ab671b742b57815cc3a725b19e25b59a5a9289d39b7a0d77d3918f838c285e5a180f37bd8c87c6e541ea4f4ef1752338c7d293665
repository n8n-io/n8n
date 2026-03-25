"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const mv_1 = __importDefault(require("mv"));
const ncp_1 = __importDefault(require("ncp"));
const path_1 = __importDefault(require("path"));
const tmp_1 = __importDefault(require("tmp"));
const util_1 = require("util");
const mocha_1 = require("mocha");
const pack_n_play_1 = require("pack-n-play");
const node_http_1 = require("node:http");
const util_cjs_1 = __importDefault(require("../src/util.cjs"));
/**
 * Optionally keep the staging directory between tests.
 */
const KEEP_STAGING_DIRECTORY = false;
const mvp = (0, util_1.promisify)(mv_1.default);
const ncpp = (0, util_1.promisify)(ncp_1.default);
const pkg = util_cjs_1.default.pkg;
const exec = (0, util_1.promisify)(child_process_1.execFile);
(0, mocha_1.describe)('📦 pack and install', () => {
    let stagingDir;
    let stagingPath;
    (0, mocha_1.before)(() => {
        stagingDir = tmp_1.default.dirSync({
            keep: KEEP_STAGING_DIRECTORY,
            unsafeCleanup: true,
        });
        stagingPath = stagingDir.name;
    });
    (0, mocha_1.after)('cleanup staging', () => {
        if (!KEEP_STAGING_DIRECTORY) {
            stagingDir.removeCallback();
        }
    });
    (0, mocha_1.describe)('pack-n-play', () => {
        let server;
        let url;
        (0, mocha_1.before)(async () => {
            server = (0, node_http_1.createServer)((req, res) => {
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
        (0, mocha_1.after)(() => {
            server.close();
        });
        (0, mocha_1.it)('supports ESM', async () => {
            await (0, pack_n_play_1.packNTest)({
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
        (0, mocha_1.it)('supports CJS', async () => {
            await (0, pack_n_play_1.packNTest)({
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
    (0, mocha_1.describe)('webpack', () => {
        /**
         * Create a staging directory with temp fixtures used to test on a fresh
         * application.
         */
        (0, mocha_1.before)('pack and install', async () => {
            await exec('npm', ['pack']);
            const tarball = `${pkg.name}-${pkg.version}.tgz`;
            await mvp(tarball, `${stagingPath}/gaxios.tgz`);
            await ncpp('system-test/fixtures/sample', `${stagingPath}/`);
            await exec('npm', ['install'], { cwd: `${stagingPath}/` });
        });
        (0, mocha_1.it)('should be able to webpack the library', async () => {
            // we expect npm install is executed in the before hook
            await exec('npx', ['webpack'], { cwd: `${stagingPath}/` });
            const bundle = path_1.default.join(stagingPath, 'dist', 'bundle.min.js');
            const stat = fs_1.default.statSync(bundle);
            (0, assert_1.default)(stat.size < 256 * 1024);
        }).timeout(20000);
    });
});
//# sourceMappingURL=test.install.js.map