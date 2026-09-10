function normalizeRustRegexCase(raw, category, index) {
  if (Array.isArray(raw.regex)) return null; // RegexSet case: not applicable, single-pattern engine

  const flags = raw['case-insensitive'] ? 'iu' : 'u';

  return {
    id: `rust-regex:${category}:${raw.name ?? index}`,
    category,
    pattern: raw.regex,
    flags,
    input: raw.haystack,
  };
}

function normalizePcre2Case(block, category, index) {
  // Any modifier outside this allow-list drops the whole block rather than risk mismodeling it.
  const FLAG_MODIFIERS = { i: 'i', m: 'm', s: 's', x: 'x' };
  const SAFE_IGNORE = new Set([
    'no_start_optimize',
    'no_auto_possess',
    'bincode',
    'info',
    'fullbincode',
    'hex',
    'startchar',
    'allcaptures',
    'no_force_utf8',
    'aftertext', // output-only: echoes text after the match, doesn't change it
    'dupnames', // allows duplicate group names; doesn't change match results
    'mark', // output-only: shows (*MARK) names, doesn't change match results
  ]);

  let flags = 'u';
  for (const modifier of block.modifiers) {
    if (modifier in FLAG_MODIFIERS) {
      flags += FLAG_MODIFIERS[modifier];
    } else if (!SAFE_IGNORE.has(modifier)) {
      return [];
    }
  }

  return block.subjects.map((subject, subjectIndex) => ({
    id: `pcre2:${category}:${index}:${subjectIndex}`,
    category,
    pattern: block.pattern,
    flags,
    input: subject.input,
  }));
}

export function normalizeRustRegexBlocks(blocks, category) {
  return blocks.map((raw, i) => normalizeRustRegexCase(raw, category, i)).filter(Boolean);
}

export function normalizePcre2Blocks(blocks, category) {
  return blocks.flatMap((block, i) => normalizePcre2Case(block, category, i));
}
