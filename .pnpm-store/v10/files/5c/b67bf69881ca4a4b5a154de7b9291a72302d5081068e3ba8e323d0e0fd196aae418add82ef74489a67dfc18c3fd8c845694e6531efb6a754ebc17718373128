import { Assertion, AssertionDefinition } from '..';
import { AssertionContext } from '../../../../config';
import { Location } from '../../../../ref-utils';
import { Source } from '../../../../resolve';
import { isOrdered, buildVisitorObject, getIntersectionLength, runAssertion } from '../utils';

describe('Oas3 assertions', () => {
  describe('Utils', () => {
    describe('getCounts', () => {
      it('should return the right counts', () => {
        const arr = ['foo', 'bar', 'baz'];
        expect(getIntersectionLength(arr, ['foo'])).toBe(1);
        expect(getIntersectionLength(arr, ['foo', 'bar', 'baz'])).toBe(3);
        expect(getIntersectionLength(arr, ['foo', 'test', 'baz'])).toBe(2);
        expect(getIntersectionLength(arr, ['example', 'test'])).toBe(0);
      });
    });

    describe('isOrdered', () => {
      it('should say if array is ordered or not in specific direction', () => {
        expect(isOrdered(['example', 'foo', 'test'], 'asc')).toBeTruthy();
        expect(isOrdered(['example'], 'asc')).toBeTruthy();
        expect(isOrdered(['test', 'foo', 'example'], 'desc')).toBeTruthy();
        expect(isOrdered(['example'], 'desc')).toBeTruthy();
        expect(isOrdered(['example', 'test', 'foo'], 'asc')).toBeFalsy();
        expect(isOrdered(['example', 'foo', 'test'], 'desc')).toBeFalsy();
      });
    });

    describe('buildVisitorObject', () => {
      it('should return a consistent visitor structure', () => {
        const where: AssertionDefinition[] = [
          {
            subject: {
              type: 'Foo',
              filterInParentKeys: ['test'],
            },
            assertions: {},
          },
          {
            subject: {
              type: 'Bar',
              filterInParentKeys: ['test'],
            },
            assertions: {},
          },
          {
            subject: {
              type: 'Roof',
              filterInParentKeys: ['test'],
            },
            assertions: {},
          },
        ] as AssertionDefinition[];

        const visitors = buildVisitorObject(
          { subject: { type: 'Bar' }, where, assertions: {} } as Assertion,
          () => {}
        );

        expect(visitors).toMatchInlineSnapshot(`
          {
            "Foo": {
              "Bar": {
                "Roof": {
                  "Bar": {
                    "enter": [Function],
                  },
                  "skip": [Function],
                },
                "skip": [Function],
              },
              "skip": [Function],
            },
          }
        `);
      });

      it('should return the right visitor structure', () => {
        const where = [
          {
            subject: {
              type: 'Operation',
              filterInParentKeys: ['put'],
            },
            assertions: {},
          },
          {
            subject: {
              type: 'Responses',
              filterInParentKeys: [201, 200],
            },
            assertions: {},
          },
        ];

        const visitors = buildVisitorObject(
          { subject: { type: 'MediaTypesMap' }, where, assertions: {} } as Assertion,
          () => {}
        );

        expect(visitors).toMatchInlineSnapshot(`
          {
            "Operation": {
              "Responses": {
                "MediaTypesMap": {
                  "enter": [Function],
                },
                "skip": [Function],
              },
              "skip": [Function],
            },
          }
        `);
      });
    });

    describe('runAssertion', () => {
      const baseLocation = new Location(jest.fn() as any as Source, 'pointer');
      const rawLocation = new Location(jest.fn() as any as Source, 'raw-pointer');
      // { $ref: 'text' }, true, {...assertionProperties, rawValue:  { $ref: 'text' }}

      const ctxStub = {
        location: baseLocation,
        node: {
          property: 'test',
        },
        rawNode: {
          property: 'test',
        },
        rawLocation: rawLocation,
      } as AssertionContext;

      it('should catch error cause property should be not defined with assertionProperty', () => {
        const result = runAssertion({
          assert: {
            name: 'defined',
            conditions: false,
            runsOnKeys: true,
            runsOnValues: false,
          },
          ctx: ctxStub,
          assertionProperty: 'property',
        });

        const expectedLocation = new Location(jest.fn() as any as Source, 'pointer/property');

        expect(JSON.stringify(result)).toEqual(
          JSON.stringify([
            {
              message: 'Should be not defined',
              location: expectedLocation,
            },
          ])
        );
      });

      it('should pass cause property defined', () => {
        const result = runAssertion({
          assert: {
            name: 'defined',
            conditions: true,
            runsOnKeys: true,
            runsOnValues: false,
          },
          ctx: ctxStub,
          assertionProperty: 'property',
        });

        expect(result).toEqual([]);
      });

      it('should failure cause property does not passed', () => {
        const result = runAssertion({
          assert: {
            name: 'defined',
            conditions: false,
            runsOnKeys: true,
            runsOnValues: false,
          },
          ctx: ctxStub,
        });

        expect(result).toEqual([
          {
            message: 'Should be not defined',
            location: baseLocation,
          },
        ]);
      });

      it('should pass with ref assertion cause it is defined', () => {
        const result = runAssertion({
          assert: {
            name: 'ref',
            conditions: true,
            runsOnKeys: true,
            runsOnValues: false,
          },
          ctx: {
            ...ctxStub,
            rawNode: {
              $ref: 'test',
            },
          },
        });

        expect(result).toEqual([]);
      });

      it('should failure with ref assertion cause it is defined', () => {
        const result = runAssertion({
          assert: {
            name: 'ref',
            conditions: false,
            runsOnKeys: true,
            runsOnValues: false,
          },
          ctx: {
            ...ctxStub,
            rawNode: {
              $ref: 'test',
            },
          },
        });

        expect(result).toEqual([
          {
            message: 'should not use $ref',
            location: rawLocation,
          },
        ]);
      });
    });
  });
});
