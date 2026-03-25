import { dateTimestampProvider } from '../scheduler/dateTimestampProvider';
import { map } from './map';
export function timestamp(timestampProvider) {
    if (timestampProvider === void 0) { timestampProvider = dateTimestampProvider; }
    return map(function (value) { return ({ value: value, timestamp: timestampProvider.now() }); });
}
//# sourceMappingURL=timestamp.js.map