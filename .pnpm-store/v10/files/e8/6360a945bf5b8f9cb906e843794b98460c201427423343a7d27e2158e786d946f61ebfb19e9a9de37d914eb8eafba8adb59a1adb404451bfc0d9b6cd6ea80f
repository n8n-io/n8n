import ClassificationsGetter from './getter.js';
import ClassificationsScheduler from './scheduler.js';
const data = (client) => {
    return {
        scheduler: () => new ClassificationsScheduler(client),
        getter: () => new ClassificationsGetter(client),
    };
};
export default data;
export { default as ClassificationsGetter } from './getter.js';
export { default as ClassificationsScheduler } from './scheduler.js';
