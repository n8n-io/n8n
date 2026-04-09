#!/usr/bin/env node

const majorNodeVersion = parseInt(process.versions.node, 10);
if (majorNodeVersion < 18) {
  console.error('To run Storybook you need to have Node.js 18 or higher');
  process.exit(1);
}

// The Storybook CLI has a catch block for all of its commands, but if an error
// occurs before the command even runs, for instance, if an import fails, then
// such error will fall under the uncaughtException handler.
// This is the earliest moment we can catch such errors.
process.once('uncaughtException', (error) => {
  if (error.message.includes('string-width')) {
    console.error(
      [
        '🔴 Error: It looks like you are having a known issue with package hoisting.',
        'Please check the following issue for details and solutions: https://github.com/storybookjs/storybook/issues/22431#issuecomment-1630086092\n\n',
      ].join('\n')
    );
  }

  throw error;
});

require('../dist/proxy.cjs');
