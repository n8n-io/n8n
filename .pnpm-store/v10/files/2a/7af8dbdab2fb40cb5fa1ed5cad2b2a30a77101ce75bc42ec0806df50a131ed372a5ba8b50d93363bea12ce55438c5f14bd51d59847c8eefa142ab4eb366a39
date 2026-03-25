var WritableStream = require('stream').Writable
                     || require('readable-stream').Writable,
    inherits = require('util').inherits,
    inspect = require('util').inspect;

var XRegExp = require('xregexp').XRegExp;

var REX_LISTUNIX = XRegExp.cache('^(?<type>[\\-ld])(?<permission>([\\-r][\\-w][\\-xstT]){3})(?<acl>(\\+))?\\s+(?<inodes>\\d+)\\s+(?<owner>\\S+)\\s+(?<group>\\S+)\\s+(?<size>\\d+)\\s+(?<timestamp>((?<month1>\\w{3})\\s+(?<date1>\\d{1,2})\\s+(?<hour>\\d{1,2}):(?<minute>\\d{2}))|((?<month2>\\w{3})\\s+(?<date2>\\d{1,2})\\s+(?<year>\\d{4})))\\s+(?<name>.+)$'),
    REX_LISTMSDOS = XRegExp.cache('^(?<month>\\d{2})(?:\\-|\\/)(?<date>\\d{2})(?:\\-|\\/)(?<year>\\d{2,4})\\s+(?<hour>\\d{2}):(?<minute>\\d{2})\\s{0,1}(?<ampm>[AaMmPp]{1,2})\\s+(?:(?<size>\\d+)|(?<isdir>\\<DIR\\>))\\s+(?<name>.+)$'),
    RE_ENTRY_TOTAL = /^total/,
    RE_RES_END = /(?:^|\r?\n)(\d{3}) [^\r\n]*\r?\n/,
    RE_EOL = /\r?\n/g,
    RE_DASH = /\-/g,
    RE_SEP = /;/g,
    RE_EQ = /=/;

var MONTHS = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

function Parser(options) {
  if (!(this instanceof Parser))
    return new Parser(options);
  WritableStream.call(this);

  this._buffer = '';
  this._debug = options.debug;
}
inherits(Parser, WritableStream);

Parser.prototype._write = function(chunk, encoding, cb) {
  var m, code, reRmLeadCode, rest = '', debug = this._debug;

  this._buffer += chunk.toString('binary');

  while (m = RE_RES_END.exec(this._buffer)) {
    // support multiple terminating responses in the buffer
    rest = this._buffer.substring(m.index + m[0].length);
    if (rest.length)
      this._buffer = this._buffer.substring(0, m.index + m[0].length);

    debug&&debug('[parser] < ' + inspect(this._buffer));

    // we have a terminating response line
    code = parseInt(m[1], 10);

    // RFC 959 does not require each line in a multi-line response to begin
    // with '<code>-', but many servers will do this.
    //
    // remove this leading '<code>-' (or '<code> ' from last line) from each
    // line in the response ...
    reRmLeadCode = '(^|\\r?\\n)';
    reRmLeadCode += m[1];
    reRmLeadCode += '(?: |\\-)';
    reRmLeadCode = new RegExp(reRmLeadCode, 'g');
    var text = this._buffer.replace(reRmLeadCode, '$1').trim();
    this._buffer = rest;

    debug&&debug('[parser] Response: code=' + code + ', buffer=' + inspect(text));
    this.emit('response', code, text);
  }

  cb();
};

Parser.parseFeat = function(text) {
  var lines = text.split(RE_EOL);
  lines.shift(); // initial response line
  lines.pop(); // final response line

  for (var i = 0, len = lines.length; i < len; ++i)
    lines[i] = lines[i].trim();

  // just return the raw lines for now
  return lines;
};

