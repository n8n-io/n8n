// Parses a PCRE2 `pcre2test` testoutputN file. NOT a general pcre2test parser -- only
// covers the grammar vendor/pcre2/testdata/testoutput1 actually uses (non-UTF, no
// error-injection).
import {
  decodePcre2TestSubject,
  decodePcre2TestOutput,
  PCRE2TEST_DELIMITERS,
} from './decode-pcre2test-string.mjs';

const SINGLE_CHAR_MODIFIERS = new Set(['i', 'm', 's', 'x', 'g']);

// pcre2test allows single-letter flags glued together (e.g. "imsx") AND comma-separated
// named modifiers (e.g. "g,aftertext") -- expand any all-single-char segment into
// individual characters, leave named segments intact.
function splitPcre2TestModifiers(modifiers) {
  const segments = modifiers.split(',').filter((s) => s.length > 0);
  return segments.flatMap((segment) => {
    if ([...segment].every((ch) => SINGLE_CHAR_MODIFIERS.has(ch))) return [...segment];
    return [segment];
  });
}

function parsePatternLine(line) {
  const delimiter = line[0];
  let end = -1;
  for (let i = 1; i < line.length; i++) {
    if (line[i] === '\\') {
      i += 1;
      continue;
    }
    if (line[i] === delimiter) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error(`parse-pcre2-testoutput: unterminated pattern: ${line}`);

  const pattern = line.slice(1, end).replace(new RegExp(`\\\\${delimiter}`, 'g'), delimiter);
  const modifiers = line.slice(end + 1).trim();
  return { pattern, modifiers: splitPcre2TestModifiers(modifiers) };
}

// Wrapped in try/catch: an unterminated \x{ from a wrapped long-line artifact should
// drop just that one block, not crash.
function decodeResultText(text, onError) {
  try {
    return decodePcre2TestOutput(text);
  } catch (error) {
    onError(error);
    return undefined;
  }
}

export function parseTestOutput(text) {
  const lines = text.split('\n');
  const blocks = [];
  const skipped = [];
  let block = null;
  let subject = null;
  let blockFailed = false;
  let ignoringUntilBlank = false;

  const finishSubject = () => {
    if (subject) block.subjects.push(subject);
    subject = null;
  };
  const finishBlock = () => {
    finishSubject();
    if (block && !blockFailed) blocks.push(block);
    else if (block && blockFailed) skipped.push(block.pattern);
    block = null;
    blockFailed = false;
  };
  const failBlock = () => {
    blockFailed = true;
  };

  for (const raw of lines) {
    if (raw.trim() === '') {
      ignoringUntilBlank = false;
      continue;
    }
    if (ignoringUntilBlank || raw.startsWith('#')) continue;

    if (PCRE2TEST_DELIMITERS.includes(raw[0])) {
      finishBlock();
      // A pattern can span multiple physical lines in pcre2test, a rare feature this
      // parser doesn't implement -- skip the whole block rather than mis-join lines.
      let parsed;
      try {
        parsed = parsePatternLine(raw);
      } catch {
        skipped.push(raw);
        ignoringUntilBlank = true;
        continue;
      }
      block = { pattern: parsed.pattern, modifiers: parsed.modifiers, subjects: [] };
      continue;
    }
    if (!block) continue;

    const trimmed = raw.trim();
    // `\=` is only a comment when followed by whitespace/nothing; `\=startchar` (no
    // space) is a genuine empty-subject DATA line and must not be treated as one.
    if (trimmed === '\\=' || /^\\=\s/.test(trimmed)) continue;

    // pcre2test right-justifies the group number in a fixed 2-character-wide field (" 0:",
    // "10:", never more than one leading space) -- matching "any number of spaces" here
    // would also match a 4-space-indented subject whose own text happens to start with
    // e.g. "0: ", misreading the subject echo as a match result.
    const resultMatch = /^ {0,1}(\d+): (.*)$/.exec(raw);
    if (resultMatch) {
      if (!subject) {
        failBlock();
        continue;
      }
      const groupIndex = Number(resultMatch[1]);
      const text =
        resultMatch[2] === '<unset>' ? undefined : decodeResultText(resultMatch[2], failBlock);
      subject.groups[groupIndex] = text;
      continue;
    }
    // "N+ text" is pcre2test's aftertext/startchar annotation line (same "+" marker for
    // both): the text following a match, or the extended match start when \K shifted it.
    const afterMatch = /^ {0,1}(\d+)\+ ?(.*)$/.exec(raw);
    if (afterMatch) {
      if (!subject) {
        failBlock();
        continue;
      }
      const groupIndex = Number(afterMatch[1]);
      subject.afterText ??= [];
      subject.afterText[groupIndex] = decodeResultText(afterMatch[2], failBlock);
      continue;
    }
    if (trimmed === 'No match') {
      if (!subject) {
        failBlock();
        continue;
      }
      subject.noMatch = true;
      continue;
    }

    // pcre2test subjects are indented by 4 spaces; anything else (e.g. a wrapped
    // long result line) isn't a shape this parser handles.
    if (!raw.startsWith('    ')) {
      failBlock();
      continue;
    }
    finishSubject();
    const dataOnly = raw.slice(4).replace(/\\=\S.*$/, '');
    try {
      subject = { input: decodePcre2TestSubject(dataOnly), groups: [], noMatch: false };
    } catch (error) {
      failBlock(error);
      subject = { input: '', groups: [], noMatch: false };
    }
  }
  finishBlock();
  return { blocks, skipped };
}
