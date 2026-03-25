
/*
CSV Parse

Please look at the [project documentation](https://csv.js.org/parse/) for
additional information.
*/

import { Transform } from 'stream';
import {is_object} from './utils/is_object.js';
import {transform} from './api/index.js';
import {CsvError} from './api/CsvError.js';

class Parser extends Transform {
  constructor(opts = {}){
    super({...{readableObjectMode: true}, ...opts, encoding: null});
    this.api = transform(opts);
    this.api.options.on_skip = (err, chunk) => {
      this.emit('skip', err, chunk);
    };
    // Backward compatibility
    this.state = this.api.state;
    this.options = this.api.options;
    this.info = this.api.info;
  }
  // Implementation of `Transform._transform`
  _transform(buf, encoding, callback){
    if(this.state.stop === true){
      return;
    }
    const err = this.api.parse(buf, false, (record) => {
      this.push(record);
    }, () => {
      this.push(null);
      this.on('end', this.destroy);
    });
    if(err !== undefined){
      this.state.stop = true;
    }
    callback(err);
  }
  // Implementation of `Transform._flush`
  _flush(callback){
    if(this.state.stop === true){
      return;
    }
    const err = this.api.parse(undefined, true, (record) => {
      this.push(record);
    }, () => {
      this.push(null);
      this.on('end', this.destroy);
    });
    callback(err);
  }
}

const parse = function(){
  let data, options, callback;
  for(const i in arguments){
    const argument = arguments[i];
    const type = typeof argument;
    if(data === undefined && (typeof argument === 'string' || Buffer.isBuffer(argument))){
      data = argument;
    }else if(options === undefined && is_object(argument)){
      options = argument;
    }else if(callback === undefined && type === 'function'){
      callback = argument;
    }else{
      throw new CsvError('CSV_INVALID_ARGUMENT', [
        'Invalid argument:',
        `got ${JSON.stringify(argument)} at index ${i}`
      ], options || {});
    }
  }
  const parser = new Parser(options);
  if(callback){
    const records = options === undefined || options.objname === undefined ? [] : {};
    parser.on('readable', function(){
      let record;
      while((record = this.read()) !== null){
        if(options === undefined || options.objname === undefined){
          records.push(record);
        }else{
          records[record[0]] = record[1];
        }
      }
    });
    parser.on('error', function(err){
      callback(err, undefined, parser.api.__infoDataSet());
    });
    parser.on('end', function(){
      callback(undefined, records, parser.api.__infoDataSet());
    });
  }
  if(data !== undefined){
    const writer = function(){
      parser.write(data);
      parser.end();
    };
    // Support Deno, Rollup doesnt provide a shim for setImmediate
    if(typeof setImmediate === 'function'){
      setImmediate(writer);
    }else{
      setTimeout(writer, 0);
    }
  }
  return parser;
};

// export default parse
export { parse, Parser, CsvError };
