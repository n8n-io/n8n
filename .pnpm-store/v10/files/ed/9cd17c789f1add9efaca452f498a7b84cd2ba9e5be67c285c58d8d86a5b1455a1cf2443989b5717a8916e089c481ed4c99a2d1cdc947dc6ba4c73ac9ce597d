'use strict';

const process = require('process');
const Timers = require('timers');

const Readable = require('stream').Readable;

const Command = require('./command.js');
const Packets = require('../packets/index.js');
const getTextParser = require('../parsers/text_parser.js');
const staticParser = require('../parsers/static_text_parser.js');
const ServerStatus = require('../constants/server_status.js');

const EmptyPacket = new Packets.Packet(0, Buffer.allocUnsafe(4), 0, 4);

// http://dev.mysql.com/doc/internals/en/com-query.html
class Query extends Command {
  constructor(options, callback) {
    super();
    this.sql = options.sql;
    this.values = options.values;
    this._queryOptions = options;
    this.namedPlaceholders = options.namedPlaceholders || false;
    this.onResult = callback;
    this.timeout = options.timeout;
    this.queryTimeout = null;
    this._fieldCount = 0;
    this._rowParser = null;
    this._fields = [];
    this._rows = [];
    this._receivedFieldsCount = 0;
    this._resultIndex = 0;
    this._localStream = null;
    this._unpipeStream = function () {};
    this._streamFactory = options.infileStreamFactory;
    this._connection = null;
  }

  then() {
    const err =
      "You have tried to call .then(), .catch(), or invoked await on the result of query that is not a promise, which is a programming error. Try calling con.promise().query(), or require('mysql2/promise') instead of 'mysql2' for a promise-compatible version of the query interface. To learn how to use async/await or Promises check out documentation at https://sidorares.github.io/node-mysql2/docs#using-promise-wrapper, or the mysql2 documentation at https://sidorares.github.io/node-mysql2/docs/documentation/promise-wrapper";

    console.log(err);
    throw new Error(err);
  }

