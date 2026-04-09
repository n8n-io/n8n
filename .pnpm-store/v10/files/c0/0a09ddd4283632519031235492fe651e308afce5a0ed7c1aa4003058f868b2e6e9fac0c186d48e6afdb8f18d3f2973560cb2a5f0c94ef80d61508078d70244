"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParquetEnvelopeReader = exports.ParquetReader = void 0;
const node_int64_1 = __importDefault(require("node-int64"));
const parquet_types_1 = __importDefault(require("../gen-nodejs/parquet_types"));
const parquet_shredder = __importStar(require("./shred"));
const parquet_util = __importStar(require("./util"));
const parquet_schema = __importStar(require("./schema"));
const parquet_codec = __importStar(require("./codec"));
const parquet_compression = __importStar(require("./compression"));
const parquet_types = __importStar(require("./types"));
const bufferReader_1 = __importDefault(require("./bufferReader"));
const bloomFilterReader = __importStar(require("./bloomFilterIO/bloomFilterReader"));
const declare_1 = require("./declare");
const client_s3_1 = require("@aws-sdk/client-s3");
const { getBloomFiltersFor } = bloomFilterReader;
/**
 * Parquet File Magic String
 */
const PARQUET_MAGIC = 'PAR1';
/**
 * Supported Parquet File Format Version for reading
 */
const PARQUET_VERSIONS = [1, 2];
/**
 * Internal type used for repetition/definition levels
 */
const PARQUET_RDLVL_TYPE = 'INT32';
const PARQUET_RDLVL_ENCODING = 'RLE';
/**
 * A parquet cursor is used to retrieve rows from a parquet file in order
 */
class ParquetCursor {
    metadata;
    envelopeReader;
    schema;
    columnList;
    rowGroup;
    rowGroupIndex;
    cursorIndex;
    /**
     * Create a new parquet reader from the file metadata and an envelope reader.
     * It is usually not recommended to call this constructor directly except for
     * advanced and internal use cases. Consider using getCursor() on the
     * ParquetReader instead
     */
    constructor(metadata, envelopeReader, schema, columnList) {
        this.metadata = metadata;
        this.envelopeReader = envelopeReader;
        this.schema = schema;
        this.columnList = columnList;
        this.rowGroup = [];
        this.rowGroupIndex = 0;
        this.cursorIndex = 0;
    }
    /**
     * Retrieve the next row from the cursor. Returns a row or NULL if the end
     * of the file was reached
     */
    async next() {
        if (this.cursorIndex >= this.rowGroup.length) {
            if (this.rowGroupIndex >= this.metadata.row_groups.length) {
                return null;
            }
            const rowBuffer = await this.envelopeReader.readRowGroup(this.schema, this.metadata.row_groups[this.rowGroupIndex], this.columnList);
            this.rowGroup = parquet_shredder.materializeRecords(this.schema, rowBuffer);
            this.rowGroupIndex++;
            this.cursorIndex = 0;
        }
        return this.rowGroup[this.cursorIndex++];
    }
    /**
     * Rewind the cursor to the beginning of the file
     */
    rewind() {
        this.rowGroup = [];
        this.rowGroupIndex = 0;
        this.cursorIndex = 0;
    }
}
/**
 * A parquet reader allows retrieving the rows from a parquet file in order.
 * The basic usage is to create a reader and then retrieve a cursor/iterator
 * which allows you to consume row after row until all rows have been read. It is
 * important that you call close() after you are finished reading the file to
 * avoid leaking file descriptors.
 */
