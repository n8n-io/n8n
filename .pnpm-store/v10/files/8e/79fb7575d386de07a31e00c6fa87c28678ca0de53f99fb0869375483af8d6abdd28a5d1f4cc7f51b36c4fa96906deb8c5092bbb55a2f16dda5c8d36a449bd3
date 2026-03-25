import { describe, it, expect } from 'vitest';
import * as fixtures from '../__fixtures__/fixtures.js';
import { load } from '../load-parse.js';

interface RedSelObject {
  red: string | undefined;
  sel: string | undefined;
}

interface RedSelMultipleObject {
  red: string[];
  sel: string[];
}

describe('$.extract', () => {
  it('() : should extract values for selectors', () => {
    const $ = load(fixtures.eleven);
    const $root = load(fixtures.eleven).root();
    // An empty object should lead to an empty extraction.

    // $ExpectType ExtractedMap<{}>
    const emptyExtract = $root.extract({});
    expect(emptyExtract).toStrictEqual({});
    // Non-existent values should be undefined.

    // $ExpectType ExtractedMap<{ foo: string; }>
    const simpleExtract = $root.extract({ foo: 'bar' });
    expect(simpleExtract).toStrictEqual({ foo: undefined });

    // Existing values should be extracted.
    expect<{ red: string | undefined }>(
      $root.extract({ red: '.red' }),
    ).toStrictEqual({
      red: 'Four',
    });
    expect<RedSelObject>(
      $root.extract({ red: '.red', sel: '.sel' }),
    ).toStrictEqual({
      red: 'Four',
      sel: 'Three',
    });
    // Descriptors for extractions should be supported
    expect<RedSelObject>(
      $root.extract({
        red: { selector: '.red' },
        sel: { selector: '.sel' },
      }),
    ).toStrictEqual({ red: 'Four', sel: 'Three' });
    // Should support extraction of multiple values.

    // $ExpectType ExtractedMap<{ red: [string]; sel: [string]; }>
    const multipleExtract = $root.extract({
      red: ['.red'],
      sel: ['.sel'],
    });
    expect<RedSelMultipleObject>(multipleExtract).toStrictEqual({
      red: ['Four', 'Five', 'Nine'],
      sel: ['Three', 'Nine', 'Eleven'],
    });
    // Should support custom `prop`s.
    expect<RedSelObject>(
      $root.extract({
        red: { selector: '.red', value: 'outerHTML' },
        sel: { selector: '.sel', value: 'tagName' },
      }),
    ).toStrictEqual({ red: '<li class="red">Four</li>', sel: 'LI' });
    // Should support custom `prop`s for multiple values.
    expect<{ red: string[] }>(
      $root.extract({
        red: [{ selector: '.red', value: 'outerHTML' }],
      }),
    ).toStrictEqual({
      red: [
        '<li class="red">Four</li>',
        '<li class="red">Five</li>',
        '<li class="red sel">Nine</li>',
      ],
    });
    // Should support custom extraction functions.
    expect<{ red: string | undefined }>(
      $root.extract({
        red: {
          selector: '.red',
          value: (el, key) => `${key}=${$(el).text()}`,
        },
      }),
    ).toStrictEqual({ red: 'red=Four' });
    // Should support custom extraction functions for multiple values.
    expect<{ red: string[] }>(
      $root.extract({
        red: [
          {
            selector: '.red',
            value: (el, key) => `${key}=${$(el).text()}`,
          },
        ],
      }),
    ).toStrictEqual({ red: ['red=Four', 'red=Five', 'red=Nine'] });
    // Should support extraction objects

    // $ExpectType ExtractedMap<{ section: { selector: string; value: { red: string; sel: string; }; }; }>
    const subExtractObject = $root.extract({
      section: {
        selector: 'ul:nth(1)',
        value: {
          red: '.red',
          sel: '.blue',
        },
      },
    });

    expect<{ section: RedSelObject | undefined }>(
      subExtractObject,
    ).toStrictEqual({
      section: {
        red: 'Five',
        sel: 'Seven',
      },
    });
  });
});
