const EventEmitter = require('events').EventEmitter;
const Util = require('../../util');
const Errors = require('../../errors');

/**
 * Creates a new Chunk.
 *
 * @param options
 * @constructor
 */
function Chunk(options) {
  // make sure the options object contains all the necessary information
  Errors.assertInternal(Util.isObject(options));
  Errors.assertInternal(Util.isObject(options.statement));
  Errors.assertInternal(Util.isObject(options.services));
  Errors.assertInternal(Util.isNumber(options.startIndex));
  Errors.assertInternal(Util.isArray(options.columns));
  Errors.assertInternal(Util.isObject(options.mapColumnNameToIndices));
  Errors.assertInternal(Util.isObject(options.statementParameters));
  Errors.assertInternal(Util.isString(options.resultVersion));
  Errors.assertInternal(Util.isNumber(options.rowCount));

  // if the result is small (i.e. not persisted on S3/Blob), there's no
  // compressed and uncompressed size, so default to -1
  this._compressedSize = options.compressedSize || -1;
  this._uncompressedSize = options.uncompressedSize || -1;

  // copy out other information from the options object and save it
  this._statement = options.statement;
  this._services = options.services;
  this._startIndex = options.startIndex;
  this._url = options.url;
  this._columns = options.columns;
  this._mapColumnNameToIndices = options.mapColumnNameToIndices;
  this._chunkHeaders = options.chunkHeaders;
  this._rowset = options.rowset;

  // use the start index and row count to compute the end index
  this._endIndex = this._startIndex + options.rowCount - 1;

  // use the start and end index to build an id for this chunk
  this._id = buildId(this._startIndex, this._endIndex);
}

Util.inherits(Chunk, EventEmitter);

/**
 * Returns the compressed size of this chunk's contents on S3/Blob.
 * A value of -1 means the contents of this chunk are not stored on S3/Blob.
 *
 * @returns {Number}
 */
Chunk.prototype.getCompressedSize = function () {
  return this._compressedSize;
};

/**
 * Returns the uncompressed size of this chunk's contents on S3/Blob.
 * A value of -1 means the contents of this chunk are not stored on S3/Blob.
 *
 * @returns {Number}
 */
Chunk.prototype.getUncompressedSize = function () {
  return this._uncompressedSize;
};

/**
 * Returns the row index of the first row in this chunk.
 *
 * @returns {Number}
 */
Chunk.prototype.getStartIndex = function () {
  return this._startIndex;
};

/**
 * Returns the row index of the last row in this chunk.
 *
 * @returns {Number}
 */
Chunk.prototype.getEndIndex = function () {
  return this._endIndex;
};

/**
 * Returns the id of this chunk.
 *
 * @returns {String}
 */
Chunk.prototype.getId = function () {
  return this._id;
};

/**
 * Determines if this chunk overlaps with a given window.
 *
 * @param {Number} start The start index of the window.
 * @param {Number} end The end index of the window.
 *
 * @returns {Boolean}
 */
Chunk.prototype.overlapsWithWindow = function (start, end) {
  const chunkStart = this._startIndex, chunkEnd = this._endIndex;

  // check if the window overlaps with the chunk from the left or
  // from the right or from both sides
  return ((end <= chunkEnd && end >= chunkStart) ||
    (start >= chunkStart && start <= chunkEnd) ||
    (start <= chunkStart && end >= chunkEnd));
};

/**
 * Returns the rows in this chunk.
 *
 * @returns {Object[]}
 */
Chunk.prototype.getRows = function () {
  // if we don't already have a valid value for the rows
  if (!Util.isArray(this._rows)) {
    // if we have a string version of the rowset
    if (Util.string.isNotNullOrEmpty(this._rowsetAsString)) {
      // add square brackets on either side and do a json-parse to get the
      // rowset
      this._rowset = JSON.parse('[' + this._rowsetAsString + ']');

      // we don't need the string version of the rowset anymore
      this._rowsetAsString = undefined;
    }

    // if we have a valid value for the rowset
    if (Util.isArray(this._rowset)) {
      // convert the rowset to an array of rows
      this._rows = convertRowsetToRows(
        this._statement,
        this._startIndex,
        this._rowset,
        this._columns,
        this._mapColumnNameToIndices);

      // clear out the rowset because we don't need it anymore
      this._rowset = undefined;
    }
  }

  return this._rows;
};

/**
 * Clears out the rows in this chunk if it has a valid url or if the force flag
 * is true.
 *
 * @param force
 */
Chunk.prototype.clearRows = function (force) {
  if (Util.string.isNotNullOrEmpty(this._url) || force) {
    // clear out all row and rowset related fields
    this._rowsetAsString = this._rowset = this._rows = undefined;
  }
};

/**
 * Updates this chunk's url.
 *
 * @param url
 */
Chunk.prototype.setUrl = function (url) {
  this._url = url;
};

/**
 * Returns true if this chunk's contents are loaded, false otherwise.
 *
 * @returns {Boolean}
 */
Chunk.prototype.isLoaded = function () {
  // the chunk is considered loaded if we have valid values for
  // _rowsetAsString, _rowset or _rows
  return Util.string.isNotNullOrEmpty(this._rowsetAsString) ||
    Util.isArray(this._rowset) || Util.isArray(this._rows);
};

