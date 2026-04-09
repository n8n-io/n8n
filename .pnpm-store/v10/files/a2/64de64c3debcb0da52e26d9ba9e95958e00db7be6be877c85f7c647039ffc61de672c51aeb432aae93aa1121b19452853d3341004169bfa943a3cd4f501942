"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHarLog = createHarLog;
const { name: packageName, version: packageVersion } = require('../../../package.json');
function createHarLog(entries = [], pageInfo = {}) {
    return {
        log: {
            version: '1.2',
            creator: {
                name: packageName,
                version: packageVersion,
            },
            pages: [
                Object.assign({
                    startedDateTime: new Date().toISOString(),
                    id: 'page_1',
                    title: 'Page',
                    pageTimings: {
                        onContentLoad: -1,
                        onLoad: -1,
                    },
                }, pageInfo),
            ],
            entries,
        },
    };
}
//# sourceMappingURL=create-har-log.js.map