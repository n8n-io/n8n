export { Filters } from './classes.js';
import { FilterCount, FilterCreationTime, FilterId, FilterProperty, FilterRef, FilterUpdateTime, } from './classes.js';
const filter = () => {
    return {
        byProperty: (name, length = false) => {
            return new FilterProperty(name, length);
        },
        byRef: (linkOn) => {
            return new FilterRef({ type_: 'single', linkOn: linkOn });
        },
        byRefMultiTarget: (linkOn, targetCollection) => {
            return new FilterRef({
                type_: 'multi',
                linkOn: linkOn,
                targetCollection: targetCollection,
            });
        },
        byRefCount: (linkOn) => {
            return new FilterCount(linkOn);
        },
        byId: () => {
            return new FilterId();
        },
        byCreationTime: () => {
            return new FilterCreationTime();
        },
        byUpdateTime: () => {
            return new FilterUpdateTime();
        },
    };
};
export default filter;
