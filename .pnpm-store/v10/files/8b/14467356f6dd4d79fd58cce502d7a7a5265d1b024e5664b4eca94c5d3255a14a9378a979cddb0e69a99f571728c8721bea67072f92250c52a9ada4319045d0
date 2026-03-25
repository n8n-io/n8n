import Connection from '../connection/index.js';
import NodesStatusGetter from './nodesStatusGetter.js';
export type NodeStatus = 'HEALTHY' | 'UNHEALTHY' | 'UNAVAILABLE';
export interface Cluster {
    nodesStatusGetter: () => NodesStatusGetter;
}
declare const cluster: (client: Connection) => Cluster;
export default cluster;
export { default as NodesStatusGetter } from './nodesStatusGetter.js';
