/**
 * @jest-environment jsdom
 */

import { output } from '../output';

describe('output', () => {
  it('should ignore all parsable data in browser', () => {
    const spyingStdout = jest.spyOn(process.stdout, 'write').mockImplementation();
    const data = '{ "errors" : [] }';

    output.write(data);

    expect(spyingStdout).not.toBeCalled();

    spyingStdout.mockRestore();
  });
});
