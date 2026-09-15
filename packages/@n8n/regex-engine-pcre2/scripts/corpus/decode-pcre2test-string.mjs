// Decodes pcre2test's own backslash-escape syntax for DATA (subject) lines -- separate
// from pattern escapes, which PCRE2 itself interprets. Throws on anything unrecognized
// rather than silently mis-decoding; callers should drop the case, not guess.

// Pattern delimiters pcre2test-oracle.mjs picks from and parse-pcre2-testoutput.mjs
// recognizes on read -- shared here so the two can't drift apart. Excludes `#`,
// pcre2test's comment-line character.
export const PCRE2TEST_DELIMITERS = ['/', '~', '!', '%', '&', '=', ';', '`'];
const SIMPLE_ESCAPES = {
  a: '\x07',
  b: '\x08',
  e: '\x1b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\x0b',
};

export function decodePcre2TestSubject(line) {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '\\') {
      out += line[i];
      continue;
    }
    const c = line[i + 1];
    if (c === undefined) throw new Error(`decodePcre2TestSubject: trailing backslash: ${line}`);

    if (c in SIMPLE_ESCAPES) {
      out += SIMPLE_ESCAPES[c];
      i += 1;
    } else if (c === 'x' && line[i + 2] === '{') {
      const end = line.indexOf('}', i + 3);
      if (end === -1) throw new Error(`decodePcre2TestSubject: unterminated \\x{: ${line}`);
      out += String.fromCodePoint(parseInt(line.slice(i + 3, end), 16));
      i = end;
    } else if (c === 'x' && /^[0-9a-fA-F]{2}/.test(line.slice(i + 2, i + 4))) {
      out += String.fromCharCode(parseInt(line.slice(i + 2, i + 4), 16));
      i += 3;
    } else if (/[0-7]/.test(c)) {
      const octal = line.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0];
      out += String.fromCharCode(parseInt(octal, 8));
      i += octal.length;
    } else {
      // pcre2test's fallback: a backslash before any other character means that literal character.
      out += c;
      i += 1;
    }
  }
  return out;
}

// Different grammar from a DATA line: pcre2test's output escapes only genuinely
// unprintable bytes as \xHH, printing a literal backslash bare -- decodePcre2TestSubject's
// grammar would wrongly eat it.
export function decodePcre2TestOutput(line) {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '\\') {
      out += line[i];
      continue;
    }
    if (line[i + 1] === 'x' && line[i + 2] === '{') {
      const end = line.indexOf('}', i + 3);
      if (end === -1) throw new Error(`decodePcre2TestOutput: unterminated \\x{: ${line}`);
      out += String.fromCodePoint(parseInt(line.slice(i + 3, end), 16));
      i = end;
    } else if (line[i + 1] === 'x' && /^[0-9a-fA-F]{2}/.test(line.slice(i + 2, i + 4))) {
      const value = parseInt(line.slice(i + 2, i + 4), 16);
      // pcre2test never escapes a printable byte -- a \xHH with a printable value can
      // only be literal text pcre2test printed as-is (e.g. the matched text genuinely
      // contains the four characters \, x, 4, 1), not a real escape.
      if (value > 0x20 && value <= 0x7e) {
        out += line[i];
      } else {
        out += String.fromCharCode(value);
        i += 3;
      }
    } else {
      out += line[i];
    }
  }
  return out;
}

// Inverse of decodePcre2TestSubject. Space (0x20) must never be emitted literally: pcre2test
// strips leading whitespace on a data line, so a literal leading space would be swallowed.
//
// `unicode` must match the case's own `u`/utf status: a non-UTF PCRE2 dialect treats each
// UTF-16 code unit as one character, so a surrogate pair has to stay as two separate
// code-unit escapes there, not combined into one code-point escape (which only a UTF-mode
// pcre2test run can represent).
export function encodePcre2TestSubject(text, unicode = true) {
  let out = '';
  if (unicode) {
    for (const ch of text) {
      const code = ch.codePointAt(0);
      if (ch === '\\') {
        out += '\\\\';
      } else if (code > 0x20 && code <= 0x7e) {
        out += ch;
      } else {
        out += `\\x{${code.toString(16)}}`;
      }
    }
    return out;
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (ch === '\\') {
      out += '\\\\';
    } else if (code > 0x20 && code <= 0x7e) {
      out += ch;
    } else {
      out += `\\x{${code.toString(16)}}`;
    }
  }
  return out;
}
