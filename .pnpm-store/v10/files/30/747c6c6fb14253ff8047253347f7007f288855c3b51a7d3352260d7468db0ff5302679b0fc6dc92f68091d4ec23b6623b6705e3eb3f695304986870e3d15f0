'use strict';

const path = require('path');
const chai = require('chai');
const fs = require('fs');
const expect = chai.expect;
const assert = chai.assert;
//chai.use(require('./helpers/file'));

const tmpDir = "files/tmp/";
const tmpPath = function (relativePath) {
  return (tmpDir+relativePath).split(/\//).join(path.sep);
};

if (!fs.existsSync(path)) {
  fs.mkdirSync(tmpDir, {recursive: true});
}

const fixture = function(relativePath) {
  return ('files/fixtures/'+relativePath).split(/\//).join(path.sep);
};

// Class Under Test
const ConfigFile = require('../index').ConfigFile;

describe("ConfigFile", function() {

  describe("#read()", function () {

    describe("with a non-existing file", function() {
      const nonExistingFile = fixture('non-existing-config.js');
      const configFile = new ConfigFile(nonExistingFile);

      beforeEach(function(done) {
        if (fs.existsSync(nonExistingFile)) {
          fs.unlink(fixture('non-existing-config.js'), done);
        } else {
          done();
        }
      });

      it("it throws an error if file not found", function() {
        const read = function() {
          configFile.read();
        };

        expect(read).to.throw(/non-existing-config\.js/);
      });

      describe("when createIfNotExists() is used before", function() {
        beforeEach(function() {
          configFile.createIfNotExists();
        });

        it("returns a empty config", function() {
          const config = configFile.read();
          expect(config).to.exist.and.to.be.a('object').and.to.be.empty;
        });
      });
    });

    describe("with a requirejs.config() call with a define() in the file", function() {
      const configFile = new ConfigFile(fixture('config-with-define.js'));

      it("returns all the properties in the config", function() {
        const config = configFile.read();

        expect(config).to.include.keys('paths');
      });
    });


    describe("with a normal requirejs.config() call in the file", function() {
      const configFile = new ConfigFile(fixture('normal-config.js'));

      it("returns the config as an object", function() {
        const config = configFile.read();
        expect(config).to.exist.and.to.be.an('object');
      });

      it("returns all the properties in the config", function() {
        const config = configFile.read();

        expect(config).to.be.an('object').and.to.include.keys('paths');
      });
    });

    describe("with a var require definition", function() {
      const configFile = new ConfigFile(fixture('var-config.js'));

      it("returns the properties from config", function() {
        const config = configFile.read();
        expect(config).to.include.keys('paths');
      });
    });

    describe("with an parse error config", function() {
      const configFile = new ConfigFile(fixture('parse-error-config.js'));

      it("shows an error", function () {
        const read = function() {
          configFile.read();
        };

        expect(read).to.throw(/syntax error/);
      });
    });

    describe("with an empty config", function() {
      const configFile = new ConfigFile(fixture('empty-config.js'));

      it("reads the config file and returns an empty object without notice", function() {
        const config = configFile.read();

        expect(config).to.exist.and.to.be.a('object').and.to.be.empty;
      });
    });

    describe("with an alternative fs implementation", function() {

      const volumeDir = 'app';
      const fileName = 'in-memory-config.js';
      const filePath = `${volumeDir}/${fileName}`;

      const unionfs = require('unionfs');
      const memfs = require('memfs');
      var memFiles = { };
      var contents = fs.readFileSync(fixture('normal-config.js'), 'utf8');
      memFiles[fileName] = contents;
      var vol = memfs.Volume.fromJSON(memFiles, volumeDir);
      var ufs = unionfs.ufs.use(vol);

      const configFile = new ConfigFile(filePath, ufs);

      it("returns the config as an object", function() {
        const config = configFile.read();
        expect(config).to.exist.and.to.be.a('object').and.not.to.be.empty;
      });

      it("returns all the properties in the config", function() {
        const config = configFile.read();
        expect(config).to.be.an('object').and.to.include.keys('paths');
      });

    });
  });

  describe("#write()", function() {
    const testModify = function(configName, modify, done) {
      const configFilePath = tmpPath(configName);
      fs.copyFile(fixture(configName), configFilePath, function (err) {
        expect(err).to.not.exist;

        const configFile = new ConfigFile(configFilePath);

        const config = configFile.read();

        modify(config);

        configFile.write();

        const expectedContents = fs.readFileSync(fixture('modified-'+configName)).toString();
        const actualContents = fs.readFileSync(configFilePath).toString();

        assert.equal(actualContents, expectedContents);
        done();
      });
    };

    it('writes the file with the modified config for a normal config', function (done) {
      testModify(
        'normal-config.js',
        function (config) {
          config.paths['monster'] = '/path/to/monster';
        },
        done
      );
    });

    it('writes the file with the modified config for a var config', function (done) {
      testModify(
        'var-config.js',
        function (config) {
          config.paths['lodash'] = '/path/to/lodash.min';
        },
        done
      );
    });

    it("writes an empty read config with a requirejs.config call", function(done) {
      testModify(
        'empty-config.js',
        function (config) {
          return config.baseUrl = './js-build/lib';
        },
        done
      );
    });

    describe('with a non existing file which is createIfNotExists() before', function () {
      const nonExistingFile = fixture('non-existing-config.js');
      const configFile = new ConfigFile(nonExistingFile);

      beforeEach(function(done) {
        if (fs.existsSync(nonExistingFile)) {
          fs.unlink(fixture('non-existing-config.js'), done);
        } else {
          done();
        }
      });

      it("writes the file", function() {
        configFile.createIfNotExists();
        configFile.write();
      });

      it("writes the file and creates directories", function() {
        const nonExistingFile = tmpPath('in/directory/non-existing-config.js');
        const configFile = new ConfigFile(nonExistingFile);

        configFile.createIfNotExists();
        configFile.write();
      });
    });
  });
});
