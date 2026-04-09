"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _events = require("events");
var _writableTrackingBuffer = _interopRequireDefault(require("./tracking-buffer/writable-tracking-buffer"));
var _stream = require("stream");
var _token = require("./token/token");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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
      try {
        this.push(c.type.generateParameterLength(parameter, this.mainOptions));
        for (const chunk of c.type.generateParameterData(parameter, this.mainOptions)) {
          this.push(chunk);
        }
      } catch (error) {
        return callback(error);
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
    this.rowToPacketTransform = new RowTransform(this);
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
var _default = exports.default = BulkLoad;
module.exports = BulkLoad;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfZXZlbnRzIiwicmVxdWlyZSIsIl93cml0YWJsZVRyYWNraW5nQnVmZmVyIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsIl9zdHJlYW0iLCJfdG9rZW4iLCJlIiwiX19lc01vZHVsZSIsImRlZmF1bHQiLCJGTEFHUyIsIm51bGxhYmxlIiwiY2FzZVNlbiIsInVwZGF0ZWFibGVSZWFkV3JpdGUiLCJ1cGRhdGVhYmxlVW5rbm93biIsImlkZW50aXR5IiwiY29tcHV0ZWQiLCJmaXhlZExlbkNMUlR5cGUiLCJzcGFyc2VDb2x1bW5TZXQiLCJoaWRkZW4iLCJrZXkiLCJudWxsYWJsZVVua25vd24iLCJET05FX1NUQVRVUyIsIkZJTkFMIiwiTU9SRSIsIkVSUk9SIiwiSU5YQUNUIiwiQ09VTlQiLCJBVFROIiwiU1JWRVJST1IiLCJyb3dUb2tlbkJ1ZmZlciIsIkJ1ZmZlciIsImZyb20iLCJUT0tFTl9UWVBFIiwiUk9XIiwidGV4dFBvaW50ZXJBbmRUaW1lc3RhbXBCdWZmZXIiLCJ0ZXh0UG9pbnRlck51bGxCdWZmZXIiLCJSb3dUcmFuc2Zvcm0iLCJUcmFuc2Zvcm0iLCJjb25zdHJ1Y3RvciIsImJ1bGtMb2FkIiwid3JpdGFibGVPYmplY3RNb2RlIiwibWFpbk9wdGlvbnMiLCJvcHRpb25zIiwiY29sdW1ucyIsImNvbHVtbk1ldGFkYXRhV3JpdHRlbiIsIl90cmFuc2Zvcm0iLCJyb3ciLCJfZW5jb2RpbmciLCJjYWxsYmFjayIsInB1c2giLCJnZXRDb2xNZXRhRGF0YSIsImkiLCJsZW5ndGgiLCJjIiwidmFsdWUiLCJBcnJheSIsImlzQXJyYXkiLCJvYmpOYW1lIiwiZmlyc3RSb3dXcml0dGVuIiwidHlwZSIsInZhbGlkYXRlIiwiY29sbGF0aW9uIiwiZXJyb3IiLCJwYXJhbWV0ZXIiLCJzY2FsZSIsInByZWNpc2lvbiIsIm5hbWUiLCJnZW5lcmF0ZVBhcmFtZXRlckxlbmd0aCIsImNodW5rIiwiZ2VuZXJhdGVQYXJhbWV0ZXJEYXRhIiwicHJvY2VzcyIsIm5leHRUaWNrIiwiX2ZsdXNoIiwiY3JlYXRlRG9uZVRva2VuIiwiQnVsa0xvYWQiLCJFdmVudEVtaXR0ZXIiLCJ0YWJsZSIsImNvbm5lY3Rpb25PcHRpb25zIiwiY2hlY2tDb25zdHJhaW50cyIsImZpcmVUcmlnZ2VycyIsImtlZXBOdWxscyIsImxvY2tUYWJsZSIsIm9yZGVyIiwiVHlwZUVycm9yIiwiY29sdW1uIiwiZGlyZWN0aW9uIiwiT2JqZWN0IiwiZW50cmllcyIsInVuZGVmaW5lZCIsImNhbmNlbGVkIiwiZXhlY3V0aW9uU3RhcnRlZCIsImNvbHVtbnNCeU5hbWUiLCJzdHJlYW1pbmdNb2RlIiwicm93VG9QYWNrZXRUcmFuc2Zvcm0iLCJidWxrT3B0aW9ucyIsImFkZENvbHVtbiIsIm91dHB1dCIsIkVycm9yIiwiaWQiLCJyZXNvbHZlTGVuZ3RoIiwicmVzb2x2ZVByZWNpc2lvbiIsInJlc29sdmVTY2FsZSIsImdldE9wdGlvbnNTcWwiLCJhZGRPcHRpb25zIiwib3JkZXJDb2x1bW5zIiwiam9pbiIsImdldEJ1bGtJbnNlcnRTcWwiLCJzcWwiLCJsZW4iLCJkZWNsYXJhdGlvbiIsImdldFRhYmxlQ3JlYXRpb25TcWwiLCJ0QnVmIiwiV3JpdGFibGVUcmFja2luZ0J1ZmZlciIsIndyaXRlVUludDgiLCJDT0xNRVRBREFUQSIsIndyaXRlVUludDE2TEUiLCJqIiwidGRzVmVyc2lvbiIsIndyaXRlVUludDMyTEUiLCJmbGFncyIsIndyaXRlQnVmZmVyIiwiZ2VuZXJhdGVUeXBlSW5mbyIsImhhc1RhYmxlTmFtZSIsIndyaXRlVXNWYXJjaGFyIiwid3JpdGVCVmFyY2hhciIsImRhdGEiLCJzZXRUaW1lb3V0IiwidGltZW91dCIsIkRPTkUiLCJzdGF0dXMiLCJjYW5jZWwiLCJlbWl0IiwiX2RlZmF1bHQiLCJleHBvcnRzIiwibW9kdWxlIl0sInNvdXJjZXMiOlsiLi4vc3JjL2J1bGstbG9hZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IFdyaXRhYmxlVHJhY2tpbmdCdWZmZXIgZnJvbSAnLi90cmFja2luZy1idWZmZXIvd3JpdGFibGUtdHJhY2tpbmctYnVmZmVyJztcbmltcG9ydCBDb25uZWN0aW9uLCB7IHR5cGUgSW50ZXJuYWxDb25uZWN0aW9uT3B0aW9ucyB9IGZyb20gJy4vY29ubmVjdGlvbic7XG5cbmltcG9ydCB7IFRyYW5zZm9ybSB9IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgeyBUWVBFIGFzIFRPS0VOX1RZUEUgfSBmcm9tICcuL3Rva2VuL3Rva2VuJztcblxuaW1wb3J0IHsgdHlwZSBEYXRhVHlwZSwgdHlwZSBQYXJhbWV0ZXIgfSBmcm9tICcuL2RhdGEtdHlwZSc7XG5pbXBvcnQgeyBDb2xsYXRpb24gfSBmcm9tICcuL2NvbGxhdGlvbic7XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgRkxBR1MgPSB7XG4gIG51bGxhYmxlOiAxIDw8IDAsXG4gIGNhc2VTZW46IDEgPDwgMSxcbiAgdXBkYXRlYWJsZVJlYWRXcml0ZTogMSA8PCAyLFxuICB1cGRhdGVhYmxlVW5rbm93bjogMSA8PCAzLFxuICBpZGVudGl0eTogMSA8PCA0LFxuICBjb21wdXRlZDogMSA8PCA1LCAvLyBpbnRyb2R1Y2VkIGluIFREUyA3LjJcbiAgZml4ZWRMZW5DTFJUeXBlOiAxIDw8IDgsIC8vIGludHJvZHVjZWQgaW4gVERTIDcuMlxuICBzcGFyc2VDb2x1bW5TZXQ6IDEgPDwgMTAsIC8vIGludHJvZHVjZWQgaW4gVERTIDcuMy5CXG4gIGhpZGRlbjogMSA8PCAxMywgLy8gaW50cm9kdWNlZCBpbiBURFMgNy4yXG4gIGtleTogMSA8PCAxNCwgLy8gaW50cm9kdWNlZCBpbiBURFMgNy4yXG4gIG51bGxhYmxlVW5rbm93bjogMSA8PCAxNSAvLyBpbnRyb2R1Y2VkIGluIFREUyA3LjJcbn07XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgRE9ORV9TVEFUVVMgPSB7XG4gIEZJTkFMOiAweDAwLFxuICBNT1JFOiAweDEsXG4gIEVSUk9SOiAweDIsXG4gIElOWEFDVDogMHg0LFxuICBDT1VOVDogMHgxMCxcbiAgQVRUTjogMHgyMCxcbiAgU1JWRVJST1I6IDB4MTAwXG59O1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmludGVyZmFjZSBJbnRlcm5hbE9wdGlvbnMge1xuICBjaGVja0NvbnN0cmFpbnRzOiBib29sZWFuO1xuICBmaXJlVHJpZ2dlcnM6IGJvb2xlYW47XG4gIGtlZXBOdWxsczogYm9vbGVhbjtcbiAgbG9ja1RhYmxlOiBib29sZWFuO1xuICBvcmRlcjogeyBbY29sdW1uTmFtZTogc3RyaW5nXTogJ0FTQycgfCAnREVTQycgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAgLyoqXG4gICAqIEhvbm9ycyBjb25zdHJhaW50cyBkdXJpbmcgYnVsayBsb2FkLCB1c2luZyBULVNRTFxuICAgKiBbQ0hFQ0tfQ09OU1RSQUlOVFNdKGh0dHBzOi8vdGVjaG5ldC5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXMxODYyNDcodj1zcWwuMTA1KS5hc3B4KS5cbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBjaGVja0NvbnN0cmFpbnRzPzogSW50ZXJuYWxPcHRpb25zWydjaGVja0NvbnN0cmFpbnRzJ10gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEhvbm9ycyBpbnNlcnQgdHJpZ2dlcnMgZHVyaW5nIGJ1bGsgbG9hZCwgdXNpbmcgdGhlIFQtU1FMIFtGSVJFX1RSSUdHRVJTXShodHRwczovL3RlY2huZXQubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zMTg3NjQwKHY9c3FsLjEwNSkuYXNweCkuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgZmlyZVRyaWdnZXJzPzogSW50ZXJuYWxPcHRpb25zWydmaXJlVHJpZ2dlcnMnXSB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogSG9ub3JzIG51bGwgdmFsdWUgcGFzc2VkLCBpZ25vcmVzIHRoZSBkZWZhdWx0IHZhbHVlcyBzZXQgb24gdGFibGUsIHVzaW5nIFQtU1FMIFtLRUVQX05VTExTXShodHRwczovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zMTg3ODg3KHY9c3FsLjEyMCkuYXNweCkuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAga2VlcE51bGxzPzogSW50ZXJuYWxPcHRpb25zWydrZWVwTnVsbHMnXSB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogUGxhY2VzIGEgYnVsayB1cGRhdGUoQlUpIGxvY2sgb24gdGFibGUgd2hpbGUgcGVyZm9ybWluZyBidWxrIGxvYWQsIHVzaW5nIFQtU1FMIFtUQUJMT0NLXShodHRwczovL3RlY2huZXQubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zMTgwODc2KHY9c3FsLjEwNSkuYXNweCkuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgbG9ja1RhYmxlPzogSW50ZXJuYWxPcHRpb25zWydsb2NrVGFibGUnXSB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogU3BlY2lmaWVzIHRoZSBvcmRlcmluZyBvZiB0aGUgZGF0YSB0byBwb3NzaWJseSBpbmNyZWFzZSBidWxrIGluc2VydCBwZXJmb3JtYW5jZSwgdXNpbmcgVC1TUUwgW09SREVSXShodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9wcmV2aW91cy12ZXJzaW9ucy9zcWwvc3FsLXNlcnZlci0yMDA4LXIyL21zMTc3NDY4KHY9c3FsLjEwNSkpLiAoZGVmYXVsdDogYHt9YClcbiAgICovXG4gIG9yZGVyPzogSW50ZXJuYWxPcHRpb25zWydvcmRlciddIHwgdW5kZWZpbmVkO1xufVxuXG5cbmV4cG9ydCB0eXBlIENhbGxiYWNrID1cbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgdGhlIFtbQnVsa0xvYWRdXSBmaW5pc2hlcyBleGVjdXRpbmcuXG4gICAqXG4gICAqIEBwYXJhbSByb3dDb3VudCB0aGUgbnVtYmVyIG9mIHJvd3MgaW5zZXJ0ZWRcbiAgICovXG4gIChlcnI6IEVycm9yIHwgdW5kZWZpbmVkIHwgbnVsbCwgcm93Q291bnQ/OiBudW1iZXIpID0+IHZvaWQ7XG5cbmludGVyZmFjZSBDb2x1bW4gZXh0ZW5kcyBQYXJhbWV0ZXIge1xuICBvYmpOYW1lOiBzdHJpbmc7XG4gIGNvbGxhdGlvbjogQ29sbGF0aW9uIHwgdW5kZWZpbmVkO1xufVxuXG5pbnRlcmZhY2UgQ29sdW1uT3B0aW9ucyB7XG4gIG91dHB1dD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEZvciBWYXJDaGFyLCBOVmFyQ2hhciwgVmFyQmluYXJ5LiBVc2UgbGVuZ3RoIGFzIGBJbmZpbml0eWAgZm9yIFZhckNoYXIobWF4KSwgTlZhckNoYXIobWF4KSBhbmQgVmFyQmluYXJ5KG1heCkuXG4gICAqL1xuICBsZW5ndGg/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEZvciBOdW1lcmljLCBEZWNpbWFsLlxuICAgKi9cbiAgcHJlY2lzaW9uPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBGb3IgTnVtZXJpYywgRGVjaW1hbCwgVGltZSwgRGF0ZVRpbWUyLCBEYXRlVGltZU9mZnNldC5cbiAgICovXG4gIHNjYWxlPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJZiB0aGUgbmFtZSBvZiB0aGUgY29sdW1uIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBmb3VuZCBvbiBgcm93T2JqYCBhcmd1bWVudHMgcGFzc2VkIHRvIFtbYWRkUm93XV0sIHRoZW4geW91IGNhbiB1c2UgdGhpcyBvcHRpb24gdG8gc3BlY2lmeSB0aGUgcHJvcGVydHkgbmFtZS5cbiAgICovXG4gIG9iak5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB3aGV0aGVyIHRoZSBjb2x1bW4gYWNjZXB0cyBOVUxMIHZhbHVlcy5cbiAgICovXG4gIG51bGxhYmxlPzogYm9vbGVhbjtcbn1cblxuY29uc3Qgcm93VG9rZW5CdWZmZXIgPSBCdWZmZXIuZnJvbShbIFRPS0VOX1RZUEUuUk9XIF0pO1xuY29uc3QgdGV4dFBvaW50ZXJBbmRUaW1lc3RhbXBCdWZmZXIgPSBCdWZmZXIuZnJvbShbXG4gIC8vIFRleHRQb2ludGVyIGxlbmd0aFxuICAweDEwLFxuXG4gIC8vIFRleHRQb2ludGVyXG4gIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsXG5cbiAgLy8gVGltZXN0YW1wXG4gIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDBcbl0pO1xuY29uc3QgdGV4dFBvaW50ZXJOdWxsQnVmZmVyID0gQnVmZmVyLmZyb20oWzB4MDBdKTtcblxuLy8gQSB0cmFuc2Zvcm0gdGhhdCBjb252ZXJ0cyByb3dzIHRvIHBhY2tldHMuXG5jbGFzcyBSb3dUcmFuc2Zvcm0gZXh0ZW5kcyBUcmFuc2Zvcm0ge1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgY29sdW1uTWV0YWRhdGFXcml0dGVuOiBib29sZWFuO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgYnVsa0xvYWQ6IEJ1bGtMb2FkO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgbWFpbk9wdGlvbnM6IEJ1bGtMb2FkWydvcHRpb25zJ107XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjb2x1bW5zOiBCdWxrTG9hZFsnY29sdW1ucyddO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY29uc3RydWN0b3IoYnVsa0xvYWQ6IEJ1bGtMb2FkKSB7XG4gICAgc3VwZXIoeyB3cml0YWJsZU9iamVjdE1vZGU6IHRydWUgfSk7XG5cbiAgICB0aGlzLmJ1bGtMb2FkID0gYnVsa0xvYWQ7XG4gICAgdGhpcy5tYWluT3B0aW9ucyA9IGJ1bGtMb2FkLm9wdGlvbnM7XG4gICAgdGhpcy5jb2x1bW5zID0gYnVsa0xvYWQuY29sdW1ucztcblxuICAgIHRoaXMuY29sdW1uTWV0YWRhdGFXcml0dGVuID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF90cmFuc2Zvcm0ocm93OiBBcnJheTx1bmtub3duPiB8IHsgW2NvbE5hbWU6IHN0cmluZ106IHVua25vd24gfSwgX2VuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I/OiBFcnJvcikgPT4gdm9pZCkge1xuICAgIGlmICghdGhpcy5jb2x1bW5NZXRhZGF0YVdyaXR0ZW4pIHtcbiAgICAgIHRoaXMucHVzaCh0aGlzLmJ1bGtMb2FkLmdldENvbE1ldGFEYXRhKCkpO1xuICAgICAgdGhpcy5jb2x1bW5NZXRhZGF0YVdyaXR0ZW4gPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMucHVzaChyb3dUb2tlbkJ1ZmZlcik7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY29sdW1ucy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMuY29sdW1uc1tpXTtcbiAgICAgIGxldCB2YWx1ZSA9IEFycmF5LmlzQXJyYXkocm93KSA/IHJvd1tpXSA6IHJvd1tjLm9iak5hbWVdO1xuXG4gICAgICBpZiAoIXRoaXMuYnVsa0xvYWQuZmlyc3RSb3dXcml0dGVuKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdmFsdWUgPSBjLnR5cGUudmFsaWRhdGUodmFsdWUsIGMuY29sbGF0aW9uKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgcGFyYW1ldGVyID0ge1xuICAgICAgICBsZW5ndGg6IGMubGVuZ3RoLFxuICAgICAgICBzY2FsZTogYy5zY2FsZSxcbiAgICAgICAgcHJlY2lzaW9uOiBjLnByZWNpc2lvbixcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICB9O1xuXG4gICAgICBpZiAoYy50eXBlLm5hbWUgPT09ICdUZXh0JyB8fCBjLnR5cGUubmFtZSA9PT0gJ0ltYWdlJyB8fCBjLnR5cGUubmFtZSA9PT0gJ05UZXh0Jykge1xuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMucHVzaCh0ZXh0UG9pbnRlck51bGxCdWZmZXIpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wdXNoKHRleHRQb2ludGVyQW5kVGltZXN0YW1wQnVmZmVyKTtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5wdXNoKGMudHlwZS5nZW5lcmF0ZVBhcmFtZXRlckxlbmd0aChwYXJhbWV0ZXIsIHRoaXMubWFpbk9wdGlvbnMpKTtcbiAgICAgICAgZm9yIChjb25zdCBjaHVuayBvZiBjLnR5cGUuZ2VuZXJhdGVQYXJhbWV0ZXJEYXRhKHBhcmFtZXRlciwgdGhpcy5tYWluT3B0aW9ucykpIHtcbiAgICAgICAgICB0aGlzLnB1c2goY2h1bmspO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnJvcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9mbHVzaChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xuICAgIHRoaXMucHVzaCh0aGlzLmJ1bGtMb2FkLmNyZWF0ZURvbmVUb2tlbigpKTtcblxuICAgIHByb2Nlc3MubmV4dFRpY2soY2FsbGJhY2spO1xuICB9XG59XG5cbi8qKlxuICogQSBCdWxrTG9hZCBpbnN0YW5jZSBpcyB1c2VkIHRvIHBlcmZvcm0gYSBidWxrIGluc2VydC5cbiAqXG4gKiBVc2UgW1tDb25uZWN0aW9uLm5ld0J1bGtMb2FkXV0gdG8gY3JlYXRlIGEgbmV3IGluc3RhbmNlLCBhbmQgW1tDb25uZWN0aW9uLmV4ZWNCdWxrTG9hZF1dIHRvIGV4ZWN1dGUgaXQuXG4gKlxuICogRXhhbXBsZSBvZiBCdWxrTG9hZCBVc2FnZXM6XG4gKlxuICogYGBganNcbiAqIC8vIG9wdGlvbmFsIEJ1bGtMb2FkIG9wdGlvbnNcbiAqIGNvbnN0IG9wdGlvbnMgPSB7IGtlZXBOdWxsczogdHJ1ZSB9O1xuICpcbiAqIC8vIGluc3RhbnRpYXRlIC0gcHJvdmlkZSB0aGUgdGFibGUgd2hlcmUgeW91J2xsIGJlIGluc2VydGluZyB0bywgb3B0aW9ucyBhbmQgYSBjYWxsYmFja1xuICogY29uc3QgYnVsa0xvYWQgPSBjb25uZWN0aW9uLm5ld0J1bGtMb2FkKCdNeVRhYmxlJywgb3B0aW9ucywgKGVycm9yLCByb3dDb3VudCkgPT4ge1xuICogICBjb25zb2xlLmxvZygnaW5zZXJ0ZWQgJWQgcm93cycsIHJvd0NvdW50KTtcbiAqIH0pO1xuICpcbiAqIC8vIHNldHVwIHlvdXIgY29sdW1ucyAtIGFsd2F5cyBpbmRpY2F0ZSB3aGV0aGVyIHRoZSBjb2x1bW4gaXMgbnVsbGFibGVcbiAqIGJ1bGtMb2FkLmFkZENvbHVtbignbXlJbnQnLCBUWVBFUy5JbnQsIHsgbnVsbGFibGU6IGZhbHNlIH0pO1xuICogYnVsa0xvYWQuYWRkQ29sdW1uKCdteVN0cmluZycsIFRZUEVTLk5WYXJDaGFyLCB7IGxlbmd0aDogNTAsIG51bGxhYmxlOiB0cnVlIH0pO1xuICpcbiAqIC8vIGV4ZWN1dGVcbiAqIGNvbm5lY3Rpb24uZXhlY0J1bGtMb2FkKGJ1bGtMb2FkLCBbXG4gKiAgIHsgbXlJbnQ6IDcsIG15U3RyaW5nOiAnaGVsbG8nIH0sXG4gKiAgIHsgbXlJbnQ6IDIzLCBteVN0cmluZzogJ3dvcmxkJyB9XG4gKiBdKTtcbiAqIGBgYFxuICovXG5jbGFzcyBCdWxrTG9hZCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjYW5jZWxlZDogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGV4ZWN1dGlvblN0YXJ0ZWQ6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBzdHJlYW1pbmdNb2RlOiBib29sZWFuO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgdGFibGU6IHN0cmluZztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHRpbWVvdXQ6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgb3B0aW9uczogSW50ZXJuYWxDb25uZWN0aW9uT3B0aW9ucztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGNhbGxiYWNrOiBDYWxsYmFjaztcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgY29sdW1uczogQXJyYXk8Q29sdW1uPjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGNvbHVtbnNCeU5hbWU6IHsgW25hbWU6IHN0cmluZ106IENvbHVtbiB9O1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBmaXJzdFJvd1dyaXR0ZW46IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSByb3dUb1BhY2tldFRyYW5zZm9ybTogUm93VHJhbnNmb3JtO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBidWxrT3B0aW9uczogSW50ZXJuYWxPcHRpb25zO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjb25uZWN0aW9uOiBDb25uZWN0aW9uIHwgdW5kZWZpbmVkO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgcm93czogQXJyYXk8YW55PiB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHJzdDogQXJyYXk8YW55PiB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHJvd0NvdW50OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgZGVjbGFyZSBjb2xsYXRpb246IENvbGxhdGlvbiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNvbnN0cnVjdG9yKHRhYmxlOiBzdHJpbmcsIGNvbGxhdGlvbjogQ29sbGF0aW9uIHwgdW5kZWZpbmVkLCBjb25uZWN0aW9uT3B0aW9uczogSW50ZXJuYWxDb25uZWN0aW9uT3B0aW9ucywge1xuICAgIGNoZWNrQ29uc3RyYWludHMgPSBmYWxzZSxcbiAgICBmaXJlVHJpZ2dlcnMgPSBmYWxzZSxcbiAgICBrZWVwTnVsbHMgPSBmYWxzZSxcbiAgICBsb2NrVGFibGUgPSBmYWxzZSxcbiAgICBvcmRlciA9IHt9LFxuICB9OiBPcHRpb25zLCBjYWxsYmFjazogQ2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNoZWNrQ29uc3RyYWludHMgIT09ICdib29sZWFuJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwib3B0aW9ucy5jaGVja0NvbnN0cmFpbnRzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBmaXJlVHJpZ2dlcnMgIT09ICdib29sZWFuJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwib3B0aW9ucy5maXJlVHJpZ2dlcnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGtlZXBOdWxscyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJvcHRpb25zLmtlZXBOdWxsc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbG9ja1RhYmxlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcIm9wdGlvbnMubG9ja1RhYmxlXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcmRlciAhPT0gJ29iamVjdCcgfHwgb3JkZXIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcIm9wdGlvbnMub3JkZXJcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgb2JqZWN0LicpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2NvbHVtbiwgZGlyZWN0aW9uXSBvZiBPYmplY3QuZW50cmllcyhvcmRlcikpIHtcbiAgICAgIGlmIChkaXJlY3Rpb24gIT09ICdBU0MnICYmIGRpcmVjdGlvbiAhPT0gJ0RFU0MnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSBvZiB0aGUgXCInICsgY29sdW1uICsgJ1wiIGtleSBpbiB0aGUgXCJvcHRpb25zLm9yZGVyXCIgb2JqZWN0IG11c3QgYmUgZWl0aGVyIFwiQVNDXCIgb3IgXCJERVNDXCIuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuZXJyb3IgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jYW5jZWxlZCA9IGZhbHNlO1xuICAgIHRoaXMuZXhlY3V0aW9uU3RhcnRlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5jb2xsYXRpb24gPSBjb2xsYXRpb247XG5cbiAgICB0aGlzLnRhYmxlID0gdGFibGU7XG4gICAgdGhpcy5vcHRpb25zID0gY29ubmVjdGlvbk9wdGlvbnM7XG4gICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIHRoaXMuY29sdW1ucyA9IFtdO1xuICAgIHRoaXMuY29sdW1uc0J5TmFtZSA9IHt9O1xuICAgIHRoaXMuZmlyc3RSb3dXcml0dGVuID0gZmFsc2U7XG4gICAgdGhpcy5zdHJlYW1pbmdNb2RlID0gZmFsc2U7XG5cbiAgICB0aGlzLnJvd1RvUGFja2V0VHJhbnNmb3JtID0gbmV3IFJvd1RyYW5zZm9ybSh0aGlzKTtcblxuICAgIHRoaXMuYnVsa09wdGlvbnMgPSB7IGNoZWNrQ29uc3RyYWludHMsIGZpcmVUcmlnZ2Vycywga2VlcE51bGxzLCBsb2NrVGFibGUsIG9yZGVyIH07XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGNvbHVtbiB0byB0aGUgYnVsayBsb2FkLlxuICAgKlxuICAgKiBUaGUgY29sdW1uIGRlZmluaXRpb25zIHNob3VsZCBtYXRjaCB0aGUgdGFibGUgeW91IGFyZSB0cnlpbmcgdG8gaW5zZXJ0IGludG8uXG4gICAqIEF0dGVtcHRpbmcgdG8gY2FsbCBhZGRDb2x1bW4gYWZ0ZXIgdGhlIGZpcnN0IHJvdyBoYXMgYmVlbiBhZGRlZCB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbi5cbiAgICpcbiAgICogYGBganNcbiAgICogYnVsa0xvYWQuYWRkQ29sdW1uKCdNeUludENvbHVtbicsIFRZUEVTLkludCwgeyBudWxsYWJsZTogZmFsc2UgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgY29sdW1uLlxuICAgKiBAcGFyYW0gdHlwZSBPbmUgb2YgdGhlIHN1cHBvcnRlZCBgZGF0YSB0eXBlc2AuXG4gICAqIEBwYXJhbSBfX25hbWVkUGFyYW1ldGVycyBBZGRpdGlvbmFsIGNvbHVtbiB0eXBlIGluZm9ybWF0aW9uLiBBdCBhIG1pbmltdW0sIGBudWxsYWJsZWAgbXVzdCBiZSBzZXQgdG8gdHJ1ZSBvciBmYWxzZS5cbiAgICogQHBhcmFtIGxlbmd0aCBGb3IgVmFyQ2hhciwgTlZhckNoYXIsIFZhckJpbmFyeS4gVXNlIGxlbmd0aCBhcyBgSW5maW5pdHlgIGZvciBWYXJDaGFyKG1heCksIE5WYXJDaGFyKG1heCkgYW5kIFZhckJpbmFyeShtYXgpLlxuICAgKiBAcGFyYW0gbnVsbGFibGUgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGNvbHVtbiBhY2NlcHRzIE5VTEwgdmFsdWVzLlxuICAgKiBAcGFyYW0gb2JqTmFtZSBJZiB0aGUgbmFtZSBvZiB0aGUgY29sdW1uIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBmb3VuZCBvbiBgcm93T2JqYCBhcmd1bWVudHMgcGFzc2VkIHRvIFtbYWRkUm93XV0gb3IgW1tDb25uZWN0aW9uLmV4ZWNCdWxrTG9hZF1dLCB0aGVuIHlvdSBjYW4gdXNlIHRoaXMgb3B0aW9uIHRvIHNwZWNpZnkgdGhlIHByb3BlcnR5IG5hbWUuXG4gICAqIEBwYXJhbSBwcmVjaXNpb24gRm9yIE51bWVyaWMsIERlY2ltYWwuXG4gICAqIEBwYXJhbSBzY2FsZSBGb3IgTnVtZXJpYywgRGVjaW1hbCwgVGltZSwgRGF0ZVRpbWUyLCBEYXRlVGltZU9mZnNldC5cbiAgKi9cbiAgYWRkQ29sdW1uKG5hbWU6IHN0cmluZywgdHlwZTogRGF0YVR5cGUsIHsgb3V0cHV0ID0gZmFsc2UsIGxlbmd0aCwgcHJlY2lzaW9uLCBzY2FsZSwgb2JqTmFtZSA9IG5hbWUsIG51bGxhYmxlID0gdHJ1ZSB9OiBDb2x1bW5PcHRpb25zKSB7XG4gICAgaWYgKHRoaXMuZmlyc3RSb3dXcml0dGVuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbHVtbnMgY2Fubm90IGJlIGFkZGVkIHRvIGJ1bGsgaW5zZXJ0IGFmdGVyIHRoZSBmaXJzdCByb3cgaGFzIGJlZW4gd3JpdHRlbi4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZXhlY3V0aW9uU3RhcnRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb2x1bW5zIGNhbm5vdCBiZSBhZGRlZCB0byBidWxrIGluc2VydCBhZnRlciBleGVjdXRpb24gaGFzIHN0YXJ0ZWQuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgY29sdW1uOiBDb2x1bW4gPSB7XG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIHZhbHVlOiBudWxsLFxuICAgICAgb3V0cHV0OiBvdXRwdXQsXG4gICAgICBsZW5ndGg6IGxlbmd0aCxcbiAgICAgIHByZWNpc2lvbjogcHJlY2lzaW9uLFxuICAgICAgc2NhbGU6IHNjYWxlLFxuICAgICAgb2JqTmFtZTogb2JqTmFtZSxcbiAgICAgIG51bGxhYmxlOiBudWxsYWJsZSxcbiAgICAgIGNvbGxhdGlvbjogdGhpcy5jb2xsYXRpb25cbiAgICB9O1xuXG4gICAgaWYgKCh0eXBlLmlkICYgMHgzMCkgPT09IDB4MjApIHtcbiAgICAgIGlmIChjb2x1bW4ubGVuZ3RoID09IG51bGwgJiYgdHlwZS5yZXNvbHZlTGVuZ3RoKSB7XG4gICAgICAgIGNvbHVtbi5sZW5ndGggPSB0eXBlLnJlc29sdmVMZW5ndGgoY29sdW1uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZS5yZXNvbHZlUHJlY2lzaW9uICYmIGNvbHVtbi5wcmVjaXNpb24gPT0gbnVsbCkge1xuICAgICAgY29sdW1uLnByZWNpc2lvbiA9IHR5cGUucmVzb2x2ZVByZWNpc2lvbihjb2x1bW4pO1xuICAgIH1cblxuICAgIGlmICh0eXBlLnJlc29sdmVTY2FsZSAmJiBjb2x1bW4uc2NhbGUgPT0gbnVsbCkge1xuICAgICAgY29sdW1uLnNjYWxlID0gdHlwZS5yZXNvbHZlU2NhbGUoY29sdW1uKTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbHVtbnMucHVzaChjb2x1bW4pO1xuXG4gICAgdGhpcy5jb2x1bW5zQnlOYW1lW25hbWVdID0gY29sdW1uO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRPcHRpb25zU3FsKCkge1xuICAgIGNvbnN0IGFkZE9wdGlvbnMgPSBbXTtcblxuICAgIGlmICh0aGlzLmJ1bGtPcHRpb25zLmNoZWNrQ29uc3RyYWludHMpIHtcbiAgICAgIGFkZE9wdGlvbnMucHVzaCgnQ0hFQ0tfQ09OU1RSQUlOVFMnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5idWxrT3B0aW9ucy5maXJlVHJpZ2dlcnMpIHtcbiAgICAgIGFkZE9wdGlvbnMucHVzaCgnRklSRV9UUklHR0VSUycpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmJ1bGtPcHRpb25zLmtlZXBOdWxscykge1xuICAgICAgYWRkT3B0aW9ucy5wdXNoKCdLRUVQX05VTExTJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYnVsa09wdGlvbnMubG9ja1RhYmxlKSB7XG4gICAgICBhZGRPcHRpb25zLnB1c2goJ1RBQkxPQ0snKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5idWxrT3B0aW9ucy5vcmRlcikge1xuICAgICAgY29uc3Qgb3JkZXJDb2x1bW5zID0gW107XG5cbiAgICAgIGZvciAoY29uc3QgW2NvbHVtbiwgZGlyZWN0aW9uXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLmJ1bGtPcHRpb25zLm9yZGVyKSkge1xuICAgICAgICBvcmRlckNvbHVtbnMucHVzaChgJHtjb2x1bW59ICR7ZGlyZWN0aW9ufWApO1xuICAgICAgfVxuXG4gICAgICBpZiAob3JkZXJDb2x1bW5zLmxlbmd0aCkge1xuICAgICAgICBhZGRPcHRpb25zLnB1c2goYE9SREVSICgke29yZGVyQ29sdW1ucy5qb2luKCcsICcpfSlgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYWRkT3B0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gYCBXSVRIICgke2FkZE9wdGlvbnMuam9pbignLCcpfSlgO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRCdWxrSW5zZXJ0U3FsKCkge1xuICAgIGxldCBzcWwgPSAnaW5zZXJ0IGJ1bGsgJyArIHRoaXMudGFibGUgKyAnKCc7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRoaXMuY29sdW1ucy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMuY29sdW1uc1tpXTtcbiAgICAgIGlmIChpICE9PSAwKSB7XG4gICAgICAgIHNxbCArPSAnLCAnO1xuICAgICAgfVxuICAgICAgc3FsICs9ICdbJyArIGMubmFtZSArICddICcgKyAoYy50eXBlLmRlY2xhcmF0aW9uKGMpKTtcbiAgICB9XG4gICAgc3FsICs9ICcpJztcblxuICAgIHNxbCArPSB0aGlzLmdldE9wdGlvbnNTcWwoKTtcbiAgICByZXR1cm4gc3FsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgaXMgc2ltcGx5IGEgaGVscGVyIHV0aWxpdHkgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIGBDUkVBVEUgVEFCTEUgU1FMYCBzdGF0ZW1lbnQgYmFzZWQgb24gdGhlIGNvbHVtbnMgYWRkZWQgdG8gdGhlIGJ1bGtMb2FkIG9iamVjdC5cbiAgICogVGhpcyBtYXkgYmUgcGFydGljdWxhcmx5IGhhbmR5IHdoZW4geW91IHdhbnQgdG8gaW5zZXJ0IGludG8gYSB0ZW1wb3JhcnkgdGFibGUgKGEgdGFibGUgd2hpY2ggc3RhcnRzIHdpdGggYCNgKS5cbiAgICpcbiAgICogYGBganNcbiAgICogdmFyIHNxbCA9IGJ1bGtMb2FkLmdldFRhYmxlQ3JlYXRpb25TcWwoKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEEgc2lkZSBub3RlIG9uIGJ1bGsgaW5zZXJ0aW5nIGludG8gdGVtcG9yYXJ5IHRhYmxlczogaWYgeW91IHdhbnQgdG8gYWNjZXNzIGEgbG9jYWwgdGVtcG9yYXJ5IHRhYmxlIGFmdGVyIGV4ZWN1dGluZyB0aGUgYnVsayBsb2FkLFxuICAgKiB5b3UnbGwgbmVlZCB0byB1c2UgdGhlIHNhbWUgY29ubmVjdGlvbiBhbmQgZXhlY3V0ZSB5b3VyIHJlcXVlc3RzIHVzaW5nIFtbQ29ubmVjdGlvbi5leGVjU3FsQmF0Y2hdXSBpbnN0ZWFkIG9mIFtbQ29ubmVjdGlvbi5leGVjU3FsXV1cbiAgICovXG4gIGdldFRhYmxlQ3JlYXRpb25TcWwoKSB7XG4gICAgbGV0IHNxbCA9ICdDUkVBVEUgVEFCTEUgJyArIHRoaXMudGFibGUgKyAnKFxcbic7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRoaXMuY29sdW1ucy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMuY29sdW1uc1tpXTtcbiAgICAgIGlmIChpICE9PSAwKSB7XG4gICAgICAgIHNxbCArPSAnLFxcbic7XG4gICAgICB9XG4gICAgICBzcWwgKz0gJ1snICsgYy5uYW1lICsgJ10gJyArIChjLnR5cGUuZGVjbGFyYXRpb24oYykpO1xuICAgICAgaWYgKGMubnVsbGFibGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzcWwgKz0gJyAnICsgKGMubnVsbGFibGUgPyAnTlVMTCcgOiAnTk9UIE5VTEwnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3FsICs9ICdcXG4pJztcbiAgICByZXR1cm4gc3FsO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRDb2xNZXRhRGF0YSgpIHtcbiAgICBjb25zdCB0QnVmID0gbmV3IFdyaXRhYmxlVHJhY2tpbmdCdWZmZXIoMTAwLCBudWxsLCB0cnVlKTtcbiAgICAvLyBUb2tlblR5cGVcbiAgICB0QnVmLndyaXRlVUludDgoVE9LRU5fVFlQRS5DT0xNRVRBREFUQSk7XG4gICAgLy8gQ291bnRcbiAgICB0QnVmLndyaXRlVUludDE2TEUodGhpcy5jb2x1bW5zLmxlbmd0aCk7XG5cbiAgICBmb3IgKGxldCBqID0gMCwgbGVuID0gdGhpcy5jb2x1bW5zLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb2x1bW5zW2pdO1xuICAgICAgLy8gVXNlclR5cGVcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICAgIHRCdWYud3JpdGVVSW50MTZMRSgwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRCdWYud3JpdGVVSW50MzJMRSgwKTtcbiAgICAgIH1cblxuICAgICAgLy8gRmxhZ3NcbiAgICAgIGxldCBmbGFncyA9IEZMQUdTLnVwZGF0ZWFibGVSZWFkV3JpdGU7XG4gICAgICBpZiAoYy5udWxsYWJsZSkge1xuICAgICAgICBmbGFncyB8PSBGTEFHUy5udWxsYWJsZTtcbiAgICAgIH0gZWxzZSBpZiAoYy5udWxsYWJsZSA9PT0gdW5kZWZpbmVkICYmIHRoaXMub3B0aW9ucy50ZHNWZXJzaW9uID49ICc3XzInKSB7XG4gICAgICAgIGZsYWdzIHw9IEZMQUdTLm51bGxhYmxlVW5rbm93bjtcbiAgICAgIH1cbiAgICAgIHRCdWYud3JpdGVVSW50MTZMRShmbGFncyk7XG5cbiAgICAgIC8vIFRZUEVfSU5GT1xuICAgICAgdEJ1Zi53cml0ZUJ1ZmZlcihjLnR5cGUuZ2VuZXJhdGVUeXBlSW5mbyhjLCB0aGlzLm9wdGlvbnMpKTtcblxuICAgICAgLy8gVGFibGVOYW1lXG4gICAgICBpZiAoYy50eXBlLmhhc1RhYmxlTmFtZSkge1xuICAgICAgICB0QnVmLndyaXRlVXNWYXJjaGFyKHRoaXMudGFibGUsICd1Y3MyJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIENvbE5hbWVcbiAgICAgIHRCdWYud3JpdGVCVmFyY2hhcihjLm5hbWUsICd1Y3MyJyk7XG4gICAgfVxuICAgIHJldHVybiB0QnVmLmRhdGE7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyBhIHRpbWVvdXQgZm9yIHRoaXMgYnVsayBsb2FkLlxuICAgKlxuICAgKiBgYGBqc1xuICAgKiBidWxrTG9hZC5zZXRUaW1lb3V0KHRpbWVvdXQpO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHRpbWVvdXQgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmVmb3JlIHRoZSBidWxrIGxvYWQgaXMgY29uc2lkZXJlZCBmYWlsZWQsIG9yIDAgZm9yIG5vIHRpbWVvdXQuXG4gICAqICAgV2hlbiBubyB0aW1lb3V0IGlzIHNldCBmb3IgdGhlIGJ1bGsgbG9hZCwgdGhlIFtbQ29ubmVjdGlvbk9wdGlvbnMucmVxdWVzdFRpbWVvdXRdXSBvZiB0aGUgQ29ubmVjdGlvbiBpcyB1c2VkLlxuICAgKi9cbiAgc2V0VGltZW91dCh0aW1lb3V0PzogbnVtYmVyKSB7XG4gICAgdGhpcy50aW1lb3V0ID0gdGltZW91dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlRG9uZVRva2VuKCkge1xuICAgIC8vIEl0IG1pZ2h0IGJlIG5pY2UgdG8gbWFrZSBEb25lVG9rZW4gYSBjbGFzcyBpZiBhbnl0aGluZyBuZWVkcyB0byBjcmVhdGUgdGhlbSwgYnV0IGZvciBub3csIGp1c3QgZG8gaXQgaGVyZVxuICAgIGNvbnN0IHRCdWYgPSBuZXcgV3JpdGFibGVUcmFja2luZ0J1ZmZlcih0aGlzLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInID8gOSA6IDEzKTtcbiAgICB0QnVmLndyaXRlVUludDgoVE9LRU5fVFlQRS5ET05FKTtcbiAgICBjb25zdCBzdGF0dXMgPSBET05FX1NUQVRVUy5GSU5BTDtcbiAgICB0QnVmLndyaXRlVUludDE2TEUoc3RhdHVzKTtcbiAgICB0QnVmLndyaXRlVUludDE2TEUoMCk7IC8vIEN1ckNtZCAoVERTIGlnbm9yZXMgdGhpcylcbiAgICB0QnVmLndyaXRlVUludDMyTEUoMCk7IC8vIHJvdyBjb3VudCAtIGRvZXNuJ3QgcmVhbGx5IG1hdHRlclxuICAgIGlmICh0aGlzLm9wdGlvbnMudGRzVmVyc2lvbiA+PSAnN18yJykge1xuICAgICAgdEJ1Zi53cml0ZVVJbnQzMkxFKDApOyAvLyByb3cgY291bnQgaXMgNjQgYml0cyBpbiA+PSBURFMgNy4yXG4gICAgfVxuICAgIHJldHVybiB0QnVmLmRhdGE7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNhbmNlbCgpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY2FuY2VsZWQgPSB0cnVlO1xuICAgIHRoaXMuZW1pdCgnY2FuY2VsJyk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnVsa0xvYWQ7XG5tb2R1bGUuZXhwb3J0cyA9IEJ1bGtMb2FkO1xuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxJQUFBQSxPQUFBLEdBQUFDLE9BQUE7QUFDQSxJQUFBQyx1QkFBQSxHQUFBQyxzQkFBQSxDQUFBRixPQUFBO0FBR0EsSUFBQUcsT0FBQSxHQUFBSCxPQUFBO0FBQ0EsSUFBQUksTUFBQSxHQUFBSixPQUFBO0FBQW1ELFNBQUFFLHVCQUFBRyxDQUFBLFdBQUFBLENBQUEsSUFBQUEsQ0FBQSxDQUFBQyxVQUFBLEdBQUFELENBQUEsS0FBQUUsT0FBQSxFQUFBRixDQUFBO0FBS25EO0FBQ0E7QUFDQTtBQUNBLE1BQU1HLEtBQUssR0FBRztFQUNaQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUM7RUFDaEJDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQztFQUNmQyxtQkFBbUIsRUFBRSxDQUFDLElBQUksQ0FBQztFQUMzQkMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUM7RUFDekJDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQztFQUNoQkMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDO0VBQUU7RUFDbEJDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQztFQUFFO0VBQ3pCQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUU7RUFBRTtFQUMxQkMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFO0VBQUU7RUFDakJDLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRTtFQUFFO0VBQ2RDLGVBQWUsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQzNCLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0EsTUFBTUMsV0FBVyxHQUFHO0VBQ2xCQyxLQUFLLEVBQUUsSUFBSTtFQUNYQyxJQUFJLEVBQUUsR0FB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