import Aggregator from './aggregator.js';
import Explorer from './explorer.js';
import GraphQLGetter from './getter.js';
import Raw from './raw.js';
const graphql = (client) => {
    return {
        get: () => new GraphQLGetter(client),
        aggregate: () => new Aggregator(client),
        explore: () => new Explorer(client),
        raw: () => new Raw(client),
    };
};
export default graphql;
export { default as Aggregator } from './aggregator.js';
export { default as Explorer } from './explorer.js';
export { FusionType, default as GraphQLGetter } from './getter.js';
export { default as Raw } from './raw.js';
