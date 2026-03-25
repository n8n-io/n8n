'use strict';

const utils = require('./utils');
const clientCommandMessageReg = /ERR unknown command ['`]\s*client\s*['`]/;

module.exports = function(Queue) {
  // IDEA, How to store metadata associated to a worker.
  // create a key from the worker ID associated to the given name.
  // We keep a hash table bull:myqueue:workers where every worker is a hash key workername:workerId with json holding
  // metadata of the worker. The worker key gets expired every 30 seconds or so, we renew the worker metadata.
  //
  Queue.prototype.setWorkerName = function() {
    return utils
      .isRedisReady(this.client)
      .then(() => {
        const connectionName = this.clientName();
        this.bclient.options.connectionName = connectionName;
        return this.bclient.client('setname', connectionName);
      })
      .catch(err => {
        if (!clientCommandMessageReg.test(err.message)) throw err;
      });
  };

  Queue.prototype.getWorkers = function() {
    return utils
      .isRedisReady(this.client)
      .then(() => {
        return this.client.client('list');
      })
      .then(clients => {
        return this.parseClientList(clients);
      })
      .catch(err => {
        if (!clientCommandMessageReg.test(err.message)) throw err;
      });
  };

  Queue.prototype.base64Name = function() {
    return Buffer.from(this.name).toString('base64');
  };

  Queue.prototype.clientName = function() {
    return this.keyPrefix + ':' + this.base64Name();
  };

  Queue.prototype.parseClientList = function(list) {
    const lines = list.split('\n');
    const clients = [];

    lines.forEach(line => {
      const client = {};
      const keyValues = line.split(' ');
      keyValues.forEach(keyValue => {
        const index = keyValue.indexOf('=');
        const key = keyValue.substring(0, index);
        const value = keyValue.substring(index + 1);
        client[key] = value;
      });
      const name = client['name'];
      if (name && name.startsWith(this.clientName())) {
        client['name'] = this.name;
        clients.push(client);
      }
    });
    return clients;
  };
};
