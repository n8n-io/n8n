#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./utils/assert-node-version");
const yargs = require("yargs");
const colors = require("colorette");
const openapi_core_1 = require("@redocly/openapi-core");
const types_1 = require("./types");
const preview_docs_1 = require("./commands/preview-docs");
const stats_1 = require("./commands/stats");
const split_1 = require("./commands/split");
const join_1 = require("./commands/join");
const push_status_1 = require("./cms/commands/push-status");
const lint_1 = require("./commands/lint");
const bundle_1 = require("./commands/bundle");
const login_1 = require("./commands/login");
const build_docs_1 = require("./commands/build-docs");
const update_version_notifier_1 = require("./utils/update-version-notifier");
const wrapper_1 = require("./wrapper");
const preview_project_1 = require("./commands/preview-project");
const translations_1 = require("./commands/translations");
const eject_1 = require("./commands/eject");
const constants_1 = require("./commands/preview-project/constants");
const push_1 = require("./commands/push");
if (!('replaceAll' in String.prototype)) {
    require('core-js/actual/string/replace-all');
}
(0, update_version_notifier_1.cacheLatestVersion)();
yargs
    .version('version', 'Show version number.', update_version_notifier_1.version)
    .help('help', 'Show help.')
    .parserConfiguration({ 'greedy-arrays': false, 'camel-case-expansion': false })
    .command('stats [api]', 'Show statistics for an API description.', (yargs) => yargs.positional('api', { type: 'string' }).option({
    config: { description: 'Path to the config file.', type: 'string' },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
    format: {
        description: 'Use a specific output format.',
        choices: ['stylish', 'json', 'markdown'],
        default: 'stylish',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'stats';
    (0, wrapper_1.commandWrapper)(stats_1.handleStats)(argv);
})
    .command('split [api]', 'Split an API description into a multi-file structure.', (yargs) => yargs
    .positional('api', {
    description: 'API description file that you want to split',
    type: 'string',
})
    .option({
    outDir: {
        description: 'Output directory where files will be saved.',
        required: true,
        type: 'string',
    },
    separator: {
        description: 'File path separator used while splitting.',
        required: false,
        type: 'string',
        default: '_',
    },
    config: {
        description: 'Path to the config file.',
        requiresArg: true,
        type: 'string',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
})
    .demandOption('api'), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'split';
    (0, wrapper_1.commandWrapper)(split_1.handleSplit)(argv);
})
    .command('join [apis...]', 'Join multiple API descriptions into one [experimental].', (yargs) => yargs
    .positional('apis', {
    array: true,
    type: 'string',
    demandOption: true,
})
    .option({
    'prefix-tags-with-info-prop': {
        description: 'Prefix tags with property value from info object.',
        requiresArg: true,
        type: 'string',
    },
    'prefix-tags-with-filename': {
        description: 'Prefix tags with property value from file name.',
        type: 'boolean',
        default: false,
    },
    'prefix-components-with-info-prop': {
        description: 'Prefix components with property value from info object.',
        requiresArg: true,
        type: 'string',
    },
    'without-x-tag-groups': {
        description: 'Skip automated x-tagGroups creation',
        type: 'boolean',
    },
    output: {
        description: 'Output file.',
        alias: 'o',
        type: 'string',
    },
    config: {
        description: 'Path to the config file.',
        requiresArg: true,
        type: 'string',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
    lint: {
        hidden: true,
        deprecated: true,
    },
    decorate: {
        hidden: true,
        deprecated: true,
    },
    preprocess: {
        hidden: true,
        deprecated: true,
    },
}), (argv) => {
    const DEPRECATED_OPTIONS = ['lint', 'preprocess', 'decorate'];
    const DECORATORS_DOCUMENTATION_LINK = 'https://redocly.com/docs/cli/decorators/#decorators';
    const JOIN_COMMAND_DOCUMENTATION_LINK = 'https://redocly.com/docs/cli/commands/join/#join';
    DEPRECATED_OPTIONS.forEach((option) => {
        if (argv[option]) {
            process.stdout.write(`${colors.red(`Option --${option} is no longer supported. Please review join command documentation ${JOIN_COMMAND_DOCUMENTATION_LINK}.`)}`);
            process.stdout.write('\n\n');
            if (['preprocess', 'decorate'].includes(option)) {
                process.stdout.write(`${colors.red(`If you are looking for decorators, please review the decorators documentation ${DECORATORS_DOCUMENTATION_LINK}.`)}`);
                process.stdout.write('\n\n');
            }
            yargs.showHelp();
            process.exit(1);
        }
    });
    process.env.REDOCLY_CLI_COMMAND = 'join';
    (0, wrapper_1.commandWrapper)(join_1.handleJoin)(argv);
})
    .command('push-status [pushId]', false, (yargs) => yargs
    .positional('pushId', {
    description: 'Push id.',
    type: 'string',
    required: true,
})
    .implies('max-execution-time', 'wait')
    .option({
    organization: {
        description: 'Name of the organization to push to.',
        type: 'string',
        alias: 'o',
    },
    project: {
        description: 'Name of the project to push to.',
        type: 'string',
        required: true,
        alias: 'p',
    },
    domain: { description: 'Specify a domain.', alias: 'd', type: 'string', required: false },
    wait: {
        description: 'Wait for build to finish.',
        type: 'boolean',
        default: false,
    },
    'max-execution-time': {
        description: 'Maximum execution time in seconds.',
        type: 'number',
    },
    'continue-on-deploy-failures': {
        description: 'Command does not fail even if the deployment fails.',
        type: 'boolean',
        default: false,
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'push-status';
    (0, wrapper_1.commandWrapper)(push_status_1.handlePushStatus)(argv);
})
    .command('push [apis...]', 'Push an API description to the Redocly API registry.', (yargs) => yargs
    .positional('apis', {
    type: 'string',
    array: true,
    required: true,
    default: [],
})
    .hide('project')
    .hide('domain')
    .hide('mount-path')
    .hide('author')
    .hide('message')
    .hide('default-branch')
    .hide('verbose')
    .hide('commit-sha')
    .hide('commit-url')
    .hide('namespace')
    .hide('repository')
    .hide('wait-for-deployment')
    .hide('created-at')
    .hide('max-execution-time')
    .deprecateOption('batch-id', 'use --job-id')
    .implies('job-id', 'batch-size')
    .implies('batch-id', 'batch-size')
    .implies('batch-size', 'job-id')
    .implies('max-execution-time', 'wait-for-deployment')
    .option({
    destination: {
        description: 'API name and version in the format `name@version`.',
        type: 'string',
        alias: 'd',
    },
    branch: {
        description: 'Branch name to push to.',
        type: 'string',
        alias: 'b',
    },
    upsert: {
        description: "Create the specified API version if it doesn't exist, update if it does exist.",
        type: 'boolean',
        alias: 'u',
    },
    'batch-id': {
        description: 'Specifies the ID of the CI job that the current push will be associated with.',
        type: 'string',
        requiresArg: true,
        deprecated: true,
        hidden: true,
    },
    'job-id': {
        description: 'ID of the CI job that the current push will be associated with.',
        type: 'string',
        requiresArg: true,
    },
    'batch-size': {
        description: 'Number of CI pushes to expect in a batch.',
        type: 'number',
        requiresArg: true,
    },
    region: { description: 'Specify a region.', alias: 'r', choices: types_1.regionChoices },
    'skip-decorator': {
        description: 'Ignore certain decorators.',
        array: true,
        type: 'string',
    },
    public: {
        description: 'Make the API description available to the public',
        type: 'boolean',
    },
    files: {
        description: 'List of other folders and files to upload',
        array: true,
        type: 'string',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
    organization: {
        description: 'Name of the organization to push to.',
        type: 'string',
        alias: 'o',
    },
    project: {
        description: 'Name of the project to push to.',
        type: 'string',
        alias: 'p',
    },
    'mount-path': {
        description: 'The path files should be pushed to.',
        type: 'string',
        alias: 'mp',
    },
    author: {
        description: 'Author of the commit.',
        type: 'string',
        alias: 'a',
    },
    message: {
        description: 'Commit message.',
        type: 'string',
        alias: 'm',
    },
    'commit-sha': {
        description: 'Commit SHA.',
        type: 'string',
        alias: 'sha',
    },
    'commit-url': {
        description: 'Commit URL.',
        type: 'string',
        alias: 'url',
    },
    namespace: {
        description: 'Repository namespace.',
        type: 'string',
    },
    repository: {
        description: 'Repository name.',
        type: 'string',
    },
    'created-at': {
        description: 'Commit creation date.',
        type: 'string',
    },
    domain: { description: 'Specify a domain.', alias: 'd', type: 'string' },
    config: {
        description: 'Path to the config file.',
        requiresArg: true,
        type: 'string',
    },
    'default-branch': {
        type: 'string',
        default: 'main',
    },
    'max-execution-time': {
        description: 'Maximum execution time in seconds.',
        type: 'number',
    },
    'wait-for-deployment': {
        description: 'Wait for build to finish.',
        type: 'boolean',
        default: false,
    },
    verbose: {
        type: 'boolean',
        default: false,
    },
    'continue-on-deploy-failures': {
        description: 'Command does not fail even if the deployment fails.',
        type: 'boolean',
        default: false,
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'push';
    (0, wrapper_1.commandWrapper)((0, push_1.commonPushHandler)(argv))(argv);
})
    .command('lint [apis...]', 'Lint an API or Arazzo description.', (yargs) => yargs.positional('apis', { array: true, type: 'string', demandOption: true }).option({
    format: {
        description: 'Use a specific output format.',
        choices: [
            'stylish',
            'codeframe',
            'json',
            'checkstyle',
            'codeclimate',
            'summary',
            'markdown',
            'github-actions',
        ],
        default: 'codeframe',
    },
    'max-problems': {
        requiresArg: true,
        description: 'Reduce output to a maximum of N problems.',
        type: 'number',
        default: 100,
    },
    'generate-ignore-file': {
        description: 'Generate an ignore file.',
        type: 'boolean',
    },
    'skip-rule': {
        description: 'Ignore certain rules.',
        array: true,
        type: 'string',
    },
    'skip-preprocessor': {
        description: 'Ignore certain preprocessors.',
        array: true,
        type: 'string',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
    config: {
        description: 'Path to the config file.',
        requiresArg: true,
        type: 'string',
    },
    extends: {
        description: 'Override extends configurations (defaults or config file settings).',
        requiresArg: true,
        array: true,
        type: 'string',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'lint';
    (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argv);
})
    .command('bundle [apis...]', 'Bundle a multi-file API description to a single file.', (yargs) => yargs
    .positional('apis', { array: true, type: 'string', demandOption: true })
    .options({
    output: {
        type: 'string',
        description: 'Output file or folder for inline APIs.',
        alias: 'o',
    },
    ext: {
        description: 'Bundle file extension.',
        requiresArg: true,
        choices: types_1.outputExtensions,
    },
    'skip-preprocessor': {
        description: 'Ignore certain preprocessors.',
        array: true,
        type: 'string',
    },
    'skip-decorator': {
        description: 'Ignore certain decorators.',
        array: true,
        type: 'string',
    },
    dereferenced: {
        alias: 'd',
        type: 'boolean',
        description: 'Produce a fully dereferenced bundle.',
    },
    force: {
        alias: 'f',
        type: 'boolean',
        description: 'Produce bundle output even when errors occur.',
    },
    config: {
        description: 'Path to the config file.',
        type: 'string',
    },
    metafile: {
        description: 'Produce metadata about the bundle',
        type: 'string',
    },
    extends: {
        description: 'Override extends configurations (defaults or config file settings).',
        requiresArg: true,
        array: true,
        type: 'string',
        hidden: true,
    },
    'remove-unused-components': {
        description: 'Remove unused components.',
        type: 'boolean',
        default: false,
    },
    'keep-url-references': {
        description: 'Keep absolute url references.',
        type: 'boolean',
        alias: 'k',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
    format: {
        hidden: true,
        deprecated: true,
    },
    lint: {
        hidden: true,
        deprecated: true,
    },
    'skip-rule': {
        hidden: true,
        deprecated: true,
        array: true,
        type: 'string',
    },
    'max-problems': {
        hidden: true,
        deprecated: true,
    },
})
    .check((argv) => {
    if (argv.output && (!argv.apis || argv.apis.length === 0)) {
        throw new Error('At least one inline API must be specified when using --output.');
    }
    return true;
}), (argv) => {
    const DEPRECATED_OPTIONS = ['lint', 'format', 'skip-rule', 'max-problems'];
    const LINT_AND_BUNDLE_DOCUMENTATION_LINK = 'https://redocly.com/docs/cli/guides/lint-and-bundle/#lint-and-bundle-api-descriptions-with-redocly-cli';
    DEPRECATED_OPTIONS.forEach((option) => {
        if (argv[option]) {
            process.stdout.write(`${colors.red(`Option --${option} is no longer supported. Please use separate commands, as described in the ${LINT_AND_BUNDLE_DOCUMENTATION_LINK}.`)}`);
            process.stdout.write('\n\n');
            yargs.showHelp();
            process.exit(1);
        }
    });
    process.env.REDOCLY_CLI_COMMAND = 'bundle';
    (0, wrapper_1.commandWrapper)(bundle_1.handleBundle)(argv);
})
    .command('check-config', 'Lint the Redocly configuration file.', async (yargs) => yargs.option({
    config: {
        description: 'Path to the config file.',
        type: 'string',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error'],
        default: 'error',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'check-config';
    (0, wrapper_1.commandWrapper)()(argv);
})
    .command('login', 'Login to the Redocly API registry with an access token.', async (yargs) => yargs.options({
    verbose: {
        description: 'Include additional output.',
        type: 'boolean',
    },
    region: {
        description: 'Specify a region.',
        alias: 'r',
        choices: types_1.regionChoices,
    },
    config: {
        description: 'Path to the config file.',
        requiresArg: true,
        type: 'string',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'login';
    (0, wrapper_1.commandWrapper)(login_1.handleLogin)(argv);
})
    .command('logout', 'Clear your stored credentials for the Redocly API registry.', (yargs) => yargs, async (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'logout';
    await (0, wrapper_1.commandWrapper)(async () => {
        const client = new openapi_core_1.RedoclyClient();
        client.logout();
        process.stdout.write('Logged out from the Redocly account. ✋\n');
    })(argv);
})
    .command('preview', 'Preview Redocly project using one of the product NPM packages.', (yargs) => yargs.options({
    product: {
        type: 'string',
        choices: ['redoc', 'revel', 'reef', 'realm', 'redoc-revel', 'redoc-reef', 'revel-reef'],
        description: "Product used to launch preview. Default is inferred from project's package.json or 'realm' is used.",
    },
    plan: {
        type: 'string',
        choices: constants_1.PRODUCT_PLANS,
        default: 'enterprise',
    },
    port: {
        alias: 'p',
        type: 'number',
        description: 'Preview port.',
        default: 4000,
    },
    'project-dir': {
        alias: ['d', 'source-dir'],
        type: 'string',
        description: 'Specifies the project content directory. The default value is the directory where the command is executed.',
        default: '.',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
}), (argv) => {
    if (process.argv.some((arg) => arg.startsWith('--source-dir'))) {
        process.stderr.write(colors.red('Option --source-dir is deprecated and will be removed soon. Use --project-dir instead.\n'));
    }
    (0, wrapper_1.commandWrapper)(preview_project_1.previewProject)(argv);
})
    .command('preview-docs [api]', 'Preview API reference docs for an API description.', (yargs) => yargs.positional('api', { type: 'string' }).options({
    port: {
        alias: 'p',
        type: 'number',
        default: 8080,
        description: 'Preview port.',
    },
    host: {
        alias: 'h',
        type: 'string',
        default: '127.0.0.1',
        description: 'Preview host.',
    },
    'skip-preprocessor': {
        description: 'Ignore certain preprocessors.',
        array: true,
        type: 'string',
    },
    'skip-decorator': {
        description: 'Ignore certain decorators.',
        array: true,
        type: 'string',
    },
    'use-community-edition': {
        description: 'Use Redoc CE for documentation preview.',
        type: 'boolean',
    },
    force: {
        alias: 'f',
        type: 'boolean',
        description: 'Produce bundle output even when errors occur.',
    },
    config: {
        description: 'Path to the config file.',
        type: 'string',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'preview-docs';
    (0, wrapper_1.commandWrapper)(preview_docs_1.previewDocs)(argv);
})
    .command('build-docs [api]', 'Produce API documentation as an HTML file', (yargs) => yargs
    .positional('api', { type: 'string' })
    .options({
    o: {
        describe: 'Output destination file.',
        alias: 'output',
        type: 'string',
        default: 'redoc-static.html',
    },
    title: {
        describe: 'Page title.',
        type: 'string',
    },
    disableGoogleFont: {
        describe: 'Disable Google fonts.',
        type: 'boolean',
        default: false,
    },
    t: {
        alias: 'template',
        describe: 'Path to handlebars page template, see https://github.com/Redocly/redocly-cli/blob/main/packages/cli/src/commands/build-docs/template.hbs for the example.',
        type: 'string',
    },
    templateOptions: {
        describe: 'Additional options to pass to the template. Use dot notation, e.g. templateOptions.metaDescription',
    },
    theme: {
        describe: 'Redoc theme.openapi configuration. Use dot notation, e.g. theme.openapi.nativeScrollbars',
    },
    config: {
        describe: 'Path to the config file.',
        type: 'string',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
})
    .check((argv) => {
    if (argv.theme && !argv.theme?.openapi)
        throw Error('Invalid option: theme.openapi not set.');
    return true;
}), async (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'build-docs';
    (0, wrapper_1.commandWrapper)(build_docs_1.handlerBuildCommand)(argv);
})
    .command('translate <locale>', 'Creates or updates translations.yaml files and fills them with missing built-in translations and translations from the redocly.yaml and sidebars.yaml files.', (yargs) => yargs
    .positional('locale', {
    description: 'Locale code to generate translations for, or `all` for all current project locales.',
    type: 'string',
    demandOption: true,
})
    .options({
    'project-dir': {
        alias: 'd',
        type: 'string',
        description: 'Specifies the project content directory. The default value is the directory where the command is executed.',
        default: '.',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'translate';
    (0, wrapper_1.commandWrapper)(translations_1.handleTranslations)(argv);
})
    .command('eject <type> [path]', 'Helper function to eject project elements for customization.', (yargs) => yargs
    .positional('type', {
    description: 'Specifies what type of project element to eject. Currently this value must be `component`.',
    demandOption: true,
    choices: ['component'],
})
    .positional('path', {
    description: 'Filepath to a component or filepath with glob pattern.',
    type: 'string',
})
    .options({
    'project-dir': {
        alias: 'd',
        type: 'string',
        description: 'Specifies the project content directory. The default value is the directory where the command is executed.',
        default: '.',
    },
    force: {
        alias: 'f',
        type: 'boolean',
        description: 'Skips the "overwrite existing" confirmation when ejecting a component that is already ejected in the destination.',
    },
    'lint-config': {
        description: 'Severity level for config file linting.',
        choices: ['warn', 'error', 'off'],
        default: 'warn',
    },
}), (argv) => {
    process.env.REDOCLY_CLI_COMMAND = 'eject';
    (0, wrapper_1.commandWrapper)(eject_1.handleEject)(argv);
})
    .completion('completion', 'Generate autocomplete script for `redocly` command.')
    .demandCommand(1)
    .middleware([update_version_notifier_1.notifyUpdateCliVersion])
    .strict().argv;
