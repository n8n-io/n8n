import NodesStatusGetter from './nodesStatusGetter.js';
const cluster = (client) => {
    return {
        nodesStatusGetter: () => new NodesStatusGetter(client),
    };
};
export default cluster;
export { default as NodesStatusGetter } from './nodesStatusGetter.js';
