/*
Language: Leaf
Description: A Swift-based templating language created for the Vapor project.
Website: https://docs.vapor.codes/leaf/overview
Category: template
*/

function leaf(hljs) {
  const IDENT = /([A-Za-z_][A-Za-z_0-9]*)?/;
  const LITERALS = [
    'true',
    'false',
    'in'
  ];
  const PARAMS = {
    scope: 'params',
    begin: /\(/,
    end: /\)(?=\:?)/,
    endsParent: true,
    relevance: 7,
    contains: [
      {
        scope: 'string',
        begin: '"',
        end: '"'
      },
      {
        scope: 'keyword',
        match: LITERALS.join("|"),
      },
      {
        scope: 'variable',
        match: /[A-Za-z_][A-Za-z_0-9]*/
      },
      {
        scope: 'operator',
        match: /\+|\-|\*|\/|\%|\=\=|\=|\!|\>|\<|\&\&|\|\|/
      }
    ]
  };
  const INSIDE_DISPATCH = {
    match: [
      IDENT,
      /(?=\()/,
    ],
    scope: {
      1: "keyword"
    },
    contains: [ PARAMS ]
  };
  PARAMS.contains.unshift(INSIDE_DISPATCH);
  return {
    name: 'Leaf',
    contains: [
      // #ident():
      {
        match: [
          /#+/,
          IDENT,
          /(?=\()/,
        ],
        scope: {
          1: "punctuation",
          2: "keyword"
        },
        // will start up after the ending `)` match from line ~44
        // just to grab the trailing `:` if we can match it
        starts: {
          contains: [
            {
              match: /\:/,
              scope: "punctuation"
            }
          ]
        },
        contains: [
          PARAMS
        ],
      },
      // #ident or #ident:
      {
        match: [
          /#+/,
          IDENT,
          /:?/,
        ],
        scope: {
          1: "punctuation",
          2: "keyword",
          3: "punctuation"
        }
      },
    ]
  };
}

export { leaf as default };
