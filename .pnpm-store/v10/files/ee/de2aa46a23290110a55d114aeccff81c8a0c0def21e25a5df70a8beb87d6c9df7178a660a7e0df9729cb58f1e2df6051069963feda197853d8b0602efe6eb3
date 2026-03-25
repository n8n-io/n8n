
import {normalize_columns_array} from './normalize_columns_array.js';
import {init_state} from './init_state.js';
import {normalize_options} from './normalize_options.js';
import {CsvError} from './CsvError.js';

const isRecordEmpty = function(record){
  return record.every((field) => field == null || field.toString && field.toString().trim() === '');
};

const cr = 13; // `\r`, carriage return, 0x0D in hexadécimal, 13 in decimal
const nl = 10; // `\n`, newline, 0x0A in hexadecimal, 10 in decimal

const boms = {
  // Note, the following are equals:
  // Buffer.from("\ufeff")
  // Buffer.from([239, 187, 191])
  // Buffer.from('EFBBBF', 'hex')
  'utf8': Buffer.from([239, 187, 191]),
  // Note, the following are equals:
  // Buffer.from "\ufeff", 'utf16le
  // Buffer.from([255, 254])
  'utf16le': Buffer.from([255, 254])
};

const transform = function(original_options = {}) {
  const info = {
    bytes: 0,
    comment_lines: 0,
    empty_lines: 0,
    invalid_field_length: 0,
    lines: 1,
    records: 0
  };
  const options = normalize_options(original_options);
  return {
    info: info,
    original_options: original_options,
    options: options,
    state: init_state(options),
    __needMoreData: function(i, bufLen, end){
      if(end) return false;
      const {encoding, escape, quote} = this.options;
      const {quoting, needMoreDataSize, recordDelimiterMaxLength} = this.state;
      const numOfCharLeft = bufLen - i - 1;
      const requiredLength = Math.max(
        needMoreDataSize,
        // Skip if the remaining buffer smaller than record delimiter
        // If "record_delimiter" is yet to be discovered:
        // 1. It is equals to `[]` and "recordDelimiterMaxLength" equals `0`
        // 2. We set the length to windows line ending in the current encoding
        // Note, that encoding is known from user or bom discovery at that point
        // recordDelimiterMaxLength,
        recordDelimiterMaxLength === 0 ? Buffer.from('\r\n', encoding).length : recordDelimiterMaxLength,
        // Skip if remaining buffer can be an escaped quote
        quoting ? ((escape === null ? 0 : escape.length) + quote.length) : 0,
        // Skip if remaining buffer can be record delimiter following the closing quote
        quoting ? (quote.length + recordDelimiterMaxLength) : 0,
      );
      return numOfCharLeft < requiredLength;
    },
    // Central parser implementation
    parse: function(nextBuf, end, push, close){
      const {bom, comment_no_infix, encoding, from_line, ltrim, max_record_size,raw, relax_quotes, rtrim, skip_empty_lines, to, to_line} = this.options;
      let {comment, escape, quote, record_delimiter} = this.options;
      const {bomSkipped, previousBuf, rawBuffer, escapeIsQuote} = this.state;
      let buf;
      if(previousBuf === undefined){
        if(nextBuf === undefined){
          // Handle empty string
          close();
          return;
        }else{
          buf = nextBuf;
        }
      }else if(previousBuf !== undefined && nextBuf === undefined){
        buf = previousBuf;
      }else{
        buf = Buffer.concat([previousBuf, nextBuf]);
      }
      // Handle UTF BOM
      if(bomSkipped === false){
        if(bom === false){
          this.state.bomSkipped = true;
        }else if(buf.length < 3){
          // No enough data
          if(end === false){
            // Wait for more data
            this.state.previousBuf = buf;
            return;
          }
        }else{
          for(const encoding in boms){
            if(boms[encoding].compare(buf, 0, boms[encoding].length) === 0){
              // Skip BOM
              const bomLength = boms[encoding].length;
              this.state.bufBytesStart += bomLength;
              buf = buf.slice(bomLength);
              // Renormalize original options with the new encoding
              this.options = normalize_options({...this.original_options, encoding: encoding});
              // Options will re-evaluate the Buffer with the new encoding
              ({comment, escape, quote } = this.options);
              break;
            }
          }
          this.state.bomSkipped = true;
        }
      }
      const bufLen = buf.length;
      let pos;
      for(pos = 0; pos < bufLen; pos++){
        // Ensure we get enough space to look ahead
        // There should be a way to move this out of the loop
        if(this.__needMoreData(pos, bufLen, end)){
          break;
        }
        if(this.state.wasRowDelimiter === true){
          this.info.lines++;
          this.state.wasRowDelimiter = false;
        }
        if(to_line !== -1 && this.info.lines > to_line){
          this.state.stop = true;
          close();
          return;
        }
        // Auto discovery of record_delimiter, unix, mac and windows supported
        if(this.state.quoting === false && record_delimiter.length === 0){
          const record_delimiterCount = this.__autoDiscoverRecordDelimiter(buf, pos);
          if(record_delimiterCount){
            record_delimiter = this.options.record_delimiter;
          }
        }
        const chr = buf[pos];
        if(raw === true){
          rawBuffer.append(chr);
        }
        if((chr === cr || chr === nl) && this.state.wasRowDelimiter === false){
          this.state.wasRowDelimiter = true;
        }
        // Previous char was a valid escape char
        // treat the current char as a regular char
        if(this.state.escaping === true){
          this.state.escaping = false;
        }else{
          // Escape is only active inside quoted fields
          // We are quoting, the char is an escape chr and there is a chr to escape
          // if(escape !== null && this.state.quoting === true && chr === escape && pos + 1 < bufLen){
          if(escape !== null && this.state.quoting === true && this.__isEscape(buf, pos, chr) && pos + escape.length < bufLen){
            if(escapeIsQuote){
              if(this.__isQuote(buf, pos+escape.length)){
                this.state.escaping = true;
                pos += escape.length - 1;
                continue;
              }
            }else{
              this.state.escaping = true;
              pos += escape.length - 1;
              continue;
            }
          }
          // Not currently escaping and chr is a quote
          // TODO: need to compare bytes instead of single char
          if(this.state.commenting === false && this.__isQuote(buf, pos)){
            if(this.state.quoting === true){
              const nextChr = buf[pos+quote.length];
              const isNextChrTrimable = rtrim && this.__isCharTrimable(buf, pos+quote.length);
              const isNextChrComment = comment !== null && this.__compareBytes(comment, buf, pos+quote.length, nextChr);
              const isNextChrDelimiter = this.__isDelimiter(buf, pos+quote.length, nextChr);
              const isNextChrRecordDelimiter = record_delimiter.length === 0 ? this.__autoDiscoverRecordDelimiter(buf, pos+quote.length) : this.__isRecordDelimiter(nextChr, buf, pos+quote.length);
              // Escape a quote
              // Treat next char as a regular character
              if(escape !== null && this.__isEscape(buf, pos, chr) && this.__isQuote(buf, pos + escape.length)){
                pos += escape.length - 1;
              }else if(!nextChr || isNextChrDelimiter || isNextChrRecordDelimiter || isNextChrComment || isNextChrTrimable){
                this.state.quoting = false;
                this.state.wasQuoting = true;
                pos += quote.length - 1;
                continue;
              }else if(relax_quotes === false){
                const err = this.__error(
                  new CsvError('CSV_INVALID_CLOSING_QUOTE', [
                    'Invalid Closing Quote:',
                    `got "${String.fromCharCode(nextChr)}"`,
                    `at line ${this.info.lines}`,
                    'instead of delimiter, record delimiter, trimable character',
                    '(if activated) or comment',
                  ], this.options, this.__infoField())
                );
                if(err !== undefined) return err;
              }else{
                this.state.quoting = false;
                this.state.wasQuoting = true;
                this.state.field.prepend(quote);
                pos += quote.length - 1;
              }
            }else{
              if(this.state.field.length !== 0){
                // In relax_quotes mode, treat opening quote preceded by chrs as regular
                if(relax_quotes === false){
                  const info = this.__infoField();
                  const bom = Object.keys(boms).map(b => boms[b].equals(this.state.field.toString()) ? b : false).filter(Boolean)[0];
                  const err = this.__error(
                    new CsvError('INVALID_OPENING_QUOTE', [
                      'Invalid Opening Quote:',
                      `a quote is found on field ${JSON.stringify(info.column)} at line ${info.lines}, value is ${JSON.stringify(this.state.field.toString(encoding))}`,
                      bom ? `(${bom} bom)` : undefined
                    ], this.options, info, {
                      field: this.state.field,
                    })
                  );
                  if(err !== undefined) return err;
                }
              }else{
                this.state.quoting = true;
                pos += quote.length - 1;
                continue;
              }
            }
          }
          if(this.state.quoting === false){
            const recordDelimiterLength = this.__isRecordDelimiter(chr, buf, pos);
            if(recordDelimiterLength !== 0){
              // Do not emit comments which take a full line
              const skipCommentLine = this.state.commenting && (this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0);
              if(skipCommentLine){
                this.info.comment_lines++;
                // Skip full comment line
              }else{
                // Activate records emition if above from_line
                if(this.state.enabled === false && this.info.lines + (this.state.wasRowDelimiter === true ? 1: 0) >= from_line){
                  this.state.enabled = true;
                  this.__resetField();
                  this.__resetRecord();
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                // Skip if line is empty and skip_empty_lines activated
                if(skip_empty_lines === true && this.state.wasQuoting === false && this.state.record.length === 0 && this.state.field.length === 0){
                  this.info.empty_lines++;
                  pos += recordDelimiterLength - 1;
                  continue;
                }
                this.info.bytes = this.state.bufBytesStart + pos;
                const errField = this.__onField();
                if(errField !== undefined) return errField;
                this.info.bytes = this.state.bufBytesStart + pos + recordDelimiterLength;
                const errRecord = this.__onRecord(push);
                if(errRecord !== undefined) return errRecord;
                if(to !== -1 && this.info.records >= to){
                  this.state.stop = true;
                  close();
                  return;
                }
              }
              this.state.commenting = false;
              pos += recordDelimiterLength - 1;
              continue;
            }
            if(this.state.commenting){
              continue;
            }
            const commentCount = comment === null ? 0 : this.__compareBytes(comment, buf, pos, chr);
            if(commentCount !== 0 && (comment_no_infix === false || this.state.field.length === 0)){
              this.state.commenting = true;
              continue;
            }
            const delimiterLength = this.__isDelimiter(buf, pos, chr);
            if(delimiterLength !== 0){
              this.info.bytes = this.state.bufBytesStart + pos;
              const errField = this.__onField();
              if(errField !== undefined) return errField;
              pos += delimiterLength - 1;
              continue;
            }
          }
        }
        if(this.state.commenting === false){
          if(max_record_size !== 0 && this.state.record_length + this.state.field.length > max_record_size){
            return this.__error(
              new CsvError('CSV_MAX_RECORD_SIZE', [
                'Max Record Size:',
                'record exceed the maximum number of tolerated bytes',
                `of ${max_record_size}`,
                `at line ${this.info.lines}`,
              ], this.options, this.__infoField())
            );
          }
        }
        const lappend = ltrim === false || this.state.quoting === true || this.state.field.length !== 0 || !this.__isCharTrimable(buf, pos);
        // rtrim in non quoting is handle in __onField
        const rappend = rtrim === false || this.state.wasQuoting === false;
        if(lappend === true && rappend === true){
          this.state.field.append(chr);
        }else if(rtrim === true && !this.__isCharTrimable(buf, pos)){
          return this.__error(
            new CsvError('CSV_NON_TRIMABLE_CHAR_AFTER_CLOSING_QUOTE', [
              'Invalid Closing Quote:',
              'found non trimable byte after quote',
              `at line ${this.info.lines}`,
            ], this.options, this.__infoField())
          );
        }else{
          if(lappend === false){
            pos += this.__isCharTrimable(buf, pos) - 1;
          }
          continue;
        }
      }
      if(end === true){
        // Ensure we are not ending in a quoting state
        if(this.state.quoting === true){
          const err = this.__error(
            new CsvError('CSV_QUOTE_NOT_CLOSED', [
              'Quote Not Closed:',
              `the parsing is finished with an opening quote at line ${this.info.lines}`,
            ], this.options, this.__infoField())
          );
          if(err !== undefined) return err;
        }else{
          // Skip last line if it has no characters
          if(this.state.wasQuoting === true || this.state.record.length !== 0 || this.state.field.length !== 0){
            this.info.bytes = this.state.bufBytesStart + pos;
            const errField = this.__onField();
            if(errField !== undefined) return errField;
            const errRecord = this.__onRecord(push);
            if(errRecord !== undefined) return errRecord;
          }else if(this.state.wasRowDelimiter === true){
            this.info.empty_lines++;
          }else if(this.state.commenting === true){
            this.info.comment_lines++;
          }
        }
      }else{
        this.state.bufBytesStart += pos;
        this.state.previousBuf = buf.slice(pos);
      }
      if(this.state.wasRowDelimiter === true){
        this.info.lines++;
        this.state.wasRowDelimiter = false;
      }
    },
    __onRecord: function(push){
      const {columns, group_columns_by_name, encoding, info, from, relax_column_count, relax_column_count_less, relax_column_count_more, raw, skip_records_with_empty_values} = this.options;
      const {enabled, record} = this.state;
      if(enabled === false){
        return this.__resetRecord();
      }
      // Convert the first line into column names
      const recordLength = record.length;
      if(columns === true){
        if(skip_records_with_empty_values === true && isRecordEmpty(record)){
          this.__resetRecord();
          return;
        }
        return this.__firstLineToColumns(record);
      }
      if(columns === false && this.info.records === 0){
        this.state.expectedRecordLength = recordLength;
      }
      if(recordLength !== this.state.expectedRecordLength){
        const err = columns === false ?
          new CsvError('CSV_RECORD_INCONSISTENT_FIELDS_LENGTH', [
            'Invalid Record Length:',
            `expect ${this.state.expectedRecordLength},`,
            `got ${recordLength} on line ${this.info.lines}`,
          ], this.options, this.__infoField(), {
            record: record,
          })
          :
          new CsvError('CSV_RECORD_INCONSISTENT_COLUMNS', [
            'Invalid Record Length:',
            `columns length is ${columns.length},`, // rename columns
            `got ${recordLength} on line ${this.info.lines}`,
          ], this.options, this.__infoField(), {
            record: record,
          });
        if(relax_column_count === true ||
          (relax_column_count_less === true && recordLength < this.state.expectedRecordLength) ||
          (relax_column_count_more === true && recordLength > this.state.expectedRecordLength)){
          this.info.invalid_field_length++;
          this.state.error = err;
        // Error is undefined with skip_records_with_error
        }else{
          const finalErr = this.__error(err);
          if(finalErr) return finalErr;
        }
      }
      if(skip_records_with_empty_values === true && isRecordEmpty(record)){
        this.__resetRecord();
        return;
      }
      if(this.state.recordHasError === true){
        this.__resetRecord();
        this.state.recordHasError = false;
        return;
      }
      this.info.records++;
      if(from === 1 || this.info.records >= from){
        const {objname} = this.options;
        // With columns, records are object
        if(columns !== false){
          const obj = {};
          // Transform record array to an object
          for(let i = 0, l = record.length; i < l; i++){
            if(columns[i] === undefined || columns[i].disabled) continue;
            // Turn duplicate columns into an array
            if (group_columns_by_name === true && obj[columns[i].name] !== undefined) {
              if (Array.isArray(obj[columns[i].name])) {
                obj[columns[i].name] = obj[columns[i].name].concat(record[i]);
              } else {
                obj[columns[i].name] = [obj[columns[i].name], record[i]];
              }
            } else {
              obj[columns[i].name] = record[i];
            }
          }
          // Without objname (default)
          if(raw === true || info === true){
            const extRecord = Object.assign(
              {record: obj},
              (raw === true ? {raw: this.state.rawBuffer.toString(encoding)}: {}),
              (info === true ? {info: this.__infoRecord()}: {})
            );
            const err = this.__push(
              objname === undefined ? extRecord : [obj[objname], extRecord]
              , push);
            if(err){
              return err;
            }
          }else{
            const err = this.__push(
              objname === undefined ? obj : [obj[objname], obj]
              , push);
            if(err){
              return err;
            }
          }
        // Without columns, records are array
        }else{
          if(raw === true || info === true){
            const extRecord = Object.assign(
              {record: record},
              raw === true ? {raw: this.state.rawBuffer.toString(encoding)}: {},
              info === true ? {info: this.__infoRecord()}: {}
            );
            const err = this.__push(
              objname === undefined ? extRecord : [record[objname], extRecord]
              , push);
            if(err){
              return err;
            }
          }else{
            const err = this.__push(
              objname === undefined ? record : [record[objname], record]
              , push);
            if(err){
              return err;
            }
          }
        }
      }
      this.__resetRecord();
    },
    __firstLineToColumns: function(record){
      const {firstLineToHeaders} = this.state;
      try{
        const headers = firstLineToHeaders === undefined ? record : firstLineToHeaders.call(null, record);
        if(!Array.isArray(headers)){
          return this.__error(
            new CsvError('CSV_INVALID_COLUMN_MAPPING', [
              'Invalid Column Mapping:',
              'expect an array from column function,',
              `got ${JSON.stringify(headers)}`
            ], this.options, this.__infoField(), {
              headers: headers,
            })
          );
        }
        const normalizedHeaders = normalize_columns_array(headers);
        this.state.expectedRecordLength = normalizedHeaders.length;
        this.options.columns = normalizedHeaders;
        this.__resetRecord();
        return;
      }catch(err){
        return err;
      }
    },
    __resetRecord: function(){
      if(this.options.raw === true){
        this.state.rawBuffer.reset();
      }
      this.state.error = undefined;
      this.state.record = [];
      this.state.record_length = 0;
    },
    __onField: function(){
      const {cast, encoding, rtrim, max_record_size} = this.options;
      const {enabled, wasQuoting} = this.state;
      // Short circuit for the from_line options
      if(enabled === false){
        return this.__resetField();
      }
      let field = this.state.field.toString(encoding);
      if(rtrim === true && wasQuoting === false){
        field = field.trimRight();
      }
      if(cast === true){
        const [err, f] = this.__cast(field);
        if(err !== undefined) return err;
        field = f;
      }
      this.state.record.push(field);
      // Increment record length if record size must not exceed a limit
      if(max_record_size !== 0 && typeof field === 'string'){
        this.state.record_length += field.length;
      }
      this.__resetField();
    },
    __resetField: function(){
      this.state.field.reset();
      this.state.wasQuoting = false;
    },
    __push: function(record, push){
      const {on_record} = this.options;
      if(on_record !== undefined){
        const info = this.__infoRecord();
        try{
          record = on_record.call(null, record, info);
        }catch(err){
          return err;
        }
        if(record === undefined || record === null){ return; }
      }
      push(record);
    },
    // Return a tuple with the error and the casted value
    __cast: function(field){
      const {columns, relax_column_count} = this.options;
      const isColumns = Array.isArray(columns);
      // Dont loose time calling cast
      // because the final record is an object
      // and this field can't be associated to a key present in columns
      if(isColumns === true && relax_column_count && this.options.columns.length <= this.state.record.length){
        return [undefined, undefined];
      }
      if(this.state.castField !== null){
        try{
          const info = this.__infoField();
          return [undefined, this.state.castField.call(null, field, info)];
        }catch(err){
          return [err];
        }
      }
      if(this.__isFloat(field)){
        return [undefined, parseFloat(field)];
      }else if(this.options.cast_date !== false){
        const info = this.__infoField();
        return [undefined, this.options.cast_date.call(null, field, info)];
      }
      return [undefined, field];
    },
    // Helper to test if a character is a space or a line delimiter
    __isCharTrimable: function(buf, pos){
      const isTrim = (buf, pos) => {
        const {timchars} = this.state;
        loop1: for(let i = 0; i < timchars.length; i++){
          const timchar = timchars[i];
          for(let j = 0; j < timchar.length; j++){
            if(timchar[j] !== buf[pos+j]) continue loop1;
          }
          return timchar.length;
        }
        return 0;
      };
      return isTrim(buf, pos);
    },
    // Keep it in case we implement the `cast_int` option
    // __isInt(value){
    //   // return Number.isInteger(parseInt(value))
    //   // return !isNaN( parseInt( obj ) );
    //   return /^(\-|\+)?[1-9][0-9]*$/.test(value)
    // }
    __isFloat: function(value){
      return (value - parseFloat(value) + 1) >= 0; // Borrowed from jquery
    },
    __compareBytes: function(sourceBuf, targetBuf, targetPos, firstByte){
      if(sourceBuf[0] !== firstByte) return 0;
      const sourceLength = sourceBuf.length;
      for(let i = 1; i < sourceLength; i++){
        if(sourceBuf[i] !== targetBuf[targetPos+i]) return 0;
      }
      return sourceLength;
    },
    __isDelimiter: function(buf, pos, chr){
      const {delimiter, ignore_last_delimiters} = this.options;
      if(ignore_last_delimiters === true && this.state.record.length === this.options.columns.length - 1){
        return 0;
      }else if(ignore_last_delimiters !== false && typeof ignore_last_delimiters === 'number' && this.state.record.length === ignore_last_delimiters - 1){
        return 0;
      }
      loop1: for(let i = 0; i < delimiter.length; i++){
        const del = delimiter[i];
        if(del[0] === chr){
          for(let j = 1; j < del.length; j++){
            if(del[j] !== buf[pos+j]) continue loop1;
          }
          return del.length;
        }
      }
      return 0;
    },
    __isRecordDelimiter: function(chr, buf, pos){
      const {record_delimiter} = this.options;
      const recordDelimiterLength = record_delimiter.length;
      loop1: for(let i = 0; i < recordDelimiterLength; i++){
        const rd = record_delimiter[i];
        const rdLength = rd.length;
        if(rd[0] !== chr){
          continue;
        }
        for(let j = 1; j < rdLength; j++){
          if(rd[j] !== buf[pos+j]){
            continue loop1;
          }
        }
        return rd.length;
      }
      return 0;
    },
    __isEscape: function(buf, pos, chr){
      const {escape} = this.options;
      if(escape === null) return false;
      const l = escape.length;
      if(escape[0] === chr){
        for(let i = 0; i < l; i++){
          if(escape[i] !== buf[pos+i]){
            return false;
          }
        }
        return true;
      }
      return false;
    },
    __isQuote: function(buf, pos){
      const {quote} = this.options;
      if(quote === null) return false;
      const l = quote.length;
      for(let i = 0; i < l; i++){
        if(quote[i] !== buf[pos+i]){
          return false;
        }
      }
      return true;
    },
    __autoDiscoverRecordDelimiter: function(buf, pos){
      const { encoding } = this.options;
      // Note, we don't need to cache this information in state,
      // It is only called on the first line until we find out a suitable
      // record delimiter.
      const rds = [
        // Important, the windows line ending must be before mac os 9
        Buffer.from('\r\n', encoding),
        Buffer.from('\n', encoding),
        Buffer.from('\r', encoding),
      ];
      loop: for(let i = 0; i < rds.length; i++){
        const l = rds[i].length;
        for(let j = 0; j < l; j++){
          if(rds[i][j] !== buf[pos + j]){
            continue loop;
          }
        }
        this.options.record_delimiter.push(rds[i]);
        this.state.recordDelimiterMaxLength = rds[i].length;
        return rds[i].length;
      }
      return 0;
    },
    __error: function(msg){
      const {encoding, raw, skip_records_with_error} = this.options;
      const err = typeof msg === 'string' ? new Error(msg) : msg;
      if(skip_records_with_error){
        this.state.recordHasError = true;
        if(this.options.on_skip !== undefined){
          this.options.on_skip(err, raw ? this.state.rawBuffer.toString(encoding) : undefined);
        }
        // this.emit('skip', err, raw ? this.state.rawBuffer.toString(encoding) : undefined);
        return undefined;
      }else{
        return err;
      }
    },
    __infoDataSet: function(){
      return {
        ...this.info,
        columns: this.options.columns
      };
    },
    __infoRecord: function(){
      const {columns, raw, encoding} = this.options;
      return {
        ...this.__infoDataSet(),
        error: this.state.error,
        header: columns === true,
        index: this.state.record.length,
        raw: raw ? this.state.rawBuffer.toString(encoding) : undefined
      };
    },
    __infoField: function(){
      const {columns} = this.options;
      const isColumns = Array.isArray(columns);
      return {
        ...this.__infoRecord(),
        column: isColumns === true ?
          (columns.length > this.state.record.length ?
            columns[this.state.record.length].name :
            null
          ) :
          this.state.record.length,
        quoting: this.state.wasQuoting,
      };
    }
  };
};


export {transform, CsvError};
