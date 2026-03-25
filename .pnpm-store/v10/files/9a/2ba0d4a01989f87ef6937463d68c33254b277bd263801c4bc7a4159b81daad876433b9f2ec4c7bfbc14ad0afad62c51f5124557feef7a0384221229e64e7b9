import { outdent } from 'outdent';

import { formatProblems, getTotals } from '../format/format';
import { LocationObject, NormalizedProblem } from '../walk';
import { Source } from '../resolve';

describe('format', () => {
  function replaceColors(log: string) {
    return log
      .replace(/\x1b\[33m(.*?)\x1b\[39m/g, '<o>$1</o>') // orange
      .replace(/\x1b\[31m(.*?)\x1b\[39m/g, '<r>$1</r>'); // red
  }

  const problems = [
    {
      ruleId: 'spec',
      location: [],
      severity: 'error' as const,
      message: 'message',
      suggest: [],
    },
    {
      ruleId: 'spec',
      location: [],
      severity: 'error' as const,
      message: 'message 2',
      suggest: [],
    },
    {
      ruleId: 'other-rule',
      location: [],
      severity: 'warn' as const,
      message: 'message',
      suggest: [],
    },
  ];

  let output = '';
  beforeEach(() => {
    output = '';
    jest.spyOn(process.stderr, 'write').mockImplementation((str: string | Uint8Array) => {
      output += str;
      return true;
    });
    jest.spyOn(process.stdout, 'write').mockImplementation((str: string | Uint8Array) => {
      output += str;
      return true;
    });
  });

  it('should correctly format summary output', () => {
    formatProblems(problems, {
      format: 'summary',
      version: '1.0.0',
      totals: getTotals(problems),
      color: false,
    });

    expect(output).toMatchInlineSnapshot(`
      "error   spec: 2
      warning other-rule: 1

      "
    `);
  });

  it('should correctly format summary output in color mode', () => {
    formatProblems(problems, {
      format: 'summary',
      version: '1.0.0',
      totals: getTotals(problems),
      color: true,
    });

    expect(replaceColors(output)).toMatchInlineSnapshot(`
      "<r>error  </r> spec: 2
      <o>warning</o> other-rule: 1

      "
    `);
  });

  it('should format problems using github-actions', () => {
    const problems = [
      {
        ruleId: 'spec',
        message: 'message',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 1, col: 2 },
            end: { line: 3, col: 4 },
          } as LocationObject,
        ],
        suggest: [],
      },
    ];

    formatProblems(problems, {
      format: 'github-actions',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toEqual(
      '::error title=spec,file=openapi.yaml,line=1,col=2,endLine=3,endColumn=4::message\n'
    );
  });

  it('should format problems using markdown', () => {
    const problems = [
      {
        ruleId: 'spec',
        message: 'message',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 1, col: 2 },
            end: { line: 3, col: 4 },
          } as LocationObject,
        ],
        suggest: [],
      },
    ];

    formatProblems(problems, {
      format: 'markdown',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toMatchInlineSnapshot(`
      "## Lint: openapi.yaml

      | Severity | Location | Problem | Message |
      |---|---|---|---|
      | error | line 1:2 | [spec](https://redocly.com/docs/cli/rules/spec/) | message |

      Validation failed
      Errors: 1

      "
    `);
  });
});