class ParquetReader {
    envelopeReader;
    metadata;
    schema;
    treatInt96AsTimestamp;
    /**
     * Open the parquet file pointed to by the specified path and return a new
     * parquet reader
     */
    static async openFile(filePath, options) {
        const envelopeReader = await ParquetEnvelopeReader.openFile(filePath, options);
        return this.openEnvelopeReader(envelopeReader, options);
    }
    static async openBuffer(buffer, options) {
        const envelopeReader = await ParquetEnvelopeReader.openBuffer(buffer, options);
        return this.openEnvelopeReader(envelopeReader, options);
    }
    /**
     * Open the parquet file from S3 using the supplied aws client [, commands] and params
     * The params have to include `Bucket` and `Key` to the file requested,
     * If using v3 of the AWS SDK, combine the client and commands into an object wiht keys matching
     * the original module names, and do not instantiate the commands; pass them as classes/modules.
     *
     * This function returns a new parquet reader [ or throws an Error.]
     */
    static async openS3(client, params, options) {
        try {
            const envelopeReader = 'function' === typeof client['headObject']
                ? await ParquetEnvelopeReader.openS3(client, params, options) // S3 client v2
                : await ParquetEnvelopeReader.openS3v3(client, params, options); // S3 client v3
            return this.openEnvelopeReader(envelopeReader, options);
        }
        catch (e) {
            throw new Error(`Error accessing S3 Bucket ${params.Bucket}. Message: ${e.message}`);
        }
    }
    /**
     * Open the parquet file from a url using the supplied request module
     * params should either be a string (url) or an object that includes
     * a `url` property.
     * This function returns a new parquet reader
     */
    static async openUrl(params, options) {
        const envelopeReader = await ParquetEnvelopeReader.openUrl(params, options);
        return this.openEnvelopeReader(envelopeReader, options);
    }
    static async openEnvelopeReader(envelopeReader, opts) {
        if (opts?.metadata) {
            return new ParquetReader(opts.metadata, envelopeReader, opts);
        }
        try {
            await envelopeReader.readHeader();
            const metadata = await envelopeReader.readFooter();
            return new ParquetReader(metadata, envelopeReader, opts);
        }
        catch (err) {
            await envelopeReader.close();
            throw err;
        }
    }
    /**
     * Create a new parquet reader from the file metadata and an envelope reader.
     * It is not recommended to call this constructor directly except for advanced
     * and internal use cases. Consider using one of the open{File,Buffer} methods
     * instead
     */
    constructor(metadata, envelopeReader, opts) {
        opts = opts || {};
        if (!PARQUET_VERSIONS.includes(metadata.version)) {
            throw new Error('invalid parquet version');
        }
        // Default to false for backward compatibility
        this.treatInt96AsTimestamp = opts.treatInt96AsTimestamp === true;
        // If metadata is a json file then we need to convert INT64 and CTIME
        if (metadata.json) {
            const convert = (o) => {
                if (o && typeof o === 'object') {
                    Object.keys(o).forEach((key) => (o[key] = convert(o[key])));
                    if (o.parquetType === 'CTIME') {
                        return new Date(o.value);
                    }
                    else if (o.parquetType === 'INT64') {
                        return new node_int64_1.default(Buffer.from(o.value));
                    }
                }
                return o;
            };
            // Go through all PageLocation objects and set the proper prototype
            metadata.row_groups.forEach((rowGroup) => {
                rowGroup.columns.forEach((column) => {
                    if (column.offsetIndex) {
                        Promise.resolve(column.offsetIndex).then((offset) => offset.page_locations.forEach((d) => {
                            if (Array.isArray(d)) {
                                Object.setPrototypeOf(d, parquet_types_1.default.PageLocation.prototype);
                            }
                        }));
                    }
                });
            });
            convert(metadata);
        }
        this.metadata = envelopeReader.metadata = metadata;
        this.envelopeReader = envelopeReader;
        this.schema = envelopeReader.schema = new parquet_schema.ParquetSchema(decodeSchema(this.metadata.schema.slice(1)));
        /* decode any statistics values */
        if (this.metadata.row_groups && !this.metadata.json && !opts.rawStatistics) {
            this.metadata.row_groups.forEach((row) => row.columns.forEach((col) => {
                const stats = col.meta_data.statistics;
                if (stats) {
                    const field = this.schema.findField(col.meta_data.path_in_schema);
                    stats.max_value = decodeStatisticsValue(stats.max_value, field);
                    stats.min_value = decodeStatisticsValue(stats.min_value, field);
                    stats.min = decodeStatisticsValue(stats.min, field);
                    stats.max = decodeStatisticsValue(stats.max, field);
                }
            }));
        }
    }
    /**
     * Support `for await` iterators on the reader object
     * Uses `ParquetCursor` still under the hood.
     *
     * ```js
     *  for await (const record of reader) {
     *    console.log(record);
     *  }
     * ```
     */
    async *[Symbol.asyncIterator]() {
        const cursor = this.getCursor();
        let record = null;
        while ((record = await cursor.next())) {
            yield record;
        }
    }
    /**
     * Return a cursor to the file. You may open more than one cursor and use
     * them concurrently. All cursors become invalid once close() is called on
     * the reader object.
     *
     * The required_columns parameter controls which columns are actually read
     * from disk. An empty array or no value implies all columns. A list of column
     * names means that only those columns should be loaded from disk.
     */
    getCursor(columnList) {
        if (!columnList) {
            columnList = [];
        }
        columnList = columnList.map((x) => (x.constructor === Array ? x : [x]));
        return new ParquetCursor(this.metadata, this.envelopeReader, this.schema, columnList);
    }
    async getBloomFiltersFor(columnNames) {
        const bloomFilterData = await getBloomFiltersFor(columnNames, this.envelopeReader);
        return bloomFilterData.reduce((acc, value) => {
            if (acc[value.columnName])
                acc[value.columnName].push(value);
            else
                acc[value.columnName] = [value];
            return acc;
        }, {});
    }
    /**
     * Return the number of rows in this file. Note that the number of rows is
     * not necessarily equal to the number of rows in each column.
     */
    getRowCount() {
        return this.metadata.num_rows;
    }
    /**
     * Returns the ParquetSchema for this file
     */
    getSchema() {
        return this.schema;
    }
    /**
     * Returns the user (key/value) metadata for this file
     */
    getMetadata() {
        const md = {};
        for (const kv of this.metadata.key_value_metadata) {
            md[kv.key] = kv.value;
        }
        return md;
    }
    async exportMetadata(indent) {
        function replacer(_key, value) {
            if (value instanceof parquet_types_1.default.PageLocation) {
                return [value.offset, value.compressed_page_size, value.first_row_index];
            }
            if (typeof value === 'object') {
                for (const k in value) {
                    if (value[k] instanceof Date) {
                        value[k].toJSON = () => JSON.stringify({
                            parquetType: 'CTIME',
                            value: value[k].valueOf(),
                        });
                    }
                }
            }
            if (typeof value === 'bigint') {
                return value.toString();
            }
            if (value instanceof node_int64_1.default) {
                if (isFinite(Number(value))) {
                    return Number(value);
                }
                else {
                    return {
                        parquetType: 'INT64',
                        value: [...value.buffer],
                    };
                }
            }
            else {
                return value;
            }
        }
        const metadata = Object.assign({}, this.metadata, { json: true });
        for (let i = 0; i < metadata.row_groups.length; i++) {
            const rowGroup = metadata.row_groups[i];
            for (let j = 0; j < rowGroup.columns.length; j++) {
                const column = rowGroup.columns[j];
                if (column.offsetIndex instanceof Promise) {
                    column.offsetIndex = await column.offsetIndex;
                }
                if (column.columnIndex instanceof Promise) {
                    column.columnIndex = await column.columnIndex;
                }
            }
        }
        return JSON.stringify(metadata, replacer, indent);
    }
    /**
     * Close this parquet reader. You MUST call this method once you're finished
     * reading rows
     */
    async close() {
        if (this.envelopeReader) {
            await this.envelopeReader.close();
        }
        this.envelopeReader = null;
        this.metadata = null;
    }
    decodePages(buffer, opts) {
        return decodePages(buffer, opts);
    }
}
exports.ParquetReader = ParquetReader;
/**
 * The parquet envelope reader allows direct, unbuffered access to the individual
 * sections of the parquet file, namely the header, footer and the row groups.
 * This class is intended for advanced/internal users; if you just want to retrieve
 * rows from a parquet file use the ParquetReader instead
 */
