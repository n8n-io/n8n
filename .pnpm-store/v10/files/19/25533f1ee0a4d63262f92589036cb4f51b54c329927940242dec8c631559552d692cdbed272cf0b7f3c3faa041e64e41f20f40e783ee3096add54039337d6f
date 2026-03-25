import Connection from '../connection/index.js';
import ClassificationsGetter from './getter.js';
import ClassificationsScheduler from './scheduler.js';
export interface Classifications {
    scheduler: () => ClassificationsScheduler;
    getter: () => ClassificationsGetter;
}
declare const data: (client: Connection) => Classifications;
export default data;
export { default as ClassificationsGetter } from './getter.js';
export { default as ClassificationsScheduler } from './scheduler.js';
