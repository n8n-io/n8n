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

let path = require('path');
let fs = require('fs');
let exec = require('child_process').exec;
let FileList = require('filelist').FileList;

/**
  @name jake
  @namespace jake
*/
/**
  @name jake.PackageTask
  @constructor
  @description Instantiating a PackageTask creates a number of Jake
  Tasks that make packaging and distributing your software easy.

  @param {String} name The name of the project
  @param {String} version The current project version (will be
  appended to the project-name in the package-archive
  @param {Function} definition Defines the contents of the package,
  and format of the package-archive. Will be executed on the instantiated
  PackageTask (i.e., 'this', will be the PackageTask instance),
  to set the various instance-propertiess.

  @example
  let t = new jake.PackageTask('rous', 'v' + version, function () {
    let files = [
      'Capfile'
    , 'Jakefile'
    , 'README.md'
    , 'package.json'
    , 'app/*'
    , 'bin/*'
    , 'config/*'
    , 'lib/*'
    , 'node_modules/*'
    ];
    this.packageFiles.include(files);
    this.packageFiles.exclude('node_modules/foobar');
    this.needTarGz = true;
  });

 */
let PackageTask = function () {
  let args = Array.prototype.slice.call(arguments);
  let name = args.shift();
  let version = args.shift();
  let definition = args.pop();
  let prereqs = args.pop() || []; // Optional

  prereqs = [].concat(prereqs); // Accept string or list

  /**
    @name jake.PackageTask#name
    @public
    @type {String}
    @description The name of the project
   */
  this.name = name;
  /**
    @name jake.PackageTask#version
    @public
    @type {String}
    @description The project version-string
   */
  this.version = version;
  /**
    @name jake.PackageTask#prereqs
    @public
    @type {Array}
    @description Tasks to run before packaging
   */
  this.prereqs = prereqs;
  /**
    @name jake.PackageTask#packageDir
    @public
    @type {String='pkg'}
    @description The directory-name to use for packaging the software
   */
  this.packageDir = 'pkg';
  /**
    @name jake.PackageTask#packageFiles
    @public
    @type {jake.FileList}
    @description The list of files and directories to include in the
    package-archive
   */
  this.packageFiles = new FileList();
  /**
    @name jake.PackageTask#needTar
    @public
    @type {Boolean=false}
    @description If set to true, uses the `tar` utility to create
    a gzip .tgz archive of the package
   */
  this.needTar = false;
  /**
    @name jake.PackageTask#needTarGz
    @public
    @type {Boolean=false}
    @description If set to true, uses the `tar` utility to create
    a gzip .tar.gz archive of the package
   */
  this.needTarGz = false;
  /**
    @name jake.PackageTask#needTarBz2
    @public
    @type {Boolean=false}
    @description If set to true, uses the `tar` utility to create
    a bzip2 .bz2 archive of the package
   */
  this.needTarBz2 = false;
  /**
    @name jake.PackageTask#needJar
    @public
    @type {Boolean=false}
    @description If set to true, uses the `jar` utility to create
    a .jar archive of the package
   */
  this.needJar = false;
  /**
    @name jake.PackageTask#needZip
    @public
    @type {Boolean=false}
    @description If set to true, uses the `zip` utility to create
    a .zip archive of the package
   */
  this.needZip = false;
  /**
    @name jake.PackageTask#manifestFile
    @public
    @type {String=null}
    @description Can be set to point the `jar` utility at a manifest
    file to use in a .jar archive. If unset, one will be automatically
    created by the `jar` utility. This path should be relative to the
    root of the package directory (this.packageDir above, likely 'pkg')
   */
  this.manifestFile = null;
  /**
    @name jake.PackageTask#tarCommand
    @public
    @type {String='tar'}
    @description The shell-command to use for creating tar archives.
   */
  this.tarCommand = 'tar';
  /**
    @name jake.PackageTask#jarCommand
    @public
    @type {String='jar'}
    @description The shell-command to use for creating jar archives.
   */
  this.jarCommand = 'jar';
  /**
    @name jake.PackageTask#zipCommand
    @public
    @type {String='zip'}
    @description The shell-command to use for creating zip archives.
   */
  this.zipCommand = 'zip';
  /**
    @name jake.PackageTask#archiveNoBaseDir
    @public
    @type {Boolean=false}
    @description Simple option for performing the archive on the
    contents of the directory instead of the directory itself
   */
  this.archiveNoBaseDir = false;
  /**
    @name jake.PackageTask#archiveChangeDir
    @public
    @type {String=null}
    @description Equivalent to the '-C' command for the `tar` and `jar`
    commands. ("Change to this directory before adding files.")
   */
  this.archiveChangeDir = null;
  /**
    @name jake.PackageTask#archiveContentDir
    @public
    @type {String=null}
    @description Specifies the files and directories to include in the
    package-archive. If unset, this will default to the main package
    directory -- i.e., name + version.
   */
  this.archiveContentDir = null;

  if (typeof definition == 'function') {
    definition.call(this);
  }
  this.define();
};

