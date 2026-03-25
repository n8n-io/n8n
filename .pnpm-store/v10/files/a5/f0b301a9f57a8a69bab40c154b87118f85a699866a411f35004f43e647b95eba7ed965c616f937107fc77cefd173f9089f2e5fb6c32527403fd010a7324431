
start
    = ws head:segment tail:segmentTail* { tail.unshift(head); return tail; }

segmentTail
    = ws ',' ws seg:segment { return seg; }

segment
    = str:string { return {string: str}; }
    / v:identifier size:size ? specs:specifierList ?
      { return {name: v, size: size, specifiers: specs}; }
    / v:number size:size ? specs:specifierList ?
      { return {value: v, size: size, specifiers: specs}; }

string
  = '"' '"'             { return "";    }
  / '"' chars:chars '"' { return chars; }

/* From JSON example
https://github.com/dmajda/pegjs/blob/master/examples/json.pegjs */

chars
  = chars:char+ { return chars.join(""); }

char
  = [^"\\\0-\x1F\x7f]
  / '\\"'  { return '"';  }
  / "\\\\" { return "\\"; }
  / "\\/"  { return "/";  }
  / "\\b"  { return "\b"; }
  / "\\f"  { return "\f"; }
  / "\\n"  { return "\n"; }
  / "\\r"  { return "\r"; }
  / "\\t"  { return "\t"; }
  / "\\u" h1:hexDigit h2:hexDigit h3:hexDigit h4:hexDigit {
      return String.fromCharCode(parseInt("0x" + h1 + h2 + h3 + h4));
    }

hexDigit
  = [0-9a-fA-F]

identifier
    = (head:[_a-zA-Z] tail:[_a-zA-Z0-9]*) { return head + tail.join(''); }

number
    = '0' { return 0; }
    / head:[1-9] tail:[0-9]* { return parseInt(head + tail.join('')); }

size
    = ':' num:number { return num; }
    / ':' id:identifier { return id; }

specifierList
    = '/' head:specifier tail:specifierTail* { tail.unshift(head); return tail; }

specifierTail
    = '-' spec:specifier { return spec; }

specifier
    = 'little' / 'big' / 'signed' / 'unsigned'
    / 'integer' / 'binary' / 'float'
    / unit

unit
    = 'unit:' num:number { return 'unit:' + num; }

ws = [ \t\n]*
