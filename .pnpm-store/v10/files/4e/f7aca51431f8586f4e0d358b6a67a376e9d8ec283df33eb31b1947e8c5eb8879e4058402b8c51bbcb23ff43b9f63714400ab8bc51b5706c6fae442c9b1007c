"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.epilogue = void 0;
// Add new examples here.
// Always start with `$ $0` so that it a) symbolizes a command line; and b) $0 gets replaced by the binary name uniformly.
const examples = [
    {
        description: 'Output nothing more than stdout+stderr of child processes',
        example: '$ $0 --raw "npm run watch-less" "npm run watch-js"',
    },
    {
        description: 'Normal output but without colors e.g. when logging to file',
        example: '$ $0 --no-color "grunt watch" "http-server" > log',
    },
    {
        description: 'Custom prefix',
        example: '$ $0 --prefix "{time}-{pid}" "npm run watch" "http-server"',
    },
    {
        description: 'Custom names and colored prefixes',
        example: '$ $0 --names "HTTP,WATCH" -c "bgBlue.bold,bgMagenta.bold" "http-server" "npm run watch"',
    },
    {
        description: 'Auto varying colored prefixes',
        example: '$ $0 -c "auto" "npm run watch" "http-server"',
    },
    {
        description: 'Mixing auto and manual colored prefixes',
        example: '$ $0 -c "red,auto" "npm run watch" "http-server" "echo hello"',
    },
    {
        description: 'Configuring via environment variables with CONCURRENTLY_ prefix',
        example: '$ CONCURRENTLY_RAW=true CONCURRENTLY_KILL_OTHERS=true $0 "echo hello" "echo world"',
    },
    {
        description: 'Send input to default',
        example: [
            '$ $0 --handle-input "nodemon" "npm run watch-js"',
            'rs  # Sends rs command to nodemon process',
        ].join('\n'),
    },
    {
        description: 'Send input to specific child identified by index',
        example: ['$ $0 --handle-input "npm run watch-js" nodemon', '1:rs'].join('\n'),
    },
    {
        description: 'Send input to specific child identified by name',
        example: ['$ $0 --handle-input -n js,srv "npm run watch-js" nodemon', 'srv:rs'].join('\n'),
    },
    {
        description: 'Shortened NPM run commands',
        example: '$ $0 npm:watch-node npm:watch-js npm:watch-css',
    },
    {
        description: 'Shortened NPM run command with wildcard (make sure to wrap it in quotes!)',
        example: '$ $0 "npm:watch-*"',
    },
    {
        description: 'Exclude patterns so that between "lint:js" and "lint:fix:js", only "lint:js" is ran',
        example: '$ $0 "npm:*(!fix)"',
    },
    {
        description: "Passthrough some additional arguments via '{<number>}' placeholder",
        example: '$ $0 -P "echo {1}" -- foo',
    },
    {
        description: "Passthrough all additional arguments via '{@}' placeholder",
        example: '$ $0 -P "npm:dev-* -- {@}" -- --watch --noEmit',
    },
    {
        description: "Passthrough all additional arguments combined via '{*}' placeholder",
        example: '$ $0 -P "npm:dev-* -- {*}" -- --watch --noEmit',
    },
];
const examplesString = examples
    .map(({ example, description }) => [
    ` - ${description}`,
    example
        .split('\n')
        .map((line) => `     ${line}`)
        .join('\n'),
].join('\n\n'))
    .join('\n\n');
exports.epilogue = `
Examples:

${examplesString}

For more details, visit https://github.com/open-cli-tools/concurrently
`;
