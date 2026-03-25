'use strict';

const Command = require('./command.js');
const Query = require('./query.js');
const Packets = require('../packets/index.js');

const getBinaryParser = require('../parsers/binary_parser.js');
const getStaticBinaryParser = require('../parsers/static_binary_parser.js');

class Execute extends Command {
  constructor(options, callback) {
    super();
    this.statement = options.statement;
    this.sql = options.sql;
    this.values = options.values;
    this.onResult = callback;
    this.parameters = options.values;
    this.insertId = 0;
    this.timeout = options.timeout;
    this.queryTimeout = null;
    this._rows = [];
    this._fields = [];
    this._result = [];
    this._fieldCount = 0;
    this._rowParser = null;
    this._executeOptions = options;
    this._resultIndex = 0;
    this._localStream = null;
    this._unpipeStream = function () {};
    this._streamFactory = options.infileStreamFactory;
    this._connection = null;
  }

  buildParserFromFields(fields, connection) {
    if (this.options.disableEval) {
      return getStaticBinaryParser(fields, this.options, connection.config);
    }

    return getBinaryParser(fields, this.options, connection.config);
  }

  start(packet, connection) {
    this._connection = connection;
    this.options = Object.assign({}, connection.config, this._executeOptions);
    this._setTimeout();
    const executePacket = new Packets.Execute(
      this.statement.id,
      this.parameters,
      connection.config.charsetNumber,
      connection.config.timezone
    );
    //For reasons why this try-catch is here, please see
    // https://github.com/sidorares/node-mysql2/pull/689
    //For additional discussion, see
    // 1. https://github.com/sidorares/node-mysql2/issues/493
    // 2. https://github.com/sidorares/node-mysql2/issues/187
    // 3. https://github.com/sidorares/node-mysql2/issues/480
    try {
      connection.writePacket(executePacket.toPacket(1));
    } catch (error) {
      this.onResult(error);
    }
    return Execute.prototype.resultsetHeader;
  }

  readField(packet, connection) {
    let fields;
    // disabling for now, but would be great to find reliable way to parse fields only once
    // fields reported by prepare can be empty at all or just incorrect - see #169
    //
    // perfomance optimisation: if we already have this field parsed in statement header, use one from header
    // const field = this.statement.columns.length == this._fieldCount ?
    //  this.statement.columns[this._receivedFieldsCount] : new Packets.ColumnDefinition(packet);
    const field = new Packets.ColumnDefinition(
      packet,
      connection.clientEncoding
    );
    this._receivedFieldsCount++;
    this._fields[this._resultIndex].push(field);
    if (this._receivedFieldsCount === this._fieldCount) {
      fields = this._fields[this._resultIndex];
      this.emit('fields', fields, this._resultIndex);
      return Execute.prototype.fieldsEOF;
    }
    return Execute.prototype.readField;
  }

  fieldsEOF(packet, connection) {
    // check EOF
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet');
    }
    this._rowParser = new (this.buildParserFromFields(
      this._fields[this._resultIndex],
      connection
    ))();
    return Execute.prototype.row;
  }
}

Execute.prototype.done = Query.prototype.done;
Execute.prototype.doneInsert = Query.prototype.doneInsert;
Execute.prototype.resultsetHeader = Query.prototype.resultsetHeader;
Execute.prototype._findOrCreateReadStream =
  Query.prototype._findOrCreateReadStream;
Execute.prototype._streamLocalInfile = Query.prototype._streamLocalInfile;
Execute.prototype._setTimeout = Query.prototype._setTimeout;
Execute.prototype._handleTimeoutError = Query.prototype._handleTimeoutError;
Execute.prototype.row = Query.prototype.row;
Execute.prototype.stream = Query.prototype.stream;

module.exports = Execute;
