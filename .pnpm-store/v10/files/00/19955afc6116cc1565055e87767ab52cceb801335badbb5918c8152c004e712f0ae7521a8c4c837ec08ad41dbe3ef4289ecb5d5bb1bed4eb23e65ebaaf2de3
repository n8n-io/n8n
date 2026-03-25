const Logger = require('../logger');

const fs = require('fs');

const Statement = require('./statement');
const { isString } = require('util');

const STAGE_NAME = 'SYSTEM$BIND';
const CREATE_STAGE_STMT = 'CREATE OR REPLACE TEMPORARY STAGE '
	+ STAGE_NAME
	+ ' file_format=( type=csv field_optionally_enclosed_by=\'"\')';
	
/**
 * Creates a new BindUploader.
 *
 * @param {Object} options
 * @param {Object} services
 * @param {Object} connectionConfig
 * @param {*} requestId 
 *
 * @constructor
 */
 
function BindUploader(options, services, connectionConfig, requestId) {
  const MAX_BUFFER_SIZE = 1024 * 1024 * 100;

  Logger.getInstance().debug('BindUploaders');
  this.options = options;
  this.services = services;
  this.connectionConfig = connectionConfig;
  this.requestId = requestId;
  this.stagePath = '@' + STAGE_NAME + '/' + requestId;
  Logger.getInstance().debug('token = %s', connectionConfig.getToken());

  this.createStage = async function () {
    const createStageOptions = { sqlText: GetCreateStageStmt() };
    const newContext = Statement.createContext(createStageOptions, this.services, this.connectionConfig);
    if (this.connectionConfig.getForceStageBindError() === 0) {
      throw new Error('Failed to create stage');
    }
    const ret = await Statement.sendRequest(newContext);
    if (ret['status'] !== 200) {
      throw new Error('Failed to create stage');
    }
  };

  this.uploadFilestream = async function (fileName, fileData) {
    Logger.getInstance().debug('BindUploaders::uploadFilestream');
    const stageName = this.stagePath;
    if (stageName == null) {
      throw new Error('Stage name is null.');
    }
    if (fileName == null) {
      throw new Error('File name is null.');
    }
    if (this.connectionConfig.getForceStageBindError() === 1) {
      throw new Error('Failed to upload file');
    }

    await new Promise((resolve, reject) => {
      const putStmt = 'PUT file://' + fileName + '\'' + stageName + '\' overwrite=true auto_compress=false source_compression=gzip';
      const uploadFileOptions = {
        sqlText: putStmt, fileStream: fileData,
        complete: function (err, stmt) {
          if (err) {
            Logger.getInstance().debug('err ' + err);
            reject(err);
          }
          Logger.getInstance().debug('uploadFiles done ');
          resolve(stmt.streamRows());
        }
      };
      Statement.createStatementPreExec(uploadFileOptions, this.services, this.connectionConfig);
    });
  };

  this.Upload = async function (bindings) {
    Logger.getInstance().debug('BindUploaders::Upload');
	
    if (bindings == null) {
      return null; 
    }
    if (!this.services.sf.isStageCreated) {
      await this.createStage();
      this.services.sf.isStageCreated = true;
    }
	
    let fileCount = 0;
    let strbuffer = '';
		
    for (let i = 0; i < bindings.length; i++) {
      for (let j = 0; j < bindings[i].length; j++) {
        if (j > 0) {
          strbuffer += ','; 
        }
        const value = this.cvsData(bindings[i][j]);
        strbuffer += value;
      }
      strbuffer += '\n';

      if ((strbuffer.length >= MAX_BUFFER_SIZE) || (i === bindings.length - 1)) {
        const fileName = (++fileCount).toString();
        Logger.getInstance().debug('fileName=' + fileName);
        await this.uploadFilestream(fileName, strbuffer);
        strbuffer = '';
      }
    }
  };
	
  this.cvsData = function (data) {
    if (data == null || data.toString() === '') {
      return '""'; 
    }
    if (!isString(data)) {
      if (data instanceof Date) {
        data = data.toJSON();
      } else {
        data = JSON.stringify(data);
      }
    }
    if (data.toString().indexOf('"') >= 0
			|| data.toString().indexOf(',') >= 0	
			|| data.toString().indexOf('\\') >= 0
			|| data.toString().indexOf('\n') >= 0
			|| data.toString().indexOf('\t') >= 0) {
      return '"' + data.toString().replaceAll('"', '""') + '"'; 
    } else {
      return data; 
    }
  };
}

function GetCreateStageStmt() {
  return CREATE_STAGE_STMT;
}

function GetStageName(requestId) {
  return '@' + STAGE_NAME + '/' + requestId;
}

function CleanFile(fileName) {
  try {
    if (fs.existsSync(fileName)) {
      fs.unlinkSync(fileName);
    }
  } catch (err) {
    Logger.getInstance().debug('Delete file failed: %s', fileName);
  }
}

module.exports = { BindUploader, GetCreateStageStmt, GetStageName, CleanFile };