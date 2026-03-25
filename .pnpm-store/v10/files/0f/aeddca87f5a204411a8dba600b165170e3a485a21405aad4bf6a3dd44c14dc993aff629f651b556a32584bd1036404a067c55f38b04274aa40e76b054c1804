'use strict';

const { createLRU } = require('lru.min');

const parserCache = createLRU({
  max: 15000,
});

function keyFromFields(type, fields, options, config) {
  const res = [
    type,
    typeof options.nestTables,
    options.nestTables,
    Boolean(options.rowsAsArray),
    Boolean(options.supportBigNumbers || config.supportBigNumbers),
    Boolean(options.bigNumberStrings || config.bigNumberStrings),
    typeof options.typeCast === 'boolean'
      ? options.typeCast
      : typeof options.typeCast,
    options.timezone || config.timezone,
    Boolean(options.decimalNumbers),
    options.dateStrings,
  ];

  for (let i = 0; i < fields.length; ++i) {
    const field = fields[i];

    res.push([
      field.name,
      field.columnType,
      field.length,
      field.schema,
      field.table,
      field.flags,
      field.characterSet,
    ]);
  }

  return JSON.stringify(res, null, 0);
}

function getParser(type, fields, options, config, compiler) {
  const key = keyFromFields(type, fields, options, config);
  let parser = parserCache.get(key);

  if (parser) {
    return parser;
  }

  parser = compiler(fields, options, config);
  parserCache.set(key, parser);
  return parser;
}

function setMaxCache(max) {
  parserCache.resize(max);
}

function clearCache() {
  parserCache.clear();
}

module.exports = {
  getParser: getParser,
  setMaxCache: setMaxCache,
  clearCache: clearCache,
  _keyFromFields: keyFromFields,
};
