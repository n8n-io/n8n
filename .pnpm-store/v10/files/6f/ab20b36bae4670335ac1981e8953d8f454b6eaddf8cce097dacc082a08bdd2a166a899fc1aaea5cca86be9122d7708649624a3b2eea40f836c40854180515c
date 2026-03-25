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
import express from 'express';
import { execFile } from 'child_process';
import * as multiparty from 'multiparty';
import cors from 'cors';
import { promisify } from 'util';
const port = 7172;
const exec = promisify(execFile);
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
    const app = express();
    app.use(cors());
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