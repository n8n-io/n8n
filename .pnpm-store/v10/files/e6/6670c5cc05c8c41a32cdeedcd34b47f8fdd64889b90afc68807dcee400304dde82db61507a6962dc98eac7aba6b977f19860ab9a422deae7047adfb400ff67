export const createLoadOrReturnBroker = <Broker>(loadBroker: (url: string) => Broker, worker: string) => {
    let broker: null | Broker = null;

    return () => {
        if (broker !== null) {
            return broker;
        }

        const blob = new Blob([worker], { type: 'application/javascript; charset=utf-8' });
        const url = URL.createObjectURL(blob);

        broker = loadBroker(url);

        // Bug #1: Edge up until v18 didn't like the URL to be revoked directly.
        setTimeout(() => URL.revokeObjectURL(url));

        return broker;
    };
};
