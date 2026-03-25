"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _events = require("events");
var _writableTrackingBuffer = _interopRequireDefault(require("./tracking-buffer/writable-tracking-buffer"));
var _stream = require("stream");
var _token = require("./token/token");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * @private
 */
const FLAGS = {
  nullable: 1 << 0,
  caseSen: 1 << 1,
  updateableReadWrite: 1 << 2,
  updateableUnknown: 1 << 3,
  identity: 1 << 4,
  computed: 1 << 5,
  // introduced in TDS 7.2
  fixedLenCLRType: 1 << 8,
  // introduced in TDS 7.2
  sparseColumnSet: 1 << 10,
  // introduced in TDS 7.3.B
  hidden: 1 << 13,
  // introduced in TDS 7.2
  key: 1 << 14,
  // introduced in TDS 7.2
  nullableUnknown: 1 << 15 // introduced in TDS 7.2
};

/**
 * @private
 */
const DONE_STATUS = {
  FINAL: 0x00,
  MORE: 0x1,
  ERROR: 0x2,
  INXACT: 0x4,
  COUNT: 0x10,
  ATTN: 0x20,
  SRVERROR: 0x100
};

/**
 * @private
 */

const rowTokenBuffer = Buffer.from([_token.TYPE.ROW]);
const textPointerAndTimestampBuffer = Buffer.from([
// TextPointer length
0x10,
// TextPointer
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
// Timestamp
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const textPointerNullBuffer = Buffer.from([0x00]);

// A transform that converts rows to packets.
class RowTransform extends _stream.Transform {
  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */
  constructor(bulkLoad) {
    super({
      writableObjectMode: true
    });
    this.bulkLoad = bulkLoad;
    this.mainOptions = bulkLoad.options;
    this.columns = bulkLoad.columns;
    this.columnMetadataWritten = false;
  }

  /**
   * @private
   */
  _transform(row, _encoding, callback) {
    if (!this.columnMetadataWritten) {
      this.push(this.bulkLoad.getColMetaData());
      this.columnMetadataWritten = true;
    }
    this.push(rowTokenBuffer);
    for (let i = 0; i < this.columns.length; i++) {
      const c = this.columns[i];
      let value = Array.isArray(row) ? row[i] : row[c.objName];
      if (!this.bulkLoad.firstRowWritten) {
        try {
          value = c.type.validate(value, c.collation);
        } catch (error) {
          return callback(error);
        }
      }
      const parameter = {
        length: c.length,
        scale: c.scale,
        precision: c.precision,
        value: value
      };
      if (c.type.name === 'Text' || c.type.name === 'Image' || c.type.name === 'NText') {
        if (value == null) {
          this.push(textPointerNullBuffer);
          continue;
        }
        this.push(textPointerAndTimestampBuffer);
      }
      this.push(c.type.generateParameterLength(parameter, this.mainOptions));
      for (const chunk of c.type.generateParameterData(parameter, this.mainOptions)) {
        this.push(chunk);
      }
    }
    process.nextTick(callback);
  }

  /**
   * @private
   */
  _flush(callback) {
    this.push(this.bulkLoad.createDoneToken());
    process.nextTick(callback);
  }
}

/**
 * A BulkLoad instance is used to perform a bulk insert.
 *
 * Use [[Connection.newBulkLoad]] to create a new instance, and [[Connection.execBulkLoad]] to execute it.
 *
 * Example of BulkLoad Usages:
 *
 * ```js
 * // optional BulkLoad options
 * const options = { keepNulls: true };
 *
 * // instantiate - provide the table where you'll be inserting to, options and a callback
 * const bulkLoad = connection.newBulkLoad('MyTable', options, (error, rowCount) => {
 *   console.log('inserted %d rows', rowCount);
 * });
 *
 * // setup your columns - always indicate whether the column is nullable
 * bulkLoad.addColumn('myInt', TYPES.Int, { nullable: false });
 * bulkLoad.addColumn('myString', TYPES.NVarChar, { length: 50, nullable: true });
 *
 * // execute
 * connection.execBulkLoad(bulkLoad, [
 *   { myInt: 7, myString: 'hello' },
 *   { myInt: 23, myString: 'world' }
 * ]);
 * ```
 */
class BulkLoad extends _events.EventEmitter {
  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */
  constructor(table, collation, connectionOptions, {
    checkConstraints = false,
    fireTriggers = false,
    keepNulls = false,
    lockTable = false,
    order = {}
  }, callback) {
    if (typeof checkConstraints !== 'boolean') {
      throw new TypeError('The "options.checkConstraints" property must be of type boolean.');
    }
    if (typeof fireTriggers !== 'boolean') {
      throw new TypeError('The "options.fireTriggers" property must be of type boolean.');
    }
    if (typeof keepNulls !== 'boolean') {
      throw new TypeError('The "options.keepNulls" property must be of type boolean.');
    }
    if (typeof lockTable !== 'boolean') {
      throw new TypeError('The "options.lockTable" property must be of type boolean.');
    }
    if (typeof order !== 'object' || order === null) {
      throw new TypeError('The "options.order" property must be of type object.');
    }
    for (const [column, direction] of Object.entries(order)) {
      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new TypeError('The value of the "' + column + '" key in the "options.order" object must be either "ASC" or "DESC".');
      }
    }
    super();
    this.error = undefined;
    this.canceled = false;
    this.executionStarted = false;
    this.collation = collation;
    this.table = table;
    this.options = connectionOptions;
    this.callback = callback;
    this.columns = [];
    this.columnsByName = {};
    this.firstRowWritten = false;
    this.streamingMode = false;
    this.rowToPacketTransform = new RowTransform(this); // eslint-disable-line no-use-before-define

    this.bulkOptions = {
      checkConstraints,
      fireTriggers,
      keepNulls,
      lockTable,
      order
    };
  }

  /**
   * Adds a column to the bulk load.
   *
   * The column definitions should match the table you are trying to insert into.
   * Attempting to call addColumn after the first row has been added will throw an exception.
   *
   * ```js
   * bulkLoad.addColumn('MyIntColumn', TYPES.Int, { nullable: false });
   * ```
   *
   * @param name The name of the column.
   * @param type One of the supported `data types`.
   * @param __namedParameters Additional column type information. At a minimum, `nullable` must be set to true or false.
   * @param length For VarChar, NVarChar, VarBinary. Use length as `Infinity` for VarChar(max), NVarChar(max) and VarBinary(max).
   * @param nullable Indicates whether the column accepts NULL values.
   * @param objName If the name of the column is different from the name of the property found on `rowObj` arguments passed to [[addRow]] or [[Connection.execBulkLoad]], then you can use this option to specify the property name.
   * @param precision For Numeric, Decimal.
   * @param scale For Numeric, Decimal, Time, DateTime2, DateTimeOffset.
  */
  addColumn(name, type, {
    output = false,
    length,
    precision,
    scale,
    objName = name,
    nullable = true
  }) {
    if (this.firstRowWritten) {
      throw new Error('Columns cannot be added to bulk insert after the first row has been written.');
    }
    if (this.executionStarted) {
      throw new Error('Columns cannot be added to bulk insert after execution has started.');
    }
    const column = {
      type: type,
      name: name,
      value: null,
      output: output,
      length: length,
      precision: precision,
      scale: scale,
      objName: objName,
      nullable: nullable,
      collation: this.collation
    };
    if ((type.id & 0x30) === 0x20) {
      if (column.length == null && type.resolveLength) {
        column.length = type.resolveLength(column);
      }
    }
    if (type.resolvePrecision && column.precision == null) {
      column.precision = type.resolvePrecision(column);
    }
    if (type.resolveScale && column.scale == null) {
      column.scale = type.resolveScale(column);
    }
    this.columns.push(column);
    this.columnsByName[name] = column;
  }

  /**
   * @private
   */
  getOptionsSql() {
    const addOptions = [];
    if (this.bulkOptions.checkConstraints) {
      addOptions.push('CHECK_CONSTRAINTS');
    }
    if (this.bulkOptions.fireTriggers) {
      addOptions.push('FIRE_TRIGGERS');
    }
    if (this.bulkOptions.keepNulls) {
      addOptions.push('KEEP_NULLS');
    }
    if (this.bulkOptions.lockTable) {
      addOptions.push('TABLOCK');
    }
    if (this.bulkOptions.order) {
      const orderColumns = [];
      for (const [column, direction] of Object.entries(this.bulkOptions.order)) {
        orderColumns.push(`${column} ${direction}`);
      }
      if (orderColumns.length) {
        addOptions.push(`ORDER (${orderColumns.join(', ')})`);
      }
    }
    if (addOptions.length > 0) {
      return ` WITH (${addOptions.join(',')})`;
    } else {
      return '';
    }
  }

  /**
   * @private
   */
  getBulkInsertSql() {
    let sql = 'insert bulk ' + this.table + '(';
    for (let i = 0, len = this.columns.length; i < len; i++) {
      const c = this.columns[i];
      if (i !== 0) {
        sql += ', ';
      }
      sql += '[' + c.name + '] ' + c.type.declaration(c);
    }
    sql += ')';
    sql += this.getOptionsSql();
    return sql;
  }

  /**
   * This is simply a helper utility function which returns a `CREATE TABLE SQL` statement based on the columns added to the bulkLoad object.
   * This may be particularly handy when you want to insert into a temporary table (a table which starts with `#`).
   *
   * ```js
   * var sql = bulkLoad.getTableCreationSql();
   * ```
   *
   * A side note on bulk inserting into temporary tables: if you want to access a local temporary table after executing the bulk load,
   * you'll need to use the same connection and execute your requests using [[Connection.execSqlBatch]] instead of [[Connection.execSql]]
   */
  getTableCreationSql() {
    let sql = 'CREATE TABLE ' + this.table + '(\n';
    for (let i = 0, len = this.columns.length; i < len; i++) {
      const c = this.columns[i];
      if (i !== 0) {
        sql += ',\n';
      }
      sql += '[' + c.name + '] ' + c.type.declaration(c);
      if (c.nullable !== undefined) {
        sql += ' ' + (c.nullable ? 'NULL' : 'NOT NULL');
      }
    }
    sql += '\n)';
    return sql;
  }

  /**
   * @private
   */
  getColMetaData() {
    const tBuf = new _writableTrackingBuffer.default(100, null, true);
    // TokenType
    tBuf.writeUInt8(_token.TYPE.COLMETADATA);
    // Count
    tBuf.writeUInt16LE(this.columns.length);
    for (let j = 0, len = this.columns.length; j < len; j++) {
      const c = this.columns[j];
      // UserType
      if (this.options.tdsVersion < '7_2') {
        tBuf.writeUInt16LE(0);
      } else {
        tBuf.writeUInt32LE(0);
      }

      // Flags
      let flags = FLAGS.updateableReadWrite;
      if (c.nullable) {
        flags |= FLAGS.nullable;
      } else if (c.nullable === undefined && this.options.tdsVersion >= '7_2') {
        flags |= FLAGS.nullableUnknown;
      }
      tBuf.writeUInt16LE(flags);

      // TYPE_INFO
      tBuf.writeBuffer(c.type.generateTypeInfo(c, this.options));

      // TableName
      if (c.type.hasTableName) {
        tBuf.writeUsVarchar(this.table, 'ucs2');
      }

      // ColName
      tBuf.writeBVarchar(c.name, 'ucs2');
    }
    return tBuf.data;
  }

  /**
   * Sets a timeout for this bulk load.
   *
   * ```js
   * bulkLoad.setTimeout(timeout);
   * ```
   *
   * @param timeout The number of milliseconds before the bulk load is considered failed, or 0 for no timeout.
   *   When no timeout is set for the bulk load, the [[ConnectionOptions.requestTimeout]] of the Connection is used.
   */
  setTimeout(timeout) {
    this.timeout = timeout;
  }

  /**
   * @private
   */
  createDoneToken() {
    // It might be nice to make DoneToken a class if anything needs to create them, but for now, just do it here
    const tBuf = new _writableTrackingBuffer.default(this.options.tdsVersion < '7_2' ? 9 : 13);
    tBuf.writeUInt8(_token.TYPE.DONE);
    const status = DONE_STATUS.FINAL;
    tBuf.writeUInt16LE(status);
    tBuf.writeUInt16LE(0); // CurCmd (TDS ignores this)
    tBuf.writeUInt32LE(0); // row count - doesn't really matter
    if (this.options.tdsVersion >= '7_2') {
      tBuf.writeUInt32LE(0); // row count is 64 bits in >= TDS 7.2
    }

    return tBuf.data;
  }

  /**
   * @private
   */
  cancel() {
    if (this.canceled) {
      return;
    }
    this.canceled = true;
    this.emit('cancel');
  }
}
var _default = BulkLoad;
exports.default = _default;
module.exports = BulkLoad;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfZXZlbnRzIiwicmVxdWlyZSIsIl93cml0YWJsZVRyYWNraW5nQnVmZmVyIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsIl9zdHJlYW0iLCJfdG9rZW4iLCJvYmoiLCJfX2VzTW9kdWxlIiwiZGVmYXVsdCIsIkZMQUdTIiwibnVsbGFibGUiLCJjYXNlU2VuIiwidXBkYXRlYWJsZVJlYWRXcml0ZSIsInVwZGF0ZWFibGVVbmtub3duIiwiaWRlbnRpdHkiLCJjb21wdXRlZCIsImZpeGVkTGVuQ0xSVHlwZSIsInNwYXJzZUNvbHVtblNldCIsImhpZGRlbiIsImtleSIsIm51bGxhYmxlVW5rbm93biIsIkRPTkVfU1RBVFVTIiwiRklOQUwiLCJNT1JFIiwiRVJST1IiLCJJTlhBQ1QiLCJDT1VOVCIsIkFUVE4iLCJTUlZFUlJPUiIsInJvd1Rva2VuQnVmZmVyIiwiQnVmZmVyIiwiZnJvbSIsIlRPS0VOX1RZUEUiLCJST1ciLCJ0ZXh0UG9pbnRlckFuZFRpbWVzdGFtcEJ1ZmZlciIsInRleHRQb2ludGVyTnVsbEJ1ZmZlciIsIlJvd1RyYW5zZm9ybSIsIlRyYW5zZm9ybSIsImNvbnN0cnVjdG9yIiwiYnVsa0xvYWQiLCJ3cml0YWJsZU9iamVjdE1vZGUiLCJtYWluT3B0aW9ucyIsIm9wdGlvbnMiLCJjb2x1bW5zIiwiY29sdW1uTWV0YWRhdGFXcml0dGVuIiwiX3RyYW5zZm9ybSIsInJvdyIsIl9lbmNvZGluZyIsImNhbGxiYWNrIiwicHVzaCIsImdldENvbE1ldGFEYXRhIiwiaSIsImxlbmd0aCIsImMiLCJ2YWx1ZSIsIkFycmF5IiwiaXNBcnJheSIsIm9iak5hbWUiLCJmaXJzdFJvd1dyaXR0ZW4iLCJ0eXBlIiwidmFsaWRhdGUiLCJjb2xsYXRpb24iLCJlcnJvciIsInBhcmFtZXRlciIsInNjYWxlIiwicHJlY2lzaW9uIiwibmFtZSIsImdlbmVyYXRlUGFyYW1ldGVyTGVuZ3RoIiwiY2h1bmsiLCJnZW5lcmF0ZVBhcmFtZXRlckRhdGEiLCJwcm9jZXNzIiwibmV4dFRpY2siLCJfZmx1c2giLCJjcmVhdGVEb25lVG9rZW4iLCJCdWxrTG9hZCIsIkV2ZW50RW1pdHRlciIsInRhYmxlIiwiY29ubmVjdGlvbk9wdGlvbnMiLCJjaGVja0NvbnN0cmFpbnRzIiwiZmlyZVRyaWdnZXJzIiwia2VlcE51bGxzIiwibG9ja1RhYmxlIiwib3JkZXIiLCJUeXBlRXJyb3IiLCJjb2x1bW4iLCJkaXJlY3Rpb24iLCJPYmplY3QiLCJlbnRyaWVzIiwidW5kZWZpbmVkIiwiY2FuY2VsZWQiLCJleGVjdXRpb25TdGFydGVkIiwiY29sdW1uc0J5TmFtZSIsInN0cmVhbWluZ01vZGUiLCJyb3dUb1BhY2tldFRyYW5zZm9ybSIsImJ1bGtPcHRpb25zIiwiYWRkQ29sdW1uIiwib3V0cHV0IiwiRXJyb3IiLCJpZCIsInJlc29sdmVMZW5ndGgiLCJyZXNvbHZlUHJlY2lzaW9uIiwicmVzb2x2ZVNjYWxlIiwiZ2V0T3B0aW9uc1NxbCIsImFkZE9wdGlvbnMiLCJvcmRlckNvbHVtbnMiLCJqb2luIiwiZ2V0QnVsa0luc2VydFNxbCIsInNxbCIsImxlbiIsImRlY2xhcmF0aW9uIiwiZ2V0VGFibGVDcmVhdGlvblNxbCIsInRCdWYiLCJXcml0YWJsZVRyYWNraW5nQnVmZmVyIiwid3JpdGVVSW50OCIsIkNPTE1FVEFEQVRBIiwid3JpdGVVSW50MTZMRSIsImoiLCJ0ZHNWZXJzaW9uIiwid3JpdGVVSW50MzJMRSIsImZsYWdzIiwid3JpdGVCdWZmZXIiLCJnZW5lcmF0ZVR5cGVJbmZvIiwiaGFzVGFibGVOYW1lIiwid3JpdGVVc1ZhcmNoYXIiLCJ3cml0ZUJWYXJjaGFyIiwiZGF0YSIsInNldFRpbWVvdXQiLCJ0aW1lb3V0IiwiRE9ORSIsInN0YXR1cyIsImNhbmNlbCIsImVtaXQiLCJfZGVmYXVsdCIsImV4cG9ydHMiLCJtb2R1bGUiXSwic291cmNlcyI6WyIuLi9zcmMvYnVsay1sb2FkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgV3JpdGFibGVUcmFja2luZ0J1ZmZlciBmcm9tICcuL3RyYWNraW5nLWJ1ZmZlci93cml0YWJsZS10cmFja2luZy1idWZmZXInO1xuaW1wb3J0IENvbm5lY3Rpb24sIHsgdHlwZSBJbnRlcm5hbENvbm5lY3Rpb25PcHRpb25zIH0gZnJvbSAnLi9jb25uZWN0aW9uJztcblxuaW1wb3J0IHsgVHJhbnNmb3JtIH0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7IFRZUEUgYXMgVE9LRU5fVFlQRSB9IGZyb20gJy4vdG9rZW4vdG9rZW4nO1xuXG5pbXBvcnQgeyB0eXBlIERhdGFUeXBlLCB0eXBlIFBhcmFtZXRlciB9IGZyb20gJy4vZGF0YS10eXBlJztcbmltcG9ydCB7IENvbGxhdGlvbiB9IGZyb20gJy4vY29sbGF0aW9uJztcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBGTEFHUyA9IHtcbiAgbnVsbGFibGU6IDEgPDwgMCxcbiAgY2FzZVNlbjogMSA8PCAxLFxuICB1cGRhdGVhYmxlUmVhZFdyaXRlOiAxIDw8IDIsXG4gIHVwZGF0ZWFibGVVbmtub3duOiAxIDw8IDMsXG4gIGlkZW50aXR5OiAxIDw8IDQsXG4gIGNvbXB1dGVkOiAxIDw8IDUsIC8vIGludHJvZHVjZWQgaW4gVERTIDcuMlxuICBmaXhlZExlbkNMUlR5cGU6IDEgPDwgOCwgLy8gaW50cm9kdWNlZCBpbiBURFMgNy4yXG4gIHNwYXJzZUNvbHVtblNldDogMSA8PCAxMCwgLy8gaW50cm9kdWNlZCBpbiBURFMgNy4zLkJcbiAgaGlkZGVuOiAxIDw8IDEzLCAvLyBpbnRyb2R1Y2VkIGluIFREUyA3LjJcbiAga2V5OiAxIDw8IDE0LCAvLyBpbnRyb2R1Y2VkIGluIFREUyA3LjJcbiAgbnVsbGFibGVVbmtub3duOiAxIDw8IDE1IC8vIGludHJvZHVjZWQgaW4gVERTIDcuMlxufTtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBET05FX1NUQVRVUyA9IHtcbiAgRklOQUw6IDB4MDAsXG4gIE1PUkU6IDB4MSxcbiAgRVJST1I6IDB4MixcbiAgSU5YQUNUOiAweDQsXG4gIENPVU5UOiAweDEwLFxuICBBVFROOiAweDIwLFxuICBTUlZFUlJPUjogMHgxMDBcbn07XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuaW50ZXJmYWNlIEludGVybmFsT3B0aW9ucyB7XG4gIGNoZWNrQ29uc3RyYWludHM6IGJvb2xlYW47XG4gIGZpcmVUcmlnZ2VyczogYm9vbGVhbjtcbiAga2VlcE51bGxzOiBib29sZWFuO1xuICBsb2NrVGFibGU6IGJvb2xlYW47XG4gIG9yZGVyOiB7IFtjb2x1bW5OYW1lOiBzdHJpbmddOiAnQVNDJyB8ICdERVNDJyB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICAvKipcbiAgICogSG9ub3JzIGNvbnN0cmFpbnRzIGR1cmluZyBidWxrIGxvYWQsIHVzaW5nIFQtU1FMXG4gICAqIFtDSEVDS19DT05TVFJBSU5UU10oaHR0cHM6Ly90ZWNobmV0Lm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczE4NjI0Nyh2PXNxbC4xMDUpLmFzcHgpLlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIGNoZWNrQ29uc3RyYWludHM/OiBJbnRlcm5hbE9wdGlvbnNbJ2NoZWNrQ29uc3RyYWludHMnXSB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogSG9ub3JzIGluc2VydCB0cmlnZ2VycyBkdXJpbmcgYnVsayBsb2FkLCB1c2luZyB0aGUgVC1TUUwgW0ZJUkVfVFJJR0dFUlNdKGh0dHBzOi8vdGVjaG5ldC5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXMxODc2NDAodj1zcWwuMTA1KS5hc3B4KS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBmaXJlVHJpZ2dlcnM/OiBJbnRlcm5hbE9wdGlvbnNbJ2ZpcmVUcmlnZ2VycyddIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBIb25vcnMgbnVsbCB2YWx1ZSBwYXNzZWQsIGlnbm9yZXMgdGhlIGRlZmF1bHQgdmFsdWVzIHNldCBvbiB0YWJsZSwgdXNpbmcgVC1TUUwgW0tFRVBfTlVMTFNdKGh0dHBzOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXMxODc4ODcodj1zcWwuMTIwKS5hc3B4KS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBrZWVwTnVsbHM/OiBJbnRlcm5hbE9wdGlvbnNbJ2tlZXBOdWxscyddIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBQbGFjZXMgYSBidWxrIHVwZGF0ZShCVSkgbG9jayBvbiB0YWJsZSB3aGlsZSBwZXJmb3JtaW5nIGJ1bGsgbG9hZCwgdXNpbmcgVC1TUUwgW1RBQkxPQ0tdKGh0dHBzOi8vdGVjaG5ldC5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXMxODA4NzYodj1zcWwuMTA1KS5hc3B4KS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBsb2NrVGFibGU/OiBJbnRlcm5hbE9wdGlvbnNbJ2xvY2tUYWJsZSddIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgdGhlIG9yZGVyaW5nIG9mIHRoZSBkYXRhIHRvIHBvc3NpYmx5IGluY3JlYXNlIGJ1bGsgaW5zZXJ0IHBlcmZvcm1hbmNlLCB1c2luZyBULVNRTCBbT1JERVJdKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3ByZXZpb3VzLXZlcnNpb25zL3NxbC9zcWwtc2VydmVyLTIwMDgtcjIvbXMxNzc0Njgodj1zcWwuMTA1KSkuIChkZWZhdWx0OiBge31gKVxuICAgKi9cbiAgb3JkZXI/OiBJbnRlcm5hbE9wdGlvbnNbJ29yZGVyJ10gfCB1bmRlZmluZWQ7XG59XG5cblxuZXhwb3J0IHR5cGUgQ2FsbGJhY2sgPVxuICAvKipcbiAgICogQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIGNhbGxlZCBhZnRlciB0aGUgW1tCdWxrTG9hZF1dIGZpbmlzaGVzIGV4ZWN1dGluZy5cbiAgICpcbiAgICogQHBhcmFtIHJvd0NvdW50IHRoZSBudW1iZXIgb2Ygcm93cyBpbnNlcnRlZFxuICAgKi9cbiAgKGVycjogRXJyb3IgfCB1bmRlZmluZWQgfCBudWxsLCByb3dDb3VudD86IG51bWJlcikgPT4gdm9pZDtcblxuaW50ZXJmYWNlIENvbHVtbiBleHRlbmRzIFBhcmFtZXRlciB7XG4gIG9iak5hbWU6IHN0cmluZztcbiAgY29sbGF0aW9uOiBDb2xsYXRpb24gfCB1bmRlZmluZWQ7XG59XG5cbmludGVyZmFjZSBDb2x1bW5PcHRpb25zIHtcbiAgb3V0cHV0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRm9yIFZhckNoYXIsIE5WYXJDaGFyLCBWYXJCaW5hcnkuIFVzZSBsZW5ndGggYXMgYEluZmluaXR5YCBmb3IgVmFyQ2hhcihtYXgpLCBOVmFyQ2hhcihtYXgpIGFuZCBWYXJCaW5hcnkobWF4KS5cbiAgICovXG4gIGxlbmd0aD86IG51bWJlcjtcblxuICAvKipcbiAgICogRm9yIE51bWVyaWMsIERlY2ltYWwuXG4gICAqL1xuICBwcmVjaXNpb24/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEZvciBOdW1lcmljLCBEZWNpbWFsLCBUaW1lLCBEYXRlVGltZTIsIERhdGVUaW1lT2Zmc2V0LlxuICAgKi9cbiAgc2NhbGU/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIElmIHRoZSBuYW1lIG9mIHRoZSBjb2x1bW4gaXMgZGlmZmVyZW50IGZyb20gdGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5IGZvdW5kIG9uIGByb3dPYmpgIGFyZ3VtZW50cyBwYXNzZWQgdG8gW1thZGRSb3ddXSwgdGhlbiB5b3UgY2FuIHVzZSB0aGlzIG9wdGlvbiB0byBzcGVjaWZ5IHRoZSBwcm9wZXJ0eSBuYW1lLlxuICAgKi9cbiAgb2JqTmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGNvbHVtbiBhY2NlcHRzIE5VTEwgdmFsdWVzLlxuICAgKi9cbiAgbnVsbGFibGU/OiBib29sZWFuO1xufVxuXG5jb25zdCByb3dUb2tlbkJ1ZmZlciA9IEJ1ZmZlci5mcm9tKFsgVE9LRU5fVFlQRS5ST1cgXSk7XG5jb25zdCB0ZXh0UG9pbnRlckFuZFRpbWVzdGFtcEJ1ZmZlciA9IEJ1ZmZlci5mcm9tKFtcbiAgLy8gVGV4dFBvaW50ZXIgbGVuZ3RoXG4gIDB4MTAsXG5cbiAgLy8gVGV4dFBvaW50ZXJcbiAgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCxcblxuICAvLyBUaW1lc3RhbXBcbiAgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMFxuXSk7XG5jb25zdCB0ZXh0UG9pbnRlck51bGxCdWZmZXIgPSBCdWZmZXIuZnJvbShbMHgwMF0pO1xuXG4vLyBBIHRyYW5zZm9ybSB0aGF0IGNvbnZlcnRzIHJvd3MgdG8gcGFja2V0cy5cbmNsYXNzIFJvd1RyYW5zZm9ybSBleHRlbmRzIFRyYW5zZm9ybSB7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjb2x1bW5NZXRhZGF0YVdyaXR0ZW46IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBidWxrTG9hZDogQnVsa0xvYWQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBtYWluT3B0aW9uczogQnVsa0xvYWRbJ29wdGlvbnMnXTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGNvbHVtbnM6IEJ1bGtMb2FkWydjb2x1bW5zJ107XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjb25zdHJ1Y3RvcihidWxrTG9hZDogQnVsa0xvYWQpIHtcbiAgICBzdXBlcih7IHdyaXRhYmxlT2JqZWN0TW9kZTogdHJ1ZSB9KTtcblxuICAgIHRoaXMuYnVsa0xvYWQgPSBidWxrTG9hZDtcbiAgICB0aGlzLm1haW5PcHRpb25zID0gYnVsa0xvYWQub3B0aW9ucztcbiAgICB0aGlzLmNvbHVtbnMgPSBidWxrTG9hZC5jb2x1bW5zO1xuXG4gICAgdGhpcy5jb2x1bW5NZXRhZGF0YVdyaXR0ZW4gPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3RyYW5zZm9ybShyb3c6IEFycmF5PHVua25vd24+IHwgeyBbY29sTmFtZTogc3RyaW5nXTogdW5rbm93biB9LCBfZW5jb2Rpbmc6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcj86IEVycm9yKSA9PiB2b2lkKSB7XG4gICAgaWYgKCF0aGlzLmNvbHVtbk1ldGFkYXRhV3JpdHRlbikge1xuICAgICAgdGhpcy5wdXNoKHRoaXMuYnVsa0xvYWQuZ2V0Q29sTWV0YURhdGEoKSk7XG4gICAgICB0aGlzLmNvbHVtbk1ldGFkYXRhV3JpdHRlbiA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5wdXNoKHJvd1Rva2VuQnVmZmVyKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb2x1bW5zW2ldO1xuICAgICAgbGV0IHZhbHVlID0gQXJyYXkuaXNBcnJheShyb3cpID8gcm93W2ldIDogcm93W2Mub2JqTmFtZV07XG5cbiAgICAgIGlmICghdGhpcy5idWxrTG9hZC5maXJzdFJvd1dyaXR0ZW4pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YWx1ZSA9IGMudHlwZS52YWxpZGF0ZSh2YWx1ZSwgYy5jb2xsYXRpb24pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBwYXJhbWV0ZXIgPSB7XG4gICAgICAgIGxlbmd0aDogYy5sZW5ndGgsXG4gICAgICAgIHNjYWxlOiBjLnNjYWxlLFxuICAgICAgICBwcmVjaXNpb246IGMucHJlY2lzaW9uLFxuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgIH07XG5cbiAgICAgIGlmIChjLnR5cGUubmFtZSA9PT0gJ1RleHQnIHx8IGMudHlwZS5uYW1lID09PSAnSW1hZ2UnIHx8IGMudHlwZS5uYW1lID09PSAnTlRleHQnKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5wdXNoKHRleHRQb2ludGVyTnVsbEJ1ZmZlcik7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnB1c2godGV4dFBvaW50ZXJBbmRUaW1lc3RhbXBCdWZmZXIpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnB1c2goYy50eXBlLmdlbmVyYXRlUGFyYW1ldGVyTGVuZ3RoKHBhcmFtZXRlciwgdGhpcy5tYWluT3B0aW9ucykpO1xuICAgICAgZm9yIChjb25zdCBjaHVuayBvZiBjLnR5cGUuZ2VuZXJhdGVQYXJhbWV0ZXJEYXRhKHBhcmFtZXRlciwgdGhpcy5tYWluT3B0aW9ucykpIHtcbiAgICAgICAgdGhpcy5wdXNoKGNodW5rKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwcm9jZXNzLm5leHRUaWNrKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2ZsdXNoKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgdGhpcy5wdXNoKHRoaXMuYnVsa0xvYWQuY3JlYXRlRG9uZVRva2VuKCkpO1xuXG4gICAgcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFjayk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIEJ1bGtMb2FkIGluc3RhbmNlIGlzIHVzZWQgdG8gcGVyZm9ybSBhIGJ1bGsgaW5zZXJ0LlxuICpcbiAqIFVzZSBbW0Nvbm5lY3Rpb24ubmV3QnVsa0xvYWRdXSB0byBjcmVhdGUgYSBuZXcgaW5zdGFuY2UsIGFuZCBbW0Nvbm5lY3Rpb24uZXhlY0J1bGtMb2FkXV0gdG8gZXhlY3V0ZSBpdC5cbiAqXG4gKiBFeGFtcGxlIG9mIEJ1bGtMb2FkIFVzYWdlczpcbiAqXG4gKiBgYGBqc1xuICogLy8gb3B0aW9uYWwgQnVsa0xvYWQgb3B0aW9uc1xuICogY29uc3Qgb3B0aW9ucyA9IHsga2VlcE51bGxzOiB0cnVlIH07XG4gKlxuICogLy8gaW5zdGFudGlhdGUgLSBwcm92aWRlIHRoZSB0YWJsZSB3aGVyZSB5b3UnbGwgYmUgaW5zZXJ0aW5nIHRvLCBvcHRpb25zIGFuZCBhIGNhbGxiYWNrXG4gKiBjb25zdCBidWxrTG9hZCA9IGNvbm5lY3Rpb24ubmV3QnVsa0xvYWQoJ015VGFibGUnLCBvcHRpb25zLCAoZXJyb3IsIHJvd0NvdW50KSA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKCdpbnNlcnRlZCAlZCByb3dzJywgcm93Q291bnQpO1xuICogfSk7XG4gKlxuICogLy8gc2V0dXAgeW91ciBjb2x1bW5zIC0gYWx3YXlzIGluZGljYXRlIHdoZXRoZXIgdGhlIGNvbHVtbiBpcyBudWxsYWJsZVxuICogYnVsa0xvYWQuYWRkQ29sdW1uKCdteUludCcsIFRZUEVTLkludCwgeyBudWxsYWJsZTogZmFsc2UgfSk7XG4gKiBidWxrTG9hZC5hZGRDb2x1bW4oJ215U3RyaW5nJywgVFlQRVMuTlZhckNoYXIsIHsgbGVuZ3RoOiA1MCwgbnVsbGFibGU6IHRydWUgfSk7XG4gKlxuICogLy8gZXhlY3V0ZVxuICogY29ubmVjdGlvbi5leGVjQnVsa0xvYWQoYnVsa0xvYWQsIFtcbiAqICAgeyBteUludDogNywgbXlTdHJpbmc6ICdoZWxsbycgfSxcbiAqICAgeyBteUludDogMjMsIG15U3RyaW5nOiAnd29ybGQnIH1cbiAqIF0pO1xuICogYGBgXG4gKi9cbmNsYXNzIEJ1bGtMb2FkIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGNhbmNlbGVkOiBib29sZWFuO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgZXhlY3V0aW9uU3RhcnRlZDogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHN0cmVhbWluZ01vZGU6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSB0YWJsZTogc3RyaW5nO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgdGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBvcHRpb25zOiBJbnRlcm5hbENvbm5lY3Rpb25PcHRpb25zO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgY2FsbGJhY2s6IENhbGxiYWNrO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjb2x1bW5zOiBBcnJheTxDb2x1bW4+O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgY29sdW1uc0J5TmFtZTogeyBbbmFtZTogc3RyaW5nXTogQ29sdW1uIH07XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGZpcnN0Um93V3JpdHRlbjogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHJvd1RvUGFja2V0VHJhbnNmb3JtOiBSb3dUcmFuc2Zvcm07XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGJ1bGtPcHRpb25zOiBJbnRlcm5hbE9wdGlvbnM7XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGNvbm5lY3Rpb246IENvbm5lY3Rpb24gfCB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSByb3dzOiBBcnJheTxhbnk+IHwgdW5kZWZpbmVkO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgcnN0OiBBcnJheTxhbnk+IHwgdW5kZWZpbmVkO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgcm93Q291bnQ6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICBkZWNsYXJlIGNvbGxhdGlvbjogQ29sbGF0aW9uIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY29uc3RydWN0b3IodGFibGU6IHN0cmluZywgY29sbGF0aW9uOiBDb2xsYXRpb24gfCB1bmRlZmluZWQsIGNvbm5lY3Rpb25PcHRpb25zOiBJbnRlcm5hbENvbm5lY3Rpb25PcHRpb25zLCB7XG4gICAgY2hlY2tDb25zdHJhaW50cyA9IGZhbHNlLFxuICAgIGZpcmVUcmlnZ2VycyA9IGZhbHNlLFxuICAgIGtlZXBOdWxscyA9IGZhbHNlLFxuICAgIGxvY2tUYWJsZSA9IGZhbHNlLFxuICAgIG9yZGVyID0ge30sXG4gIH06IE9wdGlvbnMsIGNhbGxiYWNrOiBDYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2hlY2tDb25zdHJhaW50cyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJvcHRpb25zLmNoZWNrQ29uc3RyYWludHNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGZpcmVUcmlnZ2VycyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJvcHRpb25zLmZpcmVUcmlnZ2Vyc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Yga2VlcE51bGxzICE9PSAnYm9vbGVhbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcIm9wdGlvbnMua2VlcE51bGxzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsb2NrVGFibGUgIT09ICdib29sZWFuJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwib3B0aW9ucy5sb2NrVGFibGVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9yZGVyICE9PSAnb2JqZWN0JyB8fCBvcmRlciA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwib3B0aW9ucy5vcmRlclwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbY29sdW1uLCBkaXJlY3Rpb25dIG9mIE9iamVjdC5lbnRyaWVzKG9yZGVyKSkge1xuICAgICAgaWYgKGRpcmVjdGlvbiAhPT0gJ0FTQycgJiYgZGlyZWN0aW9uICE9PSAnREVTQycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHZhbHVlIG9mIHRoZSBcIicgKyBjb2x1bW4gKyAnXCIga2V5IGluIHRoZSBcIm9wdGlvbnMub3JkZXJcIiBvYmplY3QgbXVzdCBiZSBlaXRoZXIgXCJBU0NcIiBvciBcIkRFU0NcIi4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5lcnJvciA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmNhbmNlbGVkID0gZmFsc2U7XG4gICAgdGhpcy5leGVjdXRpb25TdGFydGVkID0gZmFsc2U7XG5cbiAgICB0aGlzLmNvbGxhdGlvbiA9IGNvbGxhdGlvbjtcblxuICAgIHRoaXMudGFibGUgPSB0YWJsZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBjb25uZWN0aW9uT3B0aW9ucztcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgdGhpcy5jb2x1bW5zID0gW107XG4gICAgdGhpcy5jb2x1bW5zQnlOYW1lID0ge307XG4gICAgdGhpcy5maXJzdFJvd1dyaXR0ZW4gPSBmYWxzZTtcbiAgICB0aGlzLnN0cmVhbWluZ01vZGUgPSBmYWxzZTtcblxuICAgIHRoaXMucm93VG9QYWNrZXRUcmFuc2Zvcm0gPSBuZXcgUm93VHJhbnNmb3JtKHRoaXMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVzZS1iZWZvcmUtZGVmaW5lXG5cbiAgICB0aGlzLmJ1bGtPcHRpb25zID0geyBjaGVja0NvbnN0cmFpbnRzLCBmaXJlVHJpZ2dlcnMsIGtlZXBOdWxscywgbG9ja1RhYmxlLCBvcmRlciB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb2x1bW4gdG8gdGhlIGJ1bGsgbG9hZC5cbiAgICpcbiAgICogVGhlIGNvbHVtbiBkZWZpbml0aW9ucyBzaG91bGQgbWF0Y2ggdGhlIHRhYmxlIHlvdSBhcmUgdHJ5aW5nIHRvIGluc2VydCBpbnRvLlxuICAgKiBBdHRlbXB0aW5nIHRvIGNhbGwgYWRkQ29sdW1uIGFmdGVyIHRoZSBmaXJzdCByb3cgaGFzIGJlZW4gYWRkZWQgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24uXG4gICAqXG4gICAqIGBgYGpzXG4gICAqIGJ1bGtMb2FkLmFkZENvbHVtbignTXlJbnRDb2x1bW4nLCBUWVBFUy5JbnQsIHsgbnVsbGFibGU6IGZhbHNlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGNvbHVtbi5cbiAgICogQHBhcmFtIHR5cGUgT25lIG9mIHRoZSBzdXBwb3J0ZWQgYGRhdGEgdHlwZXNgLlxuICAgKiBAcGFyYW0gX19uYW1lZFBhcmFtZXRlcnMgQWRkaXRpb25hbCBjb2x1bW4gdHlwZSBpbmZvcm1hdGlvbi4gQXQgYSBtaW5pbXVtLCBgbnVsbGFibGVgIG11c3QgYmUgc2V0IHRvIHRydWUgb3IgZmFsc2UuXG4gICAqIEBwYXJhbSBsZW5ndGggRm9yIFZhckNoYXIsIE5WYXJDaGFyLCBWYXJCaW5hcnkuIFVzZSBsZW5ndGggYXMgYEluZmluaXR5YCBmb3IgVmFyQ2hhcihtYXgpLCBOVmFyQ2hhcihtYXgpIGFuZCBWYXJCaW5hcnkobWF4KS5cbiAgICogQHBhcmFtIG51bGxhYmxlIEluZGljYXRlcyB3aGV0aGVyIHRoZSBjb2x1bW4gYWNjZXB0cyBOVUxMIHZhbHVlcy5cbiAgICogQHBhcmFtIG9iak5hbWUgSWYgdGhlIG5hbWUgb2YgdGhlIGNvbHVtbiBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgbmFtZSBvZiB0aGUgcHJvcGVydHkgZm91bmQgb24gYHJvd09iamAgYXJndW1lbnRzIHBhc3NlZCB0byBbW2FkZFJvd11dIG9yIFtbQ29ubmVjdGlvbi5leGVjQnVsa0xvYWRdXSwgdGhlbiB5b3UgY2FuIHVzZSB0aGlzIG9wdGlvbiB0byBzcGVjaWZ5IHRoZSBwcm9wZXJ0eSBuYW1lLlxuICAgKiBAcGFyYW0gcHJlY2lzaW9uIEZvciBOdW1lcmljLCBEZWNpbWFsLlxuICAgKiBAcGFyYW0gc2NhbGUgRm9yIE51bWVyaWMsIERlY2ltYWwsIFRpbWUsIERhdGVUaW1lMiwgRGF0ZVRpbWVPZmZzZXQuXG4gICovXG4gIGFkZENvbHVtbihuYW1lOiBzdHJpbmcsIHR5cGU6IERhdGFUeXBlLCB7IG91dHB1dCA9IGZhbHNlLCBsZW5ndGgsIHByZWNpc2lvbiwgc2NhbGUsIG9iak5hbWUgPSBuYW1lLCBudWxsYWJsZSA9IHRydWUgfTogQ29sdW1uT3B0aW9ucykge1xuICAgIGlmICh0aGlzLmZpcnN0Um93V3JpdHRlbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb2x1bW5zIGNhbm5vdCBiZSBhZGRlZCB0byBidWxrIGluc2VydCBhZnRlciB0aGUgZmlyc3Qgcm93IGhhcyBiZWVuIHdyaXR0ZW4uJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLmV4ZWN1dGlvblN0YXJ0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ29sdW1ucyBjYW5ub3QgYmUgYWRkZWQgdG8gYnVsayBpbnNlcnQgYWZ0ZXIgZXhlY3V0aW9uIGhhcyBzdGFydGVkLicpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbHVtbjogQ29sdW1uID0ge1xuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICB2YWx1ZTogbnVsbCxcbiAgICAgIG91dHB1dDogb3V0cHV0LFxuICAgICAgbGVuZ3RoOiBsZW5ndGgsXG4gICAgICBwcmVjaXNpb246IHByZWNpc2lvbixcbiAgICAgIHNjYWxlOiBzY2FsZSxcbiAgICAgIG9iak5hbWU6IG9iak5hbWUsXG4gICAgICBudWxsYWJsZTogbnVsbGFibGUsXG4gICAgICBjb2xsYXRpb246IHRoaXMuY29sbGF0aW9uXG4gICAgfTtcblxuICAgIGlmICgodHlwZS5pZCAmIDB4MzApID09PSAweDIwKSB7XG4gICAgICBpZiAoY29sdW1uLmxlbmd0aCA9PSBudWxsICYmIHR5cGUucmVzb2x2ZUxlbmd0aCkge1xuICAgICAgICBjb2x1bW4ubGVuZ3RoID0gdHlwZS5yZXNvbHZlTGVuZ3RoKGNvbHVtbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGUucmVzb2x2ZVByZWNpc2lvbiAmJiBjb2x1bW4ucHJlY2lzaW9uID09IG51bGwpIHtcbiAgICAgIGNvbHVtbi5wcmVjaXNpb24gPSB0eXBlLnJlc29sdmVQcmVjaXNpb24oY29sdW1uKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZS5yZXNvbHZlU2NhbGUgJiYgY29sdW1uLnNjYWxlID09IG51bGwpIHtcbiAgICAgIGNvbHVtbi5zY2FsZSA9IHR5cGUucmVzb2x2ZVNjYWxlKGNvbHVtbik7XG4gICAgfVxuXG4gICAgdGhpcy5jb2x1bW5zLnB1c2goY29sdW1uKTtcblxuICAgIHRoaXMuY29sdW1uc0J5TmFtZVtuYW1lXSA9IGNvbHVtbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0T3B0aW9uc1NxbCgpIHtcbiAgICBjb25zdCBhZGRPcHRpb25zID0gW107XG5cbiAgICBpZiAodGhpcy5idWxrT3B0aW9ucy5jaGVja0NvbnN0cmFpbnRzKSB7XG4gICAgICBhZGRPcHRpb25zLnB1c2goJ0NIRUNLX0NPTlNUUkFJTlRTJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYnVsa09wdGlvbnMuZmlyZVRyaWdnZXJzKSB7XG4gICAgICBhZGRPcHRpb25zLnB1c2goJ0ZJUkVfVFJJR0dFUlMnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5idWxrT3B0aW9ucy5rZWVwTnVsbHMpIHtcbiAgICAgIGFkZE9wdGlvbnMucHVzaCgnS0VFUF9OVUxMUycpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmJ1bGtPcHRpb25zLmxvY2tUYWJsZSkge1xuICAgICAgYWRkT3B0aW9ucy5wdXNoKCdUQUJMT0NLJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYnVsa09wdGlvbnMub3JkZXIpIHtcbiAgICAgIGNvbnN0IG9yZGVyQ29sdW1ucyA9IFtdO1xuXG4gICAgICBmb3IgKGNvbnN0IFtjb2x1bW4sIGRpcmVjdGlvbl0gb2YgT2JqZWN0LmVudHJpZXModGhpcy5idWxrT3B0aW9ucy5vcmRlcikpIHtcbiAgICAgICAgb3JkZXJDb2x1bW5zLnB1c2goYCR7Y29sdW1ufSAke2RpcmVjdGlvbn1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9yZGVyQ29sdW1ucy5sZW5ndGgpIHtcbiAgICAgICAgYWRkT3B0aW9ucy5wdXNoKGBPUkRFUiAoJHtvcmRlckNvbHVtbnMuam9pbignLCAnKX0pYCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFkZE9wdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGAgV0lUSCAoJHthZGRPcHRpb25zLmpvaW4oJywnKX0pYDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0QnVsa0luc2VydFNxbCgpIHtcbiAgICBsZXQgc3FsID0gJ2luc2VydCBidWxrICcgKyB0aGlzLnRhYmxlICsgJygnO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLmNvbHVtbnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbHVtbnNbaV07XG4gICAgICBpZiAoaSAhPT0gMCkge1xuICAgICAgICBzcWwgKz0gJywgJztcbiAgICAgIH1cbiAgICAgIHNxbCArPSAnWycgKyBjLm5hbWUgKyAnXSAnICsgKGMudHlwZS5kZWNsYXJhdGlvbihjKSk7XG4gICAgfVxuICAgIHNxbCArPSAnKSc7XG5cbiAgICBzcWwgKz0gdGhpcy5nZXRPcHRpb25zU3FsKCk7XG4gICAgcmV0dXJuIHNxbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGlzIHNpbXBseSBhIGhlbHBlciB1dGlsaXR5IGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSBgQ1JFQVRFIFRBQkxFIFNRTGAgc3RhdGVtZW50IGJhc2VkIG9uIHRoZSBjb2x1bW5zIGFkZGVkIHRvIHRoZSBidWxrTG9hZCBvYmplY3QuXG4gICAqIFRoaXMgbWF5IGJlIHBhcnRpY3VsYXJseSBoYW5keSB3aGVuIHlvdSB3YW50IHRvIGluc2VydCBpbnRvIGEgdGVtcG9yYXJ5IHRhYmxlIChhIHRhYmxlIHdoaWNoIHN0YXJ0cyB3aXRoIGAjYCkuXG4gICAqXG4gICAqIGBgYGpzXG4gICAqIHZhciBzcWwgPSBidWxrTG9hZC5nZXRUYWJsZUNyZWF0aW9uU3FsKCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBBIHNpZGUgbm90ZSBvbiBidWxrIGluc2VydGluZyBpbnRvIHRlbXBvcmFyeSB0YWJsZXM6IGlmIHlvdSB3YW50IHRvIGFjY2VzcyBhIGxvY2FsIHRlbXBvcmFyeSB0YWJsZSBhZnRlciBleGVjdXRpbmcgdGhlIGJ1bGsgbG9hZCxcbiAgICogeW91J2xsIG5lZWQgdG8gdXNlIHRoZSBzYW1lIGNvbm5lY3Rpb24gYW5kIGV4ZWN1dGUgeW91ciByZXF1ZXN0cyB1c2luZyBbW0Nvbm5lY3Rpb24uZXhlY1NxbEJhdGNoXV0gaW5zdGVhZCBvZiBbW0Nvbm5lY3Rpb24uZXhlY1NxbF1dXG4gICAqL1xuICBnZXRUYWJsZUNyZWF0aW9uU3FsKCkge1xuICAgIGxldCBzcWwgPSAnQ1JFQVRFIFRBQkxFICcgKyB0aGlzLnRhYmxlICsgJyhcXG4nO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0aGlzLmNvbHVtbnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbHVtbnNbaV07XG4gICAgICBpZiAoaSAhPT0gMCkge1xuICAgICAgICBzcWwgKz0gJyxcXG4nO1xuICAgICAgfVxuICAgICAgc3FsICs9ICdbJyArIGMubmFtZSArICddICcgKyAoYy50eXBlLmRlY2xhcmF0aW9uKGMpKTtcbiAgICAgIGlmIChjLm51bGxhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3FsICs9ICcgJyArIChjLm51bGxhYmxlID8gJ05VTEwnIDogJ05PVCBOVUxMJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHNxbCArPSAnXFxuKSc7XG4gICAgcmV0dXJuIHNxbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0Q29sTWV0YURhdGEoKSB7XG4gICAgY29uc3QgdEJ1ZiA9IG5ldyBXcml0YWJsZVRyYWNraW5nQnVmZmVyKDEwMCwgbnVsbCwgdHJ1ZSk7XG4gICAgLy8gVG9rZW5UeXBlXG4gICAgdEJ1Zi53cml0ZVVJbnQ4KFRPS0VOX1RZUEUuQ09MTUVUQURBVEEpO1xuICAgIC8vIENvdW50XG4gICAgdEJ1Zi53cml0ZVVJbnQxNkxFKHRoaXMuY29sdW1ucy5sZW5ndGgpO1xuXG4gICAgZm9yIChsZXQgaiA9IDAsIGxlbiA9IHRoaXMuY29sdW1ucy5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMuY29sdW1uc1tqXTtcbiAgICAgIC8vIFVzZXJUeXBlXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgICB0QnVmLndyaXRlVUludDE2TEUoMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0QnVmLndyaXRlVUludDMyTEUoMCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZsYWdzXG4gICAgICBsZXQgZmxhZ3MgPSBGTEFHUy51cGRhdGVhYmxlUmVhZFdyaXRlO1xuICAgICAgaWYgKGMubnVsbGFibGUpIHtcbiAgICAgICAgZmxhZ3MgfD0gRkxBR1MubnVsbGFibGU7XG4gICAgICB9IGVsc2UgaWYgKGMubnVsbGFibGUgPT09IHVuZGVmaW5lZCAmJiB0aGlzLm9wdGlvbnMudGRzVmVyc2lvbiA+PSAnN18yJykge1xuICAgICAgICBmbGFncyB8PSBGTEFHUy5udWxsYWJsZVVua25vd247XG4gICAgICB9XG4gICAgICB0QnVmLndyaXRlVUludDE2TEUoZmxhZ3MpO1xuXG4gICAgICAvLyBUWVBFX0lORk9cbiAgICAgIHRCdWYud3JpdGVCdWZmZXIoYy50eXBlLmdlbmVyYXRlVHlwZUluZm8oYywgdGhpcy5vcHRpb25zKSk7XG5cbiAgICAgIC8vIFRhYmxlTmFtZVxuICAgICAgaWYgKGMudHlwZS5oYXNUYWJsZU5hbWUpIHtcbiAgICAgICAgdEJ1Zi53cml0ZVVzVmFyY2hhcih0aGlzLnRhYmxlLCAndWNzMicpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb2xOYW1lXG4gICAgICB0QnVmLndyaXRlQlZhcmNoYXIoYy5uYW1lLCAndWNzMicpO1xuICAgIH1cbiAgICByZXR1cm4gdEJ1Zi5kYXRhO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYSB0aW1lb3V0IGZvciB0aGlzIGJ1bGsgbG9hZC5cbiAgICpcbiAgICogYGBganNcbiAgICogYnVsa0xvYWQuc2V0VGltZW91dCh0aW1lb3V0KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSB0aW1lb3V0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSB0aGUgYnVsayBsb2FkIGlzIGNvbnNpZGVyZWQgZmFpbGVkLCBvciAwIGZvciBubyB0aW1lb3V0LlxuICAgKiAgIFdoZW4gbm8gdGltZW91dCBpcyBzZXQgZm9yIHRoZSBidWxrIGxvYWQsIHRoZSBbW0Nvbm5lY3Rpb25PcHRpb25zLnJlcXVlc3RUaW1lb3V0XV0gb2YgdGhlIENvbm5lY3Rpb24gaXMgdXNlZC5cbiAgICovXG4gIHNldFRpbWVvdXQodGltZW91dD86IG51bWJlcikge1xuICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZURvbmVUb2tlbigpIHtcbiAgICAvLyBJdCBtaWdodCBiZSBuaWNlIHRvIG1ha2UgRG9uZVRva2VuIGEgY2xhc3MgaWYgYW55dGhpbmcgbmVlZHMgdG8gY3JlYXRlIHRoZW0sIGJ1dCBmb3Igbm93LCBqdXN0IGRvIGl0IGhlcmVcbiAgICBjb25zdCB0QnVmID0gbmV3IFdyaXRhYmxlVHJhY2tpbmdCdWZmZXIodGhpcy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJyA/IDkgOiAxMyk7XG4gICAgdEJ1Zi53cml0ZVVJbnQ4KFRPS0VOX1RZUEUuRE9ORSk7XG4gICAgY29uc3Qgc3RhdHVzID0gRE9ORV9TVEFUVVMuRklOQUw7XG4gICAgdEJ1Zi53cml0ZVVJbnQxNkxFKHN0YXR1cyk7XG4gICAgdEJ1Zi53cml0ZVVJbnQxNkxFKDApOyAvLyBDdXJDbWQgKFREUyBpZ25vcmVzIHRoaXMpXG4gICAgdEJ1Zi53cml0ZVVJbnQzMkxFKDApOyAvLyByb3cgY291bnQgLSBkb2Vzbid0IHJlYWxseSBtYXR0ZXJcbiAgICBpZiAodGhpcy5vcHRpb25zLnRkc1ZlcnNpb24gPj0gJzdfMicpIHtcbiAgICAgIHRCdWYud3JpdGVVSW50MzJMRSgwKTsgLy8gcm93IGNvdW50IGlzIDY0IGJpdHMgaW4gPj0gVERTIDcuMlxuICAgIH1cbiAgICByZXR1cm4gdEJ1Zi5kYXRhO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjYW5jZWwoKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNhbmNlbGVkID0gdHJ1ZTtcbiAgICB0aGlzLmVtaXQoJ2NhbmNlbCcpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEJ1bGtMb2FkO1xubW9kdWxlLmV4cG9ydHMgPSBCdWxrTG9hZDtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBQUEsT0FBQSxHQUFBQyxPQUFBO0FBQ0EsSUFBQUMsdUJBQUEsR0FBQUMsc0JBQUEsQ0FBQUYsT0FBQTtBQUdBLElBQUFHLE9BQUEsR0FBQUgsT0FBQTtBQUNBLElBQUFJLE1BQUEsR0FBQUosT0FBQTtBQUFtRCxTQUFBRSx1QkFBQUcsR0FBQSxXQUFBQSxHQUFBLElBQUFBLEdBQUEsQ0FBQUMsVUFBQSxHQUFBRCxHQUFBLEtBQUFFLE9BQUEsRUFBQUYsR0FBQTtBQUtuRDtBQUNBO0FBQ0E7QUFDQSxNQUFNRyxLQUFLLEdBQUc7RUFDWkMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDO0VBQ2hCQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUM7RUFDZkMsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUM7RUFDM0JDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDO0VBQ3pCQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUM7RUFDaEJDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQztFQUFFO0VBQ2xCQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLENBQUM7RUFBRTtFQUN6QkMsZUFBZSxFQUFFLENBQUMsSUFBSSxFQUFFO0VBQUU7RUFDMUJDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRTtFQUFFO0VBQ2pCQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUU7RUFBRTtFQUNkQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUMzQixDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBLE1BQU1DLFdBQVcsR0FBRztFQUNsQkMsS0FBSyxFQUFFLElBQUk7RUFDWEMsSUFBSSxFQUFFLEdBQUc7RUFDVEMsS0FBSyxFQUFFLEdBQUc7RUFDVkMsTUFBTSxFQUFFLEdBQUc7RUFD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