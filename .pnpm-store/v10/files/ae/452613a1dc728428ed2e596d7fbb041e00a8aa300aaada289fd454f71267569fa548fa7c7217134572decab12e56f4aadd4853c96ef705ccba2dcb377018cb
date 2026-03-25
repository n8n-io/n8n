const { nodeFileTrace } = require('@vercel/nft');

const entryPoint = require.resolve('..');

// Trace the module entrypoint
nodeFileTrace([entryPoint]).then((result) => {
  console.log('@vercel/nft traced dependencies:', Array.from(result.fileList));

  // If either binary is picked up, fail the test
  if (result.fileList.has('sentry-cli') || result.fileList.has('sentry-cli.exe')) {
    console.error('ERROR: The sentry-cli binary should not be found by @vercel/nft');
    process.exit(-1);
  } else {
    console.log('The sentry-cli binary was not traced by @vercel/nft');
  }
});
