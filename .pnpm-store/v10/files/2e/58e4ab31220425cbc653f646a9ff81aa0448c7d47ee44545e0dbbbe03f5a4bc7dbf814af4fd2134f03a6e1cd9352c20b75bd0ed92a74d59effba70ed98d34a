import { Observable } from '../Observable';
import { innerFrom } from './innerFrom';
import { EMPTY } from './empty';
export function using(resourceFactory, observableFactory) {
    return new Observable((subscriber) => {
        const resource = resourceFactory();
        const result = observableFactory(resource);
        const source = result ? innerFrom(result) : EMPTY;
        source.subscribe(subscriber);
        return () => {
            if (resource) {
                resource.unsubscribe();
            }
        };
    });
}
//# sourceMappingURL=using.js.map