Parser.parseListEntry = function(line) {
  var ret,
      info,
      month, day, year,
      hour, mins;

  if (ret = XRegExp.exec(line, REX_LISTUNIX)) {
    info = {
      type: ret.type,
      name: undefined,
      target: undefined,
      sticky: false,
      rights: {
        user: ret.permission.substr(0, 3).replace(RE_DASH, ''),
        group: ret.permission.substr(3, 3).replace(RE_DASH, ''),
        other: ret.permission.substr(6, 3).replace(RE_DASH, '')
      },
      acl: (ret.acl === '+'),
      owner: ret.owner,
      group: ret.group,
      size: parseInt(ret.size, 10),
      date: undefined
    };

    // check for sticky bit
    var lastbit = info.rights.other.slice(-1);
    if (lastbit === 't') {
      info.rights.other = info.rights.other.slice(0, -1) + 'x';
      info.sticky = true;
    } else if (lastbit === 'T') {
      info.rights.other = info.rights.other.slice(0, -1);
      info.sticky = true;
    }

    if (ret.month1 !== undefined) {
      month = parseInt(MONTHS[ret.month1.toLowerCase()], 10);
      day = parseInt(ret.date1, 10);
      year = (new Date()).getFullYear();
      hour = parseInt(ret.hour, 10);
      mins = parseInt(ret.minute, 10);
      if (month < 10)
        month = '0' + month;
      if (day < 10)
        day = '0' + day;
      if (hour < 10)
        hour = '0' + hour;
      if (mins < 10)
        mins = '0' + mins;
      info.date = new Date(year + '-'
                           + month + '-'
                           + day + 'T'
                           + hour + ':'
                           + mins);
      // If the date is in the past but no more than 6 months old, year
      // isn't displayed and doesn't have to be the current year.
      //
      // If the date is in the future (less than an hour from now), year
      // isn't displayed and doesn't have to be the current year.
      // That second case is much more rare than the first and less annoying.
      // It's impossible to fix without knowing about the server's timezone,
      // so we just don't do anything about it.
      //
      // If we're here with a time that is more than 28 hours into the
      // future (1 hour + maximum timezone offset which is 27 hours),
      // there is a problem -- we should be in the second conditional block
      if (info.date.getTime() - Date.now() > 100800000) {
        info.date = new Date((year - 1) + '-'
                             + month + '-'
                             + day + 'T'
                             + hour + ':'
                             + mins);
      }

      // If we're here with a time that is more than 6 months old, there's
      // a problem as well.
      // Maybe local & remote servers aren't on the same timezone (with remote
      // ahead of local)
      // For instance, remote is in 2014 while local is still in 2013. In
      // this case, a date like 01/01/13 02:23 could be detected instead of
      // 01/01/14 02:23
      // Our trigger point will be 3600*24*31*6 (since we already use 31
      // as an upper bound, no need to add the 27 hours timezone offset)
      if (Date.now() - info.date.getTime() > 16070400000) {
        info.date = new Date((year + 1) + '-'
                             + month + '-'
                             + day + 'T'
                             + hour + ':'
                             + mins);
      }
    } else if (ret.month2 !== undefined) {
      month = parseInt(MONTHS[ret.month2.toLowerCase()], 10);
      day = parseInt(ret.date2, 10);
      year = parseInt(ret.year, 10);
      if (month < 10)
        month = '0' + month;
      if (day < 10)
        day = '0' + day;
      info.date = new Date(year + '-' + month + '-' + day);
    }
    if (ret.type === 'l') {
      var pos = ret.name.indexOf(' -> ');
      info.name = ret.name.substring(0, pos);
      info.target = ret.name.substring(pos+4);
    } else
      info.name = ret.name;
    ret = info;
  } else if (ret = XRegExp.exec(line, REX_LISTMSDOS)) {
    info = {
      name: ret.name,
      type: (ret.isdir ? 'd' : '-'),
      size: (ret.isdir ? 0 : parseInt(ret.size, 10)),
      date: undefined,
    };
    month = parseInt(ret.month, 10),
    day = parseInt(ret.date, 10),
    year = parseInt(ret.year, 10),
    hour = parseInt(ret.hour, 10),
    mins = parseInt(ret.minute, 10);

    if (year < 70)
      year += 2000;
    else
      year += 1900;

    if (ret.ampm[0].toLowerCase() === 'p' && hour < 12)
      hour += 12;
    else if (ret.ampm[0].toLowerCase() === 'a' && hour === 12)
      hour = 0;

    info.date = new Date(year, month - 1, day, hour, mins);

    ret = info;
  } else if (!RE_ENTRY_TOTAL.test(line))
    ret = line; // could not parse, so at least give the end user a chance to
                // look at the raw listing themselves

  return ret;
};

Parser.parseMlsdEntry = function(entry) {
  var kvs = entry.split(RE_SEP);
  var obj = { name: kvs.pop().substring(1) };
  kvs.forEach(function(kv) {
    kv = kv.split( RE_EQ );
    obj[kv[0].toLowerCase()] = kv[1];
  });

  obj.size = parseInt(obj.size, 10);

  var modify = obj.modify;
  if (modify) {
    var year = modify.substr(0, 4);
    var month = modify.substr(4, 2);
    var date = modify.substr(6, 2);
    var hour = modify.substr(8, 2);
    var minute = modify.substr(10, 2);
    var second = modify.substr(12, 2);
    obj.date = new Date(
        year + '-' + month + '-' + date + 'T' + hour + ':' +minute + ':' + second
    );
  }

    return obj;
};

module.exports = Parser;
