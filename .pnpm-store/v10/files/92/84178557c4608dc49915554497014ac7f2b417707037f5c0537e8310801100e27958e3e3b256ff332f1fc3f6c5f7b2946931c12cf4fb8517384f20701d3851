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
exports.ParquetTransformer = exports.ParquetEnvelopeWriter = exports.ParquetWriter = void 0;
const stream_1 = __importDefault(require("stream"));
const parquet_types_1 = __importStar(require("../gen-nodejs/parquet_types"));
const parquet_shredder = __importStar(require("./shred"));
const parquet_util = __importStar(require("./util"));
const parquet_codec = __importStar(require("./codec"));
const parquet_compression = __importStar(require("./compression"));
const parquet_types = __importStar(require("./types"));
const bloomFilterWriter = __importStar(require("./bloomFilterIO/bloomFilterWriter"));
const node_int64_1 = __importDefault(require("node-int64"));
/**
 * Parquet File Magic String
 */
const PARQUET_MAGIC = 'PAR1';
/**
 * Parquet File Format Version
 */
const PARQUET_VERSION = 1;
/**
 * Default Page and Row Group sizes
 */
const PARQUET_DEFAULT_PAGE_SIZE = 8192;
const PARQUET_DEFAULT_ROW_GROUP_SIZE = 4096;
/**
 * Repetition and Definition Level Encoding
 */
const PARQUET_RDLVL_TYPE = 'INT32';
const PARQUET_RDLVL_ENCODING = 'RLE';
/**
 * Write a parquet file to an output stream. The ParquetWriter will perform
 * buffering/batching for performance, so close() must be called after all rows
 * are written.
 */
class ParquetWriter {
    schema;
    envelopeWriter;
    rowBuffer;
    rowGroupSize;
    closed;
    userMetadata;
    /**
     * Convenience method to create a new buffered parquet writer that writes to
     * the specified file
     */
    static async openFile(schema, path, opts) {
        const outputStream = await parquet_util.osopen(path, opts);
        return ParquetWriter.openStream(schema, outputStream, opts);
    }
    /**
     * Convenience method to create a new buffered parquet writer that writes to
     * the specified stream
     */
    static async openStream(schema, outputStream, opts) {
        if (!opts) {
            opts = {};
        }
        const envelopeWriter = await ParquetEnvelopeWriter.openStream(schema, outputStream, opts);
        return new ParquetWriter(schema, envelopeWriter, opts);
    }
    /**
     * Create a new buffered parquet writer for a given envelope writer
     */
    constructor(schema, envelopeWriter, opts) {
        this.schema = schema;
        this.envelopeWriter = envelopeWriter;
        this.rowBuffer = {};
        this.rowGroupSize = opts.rowGroupSize || PARQUET_DEFAULT_ROW_GROUP_SIZE;
        this.closed = false;
        this.userMetadata = {};
        try {
            envelopeWriter.writeHeader();
        }
        catch (err) {
            envelopeWriter.close();
            throw err;
        }
    }
    /**
     * Append a single row to the parquet file. Rows are buffered in memory until
     * rowGroupSize rows are in the buffer or close() is called
     */
    async appendRow(row) {
        if (this.closed || this.envelopeWriter === null) {
            throw new Error('writer was closed');
        }
        parquet_shredder.shredRecord(this.schema, row, this.rowBuffer);
        const options = {
            useDataPageV2: this.envelopeWriter.useDataPageV2,
            bloomFilters: this.envelopeWriter.bloomFilters,
        };
        if (this.rowBuffer.pageRowCount >= this.envelopeWriter.pageSize) {
            await encodePages(this.schema, this.rowBuffer, options);
        }
        if (this.rowBuffer.rowCount >= this.rowGroupSize) {
            await encodePages(this.schema, this.rowBuffer, options);
            await this.envelopeWriter.writeRowGroup(this.rowBuffer);
            this.rowBuffer = {};
        }
    }
    /**
     * Finish writing the parquet file and commit the footer to disk. This method
     * MUST be called after you are finished adding rows. You must not call this
     * method twice on the same object or add any rows after the close() method has
     * been called
     */
    async close(callback) {
        if (this.closed) {
            throw new Error('writer was closed');
        }
        this.closed = true;
        if (this.envelopeWriter) {
            if (this.rowBuffer.rowCount > 0 || this.rowBuffer.rowCount >= this.rowGroupSize) {
                await encodePages(this.schema, this.rowBuffer, {
                    useDataPageV2: this.envelopeWriter.useDataPageV2,
                    bloomFilters: this.envelopeWriter.bloomFilters,
                });
                await this.envelopeWriter.writeRowGroup(this.rowBuffer);
                this.rowBuffer = {};
            }
            await this.envelopeWriter.writeBloomFilters();
            await this.envelopeWriter.writeIndex();
            await this.envelopeWriter.writeFooter(this.userMetadata);
            await this.envelopeWriter.close();
            this.envelopeWriter = null;
        }
        if (callback) {
            callback();
        }
    }
    /**
     * Add key<>value metadata to the file
     */
    setMetadata(key, value) {
        this.userMetadata[key.toString()] = value.toString();
    }
    /**
     * Set the parquet row group size. This values controls the maximum number
     * of rows that are buffered in memory at any given time as well as the number
     * of rows that are co-located on disk. A higher value is generally better for
     * read-time I/O performance at the tradeoff of write-time memory usage.
     */
    setRowGroupSize(cnt) {
        this.rowGroupSize = cnt;
    }
    /**
     * Set the parquet data page size. The data page size controls the maximum
     * number of column values that are written to disk as a consecutive array
     */
    setPageSize(cnt) {
        this.envelopeWriter.setPageSize(cnt);
    }
}
exports.ParquetWriter = ParquetWriter;
/**
 * Create a parquet file from a schema and a number of row groups. This class
 * performs direct, unbuffered writes to the underlying output stream and is
 * intended for advanced and internal users; the writeXXX methods must be
 * called in the correct order to produce a valid file.
 */
