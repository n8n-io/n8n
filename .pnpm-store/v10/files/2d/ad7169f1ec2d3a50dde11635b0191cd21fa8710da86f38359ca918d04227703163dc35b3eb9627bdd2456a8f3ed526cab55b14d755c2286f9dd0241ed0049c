"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStats = handleStats;
const perf_hooks_1 = require("perf_hooks");
const colors = require("colorette");
const openapi_core_1 = require("@redocly/openapi-core");
const miscellaneous_1 = require("../utils/miscellaneous");
const statsAccumulator = {
    refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
    externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
    schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
    parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
    links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
    pathItems: { metric: '🔀 Path Items', total: 0, color: 'green' },
    webhooks: { metric: '🎣 Webhooks', total: 0, color: 'green' },
    operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
    tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
};
function printStatsStylish(statsAccumulator) {
    for (const node in statsAccumulator) {
        const { metric, total, color } = statsAccumulator[node];
        process.stderr.write(colors[color](`${metric}: ${total} \n`));
    }
}
function printStatsJson(statsAccumulator) {
    const json = {};
    for (const key of Object.keys(statsAccumulator)) {
        json[key] = {
            metric: statsAccumulator[key].metric,
            total: statsAccumulator[key].total,
        };
    }
    process.stdout.write(JSON.stringify(json, null, 2));
}
function printStatsMarkdown(statsAccumulator) {
    let output = '| Feature  | Count  |\n| --- | --- |\n';
    for (const key of Object.keys(statsAccumulator)) {
        output +=
            '| ' +
                statsAccumulator[key].metric +
                ' | ' +
                statsAccumulator[key].total +
                ' |\n';
    }
    process.stdout.write(output);
}
function printStats(statsAccumulator, api, startedAt, format) {
    switch (format) {
        case 'stylish':
            process.stderr.write(`Document: ${colors.magenta(api)} stats:\n\n`);
            printStatsStylish(statsAccumulator);
            (0, miscellaneous_1.printExecutionTime)('stats', startedAt, api);
            break;
        case 'json':
            printStatsJson(statsAccumulator);
            break;
        case 'markdown':
            printStatsMarkdown(statsAccumulator);
            break;
    }
}
async function handleStats({ argv, config, collectSpecData }) {
    const [{ path }] = await (0, miscellaneous_1.getFallbackApisOrExit)(argv.api ? [argv.api] : [], config);
    const externalRefResolver = new openapi_core_1.BaseResolver(config.resolve);
    const { bundle: document } = await (0, openapi_core_1.bundle)({ config, ref: path });
    collectSpecData?.(document.parsed);
    const lintConfig = config.styleguide;
    const specVersion = (0, openapi_core_1.detectSpec)(document.parsed);
    const types = (0, openapi_core_1.normalizeTypes)(lintConfig.extendTypes((0, openapi_core_1.getTypes)(specVersion), specVersion), lintConfig);
    const startedAt = perf_hooks_1.performance.now();
    const ctx = {
        problems: [],
        oasVersion: specVersion,
        visitorsData: {},
    };
    const resolvedRefMap = await (0, openapi_core_1.resolveDocument)({
        rootDocument: document,
        rootType: types.Root,
        externalRefResolver,
    });
    const statsVisitor = (0, openapi_core_1.normalizeVisitors)([
        {
            severity: 'warn',
            ruleId: 'stats',
            visitor: (0, openapi_core_1.Stats)(statsAccumulator),
        },
    ], types);
    (0, openapi_core_1.walkDocument)({
        document,
        rootType: types.Root,
        normalizedVisitors: statsVisitor,
        resolvedRefMap,
        ctx,
    });
    printStats(statsAccumulator, path, startedAt, argv.format);
}
