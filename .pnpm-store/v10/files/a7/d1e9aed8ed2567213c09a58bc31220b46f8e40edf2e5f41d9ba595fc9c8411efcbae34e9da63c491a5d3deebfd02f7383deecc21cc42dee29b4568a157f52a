import getParser from '../../src/parser/block-parser.js';
import { Line } from '../../src/primitives.js';
import { seedTokens } from '../../src/util.js';

let source: Line[];

beforeEach(() => {
  source = [
    {
      number: 1,
      source: '    /**',
      tokens: seedTokens({
        start: '    ',
        delimiter: '/**',
        postDelimiter: '',
        description: '',
        end: '',
      }),
    },
    {
      number: 2,
      source: '     * description 0',
      tokens: seedTokens({
        start: '     ',
        delimiter: '*',
        postDelimiter: ' ',
        description: 'description 0',
        end: '',
      }),
    },
    {
      number: 3,
      source: '     *',
      tokens: seedTokens({
        start: '     ',
        delimiter: '*',
        postDelimiter: '',
        description: '',
        end: '',
      }),
    },
    {
      number: 4,
      source: '     * description 1',
      tokens: seedTokens({
        start: '     ',
        delimiter: '*',
        postDelimiter: ' ',
        description: 'description 1',
        end: '',
      }),
    },
    {
      number: 5,
      source: '     *',
      tokens: seedTokens({
        start: '     ',
        delimiter: '*',
        postDelimiter: '',
        description: '',
        end: '',
      }),
    },
    {
      number: 6,
      source: '     * @param {string} value value description 0',
      tokens: seedTokens({
        start: '     ',
        delimiter: '*',
        postDelimiter: ' ',
        description: '@param {string} value value description 0',
        end: '',
      }),
    },
    {
      number: 7,
      source: '    ```',
      tokens: seedTokens({
        start: '    ',
        delimiter: '',
        postDelimiter: '',
        description: '```',
        end: '',
      }),
    },
    {
      number: 8,
      source: '    @sample code',
      tokens: seedTokens({
        start: '    ',
        delimiter: '',
        postDelimiter: '',
        description: '@sample code',
        end: '',
      }),
    },
    {
      number: 9,
      source: '    ```',
      tokens: seedTokens({
        start: '    ',
        delimiter: '',
        postDelimiter: '',
        description: '```',
        end: '',
      }),
    },
    {
      number: 10,
      source: '    * value description 1',
      tokens: seedTokens({
        start: '    ',
        delimiter: '*',
        postDelimiter: ' ',
        description: 'value description 1',
        end: '',
      }),
    },
    {
      number: 11,
      source: '    */',
      tokens: seedTokens({
        start: '    ',
        delimiter: '',
        postDelimiter: '',
        description: '',
        end: '*/',
      }),
    },
  ];
});

test('standard fences', () => {
  const parser = getParser();
  const groups: Line[][] = parser(source);

  expect(groups.length).toBe(2);
  expect(groups).toEqual([source.slice(0, 5), source.slice(5)]);
});

test('custom fence', () => {
  source = source.map((line) => {
    line.tokens.description = line.tokens.description.replace('```', '###');
    return line;
  });

  const parser = getParser({ fence: '###' });
  const groups: Line[][] = parser(source);

  expect(groups.length).toBe(2);
  expect(groups).toEqual([source.slice(0, 5), source.slice(5)]);
});

test('fence function', () => {
  source = source.map((line) => {
    line.tokens.description = line.tokens.description.replace('```', '###');
    return line;
  });

  function isFenced(source: string) {
    return source.split('###').length % 2 === 0;
  }

  const parser = getParser({ fence: isFenced });
  const groups: Line[][] = parser(source);

  expect(groups.length).toBe(2);
  expect(groups).toEqual([source.slice(0, 5), source.slice(5)]);
});

test('should not treat @npm/package or @ember/debug as tags', () => {
  const parser = getParser();
  const lines: Line[] = [
    {
      number: 1,
      source: '/**',
      tokens: seedTokens({
        start: '',
        delimiter: '/**',
        postDelimiter: '',
        description: '',
        end: '',
      }),
    },
    {
      number: 2,
      source: ' * Description line',
      tokens: seedTokens({
        start: ' ',
        delimiter: '*',
        postDelimiter: ' ',
        description: 'Description line',
        end: '',
      }),
    },
    {
      number: 3,
      source: ' * @ember/debug should not be treated as tag',
      tokens: seedTokens({
        start: ' ',
        delimiter: '*',
        postDelimiter: ' ',
        description: '@ember/debug should not be treated as tag',
        end: '',
      }),
    },
    {
      number: 4,
      source: ' * @npm/package should not be treated as tag either',
      tokens: seedTokens({
        start: ' ',
        delimiter: '*',
        postDelimiter: ' ',
        description: '@npm/package should not be treated as tag either',
        end: '',
      }),
    },
    {
      number: 5,
      source: ' * @param {string} value',
      tokens: seedTokens({
        start: ' ',
        delimiter: '*',
        postDelimiter: ' ',
        description: '@param {string} value',
        end: '',
      }),
    },
    {
      number: 6,
      source: ' */',
      tokens: seedTokens({
        start: ' ',
        delimiter: '',
        postDelimiter: '',
        description: '',
        end: '*/',
      }),
    },
  ];

  const groups: Line[][] = parser(lines);

  // Should have 2 sections: description (lines 0-3) and @param tag (lines 4-5)
  // @ember/debug and @npm/package should stay in description, not create new sections
  expect(groups.length).toBe(2);
  expect(groups[0]).toEqual([lines[0], lines[1], lines[2], lines[3]]);
  expect(groups[1]).toEqual([lines[4], lines[5]]);
});