class ParquetEnvelopeWriter {
    schema;
    write;
    close;
    offset;
    rowCount;
    rowGroups;
    pageSize;
    useDataPageV2;
    pageIndex;
    bloomFilters; // TODO: OR filterCollection
    /**
     * Create a new parquet envelope writer that writes to the specified stream
     */
    static async openStream(schema, outputStream, opts) {
        const writeFn = parquet_util.oswrite.bind(undefined, outputStream);
        const closeFn = parquet_util.osend.bind(undefined, outputStream);
        return new ParquetEnvelopeWriter(schema, writeFn, closeFn, new node_int64_1.default(0), opts);
    }
    constructor(schema, writeFn, closeFn, fileOffset, opts) {
        this.schema = schema;
        this.write = writeFn;
        this.close = closeFn;
        this.offset = fileOffset;
        this.rowCount = new node_int64_1.default(0);
        this.rowGroups = [];
        this.pageSize = opts.pageSize || PARQUET_DEFAULT_PAGE_SIZE;
        this.useDataPageV2 = 'useDataPageV2' in opts ? opts.useDataPageV2 : true;
        this.pageIndex = opts.pageIndex;
        this.bloomFilters = {};
        (opts.bloomFilters || []).forEach((bloomOption) => {
            this.bloomFilters[bloomOption.column] = bloomFilterWriter.createSBBF(bloomOption);
        });
    }
    writeSection(buf) {
        this.offset.setValue(this.offset.valueOf() + buf.length);
        return this.write(buf);
    }
    /**
     * Encode the parquet file header
     */
    writeHeader() {
        return this.writeSection(Buffer.from(PARQUET_MAGIC));
    }
    /**
     * Encode a parquet row group. The records object should be created using the
     * shredRecord method
     */
    async writeRowGroup(records) {
        const rgroup = await encodeRowGroup(this.schema, records, {
            baseOffset: this.offset,
            pageSize: this.pageSize,
            useDataPageV2: this.useDataPageV2,
            pageIndex: this.pageIndex,
        });
        this.rowCount.setValue(this.rowCount.valueOf() + records.rowCount);
        this.rowGroups.push(rgroup.metadata);
        return this.writeSection(rgroup.body);
    }
    writeBloomFilters() {
        this.rowGroups.forEach((group) => {
            group.columns.forEach((column) => {
                if (!column.meta_data?.path_in_schema.length) {
                    return;
                }
                const filterName = column.meta_data?.path_in_schema.join(',');
                if (!(filterName in this.bloomFilters)) {
                    return;
                }
                const serializedBloomFilterData = bloomFilterWriter.getSerializedBloomFilterData(this.bloomFilters[filterName]);
                bloomFilterWriter.setFilterOffset(column, this.offset);
                this.writeSection(serializedBloomFilterData);
            });
        });
    }
    /**
     * Write the columnIndices and offsetIndices
     */
    writeIndex() {
        this.schema.fieldList.forEach((c, i) => {
            this.rowGroups.forEach((group) => {
                const column = group.columns[i];
                if (!column)
                    return;
                if (column.meta_data?.columnIndex) {
                    const columnBody = parquet_util.serializeThrift(column.meta_data.columnIndex);
                    delete column.meta_data.columnIndex;
                    column.column_index_offset = parquet_util.cloneInteger(this.offset);
                    column.column_index_length = columnBody.length;
                    this.writeSection(columnBody);
                }
                if (column.meta_data?.offsetIndex) {
                    const offsetBody = parquet_util.serializeThrift(column.meta_data.offsetIndex);
                    delete column.meta_data.offsetIndex;
                    column.offset_index_offset = parquet_util.cloneInteger(this.offset);
                    column.offset_index_length = offsetBody.length;
                    this.writeSection(offsetBody);
                }
            });
        });
    }
    /**
     * Write the parquet file footer
     */
    writeFooter(userMetadata) {
        if (!userMetadata) {
            userMetadata = {};
        }
        if (this.schema.fieldList.length === 0) {
            throw new Error('cannot write parquet file with zero fieldList');
        }
        return this.writeSection(encodeFooter(this.schema, this.rowCount, this.rowGroups, userMetadata));
    }
    /**
     * Set the parquet data page size. The data page size controls the maximum
     * number of column values that are written to disk as a consecutive array
     */
    setPageSize(cnt) {
        this.pageSize = cnt;
    }
}
exports.ParquetEnvelopeWriter = ParquetEnvelopeWriter;
/**
 * Create a parquet transform stream
 */
