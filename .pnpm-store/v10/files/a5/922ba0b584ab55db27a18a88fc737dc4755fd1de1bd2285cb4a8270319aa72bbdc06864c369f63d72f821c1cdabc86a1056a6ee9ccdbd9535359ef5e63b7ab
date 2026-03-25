#!/usr/bin/env node
const { program } = require('commander');
const { version } = require('../package.json');
const { WireMockRestClient } = require('../dist/client/wiremock-rest.client');

function commaSeparatedList(value) {
    return value.split(',');
}

program
    .version(version)
    .command('load')
    .requiredOption('-f, --folders <folders>', 'Comma separated list of folders containing stub mappings to be loaded', commaSeparatedList)
    .option('--no-reset', 'Skip resetting all stub mappings')
    .option('-u, --uri [uri]', 'WireMock base URI', 'http://localhost:8080')
    .action(async (args) => {
        const wireMock = new WireMockRestClient(args.uri);

        if (args.reset) {
            await wireMock.mappings.resetAllMappings();
        }

        return Promise.all(
            args.folders.map((folder) => wireMock.mappings.createMappingsFromDir(folder))
        );
    });

program.parseAsync(process.argv);
