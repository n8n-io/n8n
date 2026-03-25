export const COMPLETE_NOTIFICATION = (() => createNotification('C', undefined, undefined))();
export function errorNotification(error) {
    return createNotification('E', undefined, error);
}
export function nextNotification(value) {
    return createNotification('N', value, undefined);
}
export function createNotification(kind, value, error) {
    return {
        kind,
        value,
        error,
    };
}
//# sourceMappingURL=NotificationFactories.js.map