class ParquetTransformer extends stream_1.default.Transform {
    writer;
    constructor(schema, opts = {}) {
        super({ objectMode: true });
        const writeProxy = (function (t) {
            return function (b) {
                t.push(b);
            };
        })(this);
        this.writer = new ParquetWriter(schema, new ParquetEnvelopeWriter(schema, writeProxy, () => {
            /* void */
        }, new node_int64_1.default(0), opts), opts);
    }
    _transform(row, _encoding, callback) {
        if (row) {
            this.writer.appendRow(row).then((data) => callback(null, data), (err) => {
                const fullErr = new Error(`Error transforming to parquet: ${err.toString()} row:${row}`);
                fullErr.message = err;
                callback(fullErr);
            });
        }
        else {
            callback();
        }
    }
    _flush(callback) {
        this.writer.close().then((d) => callback(null, d), callback);
    }
}
exports.ParquetTransformer = ParquetTransformer;
/**
 * Encode a consecutive array of data using one of the parquet encodings
 */
function encodeValues(type, encoding, values, opts) {
    if (!(encoding in parquet_codec)) {
        throw new Error('invalid encoding: ' + encoding);
    }
    return parquet_codec[encoding].encodeValues(type, values, opts);
}
function encodeStatisticsValue(value, column) {
    if (value === undefined) {
        return Buffer.alloc(0);
    }
    if (column.originalType) {
        value = parquet_types.toPrimitive(column.originalType, value, column);
    }
    if (column.primitiveType !== 'BYTE_ARRAY') {
        value = encodeValues(column.primitiveType, 'PLAIN', [value], column);
    }
    return value;
}
function encodeStatistics(statistics, column) {
    statistics = Object.assign({}, statistics);
    statistics.min_value =
        statistics.min_value === undefined ? null : encodeStatisticsValue(statistics.min_value, column);
    statistics.max_value =
        statistics.max_value === undefined ? null : encodeStatisticsValue(statistics.max_value, column);
    statistics.max = statistics.max_value;
    statistics.min = statistics.min_value;
    return new parquet_types_1.default.Statistics(statistics);
}
async function encodePages(schema, rowBuffer, opts) {
    // generic
    if (!rowBuffer.pageRowCount) {
        return;
    }
    for (const field of schema.fieldList) {
        if (field.isNested) {
            continue;
        }
        let page;
        const columnPath = field.path.join(',');
        const values = rowBuffer.columnData[columnPath];
        if (opts.bloomFilters && columnPath in opts.bloomFilters) {
            const splitBlockBloomFilter = opts.bloomFilters[columnPath];
            values.values.forEach((v) => splitBlockBloomFilter.insert(v));
        }
        let statistics = {};
        if (field.statistics !== false) {
            statistics = {};
            [...values.distinct_values].forEach((v, i) => {
                if (i === 0 || v > statistics.max_value) {
                    statistics.max_value = v;
                }
                if (i === 0 || v < statistics.min_value) {
                    statistics.min_value = v;
                }
            });
            statistics.null_count = new node_int64_1.default(values.dlevels.length - values.values.length);
            statistics.distinct_count = new node_int64_1.default(values.distinct_values.size);
        }
        if (opts.useDataPageV2) {
            page = await encodeDataPageV2(field, values.count, values.values, values.rlevels, values.dlevels, statistics);
        }
        else {
            page = await encodeDataPage(field, values.values || [], values.rlevels || [], values.dlevels || [], statistics);
        }
        const pages = rowBuffer.pages[field.path.join(',')];
        const lastPage = pages[pages.length - 1];
        const first_row_index = lastPage ? lastPage.first_row_index + lastPage.count : 0;
        pages.push({
            page,
            statistics,
            first_row_index,
            distinct_values: values.distinct_values,
            num_values: values.dlevels.length,
        });
        values.distinct_values = new Set();
        values.values = [];
        values.rlevels = [];
        values.dlevels = [];
        values.count = 0;
    }
    rowBuffer.pageRowCount = 0;
}
/**
 * Encode a parquet data page
 */
