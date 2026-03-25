import { outdent } from 'outdent';
import { parseYaml, stringifyYaml } from '../js-yaml';

const yaml = `
  emptyValue:
  spaces in keys: spaces in keys
  numberString: '0123456789'
  number: 1000
  decimal: 12.34
  boolean: true
  dateWithoutQuotes: 2020-01-01
  dateWithQuotes: '2020-01-01'
  array:
    - 1
    - 2
  object:
    key1: 1
    key2: 2
`;

const yamlToDump = outdent`
  date: '2022-01-21T11:29:56.694Z'
  dateWithoutQuotes: 2020-01-01
  dateWithQuotes: '2020-01-01'
  dateImplicit: !!str 2020-01-01
  string: test
  stringWithQuotes: 'test'
  stringWithDoubleQuotes: "test"
`;

const jsObject = {
  emptyValue: null,
  'spaces in keys': 'spaces in keys',
  numberString: '0123456789',
  number: 1000,
  decimal: 12.34,
  boolean: true,
  dateWithoutQuotes: '2020-01-01',
  dateWithQuotes: '2020-01-01',
  array: [1, 2],
  object: { key1: 1, key2: 2 },
};

describe('js-yaml', () => {
  test('parseYaml', () => {
    expect(parseYaml(yaml)).toEqual(jsObject);
  });

  test('should correctly dump date and string', () => {
    expect(stringifyYaml(parseYaml(yamlToDump))).toMatchInlineSnapshot(
      `
    "date: '2022-01-21T11:29:56.694Z'
    dateWithoutQuotes: '2020-01-01'
    dateWithQuotes: '2020-01-01'
    dateImplicit: '2020-01-01'
    string: test
    stringWithQuotes: test
    stringWithDoubleQuotes: test
    "
    `
    );
  });

  test('parse and stringify', () => {
    expect(parseYaml(stringifyYaml(jsObject))).toEqual(jsObject);
  });

  test('should throw an error for unsupported types', () => {
    expect(() => stringifyYaml({ foo: () => {} })).toThrow(
      'unacceptable kind of an object to dump [object Function]'
    );
  });
});