PackageTask.prototype = new (function () {

  let _compressOpts = {
    Tar: {
      ext: '.tgz',
      flags: 'czf',
      cmd: 'tar'
    },
    TarGz: {
      ext: '.tar.gz',
      flags: 'czf',
      cmd: 'tar'
    },
    TarBz2: {
      ext: '.tar.bz2',
      flags: 'cjf',
      cmd: 'tar'
    },
    Jar: {
      ext: '.jar',
      flags: 'cf',
      cmd: 'jar'
    },
    Zip: {
      ext: '.zip',
      flags: 'qr',
      cmd: 'zip'
    }
  };

  this.define = function () {
    let self = this;
    let packageDirPath = this.packageDirPath();
    let compressTaskArr = [];

    desc('Build the package for distribution');
    task('package', self.prereqs.concat(['clobberPackage', 'buildPackage']));
    // Backward-compat alias
    task('repackage', ['package']);

    task('clobberPackage', function () {
      jake.rmRf(self.packageDir, {silent: true});
    });

    desc('Remove the package');
    task('clobber', ['clobberPackage']);

    let doCommand = function (p) {
      let filename = path.resolve(self.packageDir + '/' + self.packageName() +
                                  _compressOpts[p].ext);
      if (process.platform == 'win32') {
        // Windows full path may have drive letter, which is going to cause
        // namespace problems, so strip it.
        if (filename.length > 2 && filename[1] == ':') {
          filename = filename.substr(2);
        }
      }
      compressTaskArr.push(filename);

      file(filename, [packageDirPath], function () {
        let cmd;
        let opts = _compressOpts[p];
        // Directory to move to when doing the compression-task
        // Changes in the case of zip for emulating -C option
        let chdir = self.packageDir;
        // Save the current dir so it's possible to pop back up
        // after compressing
        let currDir = process.cwd();
        let archiveChangeDir;
        let archiveContentDir;

        if (self.archiveNoBaseDir) {
          archiveChangeDir = self.packageName();
          archiveContentDir = '.';
        }
        else {
          archiveChangeDir = self.archiveChangeDir;
          archiveContentDir = self.archiveContentDir;
        }

        cmd = self[opts.cmd + 'Command'];
        cmd += ' -' + opts.flags;
        if (opts.cmd == 'jar' && self.manifestFile) {
          cmd += 'm';
        }

        // The name of the archive to create -- use full path
        // so compression can be performed from a different dir
        // if needed
        cmd += ' ' + filename;

        if (opts.cmd == 'jar' && self.manifestFile) {
          cmd += ' ' + self.manifestFile;
        }

        // Where to perform the compression -- -C option isn't
        // supported in zip, so actually do process.chdir for this
        if (archiveChangeDir) {
          if (opts.cmd == 'zip') {
            chdir = path.join(chdir, archiveChangeDir);
          }
          else {
            cmd += ' -C ' + archiveChangeDir;
          }
        }

        // Where to get the archive content
        if (archiveContentDir) {
          cmd += ' ' + archiveContentDir;
        }
        else {
          cmd += ' ' + self.packageName();
        }

        // Move into the desired dir (usually packageDir) to compress
        // Return back up to the current dir after the exec
        process.chdir(chdir);

        exec(cmd, function (err, stdout, stderr) {
          if (err) { throw err; }

          // Return back up to the starting directory (see above,
          // before exec)
          process.chdir(currDir);

          complete();
        });
      }, {async: true});
    };

    for (let p in _compressOpts) {
      if (this['need' + p]) {
        doCommand(p);
      }
    }

    task('buildPackage', compressTaskArr, function () {});

    directory(this.packageDir);

    file(packageDirPath, this.packageFiles, function () {
      jake.mkdirP(packageDirPath);
      let fileList = [];
      self.packageFiles.forEach(function (name) {
        let f = path.join(self.packageDirPath(), name);
        let fDir = path.dirname(f);
        jake.mkdirP(fDir, {silent: true});

        // Add both files and directories
        fileList.push({
          from: name,
          to: f
        });
      });
      let _copyFile = function () {
        let file = fileList.pop();
        let stat;
        if (file) {
          stat = fs.statSync(file.from);
          // Target is a directory, just create it
          if (stat.isDirectory()) {
            jake.mkdirP(file.to, {silent: true});
            _copyFile();
          }
          // Otherwise copy the file
          else {
            jake.cpR(file.from, file.to, {silent: true});
            _copyFile();
          }
        }
        else {
          complete();
        }
      };
      _copyFile();
    }, {async: true});


  };

  this.packageName = function () {
    if (this.version) {
      return this.name + '-' + this.version;
    }
    else {
      return this.name;
    }
  };

  this.packageDirPath = function () {
    return this.packageDir + '/' + this.packageName();
  };

})();

jake.PackageTask = PackageTask;
exports.PackageTask = PackageTask;

