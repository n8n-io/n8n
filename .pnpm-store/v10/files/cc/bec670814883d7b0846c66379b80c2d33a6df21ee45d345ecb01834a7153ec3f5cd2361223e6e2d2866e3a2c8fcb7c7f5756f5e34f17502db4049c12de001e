import { zip as zipStatic } from '../observable/zip';
import { operate } from '../util/lift';
export function zip(...sources) {
    return operate((source, subscriber) => {
        zipStatic(source, ...sources).subscribe(subscriber);
    });
}
//# sourceMappingURL=zip.js.map