async function encodeDataPage(column, values, rlevels, dlevels, statistics) {
    /* encode values */
    const valuesBuf = encodeValues(column.primitiveType, column.encoding, values, {
        bitWidth: column.typeLength,
        ...column,
    });
    /* encode repetition and definition levels */
    let rLevelsBuf = Buffer.alloc(0);
    if (column.rLevelMax > 0) {
        rLevelsBuf = encodeValues(PARQUET_RDLVL_TYPE, PARQUET_RDLVL_ENCODING, rlevels, {
            bitWidth: parquet_util.getBitWidth(column.rLevelMax),
        });
    }
    let dLevelsBuf = Buffer.alloc(0);
    if (column.dLevelMax > 0) {
        dLevelsBuf = encodeValues(PARQUET_RDLVL_TYPE, PARQUET_RDLVL_ENCODING, dlevels, {
            bitWidth: parquet_util.getBitWidth(column.dLevelMax),
        });
    }
    /* build page header */
    const initialPageBody = Buffer.concat([rLevelsBuf, dLevelsBuf, valuesBuf]);
    const pageBody = await parquet_compression.deflate(column.compression, initialPageBody);
    const pageHeader = new parquet_types_1.default.PageHeader();
    pageHeader.type = parquet_types_1.default.PageType['DATA_PAGE'];
    pageHeader.uncompressed_page_size = rLevelsBuf.length + dLevelsBuf.length + valuesBuf.length;
    pageHeader.compressed_page_size = pageBody.length;
    pageHeader.data_page_header = new parquet_types_1.default.DataPageHeader();
    pageHeader.data_page_header.num_values = dlevels.length;
    if (column.statistics !== false) {
        pageHeader.data_page_header.statistics = encodeStatistics(statistics, column);
    }
    pageHeader.data_page_header.encoding = parquet_types_1.default.Encoding[column.encoding];
    pageHeader.data_page_header.definition_level_encoding = parquet_types_1.default.Encoding[PARQUET_RDLVL_ENCODING];
    pageHeader.data_page_header.repetition_level_encoding = parquet_types_1.default.Encoding[PARQUET_RDLVL_ENCODING];
    /* concat page header, repetition and definition levels and values */
    return Buffer.concat([parquet_util.serializeThrift(pageHeader), pageBody]);
}
/**
 * Encode a parquet data page (v2)
 */