let ParquetEnvelopeReaderIdCounter = 0;
class ParquetEnvelopeReader {
    readFn;
    close;
    id;
    fileSize;
    default_dictionary_size;
    metadata;
    schema;
    treatInt96AsTimestamp;
    static async openFile(filePath, options) {
        const fileStat = await parquet_util.fstat(filePath);
        const fileDescriptor = await parquet_util.fopen(filePath);
        const readFn = (offset, length, file) => {
            if (file) {
                return Promise.reject('external references are not supported');
            }
            return parquet_util.fread(fileDescriptor, offset, length);
        };
        const closeFn = parquet_util.fclose.bind(undefined, fileDescriptor);
        return new ParquetEnvelopeReader(readFn, closeFn, fileStat.size, options);
    }
    static async openBuffer(buffer, options) {
        const readFn = (offset, length, file) => {
            if (file) {
                return Promise.reject('external references are not supported');
            }
            return Promise.resolve(buffer.subarray(offset, offset + length));
        };
        const closeFn = () => ({});
        return new ParquetEnvelopeReader(readFn, closeFn, buffer.length, options);
    }
    static async openS3(client, params, options) {
        const fileStat = async () => client
            .headObject(params)
            .promise()
            .then((d) => d.ContentLength);
        const readFn = async (offset, length, file) => {
            if (file) {
                return Promise.reject('external references are not supported');
            }
            const Range = `bytes=${offset}-${offset + length - 1}`;
            const res = await client.getObject(Object.assign({ Range }, params)).promise();
            return Promise.resolve(res.Body);
        };
        const closeFn = () => ({});
        return new ParquetEnvelopeReader(readFn, closeFn, fileStat, options);
    }
    static async openS3v3(client, params, options) {
        const fileStat = async () => {
            try {
                const headObjectCommand = await client.send(new client_s3_1.HeadObjectCommand(params));
                if (headObjectCommand.ContentLength === undefined) {
                    throw new Error('Content Length is undefined!');
                }
                return Promise.resolve(headObjectCommand.ContentLength);
            }
            catch (e) {
                // having params match command names makes e.message clear to user
                return Promise.reject('rejected headObjectCommand: ' + e.message);
            }
        };
        const readFn = async (offset, length, file) => {
            if (file) {
                return Promise.reject('external references are not supported');
            }
            const Range = `bytes=${offset}-${offset + length - 1}`;
            const input = { ...{ Range }, ...params };
            const response = await client.send(new client_s3_1.GetObjectCommand(input));
            const body = response.Body;
            if (body) {
                return ParquetEnvelopeReader.streamToBuffer(body);
            }
            return Buffer.of();
        };
        const closeFn = () => ({});
        return new ParquetEnvelopeReader(readFn, closeFn, fileStat, options);
    }
    static async streamToBuffer(body) {
        const blob = body;
        if (blob.arrayBuffer !== undefined) {
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            return Buffer.from(uint8Array);
        }
        //Assumed to be a Readable like object
        const readable = body;
        return await new Promise((resolve, reject) => {
            const chunks = [];
            readable.on('data', (chunk) => chunks.push(chunk));
            readable.on('error', reject);
            readable.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }
    static async openUrl(url, options) {
        let params;
        if (typeof url === 'string')
            params = { url };
        else if (url instanceof URL)
            params = { url: url.toString() };
        else
            params = url;
        if (!params.url)
            throw new Error('URL missing');
        const baseArr = params.url.split('/');
        const base = baseArr.slice(0, baseArr.length - 1).join('/') + '/';
        const defaultHeaders = params.headers || {};
        const filesize = async () => {
            const { headers } = await fetch(params.url);
            return Number(headers.get('Content-Length')) || 0;
        };
        const readFn = async (offset, length, file) => {
            const url = file ? base + file : params.url;
            const range = `bytes=${offset}-${offset + length - 1}`;
            const headers = Object.assign({}, defaultHeaders, { range });
            const response = await fetch(url, { headers });
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return buffer;
        };
        const closeFn = () => ({});
        return new ParquetEnvelopeReader(readFn, closeFn, filesize, options);
    }
    constructor(readFn, closeFn, fileSize, options, metadata) {
        options = options || {};
        this.readFn = readFn;
        this.id = ++ParquetEnvelopeReaderIdCounter;
        this.close = closeFn;
        this.fileSize = fileSize;
        this.default_dictionary_size = options.default_dictionary_size || 10000000;
        this.metadata = metadata;
        this.treatInt96AsTimestamp = options.treatInt96AsTimestamp === true;
        if (options.maxLength || options.maxSpan || options.queueWait) {
            const bufferReader = new bufferReader_1.default(this, options);
            this.read = (offset, length) => bufferReader.read(offset, length);
        }
    }
    read(offset, length, file) {
        return this.readFn(offset, length, file);
    }
    readHeader() {
        return this.read(0, PARQUET_MAGIC.length).then((buf) => {
            if (buf.toString() != PARQUET_MAGIC) {
                throw new Error('not valid parquet file');
            }
        });
    }
    // Helper function to get the column object for a particular path and row_group
    getColumn(path, row_group) {
        let column;
        let parsedRowGroup;
        if (!isNaN(Number(row_group))) {
            parsedRowGroup = this.metadata?.row_groups[Number(row_group)];
        }
        else if (row_group instanceof parquet_types_1.default.RowGroup) {
            parsedRowGroup = row_group;
        }
        if (typeof path === 'string') {
            if (!parsedRowGroup) {
                throw new Error(`Missing RowGroup ${row_group}`);
            }
            column = parsedRowGroup.columns.find((d) => d.meta_data.path_in_schema.join(',') === path);
            if (!column) {
                throw new Error(`Column ${path} Not Found`);
            }
        }
        else {
            column = path;
        }
        return column;
    }
    getAllColumnChunkDataFor(paths, row_groups) {
        if (!row_groups) {
            row_groups = this.metadata.row_groups;
        }
        return row_groups.flatMap((rowGroup, index) => paths.map((columnName) => ({
            rowGroupIndex: index,
            column: this.getColumn(columnName, rowGroup),
        })));
    }
    readOffsetIndex(path, row_group, opts) {
        const column = this.getColumn(path, row_group);
        if (column.offsetIndex) {
            return Promise.resolve(column.offsetIndex);
        }
        else if (!column.offset_index_offset || !column.offset_index_length) {
            return Promise.reject('Offset Index Missing');
        }
        const data = this.read(+column.offset_index_offset, column.offset_index_length).then((data) => {
            const offset_index = new parquet_types_1.default.OffsetIndex();
            parquet_util.decodeThrift(offset_index, data);
            Object.defineProperty(offset_index, 'column', { value: column, enumerable: false });
            return offset_index;
        });
        if (opts?.cache) {
            column.offsetIndex = data;
        }
        return data;
    }
    readColumnIndex(path, row_group, opts) {
        const column = this.getColumn(path, row_group);
        if (column.columnIndex) {
            return Promise.resolve(column.columnIndex);
        }
        else if (!column.column_index_offset) {
            return Promise.reject(new Error('Column Index Missing'));
        }
        const data = this.read(+column.column_index_offset, column.column_index_length).then((buf) => {
            const column_index = new parquet_types_1.default.ColumnIndex();
            parquet_util.decodeThrift(column_index, buf);
            Object.defineProperty(column_index, 'column', { value: column });
            // decode the statistics values
            const field = this.schema.findField(column.meta_data.path_in_schema);
            if (column_index.max_values) {
                column_index.max_values = column_index.max_values.map((max_value) => decodeStatisticsValue(max_value, field));
            }
            if (column_index.min_values) {
                column_index.min_values = column_index.min_values.map((min_value) => decodeStatisticsValue(min_value, field));
            }
            return column_index;
        });
        if (opts?.cache) {
            column.columnIndex = data;
        }
        return data;
    }
    async readPage(column, page, records, opts) {
        column = Object.assign({}, column);
        column.meta_data = Object.assign({}, column.meta_data);
        if (page instanceof parquet_types_1.default.PageLocation && page.offset !== undefined) {
            if (isNaN(Number(page.offset)) || isNaN(page.compressed_page_size)) {
                throw Error('page offset and/or size missing');
            }
            column.meta_data.data_page_offset = parquet_util.cloneInteger(page.offset);
            column.meta_data.total_compressed_size = new node_int64_1.default(page.compressed_page_size);
        }
        else {
            const offsetIndex = await this.readOffsetIndex(column, null, opts);
            column.meta_data.data_page_offset = parquet_util.cloneInteger(offsetIndex.page_locations[page].offset);
            column.meta_data.total_compressed_size = new node_int64_1.default(offsetIndex.page_locations[page].compressed_page_size);
        }
        const chunk = await this.readColumnChunk(this.schema, column);
        Object.defineProperty(chunk, 'column', { value: column });
        const data = {
            columnData: { [chunk.column.meta_data.path_in_schema.join(',')]: chunk },
        };
        return parquet_shredder.materializeRecords(this.schema, data, records);
    }
    async readRowGroup(schema, rowGroup, columnList) {
        const buffer = {
            rowCount: +rowGroup.num_rows,
            columnData: {},
            pageRowCount: 0,
            pages: {},
        };
        for (const colChunk of rowGroup.columns) {
            const colMetadata = colChunk.meta_data;
            const colKey = colMetadata.path_in_schema;
            if (columnList.length > 0 && parquet_util.fieldIndexOf(columnList, colKey) < 0) {
                continue;
            }
            buffer.columnData[colKey.join(',')] = await this.readColumnChunk(schema, colChunk);
        }
        return buffer;
    }
    async readColumnChunk(schema, colChunk, opts) {
        const metadata = colChunk.meta_data;
        const field = schema.findField(metadata.path_in_schema);
        const type = parquet_util.getThriftEnum(parquet_types_1.default.Type, metadata.type);
        const compression = parquet_util.getThriftEnum(parquet_types_1.default.CompressionCodec, metadata.codec);
        const pagesOffset = +metadata.data_page_offset;
        let pagesSize = +metadata.total_compressed_size;
        if (!colChunk.file_path) {
            pagesSize = Math.min(this.fileSize - pagesOffset, +metadata.total_compressed_size);
        }
        opts = Object.assign({}, opts, {
            type: type,
            rLevelMax: field.rLevelMax,
            dLevelMax: field.dLevelMax,
            compression: compression,
            column: field,
            num_values: metadata.num_values,
            treatInt96AsTimestamp: this.treatInt96AsTimestamp,
        });
        // If this exists and is greater than zero then we need to have an offset
        if (metadata.dictionary_page_offset && +metadata.dictionary_page_offset > 0) {
            const offset = +metadata.dictionary_page_offset;
            const size = Math.min(+this.fileSize - offset, this.default_dictionary_size);
            await this.read(offset, size, colChunk.file_path).then(async (buffer) => {
                await decodePage({ offset: 0, buffer, size: buffer.length }, opts).then((dict) => {
                    opts.dictionary = opts.dictionary || dict.dictionary;
                });
            });
        }
        return this.read(pagesOffset, pagesSize, colChunk.file_path).then((pagesBuf) => decodePages(pagesBuf, opts));
    }
    async readFooter() {
        if (typeof this.fileSize === 'function') {
            this.fileSize = await this.fileSize();
        }
        const trailerLen = PARQUET_MAGIC.length + 4;
        const offset = this.fileSize - trailerLen;
        const trailerBuf = await this.read(offset, trailerLen);
        if (trailerBuf.subarray(4).toString() != PARQUET_MAGIC) {
            throw new Error('not a valid parquet file');
        }
        const metadataSize = trailerBuf.readUInt32LE(0);
        const metadataOffset = this.fileSize - metadataSize - trailerLen;
        if (metadataOffset < PARQUET_MAGIC.length) {
            throw new Error('invalid metadata size');
        }
        const metadataBuf = await this.read(metadataOffset, metadataSize);
        const metadata = new parquet_types_1.default.FileMetaData();
        parquet_util.decodeThrift(metadata, metadataBuf);
        return metadata;
    }
}
exports.ParquetEnvelopeReader = ParquetEnvelopeReader;
/**
 * Decode a consecutive array of data using one of the parquet encodings
 */
function decodeValues(type, encoding, cursor, count, opts) {
    if (!(encoding in parquet_codec)) {
        throw new Error('invalid encoding: ' + encoding);
    }
    return parquet_codec[encoding].decodeValues(type, cursor, count, opts);
}
function decodeStatisticsValue(value, column) {
    if (value === null || !value.length) {
        return undefined;
    }
    if (!column.primitiveType.includes('BYTE_ARRAY')) {
        value = decodeValues(column.primitiveType, 'PLAIN', { buffer: Buffer.from(value), offset: 0 }, 1, column);
        if (value.length === 1)
            value = value[0];
    }
    if (column.originalType) {
        value = parquet_types.fromPrimitive(column.originalType, value, column);
    }
    return value;
}
function decodeStatistics(statistics, column) {
    if (!statistics) {
        return;
    }
    if (statistics.min_value !== null) {
        statistics.min_value = decodeStatisticsValue(statistics.min_value, column);
    }
    if (statistics.max_value !== null) {
        statistics.max_value = decodeStatisticsValue(statistics.max_value, column);
    }
    statistics.min = decodeStatisticsValue(statistics.min, column) || statistics.min_value;
    statistics.max = decodeStatisticsValue(statistics.max, column) || statistics.max_value;
    return statistics;
}
async function decodePage(cursor, opts) {
    opts = opts || {};
    let page;
    const pageHeader = new declare_1.NewPageHeader();
    const headerOffset = cursor.offset;
    const headerSize = parquet_util.decodeThrift(pageHeader, cursor.buffer.subarray(cursor.offset));
    cursor.offset += headerSize;
    const pageType = parquet_util.getThriftEnum(parquet_types_1.default.PageType, pageHeader.type);
    switch (pageType) {
        case 'DATA_PAGE':
            if (!opts.rawStatistics) {
                pageHeader.data_page_header.statistics = decodeStatistics(pageHeader.data_page_header.statistics, opts.column);
            }
            page = await decodeDataPage(cursor, pageHeader, opts);
            break;
        case 'DATA_PAGE_V2':
            if (!opts.rawStatistics) {
                pageHeader.data_page_header_v2.statistics = decodeStatistics(pageHeader.data_page_header_v2.statistics, opts.column);
            }
            page = await decodeDataPageV2(cursor, pageHeader, opts);
            break;
        case 'DICTIONARY_PAGE':
            page = {
                dictionary: await decodeDictionaryPage(cursor, pageHeader, opts),
            };
            break;
        default:
            throw new Error(`invalid page type: ${pageType}`);
    }
    pageHeader.offset = headerOffset;
    pageHeader.headerSize = headerSize;
    page.pageHeader = pageHeader;
    return page;
}
async function decodePages(buffer, opts) {
    opts = opts || {};
    const cursor = {
        buffer: buffer,
        offset: 0,
        size: buffer.length,
    };
    const data = {
        rlevels: [],
        dlevels: [],
        values: [],
        pageHeaders: [],
        count: 0,
    };
    while (cursor.offset < cursor.size && (!opts.num_values || data.dlevels.length < opts.num_values)) {
        const pageData = await decodePage(cursor, opts);
        if (pageData.dictionary) {
            opts.dictionary = pageData.dictionary;
            continue;
        }
        // It's possible to have a column chunk where some pages should use
        // the dictionary (PLAIN_DICTIONARY for example) and others should
        // not (PLAIN for example).
        if (opts.dictionary && pageData.useDictionary) {
            pageData.values = pageData.values.map((d) => opts.dictionary[d]);
        }
        const length = pageData.rlevels != undefined ? pageData.rlevels.length : 0;
        for (let i = 0; i < length; i++) {
            data.rlevels.push(pageData.rlevels[i]);
            data.dlevels.push(pageData.dlevels[i]);
            const value = pageData.values[i];
            if (value !== undefined) {
                data.values.push(value);
            }
        }
        data.count += pageData.count;
        data.pageHeaders.push(pageData.pageHeader);
    }
    return data;
}
async function decodeDictionaryPage(cursor, header, opts) {
    const cursorEnd = cursor.offset + header.compressed_page_size;
    let dictCursor = {
        offset: 0,
        buffer: cursor.buffer.subarray(cursor.offset, cursorEnd),
        size: cursorEnd - cursor.offset,
    };
    cursor.offset = cursorEnd;
    if (opts.compression && opts.compression !== 'UNCOMPRESSED') {
        const valuesBuf = await parquet_compression.inflate(opts.compression, dictCursor.buffer.subarray(dictCursor.offset, cursorEnd));
        dictCursor = {
            buffer: valuesBuf,
            offset: 0,
            size: valuesBuf.length,
        };
    }
    return decodeValues(opts.column.primitiveType, opts.column.encoding, dictCursor, header.dictionary_page_header.num_values, opts);
}
async function decodeDataPage(cursor, header, opts) {
    const cursorEnd = cursor.offset + header.compressed_page_size;
    const dataPageHeader = header.data_page_header;
    const valueCount = dataPageHeader.num_values;
    const valueEncoding = parquet_util.getThriftEnum(parquet_types_1.default.Encoding, dataPageHeader.encoding);
    let valuesBufCursor = cursor;
    if (opts.compression && opts.compression !== 'UNCOMPRESSED') {
        const valuesBuf = await parquet_compression.inflate(opts.compression, cursor.buffer.subarray(cursor.offset, cursorEnd));
        valuesBufCursor = {
            buffer: valuesBuf,
            offset: 0,
            size: valuesBuf.length,
        };
    }
    /* read repetition levels */
    const rLevelEncoding = parquet_util.getThriftEnum(parquet_types_1.default.Encoding, dataPageHeader.repetition_level_encoding);
    let rLevels = new Array(valueCount);
    if (opts.rLevelMax > 0) {
        rLevels = decodeValues(PARQUET_RDLVL_TYPE, rLevelEncoding, valuesBufCursor, valueCount, {
            bitWidth: parquet_util.getBitWidth(opts.rLevelMax),
        });
    }
    else {
        rLevels.fill(0);
    }
    /* read definition levels */
    const dLevelEncoding = parquet_util.getThriftEnum(parquet_types_1.default.Encoding, dataPageHeader.definition_level_encoding);
    let dLevels = new Array(valueCount);
    if (opts.dLevelMax > 0) {
        dLevels = decodeValues(PARQUET_RDLVL_TYPE, dLevelEncoding, valuesBufCursor, valueCount, {
            bitWidth: parquet_util.getBitWidth(opts.dLevelMax),
        });
    }
    else {
        dLevels.fill(0);
    }
    /* read values */
    let valueCountNonNull = 0;
    for (const dlvl of dLevels) {
        if (dlvl === opts.dLevelMax) {
            ++valueCountNonNull;
        }
    }
    const values = decodeValues(opts.type, valueEncoding, valuesBufCursor, valueCountNonNull, {
        typeLength: opts.column.typeLength,
        bitWidth: opts.column.typeLength,
        disableEnvelope: opts.column.disableEnvelope,
        originalType: opts.column.originalType,
        precision: opts.column.precision,
        scale: opts.column.scale,
        name: opts.column.name,
        treatInt96AsTimestamp: opts.treatInt96AsTimestamp,
    });
    cursor.offset = cursorEnd;
    return {
        dlevels: dLevels,
        rlevels: rLevels,
        values: values,
        count: valueCount,
        useDictionary: valueEncoding === 'PLAIN_DICTIONARY' || valueEncoding === 'RLE_DICTIONARY',
    };
}
async function decodeDataPageV2(cursor, header, opts) {
    const cursorEnd = cursor.offset + header.compressed_page_size;
    const dataPageHeaderV2 = header.data_page_header_v2;
    const valueCount = dataPageHeaderV2.num_values;
    const valueCountNonNull = valueCount - dataPageHeaderV2.num_nulls;
    const valueEncoding = parquet_util.getThriftEnum(parquet_types_1.default.Encoding, dataPageHeaderV2.encoding);
    /* read repetition levels */
    let rLevels = new Array(valueCount);
    if (opts.rLevelMax > 0) {
        rLevels = decodeValues(PARQUET_RDLVL_TYPE, PARQUET_RDLVL_ENCODING, cursor, valueCount, {
            bitWidth: parquet_util.getBitWidth(opts.rLevelMax),
            disableEnvelope: true,
        });
    }
    else {
        rLevels.fill(0);
    }
    /* read definition levels */
    let dLevels = new Array(valueCount);
    if (opts.dLevelMax > 0) {
        dLevels = decodeValues(PARQUET_RDLVL_TYPE, PARQUET_RDLVL_ENCODING, cursor, valueCount, {
            bitWidth: parquet_util.getBitWidth(opts.dLevelMax),
            disableEnvelope: true,
        });
    }
    else {
        dLevels.fill(0);
    }
    /* read values */
    let valuesBufCursor = cursor;
    if (dataPageHeaderV2.is_compressed) {
        const valuesBuf = await parquet_compression.inflate(opts.compression, cursor.buffer.subarray(cursor.offset, cursorEnd));
        valuesBufCursor = {
            buffer: valuesBuf,
            offset: 0,
            size: valuesBuf.length,
        };
        cursor.offset = cursorEnd;
    }
    const values = decodeValues(opts.type, valueEncoding, valuesBufCursor, valueCountNonNull, {
        bitWidth: opts.column.typeLength,
        treatInt96AsTimestamp: opts.treatInt96AsTimestamp,
        ...opts.column,
    });
    return {
        dlevels: dLevels,
        rlevels: rLevels,
        values: values,
        count: valueCount,
        useDictionary: valueEncoding === 'PLAIN_DICTIONARY' || valueEncoding === 'RLE_DICTIONARY',
    };
}
function decodeSchema(schemaElements) {
    let schema = {};
    schemaElements.forEach((schemaElement) => {
        const repetitionType = parquet_util.getThriftEnum(parquet_types_1.default.FieldRepetitionType, schemaElement.repetition_type);
        let optional = false;
        let repeated = false;
        switch (repetitionType) {
            case 'REQUIRED':
                break;
            case 'OPTIONAL':
                optional = true;
                break;
            case 'REPEATED':
                repeated = true;
                break;
        }
        if (schemaElement.num_children != undefined && schemaElement.num_children > 0) {
            schema[schemaElement.name] = {
                optional: optional,
                repeated: repeated,
                fields: Object.create({}, {
                    /* define parent and num_children as non-enumerable */
                    parent: {
                        value: schema,
                        enumerable: false,
                    },
                    num_children: {
                        value: schemaElement.num_children,
                        enumerable: false,
                    },
                }),
            };
            /* move the schema pointer to the children */
            schema = schema[schemaElement.name].fields;
        }
        else {
            let logicalType = parquet_util.getThriftEnum(parquet_types_1.default.Type, schemaElement.type);
            if (schemaElement.converted_type != null) {
                logicalType = parquet_util.getThriftEnum(parquet_types_1.default.ConvertedType, schemaElement.converted_type);
            }
            schema[schemaElement.name] = {
                type: logicalType,
                typeLength: schemaElement.type_length,
                optional: optional,
                repeated: repeated,
                scale: schemaElement.scale,
                precision: schemaElement.precision,
            };
        }
        /* if we have processed all children we move schema pointer to parent again */
        while (schema.parent && Object.keys(schema).length === schema.num_children) {
            schema = schema.parent;
        }
    });
    return schema;
}