  /* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
  start(_packet, connection) {
    if (connection.config.debug) {
      console.log('        Sending query command: %s', this.sql);
    }
    this._connection = connection;
    this.options = Object.assign({}, connection.config, this._queryOptions);
    this._setTimeout();

    const cmdPacket = new Packets.Query(
      this.sql,
      connection.config.charsetNumber
    );
    connection.writePacket(cmdPacket.toPacket(1));
    return Query.prototype.resultsetHeader;
  }

  done() {
    this._unpipeStream();
    // if all ready timeout, return null directly
    if (this.timeout && !this.queryTimeout) {
      return null;
    }
    // else clear timer
    if (this.queryTimeout) {
      Timers.clearTimeout(this.queryTimeout);
      this.queryTimeout = null;
    }
    if (this.onResult) {
      let rows, fields;
      if (this._resultIndex === 0) {
        rows = this._rows[0];
        fields = this._fields[0];
      } else {
        rows = this._rows;
        fields = this._fields;
      }
      if (fields) {
        process.nextTick(() => {
          this.onResult(null, rows, fields);
        });
      } else {
        process.nextTick(() => {
          this.onResult(null, rows);
        });
      }
    }
    return null;
  }

  doneInsert(rs) {
    if (this._localStreamError) {
      if (this.onResult) {
        this.onResult(this._localStreamError, rs);
      } else {
        this.emit('error', this._localStreamError);
      }
      return null;
    }
    this._rows.push(rs);
    this._fields.push(void 0);
    this.emit('fields', void 0);
    this.emit('result', rs);
    if (rs.serverStatus & ServerStatus.SERVER_MORE_RESULTS_EXISTS) {
      this._resultIndex++;
      return this.resultsetHeader;
    }
    return this.done();
  }

  resultsetHeader(packet, connection) {
    const rs = new Packets.ResultSetHeader(packet, connection);
    this._fieldCount = rs.fieldCount;
    if (connection.config.debug) {
      console.log(
        `        Resultset header received, expecting ${rs.fieldCount} column definition packets`
      );
    }
    if (this._fieldCount === 0) {
      return this.doneInsert(rs);
    }
    if (this._fieldCount === null) {
      return this._streamLocalInfile(connection, rs.infileName);
    }
    this._receivedFieldsCount = 0;
    this._rows.push([]);
    this._fields.push([]);
    return this.readField;
  }

  _streamLocalInfile(connection, path) {
    if (this._streamFactory) {
      this._localStream = this._streamFactory(path);
    } else {
      this._localStreamError = new Error(
        `As a result of LOCAL INFILE command server wants to read ${path} file, but as of v2.0 you must provide streamFactory option returning ReadStream.`
      );
      connection.writePacket(EmptyPacket);
      return this.infileOk;
    }

    const onConnectionError = () => {
      this._unpipeStream();
    };
    const onDrain = () => {
      this._localStream.resume();
    };
    const onPause = () => {
      this._localStream.pause();
    };
    const onData = function (data) {
      const dataWithHeader = Buffer.allocUnsafe(data.length + 4);
      data.copy(dataWithHeader, 4);
      connection.writePacket(
        new Packets.Packet(0, dataWithHeader, 0, dataWithHeader.length)
      );
    };
    const onEnd = () => {
      connection.removeListener('error', onConnectionError);
      connection.writePacket(EmptyPacket);
    };
    const onError = (err) => {
      this._localStreamError = err;
      connection.removeListener('error', onConnectionError);
      connection.writePacket(EmptyPacket);
    };
    this._unpipeStream = () => {
      connection.stream.removeListener('pause', onPause);
      connection.stream.removeListener('drain', onDrain);
      this._localStream.removeListener('data', onData);
      this._localStream.removeListener('end', onEnd);
      this._localStream.removeListener('error', onError);
    };
    connection.stream.on('pause', onPause);
    connection.stream.on('drain', onDrain);
    this._localStream.on('data', onData);
    this._localStream.on('end', onEnd);
    this._localStream.on('error', onError);
    connection.once('error', onConnectionError);
    return this.infileOk;
  }

  readField(packet, connection) {
    this._receivedFieldsCount++;
    // Often there is much more data in the column definition than in the row itself
    // If you set manually _fields[0] to array of ColumnDefinition's (from previous call)
    // you can 'cache' result of parsing. Field packets still received, but ignored in that case
    // this is the reason _receivedFieldsCount exist (otherwise we could just use current length of fields array)
    if (this._fields[this._resultIndex].length !== this._fieldCount) {
      const field = new Packets.ColumnDefinition(
        packet,
        connection.clientEncoding
      );
      this._fields[this._resultIndex].push(field);
      if (connection.config.debug) {
        console.log('        Column definition:');
        console.log(`          name: ${field.name}`);
        console.log(`          type: ${field.columnType}`);
        console.log(`         flags: ${field.flags}`);
      }
    }
    // last field received
    if (this._receivedFieldsCount === this._fieldCount) {
      const fields = this._fields[this._resultIndex];
      this.emit('fields', fields);
      if (this.options.disableEval) {
        this._rowParser = staticParser(fields, this.options, connection.config);
      } else {
        this._rowParser = new (getTextParser(
          fields,
          this.options,
          connection.config
        ))(fields);
      }
      return Query.prototype.fieldsEOF;
    }
    return Query.prototype.readField;
  }

  fieldsEOF(packet, connection) {
    // check EOF
    if (!packet.isEOF()) {
      return connection.protocolError('Expected EOF packet');
    }
    return this.row;
  }

  row(packet, _connection) {
    if (packet.isEOF()) {
      const status = packet.eofStatusFlags();
      const moreResults = status & ServerStatus.SERVER_MORE_RESULTS_EXISTS;
      if (moreResults) {
        this._resultIndex++;
        return Query.prototype.resultsetHeader;
      }
      return this.done();
    }
    let row;
    try {
      row = this._rowParser.next(
        packet,
        this._fields[this._resultIndex],
        this.options
      );
    } catch (err) {
      this._localStreamError = err;
      return this.doneInsert(null);
    }
    if (this.onResult) {
      this._rows[this._resultIndex].push(row);
    } else {
      this.emit('result', row, this._resultIndex);
    }
    return Query.prototype.row;
  }

  infileOk(packet, connection) {
    const rs = new Packets.ResultSetHeader(packet, connection);
    return this.doneInsert(rs);
  }

  stream(options) {
    options = options || Object.create(null);
    options.objectMode = true;

    const stream = new Readable({
      ...options,
      emitClose: true,
      autoDestroy: true,
      read: () => {
        this._connection && this._connection.resume();
      },
    });

    // Prevent a breaking change for users that rely on `end` event
    stream.once('close', () => {
      if (!stream.readableEnded) {
        stream.emit('end');
      }
    });

    const onResult = (row, index) => {
      if (stream.destroyed) return;

      if (!stream.push(row)) {
        this._connection && this._connection.pause();
      }

      stream.emit('result', row, index); // replicate old emitter
    };

    const onFields = (fields) => {
      if (stream.destroyed) return;

      stream.emit('fields', fields); // replicate old emitter
    };

    const onEnd = () => {
      if (stream.destroyed) return;

      stream.push(null); // pushing null, indicating EOF
    };

    const onError = (err) => {
      stream.destroy(err);
    };

    stream._destroy = (err, cb) => {
      this._connection && this._connection.resume();

      this.removeListener('result', onResult);
      this.removeListener('fields', onFields);
      this.removeListener('end', onEnd);
      this.removeListener('error', onError);

      cb(err); // Pass on any errors
    };

    this.on('result', onResult);
    this.on('fields', onFields);
    this.on('end', onEnd);
    this.on('error', onError);

    return stream;
  }

  _setTimeout() {
    if (this.timeout) {
      const timeoutHandler = this._handleTimeoutError.bind(this);
      this.queryTimeout = Timers.setTimeout(timeoutHandler, this.timeout);
    }
  }

  _handleTimeoutError() {
    if (this.queryTimeout) {
      Timers.clearTimeout(this.queryTimeout);
      this.queryTimeout = null;
    }

    const err = new Error('Query inactivity timeout');
    err.errorno = 'PROTOCOL_SEQUENCE_TIMEOUT';
    err.code = 'PROTOCOL_SEQUENCE_TIMEOUT';
    err.syscall = 'query';

    if (this.onResult) {
      this.onResult(err);
    } else {
      this.emit('error', err);
    }
  }
}

Query.prototype.catch = Query.prototype.then;

module.exports = Query;
