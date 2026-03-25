import { Assertions } from '../.';

const opts = {
  '0': {
    subject: {
      type: 'Operation',
      property: 'summary',
    },
    description: 'example warn text',
    severity: 'warn',
    assertions: { pattern: '/example/' },
  },
  '1': {
    subject: {
      type: 'PathItem',
    },
    where: [
      {
        subject: { type: 'Operation', filterInParentKeys: ['post'], property: 'responses' },
        assertions: { defined: true },
      },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { mutuallyExclusive: ['summary', 'security'] },
  },
  '2': {
    subject: { type: 'PathItem', property: 'tags' },
    where: [
      { subject: { type: 'Operation', property: 'responses' }, assertions: { defined: true } },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { sortOrder: 'desc' },
  },
  '3': {
    subject: { type: 'Foo', property: 'test' },
    where: [
      { subject: { type: 'Bar' }, assertions: {} },
      { subject: { type: 'Baz' }, assertions: {} },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { sortOrder: 'desc' },
  },
  '4': {
    subject: {
      type: 'any',
      property: 'description',
    },
    description: 'example warn text',
    severity: 'warn',
    assertions: { notPattern: '/example/' },
  },
};

describe('Oas3 assertions', () => {
  it('should return the right visitor structure', () => {
    const visitors = Assertions(opts as any);
    expect(visitors).toMatchInlineSnapshot(`
      [
        {
          "Operation": {
            "enter": [Function],
          },
        },
        {
          "Operation": {
            "PathItem": {
              "enter": [Function],
            },
            "skip": [Function],
          },
        },
        {
          "Operation": {
            "PathItem": {
              "enter": [Function],
            },
            "skip": [Function],
          },
        },
        {
          "Bar": {
            "Baz": {
              "Foo": {
                "enter": [Function],
              },
            },
          },
        },
        {
          "any": {
            "enter": [Function],
          },
        },
      ]
    `);
  });
});
