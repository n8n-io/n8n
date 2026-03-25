export var COMPLETE_NOTIFICATION = (function () { return createNotification('C', undefined, undefined); })();
export function errorNotification(error) {
    return createNotification('E', undefined, error);
}
export function nextNotification(value) {
    return createNotification('N', value, undefined);
}
export function createNotification(kind, value, error) {
    return {
        kind: kind,
        value: value,
        error: error,
    };
}
//# sourceMappingURL=NotificationFactories.js.map