async function encodeDataPageV2(column, rowCount, values, rlevels, dlevels, statistics) {
    /* encode values */
    const valuesBuf = encodeValues(column.primitiveType, column.encoding, values, {
        bitWidth: column.typeLength,
        ...column,
    });
    const valuesBufCompressed = await parquet_compression.deflate(column.compression, valuesBuf);
    /* encode repetition and definition levels */
    let rLevelsBuf = Buffer.alloc(0);
    if (column.rLevelMax > 0) {
        rLevelsBuf = encodeValues(PARQUET_RDLVL_TYPE, PARQUET_RDLVL_ENCODING, rlevels, {
            bitWidth: parquet_util.getBitWidth(column.rLevelMax),
            disableEnvelope: true,
        });
    }
    let dLevelsBuf = Buffer.alloc(0);
    if (column.dLevelMax > 0) {
        dLevelsBuf = encodeValues(PARQUET_RDLVL_TYPE, PARQUET_RDLVL_ENCODING, dlevels, {
            bitWidth: parquet_util.getBitWidth(column.dLevelMax),
            disableEnvelope: true,
        });
    }
    /* build page header */
    const pageHeader = new parquet_types_1.default.PageHeader();
    pageHeader.type = parquet_types_1.default.PageType['DATA_PAGE_V2'];
    pageHeader.data_page_header_v2 = new parquet_types_1.default.DataPageHeaderV2();
    pageHeader.data_page_header_v2.num_values = dlevels.length;
    pageHeader.data_page_header_v2.num_nulls = dlevels.length - values.length;
    pageHeader.data_page_header_v2.num_rows = rowCount;
    if (column.statistics !== false) {
        pageHeader.data_page_header_v2.statistics = encodeStatistics(statistics, column);
    }
    pageHeader.uncompressed_page_size = rLevelsBuf.length + dLevelsBuf.length + valuesBuf.length;
    pageHeader.compressed_page_size = rLevelsBuf.length + dLevelsBuf.length + valuesBufCompressed.length;
    pageHeader.data_page_header_v2.encoding = parquet_types_1.default.Encoding[column.encoding];
    pageHeader.data_page_header_v2.definition_levels_byte_length = dLevelsBuf.length;
    pageHeader.data_page_header_v2.repetition_levels_byte_length = rLevelsBuf.length;
    pageHeader.data_page_header_v2.is_compressed = column.compression !== 'UNCOMPRESSED';
    /* concat page header, repetition and definition levels and values */
    return Buffer.concat([parquet_util.serializeThrift(pageHeader), rLevelsBuf, dLevelsBuf, valuesBufCompressed]);
}
/**
 * Encode an array of values into a parquet column chunk
 */
async function encodeColumnChunk(pages, opts) {
    const pagesBuf = Buffer.concat(pages.map((d) => d.page));
    const num_values = pages.reduce((p, d) => p + d.num_values, 0);
    let offset = opts.baseOffset;
    /* prepare metadata header */
    const metadata = new parquet_types_1.default.ColumnMetaData();
    metadata.path_in_schema = opts.column.path;
    metadata.num_values = new node_int64_1.default(num_values);
    metadata.data_page_offset = new node_int64_1.default(opts.baseOffset);
    metadata.encodings = [];
    metadata.total_uncompressed_size = new node_int64_1.default(pagesBuf.length);
    metadata.total_compressed_size = new node_int64_1.default(pagesBuf.length);
    metadata.type = parquet_types_1.default.Type[opts.column.primitiveType];
    metadata.codec = await parquet_types_1.default.CompressionCodec[opts.column.compression];
    /* compile statistics ColumnIndex and OffsetIndex*/
    const columnIndex = new parquet_types_1.default.ColumnIndex();
    columnIndex.null_pages = [];
    columnIndex.max_values = [];
    columnIndex.min_values = [];
    // Default to unordered
    columnIndex.boundary_order = 0;
    const offsetIndex = new parquet_types_1.default.OffsetIndex();
    offsetIndex.page_locations = [];
    /* prepare statistics */
    const statistics = {};
    const distinct_values = new Set();
    statistics.null_count = new node_int64_1.default(0);
    statistics.distinct_count = new node_int64_1.default(0);
    /* loop through pages and update indices and statistics */
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (opts.column.statistics !== false) {
            if (page.statistics.max_value > statistics.max_value || i == 0) {
                statistics.max_value = page.statistics.max_value;
            }
            if (page.statistics.min_value < statistics.min_value || i == 0) {
                statistics.min_value = page.statistics.min_value;
            }
            statistics.null_count.setValue(statistics.null_count.valueOf() + (page.statistics.null_count?.valueOf() || 0));
            page.distinct_values.forEach((value) => distinct_values.add(value));
            // If the number of values and the count of nulls are the same, this is a null page
            columnIndex.null_pages.push(page.num_values === statistics.null_count.valueOf());
            columnIndex.max_values.push(encodeStatisticsValue(page.statistics.max_value, opts.column));
            columnIndex.min_values.push(encodeStatisticsValue(page.statistics.min_value, opts.column));
        }
        const pageLocation = new parquet_types_1.default.PageLocation();
        pageLocation.offset = new node_int64_1.default(offset);
        offset += page.page.length;
        pageLocation.compressed_page_size = page.page.length;
        pageLocation.first_row_index = new node_int64_1.default(page.first_row_index);
        offsetIndex.page_locations.push(pageLocation);
    }
    if (opts.pageIndex !== false) {
        metadata.offsetIndex = offsetIndex;
    }
    if (opts.column.statistics !== false) {
        statistics.distinct_count = new node_int64_1.default(distinct_values.size);
        metadata.statistics = encodeStatistics(statistics, opts.column);
        if (opts.pageIndex !== false) {
            metadata.columnIndex = columnIndex;
        }
    }
    /* list encodings */
    metadata.encodings.push(parquet_types_1.default.Encoding[PARQUET_RDLVL_ENCODING]);
    metadata.encodings.push(parquet_types_1.default.Encoding[opts.column.encoding]);
    /* concat metadata header and data pages */
    const metadataOffset = opts.baseOffset + pagesBuf.length;
    const body = Buffer.concat([pagesBuf, parquet_util.serializeThrift(metadata)]);
    return { body, metadata, metadataOffset };
}
/**
 * Encode a list of column values into a parquet row group
 */
