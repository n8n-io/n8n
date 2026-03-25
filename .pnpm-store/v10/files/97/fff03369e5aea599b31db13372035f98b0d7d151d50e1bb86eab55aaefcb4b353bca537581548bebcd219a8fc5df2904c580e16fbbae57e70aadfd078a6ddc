const utils = module.exports = {};
const entities = require('entities');
const xml2js = require('xml2js');

utils.stripHtml = function(str) {
  str = str.replace(/([^\n])<\/?(h|br|p|ul|ol|li|blockquote|section|table|tr|div)(?:.|\n)*?>([^\n])/gm, '$1\n$3')
  str = str.replace(/<(?:.|\n)*?>/gm, '');
  return str;
}

utils.getSnippet = function(str) {
  return entities.decodeHTML(utils.stripHtml(str)).trim();
}

utils.getLink = function(links, rel, fallbackIdx) {
  if (!links) return;
  for (let i = 0; i < links.length; ++i) {
    if (links[i].$.rel === rel) return links[i].$.href;
  }
  if (links[fallbackIdx]) return links[fallbackIdx].$.href;
}

utils.getContent = function(content) {
  if (typeof content._ === 'string') {
    return content._;
  } else if (typeof content === 'object') {
    let builder = new xml2js.Builder({headless: true, explicitRoot: true, rootName: 'div', renderOpts: {pretty: false}});
    return builder.buildObject(content);
  } else {
    return content;
  }
}

utils.copyFromXML = function(xml, dest, fields) {
  fields.forEach(function(f) {
    let from = f;
    let to = f;
    let options = {};
    if (Array.isArray(f)) {
      from = f[0];
      to = f[1];
      if (f.length > 2) {
        options = f[2];
      }
    }
    const { keepArray, includeSnippet } = options;
    if (xml[from] !== undefined){
      dest[to] = keepArray ? xml[from] : xml[from][0];
    }
    if (dest[to] && typeof dest[to]._ === 'string') {
      dest[to]=dest[to]._;
    }
    if (includeSnippet && dest[to] && typeof dest[to] === 'string') {
      dest[to + 'Snippet'] = utils.getSnippet(dest[to]);
    }
  })
}

utils.maybePromisify = function(callback, promise) {
  if (!callback) return promise;
  return promise.then(
    data => setTimeout(() => callback(null, data)),
    err => setTimeout(() => callback(err))
  );
}

const DEFAULT_ENCODING = 'utf8';
const ENCODING_REGEX = /(encoding|charset)\s*=\s*(\S+)/;
const SUPPORTED_ENCODINGS = ['ascii', 'utf8', 'utf16le', 'ucs2', 'base64', 'latin1', 'binary', 'hex'];
const ENCODING_ALIASES = {
  'utf-8': 'utf8',
  'iso-8859-1': 'latin1',
}

utils.getEncodingFromContentType = function(contentType) {
  contentType = contentType || '';
  let match = contentType.match(ENCODING_REGEX);
  let encoding = (match || [])[2] || '';
  encoding = encoding.toLowerCase();
  encoding = ENCODING_ALIASES[encoding] || encoding;
  if (!encoding || SUPPORTED_ENCODINGS.indexOf(encoding) === -1) {
    encoding = DEFAULT_ENCODING;
  }
  return encoding;
}
