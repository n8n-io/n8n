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

let fs = require('fs');
let path = require('path');
let exec = require('child_process').execSync;
let FileList = require('filelist').FileList;

let PublishTask = function () {
  let args = Array.prototype.slice.call(arguments).filter(function (item) {
    return typeof item != 'undefined';
  });
  let arg;
  let opts = {};
  let definition;
  let prereqs = [];
  let createDef = function (arg) {
    return function () {
      this.packageFiles.include(arg);
    };
  };

  this.name = args.shift();

  // Old API, just name + list of files
  if (args.length == 1 && (Array.isArray(args[0]) || typeof args[0] == 'string')) {
    definition = createDef(args.pop());
  }
  // Current API, name + [prereqs] + [opts] + definition
  else {
    while ((arg = args.pop())) {
      // Definition func
      if (typeof arg == 'function') {
        definition = arg;
      }
      // Prereqs
      else if (Array.isArray(arg) || typeof arg == 'string') {
        prereqs = arg;
      }
      // Opts
      else {
        opts = arg;
      }
    }
  }

  this.prereqs = prereqs;
  this.packageFiles = new FileList();
  this.publishCmd = opts.publishCmd || 'npm publish %filename';
  this.publishMessage = opts.publishMessage || 'BOOM! Published.';
  this.gitCmd = opts.gitCmd || 'git';
  this.versionFiles = opts.versionFiles || ['package.json'];
  this.scheduleDelay = 5000;

  // Override utility funcs for testing
  this._ensureRepoClean = function (stdout) {
    if (stdout.length) {
      fail(new Error('Git repository is not clean.'));
    }
  };
  this._getCurrentBranch = function (stdout) {
    return String(stdout).trim();
  };

  if (typeof definition == 'function') {
    definition.call(this);
  }
  this.define();
};


PublishTask.prototype = new (function () {

  let _currentBranch = null;

  let getPackage = function () {
    let pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(),
      '/package.json')).toString());
    return pkg;
  };
  let getPackageVersionNumber = function () {
    return getPackage().version;
  };

  this.define = function () {
    let self = this;

    namespace('publish', function () {
      task('fetchTags', function () {
        // Make sure local tags are up to date
        exec(self.gitCmd + ' fetch --tags');
        console.log('Fetched remote tags.');
      });

      task('getCurrentBranch', function () {
        // Figure out what branch to push to
        let stdout = exec(self.gitCmd + ' symbolic-ref --short HEAD').toString();
        if (!stdout) {
          throw new Error('No current Git branch found');
        }
        _currentBranch = self._getCurrentBranch(stdout);
        console.log('On branch ' + _currentBranch);
      });

      task('ensureClean', function () {
        // Only bump, push, and tag if the Git repo is clean
        let stdout = exec(self.gitCmd + ' status --porcelain --untracked-files=no').toString();
        // Throw if there's output
        self._ensureRepoClean(stdout);
      });

      task('updateVersionFiles', function () {
        let pkg;
        let version;
        let arr;
        let patch;

        // Grab the current version-string
        pkg = getPackage();
        version = pkg.version;
        // Increment the patch-number for the version
        arr = version.split('.');
        patch = parseInt(arr.pop(), 10) + 1;
        arr.push(patch);
        version = arr.join('.');

        // Update package.json or other files with the new version-info
        self.versionFiles.forEach(function (file) {
          let p = path.join(process.cwd(), file);
          let data = JSON.parse(fs.readFileSync(p).toString());
          data.version = version;
          fs.writeFileSync(p, JSON.stringify(data, true, 2) + '\n');
        });
        // Return the version string so that listeners for the 'complete' event
        // for this task can use it (e.g., to update other files before pushing
        // to Git)
        return version;
      });

      task('pushVersion', ['ensureClean', 'updateVersionFiles'], function () {
        let version = getPackageVersionNumber();
        let message = 'Version ' + version;
        let cmds = [
          self.gitCmd + ' commit -a -m "' + message + '"',
          self.gitCmd + ' push origin ' + _currentBranch,
          self.gitCmd + ' tag -a v' + version + ' -m "' + message + '"',
          self.gitCmd + ' push --tags'
        ];
        cmds.forEach((cmd) => {
          exec(cmd);
        });
        version = getPackageVersionNumber();
        console.log('Bumped version number to v' + version + '.');
      });

      let defineTask = task('definePackage', function () {
        let version = getPackageVersionNumber();
        new jake.PackageTask(self.name, 'v' + version, self.prereqs, function () {
          // Replace the PackageTask's FileList with the PublishTask's FileList
          this.packageFiles = self.packageFiles;
          this.needTarGz = true; // Default to tar.gz
          // If any of the need<CompressionFormat> or archive opts are set
          // proxy them to the PackageTask
          for (let p in this) {
            if (p.indexOf('need') === 0 || p.indexOf('archive') === 0) {
              if (typeof self[p] != 'undefined') {
                this[p] = self[p];
              }
            }
          }
        });
      });
      defineTask._internal = true;

      task('package', function () {
        let definePack = jake.Task['publish:definePackage'];
        let pack = jake.Task['package'];
        let version = getPackageVersionNumber();

        // May have already been run
        if (definePack.taskStatus == jake.Task.runStatuses.DONE) {
          definePack.reenable(true);
        }
        definePack.execute();
        definePack.on('complete', function () {
          pack.invoke();
          console.log('Created package for ' + self.name + ' v' + version);
        });
      });

      task('publish', function () {
        return new Promise((resolve) => {
          let version = getPackageVersionNumber();
          let filename;
          let cmd;

          console.log('Publishing ' + self.name + ' v' + version);

          if (typeof self.createPublishCommand == 'function') {
            cmd = self.createPublishCommand(version);
          }
          else {
            filename = './pkg/' + self.name + '-v' + version + '.tar.gz';
            cmd = self.publishCmd.replace(/%filename/gi, filename);
          }

          if (typeof cmd == 'function') {
            cmd(function (err) {
              if (err) {
                throw err;
              }
              console.log(self.publishMessage);
              resolve();
            });
          }
          else {
            // Hackity hack -- NPM publish sometimes returns errror like:
            // Error sending version data\nnpm ERR!
            // Error: forbidden 0.2.4 is modified, should match modified time
            setTimeout(function () {
              let stdout = exec(cmd).toString() || '';
              stdout = stdout.trim();
              if (stdout) {
                console.log(stdout);
              }
              console.log(self.publishMessage);
              resolve();
            }, self.scheduleDelay);
          }
        });
      });

      task('cleanup', function () {
        return new Promise((resolve) => {
          let clobber = jake.Task.clobber;
          clobber.reenable(true);
          clobber.on('complete', function () {
            console.log('Cleaned up package');
            resolve();
          });
          clobber.invoke();
        });
      });

    });

    let prefixNs = function (item) {
      return 'publish:' + item;
    };

    // Create aliases in the default namespace
    desc('Create a new version and release.');
    task('publish', self.prereqs.concat(['version', 'release']
      .map(prefixNs)));

    desc('Release the existing version.');
    task('publishExisting', self.prereqs.concat(['release']
      .map(prefixNs)));

    task('version', ['fetchTags', 'getCurrentBranch', 'pushVersion']
      .map(prefixNs));

    task('release', ['package', 'publish', 'cleanup']
      .map(prefixNs));

    // Invoke proactively so there will be a callable 'package' task
    // which can be used apart from 'publish'
    jake.Task['publish:definePackage'].invoke();
  };

})();

jake.PublishTask = PublishTask;
exports.PublishTask = PublishTask;

