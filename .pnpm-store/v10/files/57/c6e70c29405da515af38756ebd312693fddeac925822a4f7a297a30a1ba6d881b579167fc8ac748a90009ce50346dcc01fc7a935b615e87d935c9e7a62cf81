
import {normalize_columns_array} from './normalize_columns_array.js';
import {CsvError} from './CsvError.js';
import {underscore} from '../utils/underscore.js';

const normalize_options = function(opts){
  const options = {};
  // Merge with user options
  for(const opt in opts){
    options[underscore(opt)] = opts[opt];
  }
  // Normalize option `encoding`
  // Note: defined first because other options depends on it
  // to convert chars/strings into buffers.
  if(options.encoding === undefined || options.encoding === true){
    options.encoding = 'utf8';
  }else if(options.encoding === null || options.encoding === false){
    options.encoding = null;
  }else if(typeof options.encoding !== 'string' && options.encoding !== null){
    throw new CsvError('CSV_INVALID_OPTION_ENCODING', [
      'Invalid option encoding:',
      'encoding must be a string or null to return a buffer,',
      `got ${JSON.stringify(options.encoding)}`
    ], options);
  }
  // Normalize option `bom`
  if(options.bom === undefined || options.bom === null || options.bom === false){
    options.bom = false;
  }else if(options.bom !== true){
    throw new CsvError('CSV_INVALID_OPTION_BOM', [
      'Invalid option bom:', 'bom must be true,',
      `got ${JSON.stringify(options.bom)}`
    ], options);
  }
  // Normalize option `cast`
  options.cast_function = null;
  if(options.cast === undefined || options.cast === null || options.cast === false || options.cast === ''){
    options.cast = undefined;
  }else if(typeof options.cast === 'function'){
    options.cast_function = options.cast;
    options.cast = true;
  }else if(options.cast !== true){
    throw new CsvError('CSV_INVALID_OPTION_CAST', [
      'Invalid option cast:', 'cast must be true or a function,',
      `got ${JSON.stringify(options.cast)}`
    ], options);
  }
  // Normalize option `cast_date`
  if(options.cast_date === undefined || options.cast_date === null || options.cast_date === false || options.cast_date === ''){
    options.cast_date = false;
  }else if(options.cast_date === true){
    options.cast_date = function(value){
      const date = Date.parse(value);
      return !isNaN(date) ? new Date(date) : value;
    };
  }else if (typeof options.cast_date !== 'function'){
    throw new CsvError('CSV_INVALID_OPTION_CAST_DATE', [
      'Invalid option cast_date:', 'cast_date must be true or a function,',
      `got ${JSON.stringify(options.cast_date)}`
    ], options);
  }
  // Normalize option `columns`
  options.cast_first_line_to_header = null;
  if(options.columns === true){
    // Fields in the first line are converted as-is to columns
    options.cast_first_line_to_header = undefined;
  }else if(typeof options.columns === 'function'){
    options.cast_first_line_to_header = options.columns;
    options.columns = true;
  }else if(Array.isArray(options.columns)){
    options.columns = normalize_columns_array(options.columns);
  }else if(options.columns === undefined || options.columns === null || options.columns === false){
    options.columns = false;
  }else{
    throw new CsvError('CSV_INVALID_OPTION_COLUMNS', [
      'Invalid option columns:',
      'expect an array, a function or true,',
      `got ${JSON.stringify(options.columns)}`
    ], options);
  }
  // Normalize option `group_columns_by_name`
  if(options.group_columns_by_name === undefined || options.group_columns_by_name === null || options.group_columns_by_name === false){
    options.group_columns_by_name = false;
  }else if(options.group_columns_by_name !== true){
    throw new CsvError('CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME', [
      'Invalid option group_columns_by_name:',
      'expect an boolean,',
      `got ${JSON.stringify(options.group_columns_by_name)}`
    ], options);
  }else if(options.columns === false){
    throw new CsvError('CSV_INVALID_OPTION_GROUP_COLUMNS_BY_NAME', [
      'Invalid option group_columns_by_name:',
      'the `columns` mode must be activated.'
    ], options);
  }
  // Normalize option `comment`
  if(options.comment === undefined || options.comment === null || options.comment === false || options.comment === ''){
    options.comment = null;
  }else{
    if(typeof options.comment === 'string'){
      options.comment = Buffer.from(options.comment, options.encoding);
    }
    if(!Buffer.isBuffer(options.comment)){
      throw new CsvError('CSV_INVALID_OPTION_COMMENT', [
        'Invalid option comment:',
        'comment must be a buffer or a string,',
        `got ${JSON.stringify(options.comment)}`
      ], options);
    }
  }
  // Normalize option `comment_no_infix`
  if(options.comment_no_infix === undefined || options.comment_no_infix === null || options.comment_no_infix === false){
    options.comment_no_infix = false;
  }else if(options.comment_no_infix !== true){
    throw new CsvError('CSV_INVALID_OPTION_COMMENT', [
      'Invalid option comment_no_infix:',
      'value must be a boolean,',
      `got ${JSON.stringify(options.comment_no_infix)}`
    ], options);
  }
  // Normalize option `delimiter`
  const delimiter_json = JSON.stringify(options.delimiter);
  if(!Array.isArray(options.delimiter)) options.delimiter = [options.delimiter];
  if(options.delimiter.length === 0){
    throw new CsvError('CSV_INVALID_OPTION_DELIMITER', [
      'Invalid option delimiter:',
      'delimiter must be a non empty string or buffer or array of string|buffer,',
      `got ${delimiter_json}`
    ], options);
  }
  options.delimiter = options.delimiter.map(function(delimiter){
    if(delimiter === undefined || delimiter === null || delimiter === false){
      return Buffer.from(',', options.encoding);
    }
    if(typeof delimiter === 'string'){
      delimiter = Buffer.from(delimiter, options.encoding);
    }
    if(!Buffer.isBuffer(delimiter) || delimiter.length === 0){
      throw new CsvError('CSV_INVALID_OPTION_DELIMITER', [
        'Invalid option delimiter:',
        'delimiter must be a non empty string or buffer or array of string|buffer,',
        `got ${delimiter_json}`
      ], options);
    }
    return delimiter;
  });
  // Normalize option `escape`
  if(options.escape === undefined || options.escape === true){
    options.escape = Buffer.from('"', options.encoding);
  }else if(typeof options.escape === 'string'){
    options.escape = Buffer.from(options.escape, options.encoding);
  }else if (options.escape === null || options.escape === false){
    options.escape = null;
  }
  if(options.escape !== null){
    if(!Buffer.isBuffer(options.escape)){
      throw new Error(`Invalid Option: escape must be a buffer, a string or a boolean, got ${JSON.stringify(options.escape)}`);
    }
  }
  // Normalize option `from`
  if(options.from === undefined || options.from === null){
    options.from = 1;
  }else{
    if(typeof options.from === 'string' && /\d+/.test(options.from)){
      options.from = parseInt(options.from);
    }
    if(Number.isInteger(options.from)){
      if(options.from < 0){
        throw new Error(`Invalid Option: from must be a positive integer, got ${JSON.stringify(opts.from)}`);
      }
    }else{
      throw new Error(`Invalid Option: from must be an integer, got ${JSON.stringify(options.from)}`);
    }
  }
  // Normalize option `from_line`
  if(options.from_line === undefined || options.from_line === null){
    options.from_line = 1;
  }else{
    if(typeof options.from_line === 'string' && /\d+/.test(options.from_line)){
      options.from_line = parseInt(options.from_line);
    }
    if(Number.isInteger(options.from_line)){
      if(options.from_line <= 0){
        throw new Error(`Invalid Option: from_line must be a positive integer greater than 0, got ${JSON.stringify(opts.from_line)}`);
      }
    }else{
      throw new Error(`Invalid Option: from_line must be an integer, got ${JSON.stringify(opts.from_line)}`);
    }
  }
  // Normalize options `ignore_last_delimiters`
  if(options.ignore_last_delimiters === undefined || options.ignore_last_delimiters === null){
    options.ignore_last_delimiters = false;
  }else if(typeof options.ignore_last_delimiters === 'number'){
    options.ignore_last_delimiters = Math.floor(options.ignore_last_delimiters);
    if(options.ignore_last_delimiters === 0){
      options.ignore_last_delimiters = false;
    }
  }else if(typeof options.ignore_last_delimiters !== 'boolean'){
    throw new CsvError('CSV_INVALID_OPTION_IGNORE_LAST_DELIMITERS', [
      'Invalid option `ignore_last_delimiters`:',
      'the value must be a boolean value or an integer,',
      `got ${JSON.stringify(options.ignore_last_delimiters)}`
    ], options);
  }
  if(options.ignore_last_delimiters === true && options.columns === false){
    throw new CsvError('CSV_IGNORE_LAST_DELIMITERS_REQUIRES_COLUMNS', [
      'The option `ignore_last_delimiters`',
      'requires the activation of the `columns` option'
    ], options);
  }
  // Normalize option `info`
  if(options.info === undefined || options.info === null || options.info === false){
    options.info = false;
  }else if(options.info !== true){
    throw new Error(`Invalid Option: info must be true, got ${JSON.stringify(options.info)}`);
  }
  // Normalize option `max_record_size`
  if(options.max_record_size === undefined || options.max_record_size === null || options.max_record_size === false){
    options.max_record_size = 0;
  }else if(Number.isInteger(options.max_record_size) && options.max_record_size >= 0){
    // Great, nothing to do
  }else if(typeof options.max_record_size === 'string' && /\d+/.test(options.max_record_size)){
    options.max_record_size = parseInt(options.max_record_size);
  }else{
    throw new Error(`Invalid Option: max_record_size must be a positive integer, got ${JSON.stringify(options.max_record_size)}`);
  }
  // Normalize option `objname`
  if(options.objname === undefined || options.objname === null || options.objname === false){
    options.objname = undefined;
  }else if(Buffer.isBuffer(options.objname)){
    if(options.objname.length === 0){
      throw new Error(`Invalid Option: objname must be a non empty buffer`);
    }
    if(options.encoding === null){
      // Don't call `toString`, leave objname as a buffer
    }else{
      options.objname = options.objname.toString(options.encoding);
    }
  }else if(typeof options.objname === 'string'){
    if(options.objname.length === 0){
      throw new Error(`Invalid Option: objname must be a non empty string`);
    }
    // Great, nothing to do
  }else if(typeof options.objname === 'number'){
    // if(options.objname.length === 0){
    //   throw new Error(`Invalid Option: objname must be a non empty string`);
    // }
    // Great, nothing to do
  }else{
    throw new Error(`Invalid Option: objname must be a string or a buffer, got ${options.objname}`);
  }
  if(options.objname !== undefined){
    if(typeof options.objname === 'number'){
      if(options.columns !== false){
        throw Error('Invalid Option: objname index cannot be combined with columns or be defined as a field');
      }
    }else{ // A string or a buffer
      if(options.columns === false){
        throw Error('Invalid Option: objname field must be combined with columns or be defined as an index');
      }
    }
  }
  // Normalize option `on_record`
  if(options.on_record === undefined || options.on_record === null){
    options.on_record = undefined;
  }else if(typeof options.on_record !== 'function'){
    throw new CsvError('CSV_INVALID_OPTION_ON_RECORD', [
      'Invalid option `on_record`:',
      'expect a function,',
      `got ${JSON.stringify(options.on_record)}`
    ], options);
  }
  // Normalize option `quote`
  if(options.quote === null || options.quote === false || options.quote === ''){
    options.quote = null;
  }else{
    if(options.quote === undefined || options.quote === true){
      options.quote = Buffer.from('"', options.encoding);
    }else if(typeof options.quote === 'string'){
      options.quote = Buffer.from(options.quote, options.encoding);
    }
    if(!Buffer.isBuffer(options.quote)){
      throw new Error(`Invalid Option: quote must be a buffer or a string, got ${JSON.stringify(options.quote)}`);
    }
  }
  // Normalize option `raw`
  if(options.raw === undefined || options.raw === null || options.raw === false){
    options.raw = false;
  }else if(options.raw !== true){
    throw new Error(`Invalid Option: raw must be true, got ${JSON.stringify(options.raw)}`);
  }
  // Normalize option `record_delimiter`
  if(options.record_delimiter === undefined){
    options.record_delimiter = [];
  }else if(typeof options.record_delimiter === 'string' || Buffer.isBuffer(options.record_delimiter)){
    if(options.record_delimiter.length === 0){
      throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
        'Invalid option `record_delimiter`:',
        'value must be a non empty string or buffer,',
        `got ${JSON.stringify(options.record_delimiter)}`
      ], options);
    }
    options.record_delimiter = [options.record_delimiter];
  }else if(!Array.isArray(options.record_delimiter)){
    throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
      'Invalid option `record_delimiter`:',
      'value must be a string, a buffer or array of string|buffer,',
      `got ${JSON.stringify(options.record_delimiter)}`
    ], options);
  }
  options.record_delimiter = options.record_delimiter.map(function(rd, i){
    if(typeof rd !== 'string' && ! Buffer.isBuffer(rd)){
      throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
        'Invalid option `record_delimiter`:',
        'value must be a string, a buffer or array of string|buffer',
        `at index ${i},`,
        `got ${JSON.stringify(rd)}`
      ], options);
    }else if(rd.length === 0){
      throw new CsvError('CSV_INVALID_OPTION_RECORD_DELIMITER', [
        'Invalid option `record_delimiter`:',
        'value must be a non empty string or buffer',
        `at index ${i},`,
        `got ${JSON.stringify(rd)}`
      ], options);
    }
    if(typeof rd === 'string'){
      rd = Buffer.from(rd, options.encoding);
    }
    return rd;
  });
  // Normalize option `relax_column_count`
  if(typeof options.relax_column_count === 'boolean'){
    // Great, nothing to do
  }else if(options.relax_column_count === undefined || options.relax_column_count === null){
    options.relax_column_count = false;
  }else{
    throw new Error(`Invalid Option: relax_column_count must be a boolean, got ${JSON.stringify(options.relax_column_count)}`);
  }
  if(typeof options.relax_column_count_less === 'boolean'){
    // Great, nothing to do
  }else if(options.relax_column_count_less === undefined || options.relax_column_count_less === null){
    options.relax_column_count_less = false;
  }else{
    throw new Error(`Invalid Option: relax_column_count_less must be a boolean, got ${JSON.stringify(options.relax_column_count_less)}`);
  }
  if(typeof options.relax_column_count_more === 'boolean'){
    // Great, nothing to do
  }else if(options.relax_column_count_more === undefined || options.relax_column_count_more === null){
    options.relax_column_count_more = false;
  }else{
    throw new Error(`Invalid Option: relax_column_count_more must be a boolean, got ${JSON.stringify(options.relax_column_count_more)}`);
  }
  // Normalize option `relax_quotes`
  if(typeof options.relax_quotes === 'boolean'){
    // Great, nothing to do
  }else if(options.relax_quotes === undefined || options.relax_quotes === null){
    options.relax_quotes = false;
  }else{
    throw new Error(`Invalid Option: relax_quotes must be a boolean, got ${JSON.stringify(options.relax_quotes)}`);
  }
  // Normalize option `skip_empty_lines`
  if(typeof options.skip_empty_lines === 'boolean'){
    // Great, nothing to do
  }else if(options.skip_empty_lines === undefined || options.skip_empty_lines === null){
    options.skip_empty_lines = false;
  }else{
    throw new Error(`Invalid Option: skip_empty_lines must be a boolean, got ${JSON.stringify(options.skip_empty_lines)}`);
  }
  // Normalize option `skip_records_with_empty_values`
  if(typeof options.skip_records_with_empty_values === 'boolean'){
    // Great, nothing to do
  }else if(options.skip_records_with_empty_values === undefined || options.skip_records_with_empty_values === null){
    options.skip_records_with_empty_values = false;
  }else{
    throw new Error(`Invalid Option: skip_records_with_empty_values must be a boolean, got ${JSON.stringify(options.skip_records_with_empty_values)}`);
  }
  // Normalize option `skip_records_with_error`
  if(typeof options.skip_records_with_error === 'boolean'){
    // Great, nothing to do
  }else if(options.skip_records_with_error === undefined || options.skip_records_with_error === null){
    options.skip_records_with_error = false;
  }else{
    throw new Error(`Invalid Option: skip_records_with_error must be a boolean, got ${JSON.stringify(options.skip_records_with_error)}`);
  }
  // Normalize option `rtrim`
  if(options.rtrim === undefined || options.rtrim === null || options.rtrim === false){
    options.rtrim = false;
  }else if(options.rtrim !== true){
    throw new Error(`Invalid Option: rtrim must be a boolean, got ${JSON.stringify(options.rtrim)}`);
  }
  // Normalize option `ltrim`
  if(options.ltrim === undefined || options.ltrim === null || options.ltrim === false){
    options.ltrim = false;
  }else if(options.ltrim !== true){
    throw new Error(`Invalid Option: ltrim must be a boolean, got ${JSON.stringify(options.ltrim)}`);
  }
  // Normalize option `trim`
  if(options.trim === undefined || options.trim === null || options.trim === false){
    options.trim = false;
  }else if(options.trim !== true){
    throw new Error(`Invalid Option: trim must be a boolean, got ${JSON.stringify(options.trim)}`);
  }
  // Normalize options `trim`, `ltrim` and `rtrim`
  if(options.trim === true && opts.ltrim !== false){
    options.ltrim = true;
  }else if(options.ltrim !== true){
    options.ltrim = false;
  }
  if(options.trim === true && opts.rtrim !== false){
    options.rtrim = true;
  }else if(options.rtrim !== true){
    options.rtrim = false;
  }
  // Normalize option `to`
  if(options.to === undefined || options.to === null){
    options.to = -1;
  }else{
    if(typeof options.to === 'string' && /\d+/.test(options.to)){
      options.to = parseInt(options.to);
    }
    if(Number.isInteger(options.to)){
      if(options.to <= 0){
        throw new Error(`Invalid Option: to must be a positive integer greater than 0, got ${JSON.stringify(opts.to)}`);
      }
    }else{
      throw new Error(`Invalid Option: to must be an integer, got ${JSON.stringify(opts.to)}`);
    }
  }
  // Normalize option `to_line`
  if(options.to_line === undefined || options.to_line === null){
    options.to_line = -1;
  }else{
    if(typeof options.to_line === 'string' && /\d+/.test(options.to_line)){
      options.to_line = parseInt(options.to_line);
    }
    if(Number.isInteger(options.to_line)){
      if(options.to_line <= 0){
        throw new Error(`Invalid Option: to_line must be a positive integer greater than 0, got ${JSON.stringify(opts.to_line)}`);
      }
    }else{
      throw new Error(`Invalid Option: to_line must be an integer, got ${JSON.stringify(opts.to_line)}`);
    }
  }
  return options;
};

export {normalize_options};