async function encodeRowGroup(schema, data, opts) {
    const metadata = new parquet_types_1.default.RowGroup();
    metadata.num_rows = new node_int64_1.default(data.rowCount);
    metadata.columns = [];
    metadata.total_byte_size = new node_int64_1.default(0);
    let body = Buffer.alloc(0);
    for (const field of schema.fieldList) {
        if (field.isNested) {
            continue;
        }
        const cchunkData = await encodeColumnChunk(data.pages[field.path.join(',')], {
            column: field,
            baseOffset: opts.baseOffset.valueOf() + body.length,
            pageSize: opts.pageSize || 0,
            rowCount: data.rowCount || 0,
            useDataPageV2: opts.useDataPageV2 ?? true,
            pageIndex: opts.pageIndex ?? true,
        });
        const cchunk = new parquet_types_1.default.ColumnChunk();
        cchunk.file_offset = new node_int64_1.default(cchunkData.metadataOffset);
        cchunk.meta_data = cchunkData.metadata;
        metadata.columns.push(cchunk);
        metadata.total_byte_size = new node_int64_1.default(metadata.total_byte_size.valueOf() + cchunkData.body.length);
        body = Buffer.concat([body, cchunkData.body]);
    }
    return { body, metadata };
}
/**
 * Encode a parquet file metadata footer
 */
function encodeFooter(schema, rowCount, rowGroups, userMetadata) {
    const metadata = new parquet_types_1.default.FileMetaData();
    metadata.version = PARQUET_VERSION;
    metadata.created_by = '@dsnp/parquetjs';
    metadata.num_rows = rowCount;
    metadata.row_groups = rowGroups;
    metadata.schema = [];
    metadata.key_value_metadata = [];
    for (const k in userMetadata) {
        const kv = new parquet_types_1.default.KeyValue();
        kv.key = k;
        kv.value = userMetadata[k];
        metadata.key_value_metadata.push(kv);
    }
    {
        const schemaRoot = new parquet_types_1.default.SchemaElement();
        schemaRoot.name = 'root';
        schemaRoot.num_children = Object.keys(schema.fields).length;
        metadata.schema.push(schemaRoot);
    }
    for (const field of schema.fieldList) {
        const schemaElem = new parquet_types_1.default.SchemaElement();
        schemaElem.name = field.name;
        schemaElem.repetition_type = parquet_types_1.default.FieldRepetitionType[field.repetitionType];
        if (field.isNested) {
            schemaElem.num_children = field.fieldCount;
        }
        else {
            schemaElem.type = parquet_types_1.default.Type[field.primitiveType];
        }
        if (field.originalType) {
            schemaElem.converted_type = parquet_types_1.default.ConvertedType[field.originalType];
        }
        // Support Decimal
        switch (schemaElem.converted_type) {
            case parquet_types_1.ConvertedType.DECIMAL:
                schemaElem.precision = field.precision;
                schemaElem.scale = field.scale || 0;
                break;
        }
        schemaElem.type_length = field.typeLength;
        metadata.schema.push(schemaElem);
    }
    const metadataEncoded = parquet_util.serializeThrift(metadata);
    const footerEncoded = Buffer.alloc(metadataEncoded.length + 8);
    metadataEncoded.copy(footerEncoded);
    footerEncoded.writeUInt32LE(metadataEncoded.length, metadataEncoded.length);
    footerEncoded.write(PARQUET_MAGIC, metadataEncoded.length + 4);
    return footerEncoded;
}
