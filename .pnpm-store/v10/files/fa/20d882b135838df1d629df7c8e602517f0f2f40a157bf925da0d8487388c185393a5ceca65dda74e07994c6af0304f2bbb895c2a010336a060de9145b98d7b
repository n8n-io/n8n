// This file was modified by Oracle on June 1, 2021.
// The changes involve new logic to handle an additional ERR Packet sent by
// the MySQL server when the connection is closed unexpectedly.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

// This file was modified by Oracle on June 17, 2021.
// The changes involve logic to ensure the socket connection is closed when
// there is a fatal error.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

// This file was modified by Oracle on September 21, 2021.
// The changes involve passing additional authentication factor passwords
// to the ChangeUser Command instance.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

'use strict';

const Net = require('net');
const Tls = require('tls');
const Timers = require('timers');
const EventEmitter = require('events').EventEmitter;
const Readable = require('stream').Readable;
const Queue = require('denque');
const SqlString = require('sql-escaper');
const { createLRU } = require('lru.min');
const PacketParser = require('../packet_parser.js');
const Packets = require('../packets/index.js');
const Commands = require('../commands/index.js');
const ConnectionConfig = require('../connection_config.js');
const CharsetToEncoding = require('../constants/charset_encodings.js');

let _connectionId = 0;

let convertNamedPlaceholders = null;

