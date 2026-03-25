'use strict';

const {
  AgentProtocol,
  BaseAgent,
  createAgent,
  CygwinAgent,
  OpenSSHAgent,
  PageantAgent,
} = require('./agent.js');
const {
  SSHTTPAgent: HTTPAgent,
  SSHTTPSAgent: HTTPSAgent,
} = require('./http-agents.js');
const { parseKey } = require('./protocol/keyParser.js');
const {
  flagsToString,
  OPEN_MODE,
  STATUS_CODE,
  stringToFlags,
} = require('./protocol/SFTP.js');

module.exports = {
  AgentProtocol,
  BaseAgent,
  createAgent,
  Client: require('./client.js'),
  CygwinAgent,
  HTTPAgent,
  HTTPSAgent,
  OpenSSHAgent,
  PageantAgent,
  Server: require('./server.js'),
  utils: {
    parseKey,
    ...require('./keygen.js'),
    sftp: {
      flagsToString,
      OPEN_MODE,
      STATUS_CODE,
      stringToFlags,
    },
  },
};
