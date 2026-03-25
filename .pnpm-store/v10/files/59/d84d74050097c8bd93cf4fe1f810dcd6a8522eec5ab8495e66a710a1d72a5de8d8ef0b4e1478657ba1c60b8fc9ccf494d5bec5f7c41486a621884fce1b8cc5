import { Subscription } from '../Subscription';
export const animationFrameProvider = {
    schedule(callback) {
        let request = requestAnimationFrame;
        let cancel = cancelAnimationFrame;
        const { delegate } = animationFrameProvider;
        if (delegate) {
            request = delegate.requestAnimationFrame;
            cancel = delegate.cancelAnimationFrame;
        }
        const handle = request((timestamp) => {
            cancel = undefined;
            callback(timestamp);
        });
        return new Subscription(() => cancel === null || cancel === void 0 ? void 0 : cancel(handle));
    },
    requestAnimationFrame(...args) {
        const { delegate } = animationFrameProvider;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.requestAnimationFrame) || requestAnimationFrame)(...args);
    },
    cancelAnimationFrame(...args) {
        const { delegate } = animationFrameProvider;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.cancelAnimationFrame) || cancelAnimationFrame)(...args);
    },
    delegate: undefined,
};
//# sourceMappingURL=animationFrameProvider.js.map