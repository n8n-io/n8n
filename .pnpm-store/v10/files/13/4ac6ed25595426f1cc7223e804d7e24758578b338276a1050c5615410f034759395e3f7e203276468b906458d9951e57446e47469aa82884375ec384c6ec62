import { outdent } from 'outdent';

import { getLineColLocation, getCodeframe } from '../format/codeframes';
import { LocationObject } from '../walk';
import { Source } from '../resolve';

describe('Location', () => {
  it('should correctly calculate location for key', () => {
    const loc = {
      reportOnKey: true,
      pointer: '#/info/license',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license:
              name: MIT
              url: https://google.com
        `
      ),
    };
    const preciseLocation = getLineColLocation(loc);
    expect(preciseLocation.start).toEqual({ line: 3, col: 3 });
    expect(preciseLocation.end).toEqual({ line: 3, col: 10 });
  });

  it('should correctly calculate location for key on top level', () => {
    const loc = {
      reportOnKey: true,
      pointer: '#/info',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license:
              name: MIT
              url: https://google.com
        `
      ),
    };
    const preciseLocation = getLineColLocation(loc);
    expect(preciseLocation.start).toEqual({ line: 2, col: 1 });
    expect(preciseLocation.end).toEqual({ line: 2, col: 5 });
  });

  it('should correctly calculate location for value', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/license/name',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license:
              name: MIT
              url: https://google.com
        `
      ),
    };
    const preciseLocation = getLineColLocation(loc);
    expect(preciseLocation.start).toEqual({ line: 4, col: 11 });
    expect(preciseLocation.end).toEqual({ line: 4, col: 14 });
  });

  it('should correctly fallback to the closest parent node if pointer is incorrect', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/missing',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license:
              name: MIT
              url: https://google.com
        `
      ),
    };
    const preciseLocation = getLineColLocation(loc);
    expect(preciseLocation.start).toEqual({ line: 3, col: 3 });
    expect(preciseLocation.end).toEqual({ line: 5, col: 28 });
  });

  it('should correctly fallback to the closest parent node if node value is null', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/servers',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          servers:
          info:
            license:
              name: MIT
              url: https://google.com
        `
      ),
    };
    const preciseLocation = getLineColLocation(loc);
    expect(preciseLocation.start).toEqual({ line: 2, col: 1 });
    expect(preciseLocation.end).toEqual({ line: 2, col: 9 });
  });

  it('should return first line for empty doc', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/missing',
      source: new Source('foobar.yaml', ''),
    };
    const preciseLocation = getLineColLocation(loc);
    expect(preciseLocation.start).toEqual({ line: 1, col: 1 });
    expect(preciseLocation.end).toEqual({ line: 1, col: 1 });
  });

  it('should return full range for file with newlines', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/missing',
      source: new Source('foobar.yaml', '\n\n\n'),
    };
    const preciseLocation = getLineColLocation(loc);
    expect(preciseLocation.start).toEqual({ line: 1, col: 1 });
    expect(preciseLocation.end).toEqual({ line: 1, col: 1 });
  });
});

describe('codeframes', () => {
  function getColorCodeframe(loc: LocationObject) {
    return getCodeframe(getLineColLocation(loc), true)
      .replace(/\x1b\[90m(.*?)\x1b\[39m/g, '<g>$1</g>')
      .replace(/\x1b\[31m(.*?)\x1b\[39m/g, '<r>$1</r>');
  }

  function getPlainCodeframe(loc: LocationObject) {
    return getCodeframe(getLineColLocation(loc), false);
  }

  expect.addSnapshotSerializer({
    test: (val) => typeof val === 'string',
    print: (v) => v as string,
  });

  it('should correctly generate simple codeframe', () => {
    const loc = {
      reportOnKey: true,
      pointer: '#/info/license',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license:
              name: MIT
              url: https://google.com
            `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | openapi: 3.0.2
      2 | info:
      3 |   license:
        |   ^^^^^^^
      4 |     name: MIT
      5 |     url: https://google.com
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>1 |</g> <g>openapi: 3.0.2</g>
      <g>2 |</g> <g>info:</g>
      <g>3 |</g>   <r>license</r>:
      <g>4 |</g>     <g>name: MIT</g>
      <g>5 |</g>     <g>url: https://google.com</g>
    `);
  });

  it('correctly generate code-frame for single-line file on key', () => {
    const loc = {
      reportOnKey: true,
      pointer: '#/openapi',
      source: new Source('foobar.yaml', `openapi: 3.0.2`),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | openapi: 3.0.2
        | ^^^^^^^
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`<g>1 |</g> <r>openapi</r>: 3.0.2`);
  });

  it('correctly generate code-frame for single-line file on value', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/openapi',
      source: new Source('foobar.yaml', `openapi: 3.0.2`),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | openapi: 3.0.2
        |          ^^^^^
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`<g>1 |</g> openapi: <r>3.0.2</r>`);
  });

  it('correctly generate code-frame for multiline-value', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/license',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license:
              name: MIT
              url: https://google.com
            `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      2 | info:
      3 |   license:
      4 |     name: MIT
        |     ^^^^^^^^^
      5 |     url: https://google.com
        |     ^^^^^^^^^^^^^^^^^^^^^^^
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>2 |</g> <g>info:</g>
      <g>3 |</g>   <g>license:</g>
      <g>4 |</g>     <r>name: MIT</r>
      <g>5 |</g>     <r>url: https://google.com</r>
    `);
  });

  it('correctly generate code-frame for multiline-value json-like', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/license',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license: {
              name: MIT,
              url: https://google.com
            }
            `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | openapi: 3.0.2
      2 | info:
      3 |   license: {
        |            ^
      4 |     name: MIT,
        |     ^^^^^^^^^^
      5 |     url: https://google.com
        |     ^^^^^^^^^^^^^^^^^^^^^^^
      6 |   }
        |   ^
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>1 |</g> <g>openapi: 3.0.2</g>
      <g>2 |</g> <g>info:</g>
      <g>3 |</g>   license: <r>{</r>
      <g>4 |</g>     <r>name: MIT,</r>
      <g>5 |</g>     <r>url: https://google.com</r>
      <g>6 |</g>   <r>}</r>
    `);
  });

  it('correctly generate code-frame for multiline-value and show only 5 lines', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/license',
      source: new Source(
        'foobar.yaml',
        outdent`
          info:
            license:
              name: MIT
              field2: MIT
              field3: MIT
              field4: MIT
              field5: MIT
              url: https://google.com
          openapi: 3.0.2
          `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | info:
      2 |   license:
      3 |     name: MIT
        |     ^^^^^^^^^
      4 |     field2: MIT
        |     ^^^^^^^^^^^
      … |     < 3 more lines >
      8 |     url: https://google.com
        |     ^^^^^^^^^^^^^^^^^^^^^^^
      9 | openapi: 3.0.2
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>1 |</g> <g>info:</g>
      <g>2 |</g>   <g>license:</g>
      <g>3 |</g>     <r>name: MIT</r>
      <g>4 |</g>     <r>field2: MIT</r>
      <g>… |</g>     <g>< 3 more lines ></g>
      <g>8 |</g>     <r>url: https://google.com</r>
      <g>9 |</g> <g>openapi: 3.0.2</g>
    `);
  });

  it('correctly generate code-frame for multiline-value and show only 5 lines with empty lines', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/license',
      source: new Source(
        'foobar.yaml',
        outdent`
          info:

            license:
              name: MIT

              field2: MIT
              field3: MIT
              field4: MIT
              field5: MIT
          `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      2 |
      3 | license:
      4 |   name: MIT
        |   ^^^^^^^^^
      5 |
        |   ^
      … |   < 3 more lines >
      9 |   field5: MIT
        |   ^^^^^^^^^^^
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>2 |</g>
      <g>3 |</g> <g>license:</g>
      <g>4 |</g>   <r>name: MIT</r>
      <g>5 |</g>
      <g>… |</g>   <g>< 3 more lines ></g>
      <g>9 |</g>   <r>field5: MIT</r>
    `);
  });

  it('correctly generate code-frame dedent', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/paths/~1pet/put/parameters/0/in',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            license:
              name: MIT
              url: https://google.com
          paths:
            '/pet':
              put:
                operationId: test
                parameters:
                  - name: a
                    in: wrong
              post:
                operationId: test2
          `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      10 |   parameters:
      11 |     - name: a
      12 |       in: wrong
         |           ^^^^^
      13 | post:
      14 |   operationId: test2
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>10 |</g>   <g>parameters:</g>
      <g>11 |</g>     <g>- name: a</g>
      <g>12 |</g>       in: <r>wrong</r>
      <g>13 |</g> <g>post:</g>
      <g>14 |</g>   <g>operationId: test2</g>
    `);
  });

  it('correctly generate code-frame for too long line', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/description',
      source: new Source(
        'foobar.yaml',
        outdent`
          openapi: 3.0.2
          info:
            description: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
            license:
              name: MIT
              url: https://google.com
          `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | openapi: 3.0.2
      2 | info:
      3 |   description: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...<77 chars>
        |                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^...<77 chars>
      4 |   license:
      5 |     name: MIT
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>1 |</g> <g>openapi: 3.0.2</g>
      <g>2 |</g> <g>info:</g>
      <g>3 |</g>   description: [31mLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolo<g>...<87 chars></g>
      <g>4 |</g>   <g>license:</g>
      <g>5 |</g>     <g>name: MIT</g>
    `);
  });

  it('correctly generate code-frame for empty file', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/info/description',
      source: new Source('foobar.yaml', `\n\n`),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 |
        | ^
      2 |
      3 |
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>1 |</g>
      <g>2 |</g>
      <g>3 |</g>
    `);
  });

  it('correctly generate code-frame for whole file and correctly skip newlines', () => {
    const loc = {
      reportOnKey: false,
      pointer: '#/',
      source: new Source(
        'foobar.yaml',
        outdent`
        openapi: 3.0.2

        info:

          description: Lorem ipsum
          license:
            name: MIT
            url: https://google.com
      `
      ),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | openapi: 3.0.2
        | ^^^^^^^^^^^^^^
      2 |
        | ^
      … | < 5 more lines >
      8 |     url: https://google.com
        |     ^^^^^^^^^^^^^^^^^^^^^^^
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>1 |</g> <r>openapi: 3.0.2</r>
      <g>2 |</g>
      <g>… |</g> <g>< 5 more lines ></g>
      <g>8 |</g>     <r>url: https://google.com</r>
    `);
  });

  it('should show line even if there are not so many file in the file', () => {
    // (yaml parser sometimes shows error on the next after last line
    const loc = {
      reportOnKey: false,
      pointer: undefined,
      start: {
        line: 2,
        col: 1,
      },
      source: new Source('foobar.yaml', outdent`openapi: 3.0.2`),
    };

    expect(getPlainCodeframe(loc)).toMatchInlineSnapshot(`
      1 | openapi: 3.0.2
      2 |
        | ^
    `);

    expect(getColorCodeframe(loc)).toMatchInlineSnapshot(`
      <g>1 |</g> <g>openapi: 3.0.2</g>
      <g>2 |</g>
    `);
  });
});
