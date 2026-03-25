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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const multiparty = __importStar(require("multiparty"));
const cors_1 = __importDefault(require("cors"));
const util_1 = require("util");
const port = 7172;
const exec = (0, util_1.promisify)(child_process_1.execFile);
async function listen(app, port) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, (err) => {
            if (err) {
                reject(err);
            }
            resolve(server);
        });
    });
}
// Starts a web server that browser tests will use, then runs actual browser
// tests.
async function main() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.post('/path', (req, res) => {
        if (req.header('origin')) {
            res.set('Access-Control-Allow-Origin', req.header('origin'));
        }
        const form = new multiparty.Form({ autoFields: true });
        form.parse(req, (err, fields) => {
            if (err) {
                res.status(500).send({ message: err.message });
            }
            else {
                res.status(200).send(fields.null);
            }
        });
    });
    app.get('/path', (req, res) => {
        if (req.header('origin')) {
            res.set('Access-Control-Allow-Origin', req.header('origin'));
        }
        res.send('response');
    });
    app.get('/querystring', (req, res) => {
        if (req.header('origin')) {
            res.set('Access-Control-Allow-Origin', req.header('origin'));
        }
        const query = req.query.query;
        res.send(query || '');
    });
    const server = await listen(app, port);
    console.log(`[http server] I'm listening on port ${port}! Starting karma.`);
    await exec('karma', ['start']);
    server.close();
    console.log(`[http server] Karma has finished! I'm no longer listening on port ${port}!`);
}
main().catch(err => {
    console.log('Error:', err);
});
//# sourceMappingURL=browser-test-runner.js.map