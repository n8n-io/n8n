/*
 * Jake JavaScript build tool
 * Copyright 2112 Matthew Eernisse (mde@fleegix.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/

const PROJECT_DIR = process.env.PROJECT_DIR;

let fs = require('fs');
let { publishTask, rmRf, mkdirP } = require(`${PROJECT_DIR}/lib/jake`);

fs.writeFileSync('package.json', '{"version": "0.0.1"}');
mkdirP('tmp_publish');
fs.writeFileSync('tmp_publish/foo.txt', 'FOO');

publishTask('zerb', function () {
  this.packageFiles.include([
    'package.json'
    , 'tmp_publish/**'
  ]);
  this.publishCmd = 'node -p -e "\'%filename\'"';
  this.gitCmd = 'echo'
  this.scheduleDelay = 0;

  this._ensureRepoClean = function () {};
  this._getCurrentBranch = function () {
    return 'v0.0'
  };
});

jake.setTaskTimeout(5000);

jake.Task['publish'].on('complete', function () {
  rmRf('tmp_publish', {silent: true});
  rmRf('package.json', {silent: true});
});

