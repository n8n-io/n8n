import { Location } from '../../../../ref-utils';
import { Source } from '../../../../resolve';
import { AssertionFnContext, Asserts, asserts, buildAssertCustomFunction } from '../asserts';

let baseLocation = new Location(jest.fn() as any as Source, 'pointer');

const assertionProperties = {
  baseLocation: baseLocation,
} as AssertionFnContext;

describe('oas3 assertions', () => {
  describe('generic rules', () => {
    const fakeNode = {
      foo: '',
      bar: '',
      baz: '',
    };

    describe('pattern', () => {
      it('value should match regex pattern', () => {
        expect(asserts.pattern('test string', '/test/', assertionProperties)).toEqual([]);
        expect(asserts.pattern('test string', '/test me/', assertionProperties)).toEqual([
          { location: baseLocation, message: '"test string" should match a regex /test me/' },
        ]);
        expect(asserts.pattern(['test string', 'test me'], '/test/', assertionProperties)).toEqual(
          []
        );
        expect(
          asserts.pattern(['test string', 'test me'], '/test me/', assertionProperties)
        ).toEqual([
          {
            message: '"test string" should match a regex /test me/',
            location: baseLocation.key(),
          },
        ]);
        expect(
          asserts.pattern(
            './components/smth/test.yaml',
            '/^(./)?components/.*.yaml$/',
            assertionProperties
          )
        ).toEqual([]);
        expect(
          asserts.pattern('./other.yaml', '/^(./)?components/.*.yaml$/', assertionProperties)
        ).toEqual([
          {
            message: '"./other.yaml" should match a regex /^(./)?components/.*.yaml$/',
            location: baseLocation,
          },
        ]);
      });
    });

    describe('notPattern', () => {
      it('value should not match regex pattern', () => {
        expect(asserts.notPattern('test string', '/test me/', assertionProperties)).toEqual([]);
        expect(asserts.notPattern('test string', '/test/', assertionProperties)).toEqual([
          { location: baseLocation, message: '"test string" should not match a regex /test/' },
        ]);
        expect(
          asserts.notPattern(['test string', 'test me'], '/test other/', assertionProperties)
        ).toEqual([]);
        expect(
          asserts.notPattern(['test string', 'test me'], '/test me/', assertionProperties)
        ).toEqual([
          {
            message: '"test me" should not match a regex /test me/',
            location: baseLocation.key(),
          },
        ]);
      });
    });

    describe('ref', () => {
      it('value should have ref', () => {
        expect(
          asserts.ref({ $ref: 'text' }, true, {
            ...assertionProperties,
            rawValue: { $ref: 'text' },
          })
        ).toEqual([]);
        expect(asserts.ref({}, true, { ...assertionProperties, rawValue: {} })).toEqual([
          {
            message: 'should use $ref',
            location: baseLocation.key(),
          },
        ]);
      });

      it('value should not have ref', () => {
        expect(
          asserts.ref({ $ref: 'text' }, false, {
            ...assertionProperties,
            rawValue: { $ref: 'text' },
          })
        ).toEqual([
          {
            message: 'should not use $ref',
            location: baseLocation,
          },
        ]);
        expect(asserts.ref({}, false, { ...assertionProperties, rawValue: {} })).toEqual([]);
      });

      it('value should match regex pattern', () => {
        expect(
          asserts.ref({ $ref: 'test string' }, '/test/', {
            ...assertionProperties,
            rawValue: { $ref: 'test string' },
          })
        ).toEqual([]);
        expect(
          asserts.ref({ $ref: 'test string' }, '/test me/', {
            ...assertionProperties,
            rawValue: { $ref: 'text' },
          })
        ).toEqual([{ message: '$ref value should match /test me/', location: baseLocation }]);
        expect(
          asserts.ref({ $ref: './components/smth/test.yaml' }, '/^(./)?components/.*.yaml$/', {
            ...assertionProperties,
            rawValue: { $ref: './components/smth/test.yaml' },
          })
        ).toEqual([]);
        expect(
          asserts.ref({ $ref: './paths/smth/test.yaml' }, '/^(./)?components/.*.yaml$/', {
            ...assertionProperties,
            rawValue: { $ref: './paths/smth/test.yaml' },
          })
        ).toEqual([
          {
            message: '$ref value should match /^(./)?components/.*.yaml$/',
            location: baseLocation,
          },
        ]);
      });
    });

    describe('enum', () => {
      it('value should be among predefined keys', () => {
        expect(asserts.enum('test', ['test', 'example'], assertionProperties)).toEqual([]);
        expect(asserts.enum(['test'], ['test', 'example'], assertionProperties)).toEqual([]);
        expect(asserts.enum(['test', 'example'], ['test', 'example'], assertionProperties)).toEqual(
          []
        );
        expect(
          asserts.enum(['test', 'example', 'foo'], ['test', 'example'], assertionProperties)
        ).toEqual([
          {
            message: '"foo" should be one of the predefined values',
            location: baseLocation.child('foo').key(),
          },
        ]);
        expect(asserts.enum('test', ['foo', 'example'], assertionProperties)).toEqual([
          {
            message: '"test" should be one of the predefined values',
            location: baseLocation,
          },
        ]);
        expect(asserts.enum(['test', 'foo'], ['test', 'example'], assertionProperties)).toEqual([
          {
            message: '"foo" should be one of the predefined values',
            location: baseLocation.child('foo').key(),
          },
        ]);
      });
    });

    describe('defined', () => {
      it('value should be defined', () => {
        expect(asserts.defined('test', true, assertionProperties)).toEqual([]);
        expect(asserts.defined(undefined, true, assertionProperties)).toEqual([
          {
            message: 'Should be defined',
            location: baseLocation,
          },
        ]);
      });
      it('value should be undefined', () => {
        expect(asserts.defined(undefined, false, assertionProperties)).toEqual([]);
        expect(asserts.defined('test', false, assertionProperties)).toEqual([
          {
            message: 'Should be not defined',
            location: baseLocation,
          },
        ]);
      });
    });

    describe('undefined', () => {
      it('value should be undefined', () => {
        expect(asserts.undefined(undefined, true, assertionProperties)).toEqual([]);
        expect(asserts.undefined('test', true, assertionProperties)).toEqual([
          {
            message: 'Should not be defined',
            location: baseLocation,
          },
        ]);
      });
      it('value should be defined', () => {
        expect(asserts.undefined('test', false, assertionProperties)).toEqual([]);
        expect(asserts.undefined(undefined, false, assertionProperties)).toEqual([
          {
            message: 'Should be defined',
            location: baseLocation,
          },
        ]);
      });
    });

    describe('required', () => {
      it('values should be required', () => {
        expect(
          asserts.required(['one', 'two', 'three'], ['one', 'two'], assertionProperties)
        ).toEqual([]);
        expect(
          asserts.required(['one', 'two'], ['one', 'two', 'three'], assertionProperties)
        ).toEqual([
          {
            message: 'three is required',
            location: baseLocation.key(),
          },
        ]);
      });
    });

    describe('nonEmpty', () => {
      it('value should not be empty', () => {
        expect(asserts.nonEmpty('test', true, assertionProperties)).toEqual([]);
        expect(asserts.nonEmpty('', true, assertionProperties)).toEqual([
          {
            message: 'Should not be empty',
            location: baseLocation,
          },
        ]);
        expect(asserts.nonEmpty(null, true, assertionProperties)).toEqual([
          {
            message: 'Should not be empty',
            location: baseLocation,
          },
        ]);
        expect(asserts.nonEmpty(undefined, true, assertionProperties)).toEqual([
          {
            message: 'Should not be empty',
            location: baseLocation,
          },
        ]);
      });
      it('value should be empty', () => {
        expect(asserts.nonEmpty('', false, assertionProperties)).toEqual([]);
        expect(asserts.nonEmpty(null, false, assertionProperties)).toEqual([]);
        expect(asserts.nonEmpty(undefined, false, assertionProperties)).toEqual([]);
        expect(asserts.nonEmpty('test', false, assertionProperties)).toEqual([
          {
            message: 'Should be empty',
            location: baseLocation,
          },
        ]);
      });
    });

    describe('minLength', () => {
      it('value should have less or equal than 5 symbols length', () => {
        expect(asserts.minLength('test', 5, assertionProperties)).toEqual([
          {
            message: 'Should have at least 5 characters',
            location: baseLocation,
          },
        ]);
        expect(asserts.minLength([1, 2, 3, 4], 5, assertionProperties)).toEqual([
          {
            message: 'Should have at least 5 characters',
            location: baseLocation,
          },
        ]);
        expect(asserts.minLength([1, 2, 3, 4, 5], 5, assertionProperties)).toEqual([]);
        expect(asserts.minLength([1, 2, 3, 4, 5, 6], 5, assertionProperties)).toEqual([]);
        expect(asserts.minLength('example', 5, assertionProperties)).toEqual([]);
        expect(asserts.minLength([], 5, assertionProperties)).toEqual([
          {
            message: 'Should have at least 5 characters',
            location: baseLocation,
          },
        ]);
        expect(asserts.minLength('', 5, assertionProperties)).toEqual([
          {
            message: 'Should have at least 5 characters',
            location: baseLocation,
          },
        ]);
      });
    });

    describe('maxLength', () => {
      it('value should have more or equal than 5 symbols length', () => {
        expect(asserts.maxLength('test', 5, assertionProperties)).toEqual([]);
        expect(asserts.maxLength([1, 2, 3, 4], 5, assertionProperties)).toEqual([]);
        expect(asserts.maxLength([1, 2, 3, 4, 5], 5, assertionProperties)).toEqual([]);
        expect(asserts.maxLength([1, 2, 3, 4, 5, 6], 5, assertionProperties)).toEqual([
          {
            message: 'Should have at most 5 characters',
            location: baseLocation,
          },
        ]);
        expect(asserts.maxLength('example', 5, assertionProperties)).toEqual([
          {
            message: 'Should have at most 5 characters',
            location: baseLocation,
          },
        ]);
        expect(asserts.maxLength([], 5, assertionProperties)).toEqual([]);
        expect(asserts.maxLength('', 5, assertionProperties)).toEqual([]);
      });
    });

    describe('casing', () => {
      it('value should be camelCase', () => {
        expect(asserts.casing(['testExample', 'fooBar'], 'camelCase', assertionProperties)).toEqual(
          []
        );
        expect(asserts.casing(['f'], 'camelCase', assertionProperties)).toEqual([]);
        expect(asserts.casing(['Q'], 'camelCase', assertionProperties)).toEqual([
          {
            message: '"Q" should use camelCase',
            location: baseLocation.child('Q').key(),
          },
        ]);
        expect(asserts.casing(['fQ'], 'camelCase', assertionProperties)).toEqual([]);
        expect(asserts.casing(['testExample', 'FooBar'], 'camelCase', assertionProperties)).toEqual(
          [
            {
              message: '"FooBar" should use camelCase',
              location: baseLocation.child('FooBar').key(),
            },
          ]
        );
        expect(asserts.casing('testExample', 'camelCase', assertionProperties)).toEqual([]);
        expect(asserts.casing('TestExample', 'camelCase', assertionProperties)).toEqual([
          {
            message: '"TestExample" should use camelCase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test-example', 'camelCase', assertionProperties)).toEqual([
          {
            message: '"test-example" should use camelCase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test_example', 'camelCase', assertionProperties)).toEqual([
          {
            message: '"test_example" should use camelCase',
            location: baseLocation,
          },
        ]);
      });
      it('value should be PascalCase', () => {
        expect(asserts.casing('TestExample', 'PascalCase', assertionProperties)).toEqual([]);
        expect(
          asserts.casing(['TestExample', 'FooBar'], 'PascalCase', assertionProperties)
        ).toEqual([]);
        expect(
          asserts.casing(['TestExample', 'fooBar'], 'PascalCase', assertionProperties)
        ).toEqual([
          {
            message: '"fooBar" should use PascalCase',
            location: baseLocation.child('fooBar').key(),
          },
        ]);
        expect(asserts.casing('testExample', 'PascalCase', assertionProperties)).toEqual([
          {
            message: '"testExample" should use PascalCase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test-example', 'PascalCase', assertionProperties)).toEqual([
          {
            message: '"test-example" should use PascalCase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test_example', 'PascalCase', assertionProperties)).toEqual([
          {
            message: '"test_example" should use PascalCase',
            location: baseLocation,
          },
        ]);
      });
      it('value should be kebab-case', () => {
        expect(asserts.casing('test-example', 'kebab-case', assertionProperties)).toEqual([]);
        expect(
          asserts.casing(['test-example', 'foo-bar'], 'kebab-case', assertionProperties)
        ).toEqual([]);
        expect(
          asserts.casing(['test-example', 'foo_bar'], 'kebab-case', assertionProperties)
        ).toEqual([
          {
            message: '"foo_bar" should use kebab-case',
            location: baseLocation.child('foo_bar').key(),
          },
        ]);
        expect(asserts.casing('testExample', 'kebab-case', assertionProperties)).toEqual([
          {
            message: '"testExample" should use kebab-case',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TestExample', 'kebab-case', assertionProperties)).toEqual([
          {
            message: '"TestExample" should use kebab-case',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test_example', 'kebab-case', assertionProperties)).toEqual([
          {
            message: '"test_example" should use kebab-case',
            location: baseLocation,
          },
        ]);
      });
      it('value should be snake_case', () => {
        expect(asserts.casing('test_example', 'snake_case', assertionProperties)).toEqual([]);
        expect(
          asserts.casing(['test_example', 'foo_bar'], 'snake_case', assertionProperties)
        ).toEqual([]);
        expect(
          asserts.casing(['test_example', 'foo-bar'], 'snake_case', assertionProperties)
        ).toEqual([
          {
            message: '"foo-bar" should use snake_case',
            location: baseLocation.child('foo-bar').key(),
          },
        ]);
        expect(asserts.casing('testExample', 'snake_case', assertionProperties)).toEqual([
          {
            message: '"testExample" should use snake_case',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TestExample', 'snake_case', assertionProperties)).toEqual([
          {
            message: '"TestExample" should use snake_case',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test-example', 'snake_case', assertionProperties)).toEqual([
          {
            message: '"test-example" should use snake_case',
            location: baseLocation,
          },
        ]);
      });
      it('value should be MACRO_CASE', () => {
        expect(asserts.casing('TEST_EXAMPLE', 'MACRO_CASE', assertionProperties)).toEqual([]);
        expect(
          asserts.casing(['TEST_EXAMPLE', 'FOO_BAR'], 'MACRO_CASE', assertionProperties)
        ).toEqual([]);
        expect(
          asserts.casing(['TEST_EXAMPLE', 'FOO-BAR'], 'MACRO_CASE', assertionProperties)
        ).toEqual([
          {
            message: '"FOO-BAR" should use MACRO_CASE',
            location: baseLocation.child('FOO-BAR').key(),
          },
        ]);
        expect(asserts.casing('TEST_EXAMPLE_', 'MACRO_CASE', assertionProperties)).toEqual([
          {
            message: '"TEST_EXAMPLE_" should use MACRO_CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('_TEST_EXAMPLE', 'MACRO_CASE', assertionProperties)).toEqual([
          {
            message: '"_TEST_EXAMPLE" should use MACRO_CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TEST__EXAMPLE', 'MACRO_CASE', assertionProperties)).toEqual([
          {
            message: '"TEST__EXAMPLE" should use MACRO_CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TEST-EXAMPLE', 'MACRO_CASE', assertionProperties)).toEqual([
          {
            message: '"TEST-EXAMPLE" should use MACRO_CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('testExample', 'MACRO_CASE', assertionProperties)).toEqual([
          {
            message: '"testExample" should use MACRO_CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TestExample', 'MACRO_CASE', assertionProperties)).toEqual([
          {
            message: '"TestExample" should use MACRO_CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test-example', 'MACRO_CASE', assertionProperties)).toEqual([
          {
            message: '"test-example" should use MACRO_CASE',
            location: baseLocation,
          },
        ]);
      });
      it('value should be COBOL-CASE', () => {
        expect(asserts.casing('TEST-EXAMPLE', 'COBOL-CASE', assertionProperties)).toEqual([]);
        expect(
          asserts.casing(['TEST-EXAMPLE', 'FOO-BAR'], 'COBOL-CASE', assertionProperties)
        ).toEqual([]);
        expect(
          asserts.casing(['TEST-EXAMPLE', 'FOO_BAR'], 'COBOL-CASE', assertionProperties)
        ).toEqual([
          {
            message: '"FOO_BAR" should use COBOL-CASE',
            location: baseLocation.child('FOO_BAR').key(),
          },
        ]);
        expect(asserts.casing('TEST-EXAMPLE-', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"TEST-EXAMPLE-" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('0TEST-EXAMPLE', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"0TEST-EXAMPLE" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('-TEST-EXAMPLE', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"-TEST-EXAMPLE" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TEST--EXAMPLE', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"TEST--EXAMPLE" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TEST_EXAMPLE', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"TEST_EXAMPLE" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('testExample', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"testExample" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TestExample', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"TestExample" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test-example', 'COBOL-CASE', assertionProperties)).toEqual([
          {
            message: '"test-example" should use COBOL-CASE',
            location: baseLocation,
          },
        ]);
      });
      it('value should be flatcase', () => {
        expect(asserts.casing('testexample', 'flatcase', assertionProperties)).toEqual([]);
        expect(asserts.casing(['testexample', 'foobar'], 'flatcase', assertionProperties)).toEqual(
          []
        );
        expect(asserts.casing(['testexample', 'foo_bar'], 'flatcase', assertionProperties)).toEqual(
          [
            {
              message: '"foo_bar" should use flatcase',
              location: baseLocation.child('foo_bar').key(),
            },
          ]
        );
        expect(asserts.casing('testexample_', 'flatcase', assertionProperties)).toEqual([
          {
            message: '"testexample_" should use flatcase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('0testexample', 'flatcase', assertionProperties)).toEqual([
          {
            message: '"0testexample" should use flatcase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('testExample', 'flatcase', assertionProperties)).toEqual([
          {
            message: '"testExample" should use flatcase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('TestExample', 'flatcase', assertionProperties)).toEqual([
          {
            message: '"TestExample" should use flatcase',
            location: baseLocation,
          },
        ]);
        expect(asserts.casing('test-example', 'flatcase', assertionProperties)).toEqual([
          {
            message: '"test-example" should use flatcase',
            location: baseLocation,
          },
        ]);
      });
    });

    describe('sortOrder', () => {
      it('value should be ordered in ASC direction', () => {
        expect(asserts.sortOrder(['example', 'foo', 'test'], 'asc', assertionProperties)).toEqual(
          []
        );
        expect(
          asserts.sortOrder(['example', 'foo', 'test'], { direction: 'asc' }, assertionProperties)
        ).toEqual([]);
        expect(asserts.sortOrder(['example'], 'asc', assertionProperties)).toEqual([]);
        expect(asserts.sortOrder(['example', 'test', 'foo'], 'asc', assertionProperties)).toEqual([
          {
            message: 'Should be sorted in an ascending order',
            location: baseLocation,
          },
        ]);
        expect(asserts.sortOrder(['example', 'foo', 'test'], 'desc', assertionProperties)).toEqual([
          {
            message: 'Should be sorted in a descending order',
            location: baseLocation,
          },
        ]);
        expect(
          asserts.sortOrder(
            [{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }],
            { direction: 'asc', property: 'name' },
            assertionProperties
          )
        ).toEqual([]);
        expect(
          asserts.sortOrder(
            [{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }],
            { direction: 'desc', property: 'name' },
            assertionProperties
          )
        ).toEqual([
          {
            message: 'Should be sorted in a descending order by property name',
            location: baseLocation,
          },
        ]);
      });
      it('value should be ordered in DESC direction', () => {
        expect(asserts.sortOrder(['test', 'foo', 'example'], 'desc', assertionProperties)).toEqual(
          []
        );
        expect(
          asserts.sortOrder(['test', 'foo', 'example'], { direction: 'desc' }, assertionProperties)
        ).toEqual([]);
        expect(asserts.sortOrder(['example'], 'desc', assertionProperties)).toEqual([]);
        expect(asserts.sortOrder(['example', 'test', 'foo'], 'desc', assertionProperties)).toEqual([
          {
            message: 'Should be sorted in a descending order',
            location: baseLocation,
          },
        ]);
        expect(asserts.sortOrder(['test', 'foo', 'example'], 'asc', assertionProperties)).toEqual([
          {
            message: 'Should be sorted in an ascending order',
            location: baseLocation,
          },
        ]);
        expect(
          asserts.sortOrder(
            [{ name: 'foo' }, { name: 'baz' }, { name: 'bar' }],
            { direction: 'desc', property: 'name' },
            assertionProperties
          )
        ).toEqual([]);
        expect(
          asserts.sortOrder(
            [{ name: 'foo' }, { name: 'baz' }, { name: 'bar' }],
            { direction: 'asc', property: 'name' },
            assertionProperties
          )
        ).toEqual([
          {
            message: 'Should be sorted in an ascending order by property name',
            location: baseLocation,
          },
        ]);
      });
      it('should not order objects without property defined', () => {
        expect(
          asserts.sortOrder(
            [
              { name: 'bar', id: 1 },
              { name: 'baz', id: 2 },
              { name: 'foo', id: 3 },
            ],
            { direction: 'desc' },
            assertionProperties
          )
        ).toEqual([
          {
            message: 'Please define a property to sort objects by',
            location: baseLocation,
          },
        ]);
        expect(
          asserts.sortOrder(
            [
              { name: 'bar', id: 1 },
              { name: 'baz', id: 2 },
              { name: 'foo', id: 3 },
            ],
            { direction: 'asc' },
            assertionProperties
          )
        ).toEqual([
          {
            message: 'Please define a property to sort objects by',
            location: baseLocation,
          },
        ]);
      });
      it('should ignore string value casing while ordering', () => {
        expect(asserts.sortOrder(['Example', 'foo', 'Test'], 'asc', assertionProperties)).toEqual(
          []
        );
        expect(asserts.sortOrder(['Test', 'foo', 'Example'], 'desc', assertionProperties)).toEqual(
          []
        );
        expect(
          asserts.sortOrder(
            [{ name: 'bar' }, { name: 'Baz' }, { name: 'Foo' }],
            { direction: 'asc', property: 'name' },
            assertionProperties
          )
        ).toEqual([]);
        expect(
          asserts.sortOrder(
            [{ name: 'Foo' }, { name: 'baz' }, { name: 'Bar' }],
            { direction: 'desc', property: 'name' },
            assertionProperties
          )
        ).toEqual([]);
      });
    });

    describe('mutuallyExclusive', () => {
      it('node should not have more than one property from predefined list', () => {
        expect(
          asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'test'], assertionProperties)
        ).toEqual([]);
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), [], assertionProperties)).toEqual(
          []
        );
        expect(
          asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'bar'], assertionProperties)
        ).toEqual([
          { message: 'foo, bar keys should be mutually exclusive', location: baseLocation.key() },
        ]);
        expect(
          asserts.mutuallyExclusive(
            Object.keys(fakeNode),
            ['foo', 'bar', 'test'],
            assertionProperties
          )
        ).toEqual([
          {
            message: 'foo, bar, test keys should be mutually exclusive',
            location: baseLocation.key(),
          },
        ]);
      });
    });

    describe('mutuallyRequired', () => {
      it('node should have all the properties from predefined list', () => {
        expect(
          asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'bar'], assertionProperties)
        ).toEqual([]);
        expect(
          asserts.mutuallyRequired(
            Object.keys(fakeNode),
            ['foo', 'bar', 'baz'],
            assertionProperties
          )
        ).toEqual([]);
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), [], assertionProperties)).toEqual(
          []
        );
        expect(
          asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'test'], assertionProperties)
        ).toEqual([
          { message: 'Properties foo, test are mutually required', location: baseLocation.key() },
        ]);
        expect(
          asserts.mutuallyRequired(
            Object.keys(fakeNode),
            ['foo', 'bar', 'test'],
            assertionProperties
          )
        ).toEqual([
          {
            message: 'Properties foo, bar, test are mutually required',
            location: baseLocation.key(),
          },
        ]);
      });
    });

    describe('requireAny', () => {
      it('node must have at least one property from predefined list', () => {
        expect(
          asserts.requireAny(Object.keys(fakeNode), ['foo', 'test'], assertionProperties)
        ).toEqual([]);
        expect(
          asserts.requireAny(Object.keys(fakeNode), ['test', 'bar'], assertionProperties)
        ).toEqual([]);
        expect(asserts.requireAny(Object.keys(fakeNode), [], assertionProperties)).toEqual([
          {
            message: 'Should have any of ',
            location: baseLocation.key(),
          },
        ]);
        expect(
          asserts.requireAny(Object.keys(fakeNode), ['test', 'test1'], assertionProperties)
        ).toEqual([
          {
            message: 'Should have any of test, test1',
            location: baseLocation.key(),
          },
        ]);
        expect(
          asserts.requireAny(Object.keys(fakeNode), ['foo', 'bar'], assertionProperties)
        ).toEqual([]);
        expect(
          asserts.requireAny(Object.keys(fakeNode), ['foo', 'bar', 'test'], assertionProperties)
        ).toEqual([]);
      });
    });

    describe('function', () => {
      it('node must have at least one property from predefined list', () => {
        const customFn = jest.fn((value: string[], options: any) => {
          if (value[0] === options.word) {
            return [
              { message: `First value should be ${options.word}`, location: baseLocation.key() },
            ];
          }
          return [];
        });
        asserts['local/customFn' as keyof Asserts] = buildAssertCustomFunction(customFn);
        expect(
          asserts['local/customFn' as keyof Asserts](
            Object.keys(fakeNode),
            { word: 'foo' },
            assertionProperties
          )
        ).toEqual([
          {
            message: 'First value should be foo',
            location: baseLocation.key(),
          },
        ]);
        expect(customFn.mock.calls.length).toBe(1);
        expect(customFn.mock.calls[0][0]).toEqual(Object.keys(fakeNode));
      });
    });
  });
});