/**
 * Returns true if this chunk is currently in the process of loading its
 * contents, false otherwise.
 *
 * @returns {Boolean}
 */
Chunk.prototype.isLoading = function () {
  return this._isLoading;
};

/**
 * Loads the contents of this chunk.
 *
 * @param callback
 */
Chunk.prototype.load = function (callback) {
  // we've started loading
  this._isLoading = true;

  const self = this;

  /**
   * Completes the chunk load.
   *
   * @param err
   */
  const completeLoad = function (err) {
    // we're done loading
    self._isLoading = false;

    // emit an event to notify subscribers
    self.emit('loadcomplete', err, self);

    // invoke the callback if one was specified
    if (Util.isFunction(callback)) {
      callback(err, self);
    }
  };

  // If the chunk is already loaded, complete the load asynchronously.
  // This ensure that we are streaming chunks the right order even if the data was received before
  // another chunk.
  if (this.isLoaded()) {
    process.nextTick(completeLoad);
  } else {
    // issue a request to load the chunk's contents from S3/Blob
    this._services.largeResultSet.getObject(
      {
        url: this._url,
        headers: this._chunkHeaders,
        callback: function (err, body) {
          // if the request succeeded, save the
          // body as a string version of the rowset
          if (!err) {
            self._rowsetAsString = body;
          }

          // complete the load
          completeLoad(err);
        }
      });
  }
};

/**
 * Builds an id for a chunk from its start and end index.
 *
 * @param startIndex The row index of the first chunk row.
 * @param endIndex The row index of the last chunk row.
 *
 * @returns {String}
 * @private
 */
function buildId(startIndex, endIndex) {
  return Util.format('s=%d, e=%d', startIndex, endIndex);
}

/**
 * Converts a rowset to an array of records.
 *
 * @param statement
 * @param startIndex the chunk start index.
 * @param rowset
 * @param columns
 * @param mapColumnNameToIndices
 *
 * @returns {Array}
 * @private
 */
function convertRowsetToRows(
  statement,
  startIndex,
  rowset,
  columns,
  mapColumnNameToIndices) {
  // assert that rowset and columns are arrays
  Errors.assertInternal(Util.isArray(rowset));
  Errors.assertInternal(Util.isArray(columns));


  ///////////////////////////////////////////////////////////////////////////
  ////     Create functions that will be used as row methods             ////
  ///////////////////////////////////////////////////////////////////////////

  /**
   * Returns the index of this row in the result.
   *
   * @returns {Number}
   */
  const getRowIndex = function () {
    return this.rowIndex;
  };

  /**
   * Returns the statement that produced this row.
   *
   * @returns {*}
   */
  const getStatement = function getStatement() {
    return statement;
  };

  /**
   * Returns the value of a column.
   *
   * @param {String | Number} columnIdentifier this can be either the column
   *   name or the column index.
   *
   * @returns {*}
   */
  const getColumnValue = function getColumnValue(columnIdentifier) {
    // resolve the column identifier to the correct column if possible
    const column = resolveColumnIdentifierToColumn(
      columns, columnIdentifier, mapColumnNameToIndices);

    return column ? column.getRowValue(this) : undefined;
  };

  /**
   * Returns the value of a column as a String.
   *
   * @param {String | Number} columnIdentifier this can be either the column
   *   name or the column index.
   *
   * @returns {*}
   */
  const getColumnValueAsString = function getColumnValueAsString(columnIdentifier) {
    // resolve the column identifier to the correct column if possible
    const column = resolveColumnIdentifierToColumn(
      columns, columnIdentifier, mapColumnNameToIndices);

    return column ? column.getRowValueAsString(this) : undefined;
  };


  ///////////////////////////////////////////////////////////////////////////
  ////     Convert the rowset to an array of row objects                 ////
  ///////////////////////////////////////////////////////////////////////////

  // create a new array to store the processed rows
  const length = rowset.length;
  const rows = new Array(length);
  for (let index = 0; index < length; index++) {
    // add a new item to the rows array
    rows[index] =
      {
        _arrayProcessedColumns: [],

        values: rowset[index],
        rowIndex: startIndex + index,
        getRowIndex: getRowIndex,
        getStatement: getStatement,
        getColumnValue: getColumnValue,
        getColumnValueAsString: getColumnValueAsString
      };
  }

  return rows;
}

/**
 * Resolves a column identifier to the corresponding column if possible. The
 * column identifier can be a column name or a column index. If an invalid
 * column identifier is specified, we return undefined.
 *
 * @param {Object[]} columns
 * @param {String | Number} columnIdentifier
 * @param {Object} mapColumnNameToIndices
 *
 * @returns {*}
 */
function resolveColumnIdentifierToColumn(
  columns, columnIdentifier, mapColumnNameToIndices) {
  let columnIndex;

  // if the column identifier is a string, treat it as a column
  // name and use it to get the index of the specified column
  if (Util.isString(columnIdentifier)) {
    // if a valid column name was specified, get the index of the first column
    // with the specified name
    if (Object.prototype.hasOwnProperty.call(mapColumnNameToIndices, columnIdentifier)) {
      columnIndex = mapColumnNameToIndices[columnIdentifier][0];
    }
  } else if (Util.isNumber(columnIdentifier)) {
    // if the column identifier is a number, treat it as a column index
    columnIndex = columnIdentifier;
  }

  return columns[columnIndex];
}

module.exports = Chunk;