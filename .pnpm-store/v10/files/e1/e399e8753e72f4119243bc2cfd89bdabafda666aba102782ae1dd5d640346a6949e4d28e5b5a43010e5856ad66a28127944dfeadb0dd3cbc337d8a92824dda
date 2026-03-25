'use strict';

const Packets = require('../packets/index.js');
const Command = require('./command.js');
const CloseStatement = require('./close_statement.js');
const Execute = require('./execute.js');

class PreparedStatementInfo {
  constructor(query, id, columns, parameters, connection) {
    this.query = query;
    this.id = id;
    this.columns = columns;
    this.parameters = parameters;
    this.rowParser = null;
    this._connection = connection;
  }

  close() {
    return this._connection.addCommand(new CloseStatement(this.id));
  }

  execute(parameters, callback) {
    if (typeof parameters === 'function') {
      callback = parameters;
      parameters = [];
    }
    return this._connection.addCommand(
      new Execute({ statement: this, values: parameters }, callback)
    );
  }
}

class Prepare extends Command {
  constructor(options, callback) {
    super();
    this.query = options.sql;
    this.onResult = callback;
    this.id = 0;
    this.fieldCount = 0;
    this.parameterCount = 0;
    this.fields = [];
    this.parameterDefinitions = [];
    this.options = options;
  }

  start(packet, connection) {
    const Connection = connection.constructor;
    this.key = Connection.statementKey(this.options);
    const statement = connection._statements.get(this.key);
    if (statement) {
      if (this.onResult) {
        this.onResult(null, statement);
      }
      return null;
    }
    const cmdPacket = new Packets.PrepareStatement(
      this.query,
      connection.config.charsetNumber,
      this.options.values
    );
    connection.writePacket(cmdPacket.toPacket(1));
    return Prepare.prototype.prepareHeader;
  }

  prepareHeader(packet, connection) {
    const header = new Packets.PreparedStatementHeader(packet);
    this.id = header.id;
    this.fieldCount = header.fieldCount;
    this.parameterCount = header.parameterCount;
    if (this.parameterCount > 0) {
      return Prepare.prototype.readParameter;
    }
    if (this.fieldCount > 0) {
      return Prepare.prototype.readField;
    }
    return this.prepareDone(connection);
  }

  readParameter(packet, connection) {
    // there might be scenarios when mysql server reports more parameters than
    // are actually present in the array of parameter definitions.
    // if EOF packet is received we switch to "read fields" state if there are
    // any fields reported by the server, otherwise we finish the command.
    if (packet.isEOF()) {
      if (this.fieldCount > 0) {
        return Prepare.prototype.readField;
      }
      return this.prepareDone(connection);
    }
    const def = new Packets.ColumnDefinition(packet, connection.clientEncoding);
    this.parameterDefinitions.push(def);
    if (this.parameterDefinitions.length === this.parameterCount) {
      return Prepare.prototype.parametersEOF;
    }
    return this.readParameter;
  }

  readField(packet, connection) {
    if (packet.isEOF()) {
      return this.prepareDone(connection);
    }
    const def = new Packets.ColumnDefinition(packet, connection.clientEncoding);
    this.fields.push(def);
    if (this.fields.length === this.fieldCount) {
      return Prepare.prototype.fieldsEOF;
    }
    return Prepare.prototype.readField;
  }

  parametersEOF(packet, connection) {
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet after parameters');
    }
    if (this.fieldCount > 0) {
      return Prepare.prototype.readField;
    }
    return this.prepareDone(connection);
  }

  fieldsEOF(packet, connection) {
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet after fields');
    }
    return this.prepareDone(connection);
  }

  prepareDone(connection) {
    const statement = new PreparedStatementInfo(
      this.query,
      this.id,
      this.fields,
      this.parameterDefinitions,
      connection
    );
    connection._statements.set(this.key, statement);
    if (this.onResult) {
      this.onResult(null, statement);
    }
    return null;
  }
}

module.exports = Prepare;
