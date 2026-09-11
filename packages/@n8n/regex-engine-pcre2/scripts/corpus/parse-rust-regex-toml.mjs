// Minimal parser for rust-lang/regex's testdata/*.toml format. Not a general
// TOML parser -- it only understands the fixed shape these files use:
// [[test]] blocks of `key = value` lines, where value is a single/triple
// quoted string (literal, no escape processing, matching TOML's ' / '''
// semantics) or a JSON-compatible array/boolean/number.

const TOML_ESCAPES = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', '"': '"', '\\': '\\' };

/** Decodes TOML basic-string escapes: \b \t \n \f \r \" \\ \uXXXX \UXXXXXXXX. */
function decodeTomlBasicEscapes(body) {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '\\') {
      out += body[i];
      continue;
    }
    const marker = body[i + 1];
    if (marker === 'u') {
      out += String.fromCodePoint(parseInt(body.slice(i + 2, i + 6), 16));
      i += 5;
    } else if (marker === 'U') {
      out += String.fromCodePoint(parseInt(body.slice(i + 2, i + 10), 16));
      i += 9;
    } else if (marker in TOML_ESCAPES) {
      out += TOML_ESCAPES[marker];
      i += 1;
    } else {
      throw new Error(`decodeTomlBasicEscapes: unrecognized escape '\\${marker}'`);
    }
  }
  return out;
}

function parseValue(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);

  if (value.startsWith("'''") && value.endsWith("'''")) {
    return value.slice(3, -3);
  }
  if (value.startsWith('"""') && value.endsWith('"""')) {
    return decodeTomlBasicEscapes(value.slice(3, -3));
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    // Not delegated to JSON.parse: TOML's 8-hex-digit \Uxxxxxxxx escape (used for
    // astral codepoints) isn't valid JSON.
    return decodeTomlBasicEscapes(value.slice(1, -1));
  }
  if (value.startsWith('[')) {
    return JSON.parse(value);
  }
  throw new Error(`parse-rust-regex-toml: unrecognized value: ${raw}`);
}

/** Parses one *.toml file's text into an array of raw [[test]] block objects. */
export function parseTestToml(text) {
  const lines = text.split('\n');
  const blocks = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    if (trimmed === '[[test]]') {
      if (current) blocks.push(current);
      current = {};
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) throw new Error(`parse-rust-regex-toml: unexpected line: ${line}`);
    const key = trimmed.slice(0, eq).trim();
    let rawValue = trimmed.slice(eq + 1).trim();

    // Multi-line values aren't supported; guard rather than silently mis-parse.
    if (
      (rawValue.startsWith("'''") && !rawValue.slice(3).includes("'''")) ||
      (rawValue.startsWith('[') && !rawValue.endsWith(']'))
    ) {
      throw new Error(`parse-rust-regex-toml: multi-line value not supported: ${line}`);
    }

    current[key] = parseValue(rawValue);
  }
  if (current) blocks.push(current);
  return blocks;
}
