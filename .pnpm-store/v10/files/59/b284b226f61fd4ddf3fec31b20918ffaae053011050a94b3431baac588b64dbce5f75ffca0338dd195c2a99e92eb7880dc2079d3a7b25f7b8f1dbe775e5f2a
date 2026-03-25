{
  var nodes = [];

  function genError(err, line, col) {
    var ex = new Error(err);
    ex.line = line;
    ex.column = col;
    throw ex;
  }

  function addNode(node) {
    nodes.push(node);
  }

  function node(type, value, line, column, key) {
    var obj = { type: type, value: value, line: line(), column: column() };
    if (key) obj.key = key;
    return obj;
  }

  function convertCodePoint(str, line, col) {
    var num = parseInt("0x" + str);

    if (
      !isFinite(num) ||
      Math.floor(num) != num ||
      num < 0 ||
      num > 0x10FFFF ||
      (num > 0xD7FF && num < 0xE000)
    ) {
      genError("Invalid Unicode escape code: " + str, line, col);
    } else {
      return fromCodePoint(num);
    }
  }

  function fromCodePoint() {
    var MAX_SIZE = 0x4000;
    var codeUnits = [];
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    var result = '';
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (codePoint <= 0xFFFF) { // BMP code point
        codeUnits.push(codePoint);
      } else { // Astral code point; split in surrogate halves
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
      if (index + 1 == length || codeUnits.length > MAX_SIZE) {
        result += String.fromCharCode.apply(null, codeUnits);
        codeUnits.length = 0;
      }
    }
    return result;
  }
}

start
  = line*                               { return nodes }

line
  = S* expr:expression S* comment* (NL+ / EOF)
  / S+ (NL+ / EOF)
  / NL

expression
  = comment / path / tablearray / assignment

comment
  = '#' (!(NL / EOF) .)*

path
  = '[' S* name:table_key S* ']'              { addNode(node('ObjectPath', name, line, column)) }

tablearray
  = '[' '[' S* name:table_key S* ']' ']'      { addNode(node('ArrayPath', name, line, column)) }

table_key
  = parts:dot_ended_table_key_part+ name:table_key_part    { return parts.concat(name) }
  / name:table_key_part                                    { return [name] }

table_key_part
  = S* name:key S*                      { return name }
  / S* name:quoted_key S*               { return name }

dot_ended_table_key_part
  = S* name:key S* '.' S*               { return name }
  / S* name:quoted_key S* '.' S*        { return name }

assignment
  = key:key S* '=' S* value:value        { addNode(node('Assign', value, line, column, key)) }
  / key:quoted_key S* '=' S* value:value { addNode(node('Assign', value, line, column, key)) }

key
  = chars:ASCII_BASIC+ { return chars.join('') }

quoted_key
  = node:double_quoted_single_line_string { return node.value }
  / node:single_quoted_single_line_string { return node.value }

value
  = string / datetime / float / integer / boolean / array / inline_table

string
  = double_quoted_multiline_string
  / double_quoted_single_line_string
  / single_quoted_multiline_string
  / single_quoted_single_line_string

double_quoted_multiline_string
  = '"""' NL? chars:multiline_string_char* '"""'  { return node('String', chars.join(''), line, column) }
double_quoted_single_line_string
  = '"' chars:string_char* '"'                    { return node('String', chars.join(''), line, column) }
single_quoted_multiline_string
  = "'''" NL? chars:multiline_literal_char* "'''" { return node('String', chars.join(''), line, column) }
single_quoted_single_line_string
  = "'" chars:literal_char* "'"                   { return node('String', chars.join(''), line, column) }

string_char
  = ESCAPED / (!'"' char:. { return char })

literal_char
  = (!"'" char:. { return char })

multiline_string_char
  = ESCAPED / multiline_string_delim / (!'"""' char:. { return char})

multiline_string_delim
  = '\\' NL NLS*                        { return '' }

multiline_literal_char
  = (!"'''" char:. { return char })

float
  = left:(float_text / integer_text) ('e' / 'E') right:integer_text { return node('Float', parseFloat(left + 'e' + right), line, column) }
  / text:float_text                                                 { return node('Float', parseFloat(text), line, column) }

float_text
  = '+'? digits:(DIGITS '.' DIGITS)     { return digits.join('') }
  / '-'  digits:(DIGITS '.' DIGITS)     { return '-' + digits.join('') }

integer
  = text:integer_text                   { return node('Integer', parseInt(text, 10), line, column) }

integer_text
  = '+'? digits:DIGIT+ !'.'             { return digits.join('') }
  / '-'  digits:DIGIT+ !'.'             { return '-' + digits.join('') }

boolean
  = 'true'                              { return node('Boolean', true, line, column) }
  / 'false'                             { return node('Boolean', false, line, column) }

array
  = '[' array_sep* ']'                                 { return node('Array', [], line, column) }
  / '[' value:array_value? ']'                         { return node('Array', value ? [value] : [], line, column) }
  / '[' values:array_value_list+ ']'                   { return node('Array', values, line, column) }
  / '[' values:array_value_list+ value:array_value ']' { return node('Array', values.concat(value), line, column) }

array_value
  = array_sep* value:value array_sep*                  { return value }

array_value_list
  = array_sep* value:value array_sep* ',' array_sep*   { return value }

array_sep
  = S / NL / comment

inline_table
  = '{' S* values:inline_table_assignment* S* '}'      { return node('InlineTable', values, line, column) }

inline_table_assignment
  = S* key:key S* '=' S* value:value S* ',' S*         { return node('InlineTableValue', value, line, column, key) }
  / S* key:key S* '=' S* value:value                   { return node('InlineTableValue', value, line, column, key) }

secfragment
  = '.' digits:DIGITS                                  { return "." + digits }

date
  = date:(
      DIGIT DIGIT DIGIT DIGIT
      '-'
      DIGIT DIGIT
      '-'
      DIGIT DIGIT
    )                                                               { return  date.join('') }

time
  = time:(DIGIT DIGIT ':' DIGIT DIGIT ':' DIGIT DIGIT secfragment?) { return time.join('') }

time_with_offset
  = time:(
      DIGIT DIGIT ':' DIGIT DIGIT ':' DIGIT DIGIT secfragment?
      ('-' / '+')
      DIGIT DIGIT ':' DIGIT DIGIT
    )                                                               { return time.join('') }

datetime
  = date:date 'T' time:time 'Z'               { return node('Date', new Date(date + "T" + time + "Z"), line, column) }
  / date:date 'T' time:time_with_offset       { return node('Date', new Date(date + "T" + time), line, column) }


S                = [ \t]
NL               = "\n" / "\r" "\n"
NLS              = NL / S
EOF              = !.
HEX              = [0-9a-f]i
DIGIT            = DIGIT_OR_UNDER
DIGIT_OR_UNDER   = [0-9]
                 / '_'                  { return "" }
ASCII_BASIC      = [A-Za-z0-9_\-]
DIGITS           = d:DIGIT_OR_UNDER+    { return d.join('') }
ESCAPED          = '\\"'                { return '"'  }
                 / '\\\\'               { return '\\' }
                 / '\\b'                { return '\b' }
                 / '\\t'                { return '\t' }
                 / '\\n'                { return '\n' }
                 / '\\f'                { return '\f' }
                 / '\\r'                { return '\r' }
                 / ESCAPED_UNICODE
ESCAPED_UNICODE  = "\\U" digits:(HEX HEX HEX HEX HEX HEX HEX HEX) { return convertCodePoint(digits.join('')) }
                 / "\\u" digits:(HEX HEX HEX HEX) { return convertCodePoint(digits.join('')) }