class BaseConnection extends EventEmitter {
  constructor(opts) {
    super();
    this.config = opts.config;
    // TODO: fill defaults
    // if no params, connect to /var/lib/mysql/mysql.sock ( /tmp/mysql.sock on OSX )
    // if host is given, connect to host:3306
    // TODO: use `/usr/local/mysql/bin/mysql_config --socket` output? as default socketPath
    // if there is no host/port and no socketPath parameters?
    if (!opts.config.stream) {
      if (opts.config.socketPath) {
        this.stream = Net.connect(opts.config.socketPath);
      } else {
        this.stream = Net.connect(opts.config.port, opts.config.host);

        // Optionally enable keep-alive on the socket.
        if (this.config.enableKeepAlive) {
          this.stream.on('connect', () => {
            this.stream.setKeepAlive(true, this.config.keepAliveInitialDelay);
          });
        }

        // Enable TCP_NODELAY flag. This is needed so that the network packets
        // are sent immediately to the server
        this.stream.setNoDelay(true);
      }
      // if stream is a function, treat it as "stream agent / factory"
    } else if (typeof opts.config.stream === 'function') {
      this.stream = opts.config.stream(opts);
    } else {
      this.stream = opts.config.stream;
    }

    this._internalId = _connectionId++;
    this._commands = new Queue();
    this._command = null;
    this._paused = false;
    this._paused_packets = new Queue();
    this._statements = createLRU({
      max: this.config.maxPreparedStatements,
      onEviction: function (_, statement) {
        statement.close();
      },
    });
    this.serverCapabilityFlags = 0;
    this.authorized = false;
    this.sequenceId = 0;
    this.compressedSequenceId = 0;
    this.threadId = null;
    this._handshakePacket = null;
    this._fatalError = null;
    this._protocolError = null;
    this._outOfOrderPackets = [];
    this.clientEncoding = CharsetToEncoding[this.config.charsetNumber];
    this.stream.on('error', this._handleNetworkError.bind(this));
    // see https://gist.github.com/khoomeister/4985691#use-that-instead-of-bind
    this.packetParser = new PacketParser((p) => {
      this.handlePacket(p);
    });
    this.stream.on('data', (data) => {
      if (this.connectTimeout) {
        Timers.clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      this.packetParser.execute(data);
    });
    this.stream.on('end', () => {
      // emit the end event so that the pooled connection can close the connection
      this.emit('end');
    });
    this.stream.on('close', () => {
      // we need to set this flag everywhere where we want connection to close
      if (this._closing) {
        return;
      }
      if (!this._protocolError) {
        // no particular error message before disconnect
        this._protocolError = new Error(
          'Connection lost: The server closed the connection.'
        );
        this._protocolError.fatal = true;
        this._protocolError.code = 'PROTOCOL_CONNECTION_LOST';
      }
      this._notifyError(this._protocolError);
    });
    let handshakeCommand;
    if (!this.config.isServer) {
      handshakeCommand = new Commands.ClientHandshake(this.config.clientFlags);
      handshakeCommand.on('end', () => {
        // this happens when handshake finishes early either because there was
        // some fatal error or the server sent an error packet instead of
        // an hello packet (for example, 'Too many connections' error)
        if (
          !handshakeCommand.handshake ||
          this._fatalError ||
          this._protocolError
        ) {
          return;
        }
        this._handshakePacket = handshakeCommand.handshake;
        this.threadId = handshakeCommand.handshake.connectionId;
        this.emit('connect', handshakeCommand.handshake);
      });
      handshakeCommand.on('error', (err) => {
        this._closing = true;
        this._notifyError(err);
      });
      this.addCommand(handshakeCommand);
    }
    // in case there was no initial handshake but we need to read sting, assume it utf-8
    // most common example: "Too many connections" error ( packet is sent immediately on connection attempt, we don't know server encoding yet)
    // will be overwritten with actual encoding value as soon as server handshake packet is received
    this.serverEncoding = 'utf8';
    if (this.config.connectTimeout) {
      const timeoutHandler = this._handleTimeoutError.bind(this);
      this.connectTimeout = Timers.setTimeout(
        timeoutHandler,
        this.config.connectTimeout
      );
    }
  }

  _addCommandClosedState(cmd) {
    const err = new Error(
      "Can't add new command when connection is in closed state"
    );
    err.fatal = true;
    if (cmd.onResult) {
      cmd.onResult(err);
    } else {
      this.emit('error', err);
    }
  }

  _handleFatalError(err) {
    err.fatal = true;
    // stop receiving packets
    this.stream.removeAllListeners('data');
    this.addCommand = this._addCommandClosedState;
    this.write = () => {
      this.emit('error', new Error("Can't write in closed state"));
    };
    this._notifyError(err);
    this._fatalError = err;
  }

  _handleNetworkError(err) {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    // Do not throw an error when a connection ends with a RST,ACK packet
    if (err.code === 'ECONNRESET' && this._closing) {
      return;
    }
    this._handleFatalError(err);
  }

  _handleTimeoutError() {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this.stream.destroy && this.stream.destroy();
    const err = new Error('connect ETIMEDOUT');
    err.errorno = 'ETIMEDOUT';
    err.code = 'ETIMEDOUT';
    err.syscall = 'connect';
    this._handleNetworkError(err);
  }

  // notify all commands in the queue and bubble error as connection "error"
  // called on stream error or unexpected termination
  _notifyError(err) {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    // prevent from emitting 'PROTOCOL_CONNECTION_LOST' after EPIPE or ECONNRESET
    if (this._fatalError) {
      return;
    }
    let command;
    // if there is no active command, notify connection
    // if there are commands and all of them have callbacks, pass error via callback
    let bubbleErrorToConnection = !this._command;
    if (this._command && this._command.onResult) {
      this._command.onResult(err);
      this._command = null;
      // connection handshake is special because we allow it to be implicit
      // if error happened during handshake, but there are others commands in queue
      // then bubble error to other commands and not to connection
    } else if (
      !(
        this._command &&
        this._command.constructor === Commands.ClientHandshake &&
        this._commands.length > 0
      )
    ) {
      bubbleErrorToConnection = true;
    }
    while ((command = this._commands.shift())) {
      if (command.onResult) {
        command.onResult(err);
      } else {
        bubbleErrorToConnection = true;
      }
    }
    // notify connection if some comands in the queue did not have callbacks
    // or if this is pool connection ( so it can be removed from pool )
    if (bubbleErrorToConnection || this._pool) {
      this.emit('error', err);
    }
    // close connection after emitting the event in case of a fatal error
    if (err.fatal) {
      this.close();
    }
  }

  write(buffer) {
    const result = this.stream.write(buffer, (err) => {
      if (err) {
        this._handleNetworkError(err);
      }
    });

    if (!result) {
      this.stream.emit('pause');
    }
  }

  // http://dev.mysql.com/doc/internals/en/sequence-id.html
  //
  // The sequence-id is incremented with each packet and may wrap around.
  // It starts at 0 and is reset to 0 when a new command
  // begins in the Command Phase.
  // http://dev.mysql.com/doc/internals/en/example-several-mysql-packets.html
  _resetSequenceId() {
    this.sequenceId = 0;
    this.compressedSequenceId = 0;
  }

  _bumpCompressedSequenceId(numPackets) {
    this.compressedSequenceId += numPackets;
    this.compressedSequenceId %= 256;
  }

  _bumpSequenceId(numPackets) {
    this.sequenceId += numPackets;
    this.sequenceId %= 256;
  }

  writePacket(packet) {
    const MAX_PACKET_LENGTH = 16777215;
    const length = packet.length();
    let chunk, offset, header;
    if (length < MAX_PACKET_LENGTH) {
      packet.writeHeader(this.sequenceId);
      if (this.config.debug) {
        console.log(
          `${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${[this.sequenceId, packet._name, packet.length()].join(',')})`
        );
        console.log(
          `${this._internalId} ${this.connectionId} <== ${packet.buffer.toString('hex')}`
        );
      }
      this._bumpSequenceId(1);
      this.write(packet.buffer);
    } else {
      if (this.config.debug) {
        console.log(
          `${this._internalId} ${this.connectionId} <== Writing large packet, raw content not written:`
        );
        console.log(
          `${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${[this.sequenceId, packet._name, packet.length()].join(',')})`
        );
      }
      for (offset = 4; offset < 4 + length; offset += MAX_PACKET_LENGTH) {
        chunk = packet.buffer.slice(offset, offset + MAX_PACKET_LENGTH);
        if (chunk.length === MAX_PACKET_LENGTH) {
          header = Buffer.from([0xff, 0xff, 0xff, this.sequenceId]);
        } else {
          header = Buffer.from([
            chunk.length & 0xff,
            (chunk.length >> 8) & 0xff,
            (chunk.length >> 16) & 0xff,
            this.sequenceId,
          ]);
        }
        this._bumpSequenceId(1);
        this.write(header);
        this.write(chunk);
      }
    }
  }

  // 0.11+ environment
  startTLS(onSecure) {
    if (this.config.debug) {
      console.log('Upgrading connection to TLS');
    }
    const secureContext = Tls.createSecureContext({
      ca: this.config.ssl.ca,
      cert: this.config.ssl.cert,
      ciphers: this.config.ssl.ciphers,
      key: this.config.ssl.key,
      passphrase: this.config.ssl.passphrase,
      minVersion: this.config.ssl.minVersion,
      maxVersion: this.config.ssl.maxVersion,
    });
    const rejectUnauthorized = this.config.ssl.rejectUnauthorized;
    const verifyIdentity = this.config.ssl.verifyIdentity;
    const servername = Net.isIP(this.config.host)
      ? undefined
      : this.config.host;

    let secureEstablished = false;
    this.stream.removeAllListeners('data');
    const secureSocket = Tls.connect(
      {
        rejectUnauthorized,
        requestCert: rejectUnauthorized,
        checkServerIdentity: verifyIdentity
          ? Tls.checkServerIdentity
          : function () {
              return undefined;
            },
        secureContext,
        isServer: false,
        socket: this.stream,
        servername,
      },
      () => {
        secureEstablished = true;
        if (rejectUnauthorized) {
          if (typeof servername === 'string' && verifyIdentity) {
            const cert = secureSocket.getPeerCertificate(true);
            const serverIdentityCheckError = Tls.checkServerIdentity(
              servername,
              cert
            );
            if (serverIdentityCheckError) {
              onSecure(serverIdentityCheckError);
              return;
            }
          }
        }
        onSecure();
      }
    );
    // error handler for secure socket
    secureSocket.on('error', (err) => {
      if (secureEstablished) {
        this._handleNetworkError(err);
      } else {
        onSecure(err);
      }
    });
    secureSocket.on('data', (data) => {
      this.packetParser.execute(data);
    });
    this.stream = secureSocket;
  }

  protocolError(message, code) {
    // Starting with MySQL 8.0.24, if the client closes the connection
    // unexpectedly, the server will send a last ERR Packet, which we can
    // safely ignore.
    // https://dev.mysql.com/worklog/task/?id=12999
    if (this._closing) {
      return;
    }

    const err = new Error(message);
    err.fatal = true;
    err.code = code || 'PROTOCOL_ERROR';
    this.emit('error', err);
  }

  get state() {
    // Error state has highest priority
    if (this._fatalError || this._protocolError) {
      return 'error';
    }

    // Closing state has second priority
    if (this._closing || (this.stream && this.stream.destroyed)) {
      return 'disconnected';
    }

    // Authenticated state has third priority
    if (this.authorized) {
      return 'authenticated';
    }

    // Connected state: handshake completed but not yet authorized
    // This matches the original mysql driver's 'connected' state
    if (this._handshakePacket) {
      return 'connected';
    }

    // Protocol handshake state: connection established, handshake in progress
    if (this.stream && !this.stream.destroyed) {
      return 'protocol_handshake';
    }

    // Default: not connected
    return 'disconnected';
  }

  get fatalError() {
    return this._fatalError;
  }

  handlePacket(packet) {
    if (this._paused) {
      this._paused_packets.push(packet);
      return;
    }
    if (this.config.debug) {
      if (packet) {
        console.log(
          ` raw: ${packet.buffer
            .slice(packet.offset, packet.offset + packet.length())
            .toString('hex')}`
        );
        console.trace();
        const commandName = this._command
          ? this._command._commandName
          : '(no command)';
        const stateName = this._command
          ? this._command.stateName()
          : '(no command)';
        console.log(
          `${this._internalId} ${this.connectionId} ==> ${commandName}#${stateName}(${[packet.sequenceId, packet.type(), packet.length()].join(',')})`
        );
      }
    }
    if (!this._command) {
      const marker = packet.peekByte();
      // If it's an Err Packet, we should use it.
      if (marker === 0xff) {
        const error = Packets.Error.fromPacket(packet);
        this.protocolError(error.message, error.code);
      } else {
        // Otherwise, it means it's some other unexpected packet.
        this.protocolError(
          'Unexpected packet while no commands in the queue',
          'PROTOCOL_UNEXPECTED_PACKET'
        );
      }
      this.close();
      return;
    }
    if (packet) {
      // Note: when server closes connection due to inactivity, Err packet ER_CLIENT_INTERACTION_TIMEOUT from MySQL 8.0.24, sequenceId will be 0
      if (this.sequenceId !== packet.sequenceId) {
        const err = new Error(
          `Warning: got packets out of order. Expected ${this.sequenceId} but received ${packet.sequenceId}`
        );
        err.expected = this.sequenceId;
        err.received = packet.sequenceId;
        this.emit('warn', err); // REVIEW
        console.error(err.message);
      }
      this._bumpSequenceId(packet.numPackets);
    }
    try {
      if (this._fatalError) {
        // skip remaining packets after client is in the error state
        return;
      }
      const done = this._command.execute(packet, this);
      if (done) {
        this._command = this._commands.shift();
        if (this._command) {
          this.sequenceId = 0;
          this.compressedSequenceId = 0;
          this.handlePacket();
        }
      }
    } catch (err) {
      this._handleFatalError(err);
      this.stream.destroy();
    }
  }

  addCommand(cmd) {
    // this.compressedSequenceId = 0;
    // this.sequenceId = 0;
    if (this.config.debug) {
      const commandName = cmd.constructor.name;
      console.log(`Add command: ${commandName}`);
      cmd._commandName = commandName;
    }
    if (!this._command) {
      this._command = cmd;
      this.handlePacket();
    } else {
      this._commands.push(cmd);
    }
    return cmd;
  }

  format(sql, values) {
    if (typeof this.config.queryFormat === 'function') {
      return this.config.queryFormat.call(
        this,
        sql,
        values,
        this.config.timezone
      );
    }
    const opts = {
      sql: sql,
      values: values,
    };
    this._resolveNamedPlaceholders(opts);
    return SqlString.format(
      opts.sql,
      opts.values,
      this.config.stringifyObjects,
      this.config.timezone
    );
  }

  escape(value) {
    return SqlString.escape(value, false, this.config.timezone);
  }

  escapeId(value) {
    return SqlString.escapeId(value, false);
  }

  raw(sql) {
    return SqlString.raw(sql);
  }

  _resolveNamedPlaceholders(options) {
    let unnamed;
    if (this.config.namedPlaceholders || options.namedPlaceholders) {
      if (Array.isArray(options.values)) {
        // if an array is provided as the values, assume the conversion is not necessary.
        // this allows the usage of unnamed placeholders even if the namedPlaceholders flag is enabled.
        return;
      }
      if (convertNamedPlaceholders === null) {
        convertNamedPlaceholders = require('named-placeholders')();
      }
      unnamed = convertNamedPlaceholders(options.sql, options.values);
      options.sql = unnamed[0];
      options.values = unnamed[1];
    }
  }

  query(sql, values, cb) {
    let cmdQuery;
    if (sql.constructor === Commands.Query) {
      cmdQuery = sql;
    } else {
      cmdQuery = BaseConnection.createQuery(sql, values, cb, this.config);
    }
    this._resolveNamedPlaceholders(cmdQuery);
    const rawSql = this.format(
      cmdQuery.sql,
      cmdQuery.values !== undefined ? cmdQuery.values : []
    );
    cmdQuery.sql = rawSql;
    return this.addCommand(cmdQuery);
  }

  pause() {
    this._paused = true;
    this.stream.pause();
  }

  resume() {
    let packet;
    this._paused = false;
    while ((packet = this._paused_packets.shift())) {
      this.handlePacket(packet);
      // don't resume if packet handler paused connection
      if (this._paused) {
        return;
      }
    }
    this.stream.resume();
  }

  // TODO: named placeholders support
  prepare(options, cb) {
    if (typeof options === 'string') {
      options = { sql: options };
    }
    return this.addCommand(new Commands.Prepare(options, cb));
  }

  unprepare(sql) {
    let options = {};
    if (typeof sql === 'object') {
      options = sql;
    } else {
      options.sql = sql;
    }
    const key = BaseConnection.statementKey(options);
    const stmt = this._statements.get(key);
    if (stmt) {
      this._statements.delete(key);
      stmt.close();
    }
    return stmt;
  }

  execute(sql, values, cb) {
    let options = {
      infileStreamFactory: this.config.infileStreamFactory,
    };
    if (typeof sql === 'object') {
      // execute(options, cb)
      options = {
        ...options,
        ...sql,
        sql: sql.sql,
        values: sql.values,
      };
      if (typeof values === 'function') {
        cb = values;
      } else {
        options.values = options.values || values;
      }
    } else if (typeof values === 'function') {
      // execute(sql, cb)
      cb = values;
      options.sql = sql;
      options.values = undefined;
    } else {
      // execute(sql, values, cb)
      options.sql = sql;
      options.values = values;
    }
    this._resolveNamedPlaceholders(options);
    // check for values containing undefined
    if (options.values) {
      //If namedPlaceholder is not enabled and object is passed as bind parameters
      if (!Array.isArray(options.values)) {
        throw new TypeError(
          'Bind parameters must be array if namedPlaceholders parameter is not enabled'
        );
      }
      options.values.forEach((val) => {
        //If namedPlaceholder is not enabled and object is passed as bind parameters
        if (!Array.isArray(options.values)) {
          throw new TypeError(
            'Bind parameters must be array if namedPlaceholders parameter is not enabled'
          );
        }
        if (val === undefined) {
          throw new TypeError(
            'Bind parameters must not contain undefined. To pass SQL NULL specify JS null'
          );
        }
        if (typeof val === 'function') {
          throw new TypeError(
            'Bind parameters must not contain function(s). To pass the body of a function as a string call .toString() first'
          );
        }
      });
    }
    const executeCommand = new Commands.Execute(options, cb);
    const prepareCommand = new Commands.Prepare(options, (err, stmt) => {
      if (err) {
        // skip execute command if prepare failed, we have main
        // combined callback here
        executeCommand.start = function () {
          return null;
        };
        if (cb) {
          cb(err);
        } else {
          executeCommand.emit('error', err);
        }
        executeCommand.emit('end');
        return;
      }
      executeCommand.statement = stmt;
    });
    this.addCommand(prepareCommand);
    this.addCommand(executeCommand);
    return executeCommand;
  }

  changeUser(options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    const charsetNumber = options.charset
      ? ConnectionConfig.getCharsetNumber(options.charset)
      : this.config.charsetNumber;
    return this.addCommand(
      new Commands.ChangeUser(
        {
          user: options.user || this.config.user,
          // for the purpose of multi-factor authentication, or not, the main
          // password (used for the 1st authentication factor) can also be
          // provided via the "password1" option
          password:
            options.password ||
            options.password1 ||
            this.config.password ||
            this.config.password1,
          password2: options.password2 || this.config.password2,
          password3: options.password3 || this.config.password3,
          passwordSha1: options.passwordSha1 || this.config.passwordSha1,
          database: options.database || this.config.database,
          timeout: options.timeout,
          charsetNumber: charsetNumber,
          currentConfig: this.config,
        },
        (err) => {
          if (err) {
            err.fatal = true;
          }
          if (callback) {
            callback(err);
          }
        }
      )
    );
  }

  // transaction helpers
  beginTransaction(cb) {
    return this.query('START TRANSACTION', cb);
  }

  commit(cb) {
    return this.query('COMMIT', cb);
  }

  rollback(cb) {
    return this.query('ROLLBACK', cb);
  }

  ping(cb) {
    return this.addCommand(new Commands.Ping(cb));
  }

  _registerSlave(opts, cb) {
    return this.addCommand(new Commands.RegisterSlave(opts, cb));
  }

  _binlogDump(opts, cb) {
    return this.addCommand(new Commands.BinlogDump(opts, cb));
  }

  // currently just alias to close
  destroy() {
    this.close();
  }

  close() {
    if (this.connectTimeout) {
      Timers.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this._closing = true;
    this.stream.end();
    this.addCommand = this._addCommandClosedState;
  }

  createBinlogStream(opts) {
    // TODO: create proper stream class
    // TODO: use through2
    let test = 1;
    const stream = new Readable({ objectMode: true });
    stream._read = function () {
      return {
        data: test++,
      };
    };
    this._registerSlave(opts, () => {
      const dumpCmd = this._binlogDump(opts);
      dumpCmd.on('event', (ev) => {
        stream.push(ev);
      });
      dumpCmd.on('eof', () => {
        stream.push(null);
        // if non-blocking, then close stream to prevent errors
        if (opts.flags && opts.flags & 0x01) {
          this.close();
        }
      });
      // TODO: pipe errors as well
    });
    return stream;
  }

  connect(cb) {
    if (!cb) {
      return;
    }
    if (this._fatalError || this._protocolError) {
      return cb(this._fatalError || this._protocolError);
    }
    if (this._handshakePacket) {
      return cb(null, this);
    }
    let connectCalled = 0;
    function callbackOnce(isErrorHandler) {
      return function (param) {
        if (!connectCalled) {
          if (isErrorHandler) {
            cb(param);
          } else {
            cb(null, param);
          }
        }
        connectCalled = 1;
      };
    }
    this.once('error', callbackOnce(true));
    this.once('connect', callbackOnce(false));
  }

  // ===================================
  // outgoing server connection methods
  // ===================================
  writeColumns(columns) {
    this.writePacket(Packets.ResultSetHeader.toPacket(columns.length));
    columns.forEach((column) => {
      this.writePacket(
        Packets.ColumnDefinition.toPacket(column, this.serverConfig.encoding)
      );
    });
    this.writeEof();
  }

  // row is array of columns, not hash
  writeTextRow(column) {
    this.writePacket(
      Packets.TextRow.toPacket(column, this.serverConfig.encoding)
    );
  }

  writeBinaryRow(column) {
    this.writePacket(
      Packets.BinaryRow.toPacket(column, this.serverConfig.encoding)
    );
  }

  writeTextResult(rows, columns, binary = false) {
    this.writeColumns(columns);
    rows.forEach((row) => {
      const arrayRow = new Array(columns.length);
      columns.forEach((column) => {
        arrayRow.push(row[column.name]);
      });
      if (binary) {
        this.writeBinaryRow(arrayRow);
      } else this.writeTextRow(arrayRow);
    });
    this.writeEof();
  }

  writeEof(warnings, statusFlags) {
    this.writePacket(Packets.EOF.toPacket(warnings, statusFlags));
  }

  writeOk(args) {
    if (!args) {
      args = { affectedRows: 0 };
    }
    this.writePacket(Packets.OK.toPacket(args, this.serverConfig.encoding));
  }

  writeError(args) {
    // if we want to send error before initial hello was sent, use default encoding
    const encoding = this.serverConfig ? this.serverConfig.encoding : 'cesu8';
    this.writePacket(Packets.Error.toPacket(args, encoding));
  }

  serverHandshake(args) {
    this.serverConfig = args;
    this.serverConfig.encoding =
      CharsetToEncoding[this.serverConfig.characterSet];
    return this.addCommand(new Commands.ServerHandshake(args));
  }

  // ===============================================================
  end(callback) {
    if (this.config.isServer) {
      this._closing = true;
      const quitCmd = new EventEmitter();
      setImmediate(() => {
        this.stream.end();
        quitCmd.emit('end');
      });
      return quitCmd;
    }
    // trigger error if more commands enqueued after end command
    const quitCmd = this.addCommand(new Commands.Quit(callback));
    this.addCommand = this._addCommandClosedState;
    return quitCmd;
  }

  static createQuery(sql, values, cb, config) {
    let options = {
      rowsAsArray: config.rowsAsArray,
      infileStreamFactory: config.infileStreamFactory,
    };
    if (typeof sql === 'object') {
      // query(options, cb)
      options = {
        ...options,
        ...sql,
        sql: sql.sql,
        values: sql.values,
      };
      if (typeof values === 'function') {
        cb = values;
      } else if (values !== undefined) {
        options.values = values;
      }
    } else if (typeof values === 'function') {
      // query(sql, cb)
      cb = values;
      options.sql = sql;
      options.values = undefined;
    } else {
      // query(sql, values, cb)
      options.sql = sql;
      options.values = values;
    }
    return new Commands.Query(options, cb);
  }

  static statementKey(options) {
    return `${typeof options.nestTables}/${options.nestTables}/${options.rowsAsArray}${options.sql}`;
  }
}

module.exports = BaseConnection;
