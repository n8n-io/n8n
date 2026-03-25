"use strict";
// Copyright 2019 Google, LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
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
const mocha_1 = require("mocha");
const index_1 = require("../src/index");
const port = 7172; // should match the port defined in `webserver.ts`
(0, mocha_1.describe)('💻 browser tests', () => {
    (0, mocha_1.it)('should just work from browser', async () => {
        const result = await (0, index_1.request)({ url: `http://localhost:${port}/path` });
        assert_1.default.strictEqual(result.status, 200);
        assert_1.default.strictEqual(result.data, 'response');
    });
    (0, mocha_1.it)('should pass querystring parameters from browser', async () => {
        const result = await (0, index_1.request)({
            url: `http://localhost:${port}/querystring`,
            params: { query: 'value' },
        });
        assert_1.default.strictEqual(result.status, 200);
        assert_1.default.strictEqual(result.data, 'value');
    });
    (0, mocha_1.it)('should allow passing browser fetch explicitly', async () => {
        const result = await (0, index_1.request)({
            url: `http://localhost:${port}/path`,
            fetchImplementation: window.fetch,
        });
        assert_1.default.strictEqual(result.status, 200);
    });
    (0, mocha_1.it)('should support multipart post from the browser', async () => {
        const headers = new Headers();
        const multipart = [
            {
                'Content-Type': 'application/json',
                body: JSON.stringify({ hello: 'world' }),
            },
            {
                'Content-Type': 'text/plain',
                body: 'hello world!',
            },
        ];
        const boundary = globalThis?.crypto.randomUUID() || (await import('crypto')).randomUUID();
        const finale = `--${boundary}--`;
        headers.set('Content-Type', `multipart/related; boundary=${boundary}`);
        let content = '';
        for (const part of multipart) {
            const preamble = `--${boundary}\r\nContent-Type: ${part['Content-Type']}\r\n\r\n`;
            // rStream.push(preamble);
            content += preamble;
            if (typeof part.body === 'string') {
                content += part.body;
                content += '\r\n';
            }
        }
        content += finale;
        const result = await (0, index_1.request)({
            headers,
            data: content,
            method: 'POST',
            url: `http://localhost:${port}/path`,
        });
        assert_1.default.strictEqual(result.status, 200);
        const parts = result.data;
        assert_1.default.strictEqual(parts[0], '{"hello":"world"}');
        assert_1.default.strictEqual(parts[1], 'hello world!');
    });
});
//# sourceMappingURL=test.browser.js.map