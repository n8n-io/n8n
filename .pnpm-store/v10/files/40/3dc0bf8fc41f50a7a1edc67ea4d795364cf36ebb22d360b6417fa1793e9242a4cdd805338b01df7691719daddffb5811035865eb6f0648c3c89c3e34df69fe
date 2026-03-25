import LiveChecker from './liveChecker.js';
import MetaGetter from './metaGetter.js';
import OpenidConfigurationGetter from './openidConfigurationGetter.js';
import ReadyChecker from './readyChecker.js';
const misc = (client, dbVersionProvider) => {
    return {
        liveChecker: () => new LiveChecker(client, dbVersionProvider),
        readyChecker: () => new ReadyChecker(client, dbVersionProvider),
        metaGetter: () => new MetaGetter(client),
        openidConfigurationGetter: () => new OpenidConfigurationGetter(client.http),
    };
};
export default misc;
export { default as LiveChecker } from './liveChecker.js';
export { default as MetaGetter } from './metaGetter.js';
export { default as OpenidConfigurationGetter } from './openidConfigurationGetter.js';
export { default as ReadyChecker } from './readyChecker.js';
