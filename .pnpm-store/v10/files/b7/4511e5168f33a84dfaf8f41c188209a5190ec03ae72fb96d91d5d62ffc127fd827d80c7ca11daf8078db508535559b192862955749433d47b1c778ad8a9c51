'use strict';

const fs = require('fs');
const path = require('path');
const esprima = require('esprima');
const util = require('util');
const stringifyObject = require("stringify-object");

const noop = function(){};

function outputFileSync (filePath, contents, fileSystem = fs) {
  const dir = path.dirname(filePath);
  fileSystem.mkdirSync(dir, {recursive: true});
  fileSystem.writeFileSync(filePath, contents);
}

class ConfigFile {
  constructor(filePath, fileSystem = fs) {
    this.filePath = filePath;
    this.fileSystem = fileSystem;
    this.config = null;

    /**
     * null = never read
     * var = config was read with var require = {...}
     * requirejs = config was read with requirejs.config({...})
     * require = config was read with require.config({...})
     * empty = no config expression was found (but read() was called)
     * create-if-not-exists = createIfNotExists() was called so it might not have an existing file
     */
    this.type = null;

    /**
     * The position where the object expression should be written back to
     */
    this.range = null;

    this.contents = null;
  }

  /**
   * returns the config object from the read file
   */
  read() {
    try {
      const data = this.fileSystem.readFileSync(this.filePath);

      this.contents = data.toString();

    } catch (err) {
      if (err.code === 'ENOENT' && this.type === 'create-if-not-exists') {
        return this.config;
      } else {
        throw err;
      }
    }

    let program;

    try {
      program = esprima.parse(this.contents, {range: true});
    } catch (ex) {
      throw new Error(`could not read: ${this.filePath} because it has syntax errors: ${ex}`);
    }

    this.type = 'empty';
    if (program.type === 'Program') {
      program.body.forEach(statement => {

        if (statement.expression && statement.expression.type === 'CallExpression') {
          const call = statement.expression;

          if (call.callee.type === 'MemberExpression' && (call.callee.object.name === 'requirejs' || call.callee.object.name === 'require') && call.callee.property.name === 'config') {
            this.type = call.callee.object.name === 'require' ? 'require' : 'requirejs';
            this.readObjectExpression(call.arguments[0], noop);
            return false;
          }
        } else if(statement.type === 'VariableDeclaration') {
          statement.declarations.forEach(declarator => {
            if (declarator.id.name === 'require') {
              this.type = 'var';
              this.readObjectExpression(declarator.init, noop);
              return false;
            }
          });

          if (this.type === 'var') return false;
        }
      });
    }

    if (this.type === 'empty') {
      this.config = {};
    }

    return this.config;
  }

  write() {
    let contents;

    if (this.type === 'empty' || this.type === 'create-if-not-exists') {
      contents = util.format("/* globals requirejs */\nrequirejs.config(%s);\n", this.buildConfig());

    } else {

      if (!this.range) {
        throw new Error('The config cannot be written. Was it read() before? The config expression has to be found to allow writing. You can use createIfNotExists() to create an empty config.');
      }

      contents = this.contents.substring(0, this.range[0]) + this.buildConfig() + this.contents.substring(this.range[1]);
    }

    outputFileSync(this.filePath, contents, this.fileSystem);
  }

  /**
   * Creates the config(File) if not already existing
   *
   * notice: you still need to write() it to have a physical existing file.
   */
  createIfNotExists(config = {}) {
    this.config = config;
    this.type = 'create-if-not-exists';
  }

  buildConfig() {
    return stringifyObject(
      this.config,
      {
        indent: '  '
      }
    );
  }

  readObjectExpression(objectExpression, callback) {
    /* jshint evil:true */
    if (objectExpression && objectExpression.type === 'ObjectExpression') {
      try {
        this.config = eval(`(${this.contents.substring(objectExpression.range[0], objectExpression.range[1])})`);

      } catch (syntaxError) {
        return callback(syntaxError, null);
      }

      this.range = objectExpression.range;
      return callback(null, this.config);
    }

    return callback('cannot read objectExpression from '+util.inspect(objectExpression));
  }
}

module.exports = {ConfigFile};
